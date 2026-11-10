package dev.ishflow.android.appshared.api

sealed class ApiException(message: String) : RuntimeException(message) {
    abstract val httpCode: Int?

    data class Network(val throwable: Throwable) : ApiException("network: ${throwable.message}") {
        override val httpCode: Int? = null
    }
    data class Http(val status: Int, val body: String?) : ApiException("http $status") {
        override val httpCode: Int? = status
    }
    data class Decoding(val throwable: Throwable) : ApiException("decode: ${throwable.message}") {
        override val httpCode: Int? = -1
    }
    data object MissingToken : ApiException("missing token") {
        override val httpCode: Int? = 401
    }
}
