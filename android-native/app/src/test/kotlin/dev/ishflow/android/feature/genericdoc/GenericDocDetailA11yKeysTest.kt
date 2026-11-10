package dev.ishflow.android.feature.genericdoc

import dev.ishflow.android.appshared.R as SharedR
import org.junit.Assert.assertNotEquals
import org.junit.Test

class GenericDocDetailA11yKeysTest {
    @Test
    fun backLabelKeyExistsAndDiffersFromRetry() {
        assertNotEquals(SharedR.string.action_back, SharedR.string.action_retry)
    }
}
