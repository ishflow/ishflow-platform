package dev.ishflow.android.feature.inventory.scan

import android.Manifest
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.accompanist.permissions.shouldShowRationale
import dev.ishflow.android.feature.inventory.R

/**
 * Camera + ML Kit barcode scanner screen.
 *
 * Delegates the camera preview and scanning to [CameraXBarcodeScanner].
 * Handles the CAMERA runtime-permission flow before showing the preview.
 * [onScan] is invoked at most once per unique barcode value per composition
 * (dedup is enforced in [CameraXBarcodeScanner]).
 *
 * Used by:
 * - inventory "scan" entrypoint (navigates to product detail)
 * - sales + purchase wizards (resolves product by code → adds line)
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun BarcodeScanScreen(onScan: (String) -> Unit) {
    val context = LocalContext.current
    val alreadyGranted = remember {
        ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }
    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)

    when {
        alreadyGranted || cameraPermissionState.status.isGranted -> {
            Box(modifier = Modifier.fillMaxSize()) {
                CameraXBarcodeScanner(
                    onScanned = onScan,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        cameraPermissionState.status.shouldShowRationale -> {
            // Show rationale and let the user explicitly grant the permission.
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = stringResource(R.string.barcode_permission_rationale),
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = 16.dp),
                )
                Button(onClick = { cameraPermissionState.launchPermissionRequest() }) {
                    Text(stringResource(R.string.barcode_permission_grant))
                }
            }
        }
        else -> {
            // First time — launch the system permission dialog automatically.
            LaunchedEffect(Unit) { cameraPermissionState.launchPermissionRequest() }
        }
    }
}
