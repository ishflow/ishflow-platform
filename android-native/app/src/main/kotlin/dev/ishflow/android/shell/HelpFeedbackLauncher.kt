package dev.ishflow.android.shell

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import dev.ishflow.android.BuildConfig
import dev.ishflow.android.R

private const val FEEDBACK_EMAIL = "feedback@ishflow.com"

/**
 * Fires the system email composer pre-filled with the feedback address and a
 * triage footer (app version + tenant slug). Used by the "Yardım ve geri
 * bildirim" row in [MoreSheet] until the web exposes an in-app feedback form.
 *
 * Falls back silently when no email handler is installed — Compose can't
 * surface a Snackbar from this seam without coupling the launcher to the
 * scaffold's state, and the system chooser already returns a user-friendly
 * error toast on Android when no app handles the intent.
 */
fun openHelpFeedback(context: Context, tenantSlug: String?) {
    val subject = context.getString(R.string.more_sheet_help_email_subject)
    val title = context.getString(R.string.more_sheet_help)
    val footer = buildString {
        appendLine()
        appendLine("---")
        appendLine("App version: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
        appendLine("Tenant: ${tenantSlug.orEmpty()}")
    }
    val mailto = Intent(Intent.ACTION_SENDTO, "mailto:$FEEDBACK_EMAIL".toUri()).apply {
        putExtra(Intent.EXTRA_SUBJECT, subject)
        putExtra(Intent.EXTRA_TEXT, footer)
    }
    val chooser = Intent.createChooser(mailto, title).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    runCatching { context.startActivity(chooser) }
}
