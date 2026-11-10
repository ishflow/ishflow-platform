package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

@Suppress("EnumNaming")
@Serializable
enum class PushPlatform { ios, android }

@Serializable
data class PushRegisterRequest(val token: String, val platform: PushPlatform, val deviceName: String? = null)

@Serializable
data class PushUnregisterRequest(val token: String, val platform: String = "android")
