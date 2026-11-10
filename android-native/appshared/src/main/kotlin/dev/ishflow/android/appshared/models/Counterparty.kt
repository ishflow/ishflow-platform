package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

@Serializable
@Suppress("EnumNaming")
enum class CounterpartyType { customer, supplier }

@Serializable
@Suppress("EnumNaming")
enum class BalanceDirection { owesUs, weOwe, zero }

/**
 * Counterparty (cari) — customer or supplier.
 *
 * Returned by `/api/mobile/counterparties`. `balance` is wire-encoded as a
 * decimal string to avoid JSON precision loss; the list endpoint may omit
 * balance/contact fields, so all optional fields default to null.
 */
@Serializable
data class Counterparty(
    val id: String,
    // Server `/api/mobile/counterparties` omits `type` from items; the repo
    // tags each row with the type matching the request it issued.
    val type: CounterpartyType = CounterpartyType.customer,
    val name: String,
    val code: String? = null,
    val contactName: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val balance: String? = null,
    val balanceDirection: BalanceDirection? = null,
    val currency: String? = null,
)

typealias CounterpartyListResponse = PaginatedResponse<Counterparty>
