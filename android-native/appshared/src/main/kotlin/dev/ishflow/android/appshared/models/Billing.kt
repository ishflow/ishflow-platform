package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

/**
 * Response from GET /api/mobile/billing.
 *
 * [plan]    — tenant plan id: free | starter | pro | business | enterprise
 * [status]  — subscription status: active | trialing | past_due | suspended | cancelled
 * [trialEnd] — ISO-8601 timestamp when the trial expires, null if not trialing
 * [featureFlags] — opaque feature flag map from Tenant.mobileFeatures
 */
@Serializable
data class BillingResponse(
    val plan: String,
    val status: String,
    val trialEnd: String? = null,
    val featureFlags: Map<String, Boolean> = emptyMap(),
)

/** Response from POST /api/mobile/billing/portal. */
@Serializable
data class BillingPortalResponse(val url: String)
