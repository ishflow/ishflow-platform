package dev.ishflow.android.feature.reports

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import dev.ishflow.android.apiclient.ApiService
import okhttp3.ResponseBody
import java.io.File

/**
 * Fetches a report XLSX from the backend and launches the system share chooser.
 *
 * The XLSX is written to `cacheDir/report_share/<type>-<timestamp>.xlsx` and
 * exposed via the existing [FileProvider] (`${applicationId}.fileprovider`).
 *
 * @param context  Android context used for cache dir, FileProvider, and startActivity.
 * @param type     URL slug matching the backend route: `"sales-summary"`,
 *                 `"ar-aging"`, or `"gross-profit"`.
 * @param from     ISO-8601 date string for period start, or null for snapshot reports.
 * @param to       ISO-8601 date string for period end, or null for snapshot reports.
 * @param api      Retrofit [ApiService] instance, pre-authenticated.
 */
suspend fun shareReport(
    context: Context,
    type: String,
    from: String?,
    to: String?,
    api: ApiService,
) {
    val body = api.exportReportXlsx(type, from, to)
    val shareDir = File(context.cacheDir, "report_share").also { it.mkdirs() }
    val file = File(shareDir, "$type-${System.currentTimeMillis()}.xlsx")
    body.byteStream().use { input -> file.outputStream().use { output -> input.copyTo(output) } }

    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, null))
}
