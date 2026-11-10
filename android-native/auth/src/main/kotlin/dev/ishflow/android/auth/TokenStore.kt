package dev.ishflow.android.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenStore(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun getToken(): String? = prefs.getString(KEY_JWT, null)

    fun hasToken(): Boolean = !prefs.getString(KEY_JWT, null).isNullOrEmpty()

    fun setToken(token: String) {
        prefs.edit().putString(KEY_JWT, token).apply()
    }

    fun clearToken() {
        prefs.edit().remove(KEY_JWT).apply()
    }

    private companion object {
        const val FILE_NAME = "ishflow_auth"
        const val KEY_JWT = "jwt"
    }
}
