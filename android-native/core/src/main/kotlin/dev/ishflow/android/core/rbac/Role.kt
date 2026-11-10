package dev.ishflow.android.core.rbac

/**
 * Canonical 1C-style system role names returned by the server.
 *
 * String constants rather than an enum because the server may introduce
 * tenant-defined custom roles; unknown values are tolerated as opaque
 * strings (see [PickPrimaryRole.pick]).
 */
object SystemRole {
    const val OWNER = "owner"
    const val ADMINISTRATOR = "administrator"
    const val CHIEF_ACCOUNTANT = "chief_accountant"
    const val ACCOUNTANT = "accountant"
    const val CASHIER = "cashier"
    const val MANAGER = "manager"
    const val BUYER = "buyer"
    const val WAREHOUSEMAN = "warehouseman"
    const val VIEWER = "viewer"

    /** All known roles in display order (owner → viewer). */
    val ALL: List<String> = listOf(
        OWNER,
        ADMINISTRATOR,
        CHIEF_ACCOUNTANT,
        ACCOUNTANT,
        CASHIER,
        MANAGER,
        BUYER,
        WAREHOUSEMAN,
        VIEWER,
    )
}
