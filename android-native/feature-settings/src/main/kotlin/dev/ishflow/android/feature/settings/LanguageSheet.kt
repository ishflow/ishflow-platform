package dev.ishflow.android.feature.settings

import android.app.LocaleManager
import android.content.Context
import android.os.LocaleList
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp

/**
 * One supported display locale. [tag] is the BCP-47 language tag fed into
 * [LocaleList.forLanguageTags]; [nameRes] is the user-facing name rendered
 * in the picker.
 */
internal data class AppLocale(val tag: String, val nameRes: Int)

internal val SUPPORTED_LOCALES: List<AppLocale> = listOf(
    AppLocale("en", R.string.language_en),
    AppLocale("ru", R.string.language_ru),
    AppLocale("tr", R.string.language_tr),
    AppLocale("uz", R.string.language_uz),
    AppLocale("ky", R.string.language_ky),
)

/**
 * Reads the current application locale via the SDK 33+ [LocaleManager].
 * Falls back to "en" when the user hasn't set a preference yet.
 */
internal fun currentLocaleTag(context: Context): String {
    val manager = context.getSystemService(Context.LOCALE_SERVICE) as? LocaleManager
        ?: return "en"
    val locales = manager.applicationLocales
    return if (locales.isEmpty) "en" else locales[0].language
}

/**
 * Persists the chosen locale through the per-app language API. The system
 * recreates Activities with the new resource configuration, so callers
 * don't need to manually rebuild the UI.
 */
internal fun applyLocale(context: Context, tag: String) {
    val manager = context.getSystemService(Context.LOCALE_SERVICE) as? LocaleManager
        ?: return
    manager.applicationLocales = LocaleList.forLanguageTags(tag)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LanguageSheet(onDismiss: () -> Unit) {
    val context = LocalContext.current
    var selected by remember { mutableStateOf(currentLocaleTag(context)) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
            SUPPORTED_LOCALES.forEach { locale ->
                ListItem(
                    headlineContent = { Text(stringResource(locale.nameRes)) },
                    trailingContent = if (selected == locale.tag) {
                        { Icon(Icons.Filled.Check, contentDescription = null) }
                    } else {
                        null
                    },
                    modifier = Modifier.clickable {
                        selected = locale.tag
                        applyLocale(context, locale.tag)
                        onDismiss()
                    },
                )
            }
        }
    }
}
