package dev.ishflow.android.shell

import androidx.compose.foundation.clickable
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed

/**
 * Adds a tap handler to a row. Kept as a private helper so the sheet rows stay
 * declarative and don't repeat the `Modifier.clickable` boilerplate.
 */
internal fun Modifier.clickableRow(onClick: () -> Unit): Modifier =
    composed { this.then(Modifier.clickable(onClick = onClick)) }
