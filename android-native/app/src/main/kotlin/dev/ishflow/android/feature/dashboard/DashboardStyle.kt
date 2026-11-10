package dev.ishflow.android.feature.dashboard

/**
 * The actual enum lives in `:core`'s [dev.ishflow.android.core.store.DashboardStyle]
 * so the singleton [dev.ishflow.android.core.store.DashboardStyleStore] can return
 * it strongly typed without creating a cyclic dependency on the feature-dashboard
 * sources that live in `:app`. This file re-exports the enum under the dashboard
 * package so screen/layout code can import it locally.
 */
typealias DashboardStyle = dev.ishflow.android.core.store.DashboardStyle
