package dev.ishflow.android

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddBusiness
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.MoveDown
import androidx.compose.material.icons.filled.MoveUp
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Tiny SF Symbol → Material [ImageVector] mapper for server-driven shell
 * elements (tabs + FAB sheet).
 *
 * The mobile API speaks SF Symbol names because iOS consumes them directly.
 * Until the server learns to emit platform-neutral hints, Android keeps a
 * small lookup table covering every icon emitted by `MOBILE_TABS` +
 * `MOBILE_FAB_ACTIONS` in `lib/mobile/tab-registry.ts`. Unknown input
 * collapses to a generic help glyph — visible but not crashy.
 */
private val ICON_MAP: Map<String, ImageVector> = mapOf(
    // Tabs
    "house.fill" to Icons.Filled.Home,
    "doc.text.fill" to Icons.Filled.Description,
    "cube.box.fill" to Icons.Filled.Inventory,
    "person.2.fill" to Icons.Filled.Groups,
    // FAB actions
    "doc.text.badge.plus" to Icons.Filled.Description,
    "creditcard.fill" to Icons.Filled.Payments,
    "cart.fill" to Icons.Filled.ShoppingCart,
    "arrow.up.right.circle.fill" to Icons.AutoMirrored.Filled.TrendingDown,
    "arrow.down.circle.fill" to Icons.Filled.MoveDown,
    "arrow.up.circle.fill" to Icons.Filled.MoveUp,
    "person.crop.circle.badge.plus" to Icons.Filled.PersonAdd,
    "building.2.fill" to Icons.Filled.AddBusiness,
    "person.badge.plus" to Icons.Filled.Group,
    "plus" to Icons.Filled.Add,
)

/** Resolves an SF Symbol [name] to a Material icon, or a help glyph if unknown. */
fun materialIcon(name: String?): ImageVector {
    if (name.isNullOrBlank()) return Icons.AutoMirrored.Filled.Help
    return ICON_MAP[name] ?: Icons.AutoMirrored.Filled.Help
}
