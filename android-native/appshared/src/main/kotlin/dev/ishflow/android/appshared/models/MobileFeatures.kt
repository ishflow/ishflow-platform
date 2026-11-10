package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

@Serializable
data class MobileFeatures(
    val sales: Boolean = true,
    val prices: Boolean = true,
    val inventory: Boolean = true,
    val purchases: Boolean? = null,
    val payments: Boolean? = null,
)
