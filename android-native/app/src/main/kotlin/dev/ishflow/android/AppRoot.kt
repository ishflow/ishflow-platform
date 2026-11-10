package dev.ishflow.android

import androidx.compose.foundation.Image
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.auth.AuthFlow
import dev.ishflow.android.auth.RoleNotConfiguredScreen
import dev.ishflow.android.auth.biometric.BiometricPromptScreen
import dev.ishflow.android.auth.biometric.BiometricStore
import dev.ishflow.android.auth.rememberContactAdminAction
import dev.ishflow.android.auth.shouldShowRoleNotConfigured
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.core.ui.ConnectivityCapsule
import dev.ishflow.android.core.ui.aurora.AuroraBackground
import dev.ishflow.android.core.ui.aurora.AuroraPrimaryButton
import dev.ishflow.android.core.ui.aurora.AuroraTextLink
import dev.ishflow.android.core.ui.aurora.GlassCard
import dev.ishflow.android.core.ui.aurora.GlassHeadline
import dev.ishflow.android.core.ui.aurora.GlassMark
import dev.ishflow.android.core.ui.aurora.GlassSubtitle
import dev.ishflow.android.feature.onboarding.OnboardingCoordinator
import kotlinx.coroutines.flow.SharedFlow

@Composable
fun AppRoot(
    authFlow: AuthFlow,
    refreshTrigger: RefreshTrigger,
    sessionStore: SessionStore,
    biometricStore: BiometricStore,
    documentDeepLinks: SharedFlow<DocumentDeepLink>,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onSignOut: () -> Unit,
    onRefreshSession: () -> Unit = {},
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) refreshTrigger.fire()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    val signedIn by authFlow.signedIn.collectAsStateWithLifecycle()
    val me by sessionStore.me.collectAsStateWithLifecycle()
    val biometricEnabled by biometricStore.enabled.collectAsStateWithLifecycle(initialValue = false)
    // Survive configuration changes (rotation, theme flip) so the user
    // doesn't get re-prompted; cold-start resets the flag, which is the
    // exact behaviour we want for a session-level gate.
    var biometricPassed by rememberSaveable { mutableStateOf(false) }
    val onContactAdmin = rememberContactAdminAction()
    Box(modifier = Modifier.fillMaxSize()) {
        if (signedIn) {
            if (biometricEnabled && !biometricPassed) {
                BiometricPromptScreen(
                    onSuccess = { biometricPassed = true },
                    onFallbackSignOut = onSignOut,
                )
            } else {
                // `me == null` → still loading; show MainScaffold which handles its
                // own loading states rather than flashing onboarding prematurely.
                // Once `/api/mobile/me` confirms no active tenant, route to onboarding.
                // Guard: signed-in users whose role has zero permission grants
                // hit a dedicated screen instead of being stranded on an empty shell.
                val meSnapshot = me
                val permissionCount = meSnapshot?.permissions?.size
                val noTenant = meSnapshot != null && meSnapshot.tenant == null
                if (noTenant) {
                    OnboardingCoordinator(onComplete = onRefreshSession)
                } else if (permissionCount != null &&
                    shouldShowRoleNotConfigured(
                        signedIn = true,
                        permissionCount = permissionCount,
                    )
                ) {
                    RoleNotConfiguredScreen(
                        onContactAdmin = onContactAdmin,
                        onSignOut = onSignOut,
                    )
                } else {
                    MainScaffold(documentDeepLinks = documentDeepLinks, onSignOut = onSignOut)
                }
            }
        } else {
            WelcomeScreen(
                onSignUp = onSignUp,
                onSignIn = onSignIn,
                onDevSkip = { authFlow.signInDevOverride() },
            )
        }
        ConnectivityCapsule(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(top = 8.dp),
        )
    }
}

@Composable
private fun WelcomeScreen(
    onSignUp: () -> Unit,
    onSignIn: () -> Unit,
    onDevSkip: () -> Unit,
) {
    val dark = isSystemInDarkTheme()
    AuroraBackground(dark = dark) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.weight(1f))
            // Brand logo moved into a frosted glass-mark tile.
            GlassMark(
                modifier = Modifier.padding(bottom = 14.dp),
                content = {
                    Image(
                        painter = painterResource(R.drawable.ishflow_logo),
                        contentDescription = null,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp)),
                    )
                },
                dark = dark,
            )
            GlassCard(modifier = Modifier.fillMaxWidth(), dark = dark) {
                GlassHeadline(text = stringResource(R.string.auth_welcome), dark = dark)
                Spacer(Modifier.height(10.dp))
                GlassSubtitle(text = stringResource(R.string.auth_subtitle), dark = dark)
                Spacer(Modifier.height(20.dp))
                AuroraPrimaryButton(
                    text = stringResource(R.string.auth_sign_up),
                    onClick = onSignUp,
                    dark = dark,
                    trailingIcon = Icons.AutoMirrored.Filled.ArrowForward,
                )
                Spacer(Modifier.height(4.dp))
                AuroraTextLink(
                    prefix = stringResource(R.string.auth_have_account),
                    emphasis = stringResource(R.string.auth_sign_in),
                    onClick = onSignIn,
                    dark = dark,
                )
                if (BuildConfig.ALLOW_DEV_SKIP) {
                    TextButton(
                        onClick = onDevSkip,
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .padding(top = 4.dp),
                    ) {
                        Text(stringResource(R.string.auth_dev_skip))
                    }
                }
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}
