package dev.ishflow.android.feature.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import dev.ishflow.android.feature.onboarding.demo.DemoOfferScreen
import dev.ishflow.android.feature.onboarding.welcome.WelcomeCarousel
import dev.ishflow.android.feature.onboarding.workspace.WorkspaceSetupScreen

private const val ROUTE_WELCOME = "welcome"
private const val ROUTE_WORKSPACE = "workspace"
private const val ROUTE_DEMO = "demo/{tenantId}"
private const val ARG_TENANT_ID = "tenantId"

@Composable
fun OnboardingCoordinator(onComplete: () -> Unit) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = ROUTE_WELCOME) {
        composable(ROUTE_WELCOME) {
            WelcomeCarousel(
                onSkip = { navController.navigate(ROUTE_WORKSPACE) },
                onContinue = { navController.navigate(ROUTE_WORKSPACE) },
            )
        }

        composable(ROUTE_WORKSPACE) {
            WorkspaceSetupScreen(
                onCompleted = { tenantId ->
                    navController.navigate("demo/$tenantId")
                },
            )
        }

        composable(
            route = ROUTE_DEMO,
            arguments = listOf(navArgument(ARG_TENANT_ID) { type = NavType.StringType }),
        ) { backStackEntry ->
            val tenantId = backStackEntry.arguments?.getString(ARG_TENANT_ID).orEmpty()
            DemoOfferScreen(
                tenantId = tenantId,
                onCompleted = onComplete,
            )
        }
    }
}
