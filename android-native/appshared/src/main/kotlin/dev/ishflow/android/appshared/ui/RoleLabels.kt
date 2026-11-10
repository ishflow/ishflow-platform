package dev.ishflow.android.appshared.ui

import androidx.annotation.StringRes
import dev.ishflow.android.appshared.R

/**
 * Maps a server-supplied role key (see `core/rbac/Role.kt::SystemRole`) to
 * the localized label string resource. Returns `null` for tenant-defined
 * custom roles or unknown keys so callers can fall back to either the raw
 * key or a generic "Member" label.
 */
@StringRes
fun roleLabelResOrNull(roleKey: String?): Int? = when (roleKey) {
    "owner" -> R.string.role_owner
    "administrator", "admin" -> R.string.role_administrator
    "chief_accountant" -> R.string.role_chief_accountant
    "accountant" -> R.string.role_accountant
    "cashier" -> R.string.role_cashier
    "manager" -> R.string.role_manager
    "buyer" -> R.string.role_buyer
    "warehouseman", "warehouse" -> R.string.role_warehouseman
    "viewer" -> R.string.role_viewer
    else -> null
}
