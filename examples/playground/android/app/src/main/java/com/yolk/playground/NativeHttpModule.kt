package com.yolk.playground

import com.yolk.runtime.YolkModule
import com.yolk.runtime.YolkValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

class NativeHttpModule : YolkModule {
    override val name: String = "Http"

    override suspend fun handle(method: String, args: List<YolkValue>): YolkValue {
        return when (method) {
            "get" -> {
                val urlString = (args.getOrNull(0) as? YolkValue.String)?.value 
                    ?: throw IllegalArgumentException("Expected string URL at arg 0")
                YolkValue.String(fetchGet(urlString))
            }
            else -> throw IllegalArgumentException("Unknown method $method")
        }
    }

    private suspend fun fetchGet(urlString: String): String = withContext(Dispatchers.IO) {
        URL(urlString).openStream().bufferedReader().use { it.readText() }
    }
}
