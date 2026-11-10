package dev.ishflow.android.appshared.api

import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import java.io.IOException

fun Throwable.toApiException(): ApiException = when (this) {
    is ApiException -> this

    is HttpException -> ApiException.Http(
        status = code(),
        body = response()?.errorBody()?.string(),
    )

    is SerializationException -> ApiException.Decoding(this)

    is IOException -> ApiException.Network(this)

    else -> ApiException.Network(this)
}
