package com.yolk.playground

import com.yolk.runtime.YolkBin
import com.yolk.runtime.YolkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import java.nio.ByteBuffer

class NativeHttpModule : YolkModule {
    override val name: String = "Http"

    override suspend fun handle(method: String, args: ByteBuffer): ByteBuffer {
        val argArray = (YolkBin.decode(args) as? List<*>) ?: emptyList<Any?>()
        return when (method) {
            "get" -> {
                val urlString = argArray.getOrNull(0) as? String
                    ?: throw IllegalArgumentException("Expected string URL at arg 0")
                YolkBin.encode(fetchGet(urlString))
            }
            else -> throw IllegalArgumentException("Unknown method $method")
        }
    }

    private suspend fun fetchGet(urlString: String): String = withContext(Dispatchers.IO) {
        android.util.Log.d("YolkHttp", "Fetching: $urlString")
        try {
            val result = URL(urlString).openStream().bufferedReader().use { it.readText() }
            android.util.Log.d("YolkHttp", "Success: ${result.take(50)}...")
            result
        } catch (e: Exception) {
            android.util.Log.e("YolkHttp", "Failed: $urlString", e)
            throw e
        }
    }
}
