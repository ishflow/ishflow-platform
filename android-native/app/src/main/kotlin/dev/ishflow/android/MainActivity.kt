package dev.ishflow.android

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import dagger.hilt.android.AndroidEntryPoint
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.auth.AuthFlow
import dev.ishflow.android.auth.biometric.BiometricStore
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.theme.IshflowTheme
import dev.ishflow.android.theme.ThemeMode
import dev.ishflow.android.theme.ThemeModeStore
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

/**
 * Wire-id + document id parsed from a `ishflow://documents/{kind}/{id}` URI.
 * Mirrors the iOS `handleDeepLink` payload so the activity can hand off to
 * the existing `navController.navigateToDoc` extension without inventing a
 * new route format.
 */
data class DocumentDeepLink(val kind: String, val id: String)

@AndroidEntryPoint
class MainActivity : FragmentActivity() {
    @Inject lateinit var authFlow: AuthFlow

    @Inject lateinit var refreshTrigger: RefreshTrigger

    @Inject lateinit var sessionStore: SessionStore

    @Inject lateinit var api: ApiService

    @Inject lateinit var themeModeStore: ThemeModeStore

    // Biometric unlock gate state is consulted by AppRoot before showing
    // the main scaffold. Hosted here (not in the composable) so the same
    // store instance survives Activity recreation under configuration
    // changes.
    @Inject lateinit var biometricStore: BiometricStore

    // Debug-only QA hook: `adb am start … --ez seed_notifications true` drops a
    // sync error + an offline-waiting mutation into the real queue so the
    // notification center / bell badge can be inspected without a live failure.
    @Inject lateinit var pendingMutationDao: dev.ishflow.android.core.db.PendingMutationDao

    // replay = 1 so a cold-boot deep link (parsed in onCreate before the
    // collector inside MainScaffold attaches) is still delivered. The
    // collector calls `navController.navigateToDoc(...)` which is idempotent
    // for the same (kind, id), so any duplicate emission on lifecycle
    // re-collection is a no-op visually.
    private val _documentDeepLinks = MutableSharedFlow<DocumentDeepLink>(replay = 1, extraBufferCapacity = 1)
    val documentDeepLinks: SharedFlow<DocumentDeepLink> = _documentDeepLinks.asSharedFlow()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (BuildConfig.DEBUG && intent?.getBooleanExtra("seed_notifications", false) == true) {
            seedNotifications()
        }
        intent?.data?.let { authFlow.handleCallback(it) }
        handleDeepLink(intent)
        observeSignOut()
        observeSignIn()
        setContent {
            val themeMode by themeModeStore.mode.collectAsState(initial = ThemeMode.SYSTEM)
            IshflowTheme(themeMode = themeMode) {
                AppRoot(
                    authFlow = authFlow,
                    refreshTrigger = refreshTrigger,
                    sessionStore = sessionStore,
                    biometricStore = biometricStore,
                    documentDeepLinks = documentDeepLinks,
                    onSignIn = { authFlow.launchSignIn(this) },
                    onSignUp = { authFlow.launchSignUp(this) },
                    onSignOut = { signOut() },
                    onRefreshSession = { lifecycleScope.launch { bootstrapSession() } },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.let { authFlow.handleCallback(it) }
        handleDeepLink(intent)
    }

    /**
     * Parses `ishflow://documents/{kind}/{id}` and forwards to the navigation
     * layer via [documentDeepLinks]. Auth callbacks are handled separately
     * above; any other host is ignored so existing intent-filters keep their
     * behaviour. Mirrors iOS `MainTabView.handleDeepLink`.
     */
    /** Debug-only: seed one failed + one offline-waiting mutation. */
    private fun seedNotifications() {
        lifecycleScope.launch {
            val now = System.currentTimeMillis()
            pendingMutationDao.insert(
                dev.ishflow.android.core.db.PendingMutationEntity(
                    id = java.util.UUID.randomUUID().toString(),
                    endpoint = "/api/mobile/documents/sales.invoice",
                    method = "POST",
                    body = "{}",
                    idempotencyKey = java.util.UUID.randomUUID().toString(),
                    attempts = 5,
                    lastError = "java.net.ConnectException",
                    status = "failed",
                    createdAt = now,
                ),
            )
            pendingMutationDao.insert(
                dev.ishflow.android.core.db.PendingMutationEntity(
                    id = java.util.UUID.randomUUID().toString(),
                    endpoint = "/api/mobile/documents/sales.invoice",
                    method = "POST",
                    body = "{}",
                    idempotencyKey = java.util.UUID.randomUUID().toString(),
                    status = "pending",
                    createdAt = now,
                ),
            )
        }
    }

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri = intent?.data ?: return
        if (data.scheme != "ishflow") return
        if (data.host != "documents") return
        val segments = data.pathSegments
        if (segments.size < 2) return
        val kind = segments[0]
        val id = segments[1]
        if (kind.isBlank() || id.isBlank()) return
        _documentDeepLinks.tryEmit(DocumentDeepLink(kind = kind, id = id))
    }

    /**
     * Clears in-memory user state alongside the auth token. Without this the
     * next sign-in (possibly as a different user) sees a stale [SessionStore]
     * snapshot until `/api/mobile/me` refetches — which leaks the previous
     * tenant id and permission set during the brief window.
     */
    private fun signOut() {
        sessionStore.clear()
        authFlow.signOut()
    }

    /**
     * Mirror the cleanup for forced sign-outs (401 → [dev.ishflow.android.auth.AuthModule]
     * UnauthorizedHandler) where `authFlow.signOut()` is invoked without
     * going through [signOut]. Drop the initial value so we don't clear on
     * boot when the user is already signed out.
     */
    private fun observeSignOut() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                // StateFlow already de-duplicates, so we only need to skip
                // the initial value to avoid clearing on cold boot.
                authFlow.signedIn
                    .drop(1)
                    .collect { signedIn -> if (!signedIn) sessionStore.clear() }
            }
        }
    }

    /**
     * Populates [SessionStore] from `/api/mobile/me` whenever the user is
     * signed in. Without this every catalog-backed picker (Customer, Warehouse,
     * Price type, Product) silently no-ops because [dev.ishflow.android.core.repository.CatalogRepository.refresh]
     * early-returns when `sessionStore.tenantId.value` is null. Re-runs on
     * each fresh STARTED so token refreshes also rehydrate the store.
     */
    private fun observeSignIn() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                authFlow.signedIn.collect { signedIn ->
                    if (signedIn && sessionStore.tenantId.value == null) {
                        bootstrapSession()
                    }
                }
            }
        }
    }

    @Suppress("TooGenericExceptionCaught")
    private suspend fun bootstrapSession() {
        try {
            sessionStore.update(api.getMe())
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            // Swallow — the dashboard / picker layer will surface the failure
            // through its own error states; we don't want to crash the shell.
        }
    }
}
