package dev.ishflow.android

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Top-level bottom-bar destinations.
 *
 * Faz 1 rewrites the shell to 4 tabs (was 5). Old routes (`sales`, `prices`,
 * `settings`) remain registered in [MainScaffold]'s NavHost so deep-links and
 * MoreSheet entries still work, but they no longer appear in the [all] list.
 */
sealed class TopDestination(val route: String, val labelRes: Int, val icon: ImageVector) {
    data object Home : TopDestination("dashboard", R.string.tab_home, Icons.Filled.Home)
    data object Docs : TopDestination("docs", R.string.tab_docs, Icons.Filled.Description)
    data object Stock : TopDestination("inventory", R.string.tab_stock, Icons.Filled.Inventory)
    data object Cari : TopDestination("cari", R.string.tab_cari, Icons.Filled.Person)

    companion object {
        val all = listOf(Home, Docs, Stock, Cari)
    }
}
