package com.yolk.playground

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.yolk.runtime.YolkBin
import com.yolk.runtime.YolkRuntime
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.io.InputStreamReader
import java.nio.ByteBuffer

data class PlaygroundState(
    val count: Int = 0,
    val canIncrement: Boolean = true,
    val canDecrement: Boolean = false,
    val activity: String = ""
)

class PlaygroundViewModel(application: Application) : AndroidViewModel(application) {
    private val _state = MutableStateFlow<PlaygroundState?>(null)
    val state: StateFlow<PlaygroundState?> = _state.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val runtime = YolkRuntime()

    init {
        runtime.register(NativeHttpModule())
        runtime.register(NativeObserverModule { map ->
            val count = (map["count"] as? Double)?.toInt() ?: 0
            val canIncrement = map["canIncrement"] as? Boolean ?: true
            val canDecrement = map["canDecrement"] as? Boolean ?: false
            val activity = map["activity"] as? String ?: ""
            _state.value = PlaygroundState(count, canIncrement, canDecrement, activity)
            _isLoading.value = false
        })
        setup()
    }

    private fun setup() {
        viewModelScope.launch {
            try {
                val inputStream = getApplication<Application>().resources.openRawResource(R.raw.logic)
                val script = InputStreamReader(inputStream).readText()
                runtime.load(script)

                // Trigger the initial state push. subscribe() is async but has no
                // awaits — its side effect (notifyNative) fires synchronously, so a
                // direct evaluate() is enough. Using call() would block on a Promise
                // chain that QuickJS may never pump automatically.
                runtime.evaluate("void subscribe()")

                // Wait for the Observer to deliver the first state snapshot.
                _state.filterNotNull().first()
                _isReady.value = true
            } catch (e: Exception) {
                android.util.Log.e("Playground", "Setup failed", e)
                e.printStackTrace()
            }
        }
    }

    fun increment() = dispatch("increment", listOf(1.0))
    fun decrement() = dispatch("decrement", listOf(1.0))
    fun reset() = dispatch("reset")
    
    fun fetchActivity() {
        if (_isLoading.value) return
        viewModelScope.launch {
            _isLoading.value = true
            try {
                runtime.fireAndForget("fetchActivity", YolkBin.encode(emptyList<Any>()))
            } catch (e: Exception) {
                e.printStackTrace()
                _isLoading.value = false
            }
            // Note: _isLoading will be cleared when the observer receives the new state
        }
    }

    fun testBinaryBridge() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val size = 1024 * 1024 // 1MB
                val buffer = ByteBuffer.allocateDirect(size)
                for (i in 0 until size) {
                    buffer.put((i % 256).toByte())
                }
                buffer.flip()

                val start = System.currentTimeMillis()
                val resultBuffer = runtime.call("processBuffer", YolkBin.encode(listOf(buffer)))
                val end = System.currentTimeMillis()

                val returnedData = YolkBin.decode(resultBuffer) as? ByteBuffer
                if (returnedData != null) {
                    val duration = end - start
                    android.util.Log.d("Playground", "Binary bridge roundtrip: $size bytes in ${duration}ms")
                    val firstByte = returnedData.get(0).toInt() and 0xFF
                    android.util.Log.d("Playground", "Verification: input[0]=0, output[0]=$firstByte (expected 255)")
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun dispatch(function: String, args: List<Any?> = emptyList()) {
        viewModelScope.launch {
            try {
                runtime.fireAndForget(function, YolkBin.encode(args))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        runtime.close()
    }
}
