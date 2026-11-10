package dev.ishflow.android.appshared.ui

import androidx.annotation.StringRes
import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.api.ApiException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Server contract — error envelope shape mirroring web `app/api`:
 *
 *   { "error": { "code": "PERIOD_CLOSED", "message": "..." } }
 *
 * For typed UX (e.g. period-close, RBAC denials, optimistic-lock conflict),
 * we inspect this code first before falling back to HTTP-status mapping.
 *
 * Add codes here as the server starts emitting them.
 */
private const val CODE_PERIOD_CLOSED = "PERIOD_CLOSED"
// Engine `posting_validation` envelope: `{error:"posting_validation", reason:"<sub>"}`.
// `belowCost` fires when a sales-invoice line price < cached cost AND the tenant
// hasn't allowed below-cost selling. Mapping these as typed codes lets us surface
// the engine semantics without bouncing through "Bad request".
private const val CODE_POSTING_VALIDATION = "posting_validation"
private const val REASON_BELOW_COST = "belowCost"

@StringRes
fun ApiException.stringRes(): Int {
    val body = (this as? ApiException.Http)?.body
    val code = body?.let(::extractErrorCode)
    return when (code) {
        CODE_PERIOD_CLOSED -> R.string.error_period_closed
        CODE_POSTING_VALIDATION -> when (body.let(::extractReason)) {
            REASON_BELOW_COST -> R.string.error_below_cost
            else -> stringResForHttpStatus()
        }
        else -> stringResForHttpStatus()
    }
}

@StringRes
private fun ApiException.stringResForHttpStatus(): Int = when (httpCode) {
    400 -> R.string.error_bad_request
    401 -> R.string.error_unauthorized
    404 -> R.string.error_not_found
    in 500..599 -> R.string.error_server
    null -> R.string.error_network
    -1 -> R.string.error_unknown
    else -> R.string.error_unknown
}

private val errorEnvelopeJson: Json = Json {
    ignoreUnknownKeys = true
    isLenient = true
}

private fun extractErrorCode(body: String): String? = runCatching {
    val root = errorEnvelopeJson.parseToJsonElement(body) as? JsonObject ?: return null
    // Two server envelope shapes in use:
    //   canonical: `{error:{code:"X", message:"Y"}}`
    //   engine:    `{error:"X", reason:"Y"}`
    when (val errorEl = root["error"]) {
        is JsonObject -> errorEl["code"]?.jsonPrimitive?.contentOrNull
        is JsonPrimitive -> errorEl.contentOrNull
        else -> null
    }
}.getOrNull()

/** Engine envelope `reason` sub-code, e.g. `"belowCost"` for `posting_validation`. */
private fun extractReason(body: String): String? = runCatching {
    val root = errorEnvelopeJson.parseToJsonElement(body) as? JsonObject ?: return null
    root["reason"]?.jsonPrimitive?.contentOrNull
}.getOrNull()

/**
 * Best-effort server message for surfacing in snackbars when no typed code
 * mapped to a localized resource. Accepts both server envelope shapes:
 *   canonical: `{error:{code, message}}` → returns `message`
 *   engine:    `{error:"code", reason:"sub"}` → returns null (let the
 *              typed mapping in [stringRes] handle it; we don't want raw
 *              machine codes leaking to the user).
 * Returns null when neither shape yields a human-readable message so
 * callers fall back to the HTTP-status string or wizard label.
 */
fun ApiException.serverMessage(): String? {
    val body = (this as? ApiException.Http)?.body ?: return null
    return runCatching {
        val root = errorEnvelopeJson.parseToJsonElement(body) as? JsonObject ?: return null
        val errorObj = root["error"] as? JsonObject ?: return null
        errorObj["message"]?.jsonPrimitive?.contentOrNull
    }.getOrNull()
}
