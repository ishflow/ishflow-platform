package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

@Serializable
data class PaginatedResponse<T>(val items: List<T>, val total: Int, val page: Int, val pageSize: Int)

@Serializable
data class ErrorResponse(val error: String, val code: String? = null)
