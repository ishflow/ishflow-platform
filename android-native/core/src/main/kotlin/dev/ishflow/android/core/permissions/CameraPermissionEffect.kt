package dev.ishflow.android.core.permissions

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

/**
 * Returns a function that the caller invokes with two callbacks:
 * - If camera permission is already granted, runs `onGranted` immediately.
 * - Otherwise launches the system permission dialog. On grant, runs `onGranted`;
 *   on denial, runs `onDenied`.
 */
@Composable
fun rememberRequestCameraPermission(): (onGranted: () -> Unit, onDenied: () -> Unit) -> Unit {
    val context = LocalContext.current
    val pending = remember {
        object {
            var onGranted: (() -> Unit)? = null
            var onDenied: (() -> Unit)? = null
        }
    }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        val cb = if (granted) pending.onGranted else pending.onDenied
        pending.onGranted = null
        pending.onDenied = null
        cb?.invoke()
    }
    return { onGranted, onDenied ->
        val already = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA,
        ) == PackageManager.PERMISSION_GRANTED
        if (already) {
            onGranted()
        } else {
            pending.onGranted = onGranted
            pending.onDenied = onDenied
            launcher.launch(Manifest.permission.CAMERA)
        }
    }
}
