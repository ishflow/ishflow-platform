package dev.ishflow.android.feature.onboarding.demo

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import dev.ishflow.android.core.ui.aurora.AuroraBackground
import dev.ishflow.android.core.ui.aurora.AuroraGhostButton
import dev.ishflow.android.core.ui.aurora.AuroraPrimaryButton
import dev.ishflow.android.core.ui.aurora.GlassCard
import dev.ishflow.android.core.ui.aurora.GlassHeadline
import dev.ishflow.android.core.ui.aurora.GlassMark
import dev.ishflow.android.core.ui.aurora.GlassSubtitle

/**
 * Stateless demo-offer body for snapshot tests and previews.
 * Renders the card + CTA buttons without a Scaffold wrapper.
 */
@Composable
internal fun DemoOfferContent(
    uiState: DemoOfferUiState,
    onSeed: () -> Unit = {},
    onSkip: () -> Unit = {},
) {
    Box(
        modifier = Modifier.fillMaxSize(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = stringResource(R.string.onboarding_demo_body),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(16.dp),
                )
            }

            Spacer(Modifier.height(32.dp))

            Button(
                onClick = onSeed,
                enabled = uiState !is DemoOfferUiState.Seeding,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    if (uiState is DemoOfferUiState.Seeding) {
                        stringResource(R.string.onboarding_demo_seeding)
                    } else {
                        stringResource(R.string.onboarding_demo_seed)
                    },
                )
            }

            Spacer(Modifier.height(12.dp))

            FilledTonalButton(
                onClick = onSkip,
                enabled = uiState !is DemoOfferUiState.Seeding,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.onboarding_demo_skip))
            }
        }

        if (uiState is DemoOfferUiState.Seeding) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemoOfferScreen(
    tenantId: String,
    onCompleted: () -> Unit,
    viewModel: DemoOfferViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    // Navigate on terminal states
    LaunchedEffect(uiState) {
        when (uiState) {
            is DemoOfferUiState.Success,
            is DemoOfferUiState.Skipped,
            -> onCompleted()
            else -> Unit
        }
    }

    // Show snackbar on error then complete
    val errorMsg = if (uiState is DemoOfferUiState.Error) {
        stringResource(
            R.string.onboarding_demo_error,
            (uiState as DemoOfferUiState.Error).message,
        )
    } else null
    LaunchedEffect(errorMsg) {
        if (errorMsg != null) {
            snackbarHostState.showSnackbar(errorMsg)
            onCompleted()
        }
    }

    val dark = isSystemInDarkTheme()
    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent,
    ) { padding ->
        AuroraBackground(dark = dark) {
            Box(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .systemBarsPadding()
                        .padding(horizontal = 22.dp)
                        .padding(top = padding.calculateTopPadding()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(Modifier.weight(1f))
                    GlassMark(
                        icon = Icons.Outlined.AutoAwesome,
                        dark = dark,
                        modifier = Modifier.padding(bottom = 14.dp),
                    )
                    GlassCard(modifier = Modifier.fillMaxWidth(), dark = dark) {
                        GlassHeadline(text = stringResource(R.string.onboarding_demo_title), dark = dark)
                        Spacer(Modifier.height(10.dp))
                        GlassSubtitle(text = stringResource(R.string.onboarding_demo_body), dark = dark)

                        Spacer(Modifier.height(20.dp))

                        // Primary CTA — seed demo data
                        AuroraPrimaryButton(
                            text = if (uiState is DemoOfferUiState.Seeding) {
                                stringResource(R.string.onboarding_demo_seeding)
                            } else {
                                stringResource(R.string.onboarding_demo_seed)
                            },
                            onClick = viewModel::seed,
                            enabled = uiState !is DemoOfferUiState.Seeding,
                            dark = dark,
                        )

                        Spacer(Modifier.height(10.dp))

                        // Secondary CTA — skip demo, start empty
                        AuroraGhostButton(
                            text = stringResource(R.string.onboarding_demo_skip),
                            onClick = viewModel::skip,
                            enabled = uiState !is DemoOfferUiState.Seeding,
                            dark = dark,
                        )
                    }
                    Spacer(Modifier.height(28.dp))
                }

                // Full-screen progress overlay while seeding
                if (uiState is DemoOfferUiState.Seeding) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
            }
        }
    }
}
