package com.yolk.playground

import com.yolk.runtime.YolkBin
import com.yolk.runtime.YolkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer

class NativeObserverModule(
    private val onStateChanged: (Map<String, Any?>) -> Unit
) : YolkModule {
    override val name: String = "Observer"

    override suspend fun handle(method: String, args: ByteBuffer): ByteBuffer {
        return when (method) {
            "onStateChanged" -> {
                val argArray = (YolkBin.decode(args) as? List<*>) ?: emptyList<Any?>()
                val state = argArray.getOrNull(0) as? Map<String, Any?>
                    ?: throw IllegalArgumentException("Missing state")
                
                withContext(Dispatchers.Main) {
                    onStateChanged(state)
                }
                YolkBin.encode(null)
            }
            else -> throw IllegalArgumentException("Unknown method $method")
        }
    }
}
