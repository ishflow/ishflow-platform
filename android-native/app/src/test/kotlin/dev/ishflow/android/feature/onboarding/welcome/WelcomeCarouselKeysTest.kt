package dev.ishflow.android.feature.onboarding.welcome

import dev.ishflow.android.R
import org.junit.Assert.assertNotEquals
import org.junit.Test

class WelcomeCarouselKeysTest {
    @Test
    fun threeWelcomeTitlesAreDistinct() {
        assertNotEquals(R.string.onboarding_welcome_title_1, R.string.onboarding_welcome_title_2)
        assertNotEquals(R.string.onboarding_welcome_title_2, R.string.onboarding_welcome_title_3)
    }

    @Test
    fun threeWelcomeBodiesAreDistinct() {
        assertNotEquals(R.string.onboarding_welcome_body_1, R.string.onboarding_welcome_body_2)
        assertNotEquals(R.string.onboarding_welcome_body_2, R.string.onboarding_welcome_body_3)
    }

    @Test
    fun skipAndGetStartedAreDistinct() {
        assertNotEquals(R.string.onboarding_skip, R.string.onboarding_get_started)
    }

    @Test
    fun nextAndGetStartedAreDistinct() {
        assertNotEquals(R.string.action_next, R.string.onboarding_get_started)
    }
}
