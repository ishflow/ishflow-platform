# AppSearch indexer — deferred

Status: **DEFERRED** (alpha-library + KSP/kapt impedance mismatch on the build graph).

## Why

Task **G1** of the 2026-05-11 Android/iOS parity bundle
(the internal design spec) calls for an `androidx.appsearch`
indexer that mirrors the iOS Spotlight integration — on post-sync (`RefreshTrigger.fire()`) it would push
customer + product + recent-document rows into the on-device AppSearch index so the system search surface
can find them.

The spec authorised a deferral if the AppSearch alpha library proved unstable or added non-trivial build
cost. Both conditions are met:

1. **AppSearch compiler is javac-only, not KSP.** `androidx.appsearch:appsearch-compiler:1.1.0-alpha04`
   ships as a Java annotation processor (`javax.annotation.processing.Processor`). It has no
   `SymbolProcessorProvider`, so wiring it via `ksp(libs.androidx.appsearch.compiler)` would silently emit
   zero code and the `@Document` types would fail at runtime (no generated `*$$__AppSearch__*` factories).
2. **The Android core module is pure KSP.** `android-native/core/build.gradle.kts` uses KSP for Room and
   Hilt. Adding AppSearch's annotation processor would force us to re-introduce the `kotlin-kapt` plugin
   alongside KSP. kapt adds a separate Java stub generation pass on every build of `:core` — a measurable
   build-time regression for a feature that is currently **invisible** (no UI surface in the app consumes
   AppSearch query results today; the indexer is only useful to the OS-level search surface, which is a
   future integration point).
3. **Alpha-stage API churn risk.** `1.1.0-alpha04` is two minors behind the latest `1.2.0-alpha01`; the
   schema and result APIs are still moving. Shipping it now would create premature surface area to
   maintain (schema migrations, throttle tuning, session lifecycle) for zero user-visible benefit.

Half-wiring the integration (declaring the dependency without the processor, or hand-writing
`GenericDocument` builders instead of using the annotation) would either fail at runtime or duplicate the
maintenance cost of the official annotation flow. Per the parity-bundle G1 risk register, the correct
action is to defer and document.

## What's needed to unblock

1. Wait for `androidx.appsearch:appsearch-compiler` to ship a KSP-compatible processor (track
   <https://issuetracker.google.com/issues/?q=componentid:1156866%20appsearch%20ksp>) — **or** accept the
   build-time cost and re-introduce `kotlin-kapt` on `:core` purely for this annotation.
2. Add to `gradle/libs.versions.toml`:

   ```toml
   [versions]
   appsearch = "1.x.0"  # whichever version ships KSP support, or stable 1.1.0+
   coroutines-guava = "1.9.0"

   [libraries]
   androidx-appsearch = { module = "androidx.appsearch:appsearch", version.ref = "appsearch" }
   androidx-appsearch-local-storage = { module = "androidx.appsearch:appsearch-local-storage", version.ref = "appsearch" }
   androidx-appsearch-compiler = { module = "androidx.appsearch:appsearch-compiler", version.ref = "appsearch" }
   kotlinx-coroutines-guava = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-guava", version.ref = "coroutines-guava" }
   ```

3. In `android-native/core/build.gradle.kts`:

   ```kotlin
   implementation(libs.androidx.appsearch)
   implementation(libs.androidx.appsearch.local.storage)
   implementation(libs.kotlinx.coroutines.guava) // for ListenableFuture.await()
   ksp(libs.androidx.appsearch.compiler)         // OR: kapt(...) until KSP support lands
   ```

4. Create the searchable types under `android-native/core/src/main/kotlin/dev/canalog/android/core/search/`:

   - `SearchableCustomer.kt` (`@Document`, namespace = "customer", `name` indexed `PREFIXES`)
   - `SearchableProduct.kt` (`@Document`, namespace = "product", `name` indexed `PREFIXES`, optional `sku`)
   - `SearchableDocument.kt` (`@Document`, namespace = "document", `title` indexed `PREFIXES`, `kind`)

5. Create `AppSearchIndexer.kt` (`@Singleton`, `@Inject` ctor, `@ApplicationContext`):

   - `@Volatile lastReindexAtMs` + 60s throttle.
   - `suspend fun reindex(customers, products, documents)` that opens a `LocalStorage` session named
     `"canalog"`, calls `setSchemaAsync(...).await()`, then `putAsync(PutDocumentsRequest...).await()`.
   - `catch (e: Exception) { if (e is CancellationException) throw e; Log.w(...) }` — never break the
     user-flow if indexing fails.

6. Hook into the existing post-sync path. `RefreshTrigger` today is a fire-and-forget `SharedFlow<Unit>`
   emitter; the wiring options are:

   - **Option A (cheapest, no DI surgery):** add a `CoroutineScope` observer in `CoreModule` (or a
     dedicated `AppSearchObserver` `@Singleton`) that collects `refreshTrigger.events`, pulls fresh data
     from `CatalogRepository.observe("customer").first()` / `observe("product").first()` + a recent-docs
     fetch, maps to the searchable types, and calls `appSearch.reindex(...)`. Keeps `RefreshTrigger` as a
     pure event bus.
   - **Option B:** inject `AppSearchIndexer` into each list `ViewModel` that already collects
     `refreshTrigger.events` and have them notify the indexer. Spreads the wiring and risks duplicate
     reindex calls — the 60s throttle protects correctness but Option A is cleaner.

   Prefer Option A.

7. Document-side data: there is no shared `DocsRepository.recent()` today — each feature module
   (`feature-docs`, `feature-sales`, `feature-purchases`) calls `ApiService.listDocuments(kind, ...)`
   directly. The unblock task should either (a) add a `RecentDocumentsCache` in `:core` with a small Room
   table mirroring catalog records, or (b) accept that document indexing is best-effort and call the API
   on the indexer side with a small page size (e.g. 20 per kind). Option (a) is the long-term right
   answer and pairs naturally with offline mode.

8. Verify end-to-end on an emulator: install the app, trigger a refresh, then run `adb shell` `cmd
   appsearch query "<prefix>"` (or use an in-app debug surface) and confirm hits.

## Privacy + tenancy reminders (for when this ships)

- Namespaces must include the active tenant id (e.g. `"customer:<tenantId>"`) **or** the session must be
  scoped per-tenant. Otherwise a tenant switch would surface stale data in the OS search. Easiest fix:
  clear the AppSearch database (`session.setSchemaAsync(... .setForceOverride(true) ...)`) on tenant
  switch.
- Honour the privacy gate from Wave C1/C2 (`PrivacyStore`) — if a "discoverable in system search" toggle
  exists or is added, gate `reindex(...)` on it and clear the index when the user opts out.

## Owner

Android app maintainer. Track via the parity-bundle PR's "Deferred" list and re-open G1 when either the
AppSearch compiler ships KSP support or we decide to absorb the kapt build-time cost.
