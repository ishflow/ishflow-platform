package dev.ishflow.android.auth.biometric

import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import dev.ishflow.android.auth.R

/**
 * Biometric (or device-credential fallback) unlock gate.
 *
 * Rendered only when [BiometricStore]'s flag is on AND the user hasn't
 * passed the gate in this process. We host the prompt against the current
 * [FragmentActivity] — MainActivity is configured to extend it so this
 * cast resolves; the Compose tree itself stays pure Material 3.
 *
 * The negative button is wired to [onFallbackSignOut]: the user can always
 * escape to the welcome screen rather than getting stuck if they no longer
 * have working biometrics.
 */
@Composable
fun BiometricPromptScreen(
    onSuccess: () -> Unit,
    onFallbackSignOut: () -> Unit,
) {
    val activity = LocalContext.current as? FragmentActivity
    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Filled.Fingerprint,
                contentDescription = null,
                modifier = Modifier
                    .size(64.dp)
                    .padding(bottom = 16.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = stringResource(R.string.biometric_title),
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
            )
            Button(
                onClick = {
                    if (activity == null) return@Button
                    val executor = ContextCompat.getMainExecutor(activity)
                    val info = BiometricPrompt.PromptInfo.Builder()
                        .setTitle(activity.getString(R.string.biometric_title))
                        .setNegativeButtonText(
                            activity.getString(R.string.biometric_negative_signout),
                        )
                        .setAllowedAuthenticators(
                            BIOMETRIC_STRONG or BIOMETRIC_WEAK or DEVICE_CREDENTIAL,
                        )
                        .build()
                    BiometricPrompt(
                        activity,
                        executor,
                        object : BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationSucceeded(
                                result: BiometricPrompt.AuthenticationResult,
                            ) {
                                onSuccess()
                            }

                            override fun onAuthenticationError(
                                errorCode: Int,
                                errString: CharSequence,
                            ) {
                                if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                                    errorCode == BiometricPrompt.ERROR_USER_CANCELED
                                ) {
                                    onFallbackSignOut()
                                }
                            }
                        },
                    ).authenticate(info)
                },
                modifier = Modifier.padding(top = 24.dp),
            ) {
                Text(stringResource(R.string.biometric_button_authenticate))
            }
        }
    }
}
