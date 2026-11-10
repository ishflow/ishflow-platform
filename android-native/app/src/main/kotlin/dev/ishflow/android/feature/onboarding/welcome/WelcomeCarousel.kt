package dev.ishflow.android.feature.onboarding.welcome

import androidx.annotation.StringRes
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R
import dev.ishflow.android.core.ui.aurora.AuroraBackground
import dev.ishflow.android.core.ui.aurora.AuroraPrimaryButton
import dev.ishflow.android.core.ui.aurora.FeaturePill
import dev.ishflow.android.core.ui.aurora.GlassCard
import dev.ishflow.android.core.ui.aurora.GlassHeadline
import dev.ishflow.android.core.ui.aurora.GlassMark
import dev.ishflow.android.core.ui.aurora.GlassSubtitle
import dev.ishflow.android.core.ui.aurora.PageDots
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun WelcomeCarousel(onSkip: () -> Unit = {}, onContinue: () -> Unit = {}) {
    data class WelcomePage(
        @StringRes val titleRes: Int,
        @StringRes val bodyRes: Int,
        val icon: ImageVector,
    )

    val pages = remember {
        listOf(
            WelcomePage(R.string.onboarding_welcome_title_1, R.string.onboarding_welcome_body_1, Icons.Outlined.Store),
            WelcomePage(R.string.onboarding_welcome_title_2, R.string.onboarding_welcome_body_2, Icons.Outlined.Inventory2),
            WelcomePage(R.string.onboarding_welcome_title_3, R.string.onboarding_welcome_body_3, Icons.Outlined.BarChart),
        )
    }

    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    val dark = isSystemInDarkTheme()

    AuroraBackground(dark = dark) {
        Box(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize(),
            ) { page ->
                val p = pages[page]
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .systemBarsPadding()
                        .padding(horizontal = 22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Top skip row.
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                    ) {
                        TextButton(onClick = onSkip) {
                            Text(
                                text = stringResource(R.string.onboarding_skip),
                                color = if (dark) Color.White.copy(alpha = 0.72f) else Color(0xFF1C4FB0),
                            )
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    GlassMark(icon = p.icon, dark = dark, modifier = Modifier.padding(bottom = 14.dp))
                    GlassCard(modifier = Modifier.fillMaxWidth(), dark = dark) {
                        GlassHeadline(text = stringResource(p.titleRes), dark = dark)
                        Spacer(Modifier.height(10.dp))
                        GlassSubtitle(text = stringResource(p.bodyRes), dark = dark)

                        // Feature pills — page 1 only (mockup).
                        if (page == 0) {
                            Spacer(Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FeaturePill(
                                    label = stringResource(R.string.onboarding_pill_sales),
                                    icon = Icons.Outlined.Check,
                                    dark = dark,
                                )
                                FeaturePill(
                                    label = stringResource(R.string.onboarding_pill_stock),
                                    icon = Icons.Outlined.Check,
                                    dark = dark,
                                )
                                FeaturePill(
                                    label = stringResource(R.string.onboarding_pill_balances),
                                    icon = Icons.Outlined.Check,
                                    dark = dark,
                                )
                            }
                        }

                        Spacer(Modifier.height(20.dp))
                        val isLast = page == pages.lastIndex
                        AuroraPrimaryButton(
                            text = stringResource(
                                if (isLast) R.string.onboarding_get_started else R.string.action_next,
                            ),
                            onClick = {
                                if (isLast) {
                                    onContinue()
                                } else {
                                    scope.launch { pagerState.animateScrollToPage(page + 1) }
                                }
                            },
                            dark = dark,
                            trailingIcon = Icons.AutoMirrored.Filled.ArrowForward,
                        )
                        Spacer(Modifier.height(16.dp))
                        PageDots(
                            count = pages.size,
                            active = pagerState.currentPage,
                            dark = dark,
                            modifier = Modifier.align(Alignment.CenterHorizontally),
                        )
                    }
                    Spacer(Modifier.height(28.dp))
                }
            }
        }
    }
}
