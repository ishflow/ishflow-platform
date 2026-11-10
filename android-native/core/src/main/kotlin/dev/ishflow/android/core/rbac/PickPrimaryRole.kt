package dev.ishflow.android.core.rbac

/**
 * Picks the highest-priority role name from a user's role list.
 *
 * Mirrors the web `platform/auth/pick-primary-role.ts` precedence order:
 * owner > administrator > chief_accountant > accountant > cashier >
 * manager > buyer > warehouseman > viewer. Unknown roles sort last and
 * are returned only if no system role is present.
 */
object PickPrimaryRole {
    private const val LOWEST_PRIORITY = Int.MAX_VALUE

    private val PRIORITY: Map<String, Int> = mapOf(
        SystemRole.OWNER to 0,
        SystemRole.ADMINISTRATOR to 1,
        SystemRole.CHIEF_ACCOUNTANT to 2,
        SystemRole.ACCOUNTANT to 3,
        SystemRole.CASHIER to 4,
        SystemRole.MANAGER to 5,
        SystemRole.BUYER to 6,
        SystemRole.WAREHOUSEMAN to 7,
        SystemRole.VIEWER to 8,
    )

    fun pick(roles: List<String>): String? {
        if (roles.isEmpty()) return null
        return roles.minByOrNull { PRIORITY[it] ?: LOWEST_PRIORITY }
    }
}
