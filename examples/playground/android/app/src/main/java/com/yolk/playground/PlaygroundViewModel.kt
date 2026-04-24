package com.yolk.playground

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.yolk.runtime.YolkRuntime
import com.yolk.runtime.YolkValue
import com.yolk.playground.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.InputStreamReader

class PlaygroundViewModel(application: Application) : AndroidViewModel(application) {
    private val _count = MutableStateFlow(0)
    val count: StateFlow<Int> = _count.asStateFlow()

    private val _canIncrement = MutableStateFlow(true)
    val canIncrement: StateFlow<Boolean> = _canIncrement.asStateFlow()

    private val _canDecrement = MutableStateFlow(false)
    val canDecrement: StateFlow<Boolean> = _canDecrement.asStateFlow()

    private val _activity = MutableStateFlow("")
    val activity: StateFlow<String> = _activity.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val runtime = YolkRuntime()

    init {
        runtime.register(NativeHttpModule())
        setup()
    }

    private fun setup() {
        viewModelScope.launch {
            try {
                val inputStream = getApplication<Application>().resources.openRawResource(R.raw.logic)
                val script = InputStreamReader(inputStream).readText()
                runtime.load(script)
                applyState(runtime.call("getState"))
                _isReady.value = true
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun increment() = dispatch("increment")
    fun decrement() = dispatch("decrement")
    fun reset() = dispatch("reset")
    fun fetchActivity() = dispatch("fetchActivity")

    private fun dispatch(function: String) {
        if (_isLoading.value) return
        viewModelScope.launch {
            _isLoading.value = true
            try {
                applyState(runtime.call(function))
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun applyState(value: YolkValue) {
        if (value is YolkValue.Object) {
            val fields = value.fields
            (fields["count"] as? YolkValue.Int)?.let { _count.value = it.value }
            (fields["count"] as? YolkValue.Double)?.let { _count.value = it.value.toInt() }
            (fields["canIncrement"] as? YolkValue.Bool)?.let { _canIncrement.value = it.value }
            (fields["canDecrement"] as? YolkValue.Bool)?.let { _canDecrement.value = it.value }
            (fields["activity"] as? YolkValue.String)?.let { _activity.value = it.value }
        }
    }

    override fun onCleared() {
        super.onCleared()
        runtime.close()
    }
}
