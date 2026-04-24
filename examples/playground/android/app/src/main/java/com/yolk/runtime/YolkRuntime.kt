package com.yolk.runtime

import app.cash.quickjs.QuickJs
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class YolkRuntime {
    private val executor = Executors.newSingleThreadExecutor()
    private val jsDispatcher = executor.asCoroutineDispatcher()
    private val scope = CoroutineScope(jsDispatcher + SupervisorJob())
    private lateinit var quickJs: QuickJs
    private val modules = mutableMapOf<String, YolkModule>()

    init {
        executor.execute {
            quickJs = QuickJs.create()
            quickJs.evaluate(BOOTSTRAP_SCRIPT)
            
            // Install the internal dispatcher
            val internalDispatch = object : InternalDispatch {
                override fun dispatch(moduleName: String, method: String, argsJson: String): String {
                    val promiseId = "p_${System.currentTimeMillis()}_${(0..1000).random()}"
                    val args = parseYolkValue(argsJson)
                    val argList = if (args is YolkValue.Array) args.values else emptyList()
                    
                    scope.launch {
                        try {
                            val module = modules[moduleName] ?: throw Exception("Module $moduleName not found")
                            val result = module.handle(method, argList)
                            resolvePromise(promiseId, result)
                        } catch (e: Exception) {
                            rejectPromise(promiseId, e.message ?: "Unknown error")
                        }
                    }
                    return promiseId
                }
            }
            quickJs.set("__yolk_internal", InternalDispatch::class.java, internalDispatch)
        }
    }

    private fun resolvePromise(id: String, value: YolkValue) {
        executor.execute {
            quickJs.evaluate("__yolk.resolve('$id', ${value.toJson()})")
        }
    }

    private fun rejectPromise(id: String, message: String) {
        executor.execute {
            quickJs.evaluate("__yolk.reject('$id', '$message')")
        }
    }

    fun register(module: YolkModule) {
        modules[module.name] = module
        executor.execute {
            quickJs.evaluate("""
                globalThis.__yolk_native_${module.name} = (method, args) => {
                    var id = __yolk_internal.dispatch("${module.name}", method, JSON.stringify(args));
                    var p = __yolk.createPromiseWithId(id);
                    return p;
                };
            """.trimIndent())
        }
    }

    suspend fun load(script: String) = withContext(jsDispatcher) {
        quickJs.evaluate(script)
    }

    suspend fun call(function: String, vararg args: YolkValue): YolkValue = withContext(jsDispatcher) {
        val argsJson = args.joinToString(",") { it.toJson() }
        
        suspendCancellableCoroutine { continuation ->
            val promiseId = "call_${System.currentTimeMillis()}_${(0..1000).random()}"
            
            val callback = object : PromiseCallback {
                override fun resolve(json: String) {
                    executor.execute {
                        continuation.resume(parseYolkValue(json))
                    }
                }
                override fun reject(error: String) {
                    executor.execute {
                        continuation.resumeWithException(Exception(error))
                    }
                }
            }
            
            quickJs.set("__yolk_callback_$promiseId", PromiseCallback::class.java, callback)
            
            val evalScript = """
                (function() {
                    try {
                        var result = $function($argsJson);
                        if (result instanceof Promise) {
                            result.then(val => __yolk_callback_$promiseId.resolve(JSON.stringify(val)))
                                  .catch(err => __yolk_callback_$promiseId.reject(err.message || err.toString()));
                        } else {
                            __yolk_callback_$promiseId.resolve(JSON.stringify(result));
                        }
                    } catch (e) {
                        __yolk_callback_$promiseId.reject(e.message || e.toString());
                    }
                })()
            """.trimIndent()
            
            quickJs.evaluate(evalScript)
        }
    }

    private fun parseYolkValue(json: String): YolkValue {
        if (json == "null" || json == "undefined") return YolkValue.Null
        if (json == "true") return YolkValue.Bool(true)
        if (json == "false") return YolkValue.Bool(false)
        
        return try {
            if (json.startsWith("{")) {
                val obj = JSONObject(json)
                val fields = mutableMapOf<String, YolkValue>()
                obj.keys().forEach { key ->
                    fields[key] = parseYolkValue(obj.get(key).toString())
                }
                YolkValue.Object(fields)
            } else if (json.startsWith("[")) {
                val arr = JSONArray(json)
                val values = mutableListOf<YolkValue>()
                for (i in 0 until arr.length()) {
                    values.add(parseYolkValue(arr.get(i).toString()))
                }
                YolkValue.Array(values)
            } else if (json.startsWith("\"")) {
                YolkValue.String(json.trim('"'))
            } else if (json.contains(".")) {
                YolkValue.Double(json.toDouble())
            } else {
                YolkValue.Int(json.toInt())
            }
        } catch (e: Exception) {
            if (json.startsWith("\"")) YolkValue.String(json.trim('"'))
            else if (json == "true" || json == "false") YolkValue.Bool(json.toBoolean())
            else YolkValue.String(json)
        }
    }

    fun close() {
        executor.execute {
            quickJs.close()
        }
        executor.shutdown()
    }

    interface InternalDispatch {
        fun dispatch(moduleName: String, method: String, argsJson: String): String
    }

    interface PromiseCallback {
        fun resolve(json: String)
        fun reject(error: String)
    }

    companion object {
        private const val BOOTSTRAP_SCRIPT = """
            var global = globalThis;
            var __yolk = (function() {
                var pending = {};
                return {
                    createPromiseWithId: function(id) {
                        return new Promise(function(resolve, reject) {
                            pending[id] = { resolve: resolve, reject: reject };
                        });
                    },
                    resolve: function(id, value) {
                        var h = pending[id];
                        if (h) { delete pending[id]; h.resolve(value); }
                    },
                    reject: function(id, message) {
                        var h = pending[id];
                        if (h) { delete pending[id]; h.reject(new Error(message)); }
                    }
                };
            })();
        """
    }
}

private fun YolkValue.toJson(): String {
    return when (this) {
        is YolkValue.Null -> "null"
        is YolkValue.Bool -> value.toString()
        is YolkValue.Int -> value.toString()
        is YolkValue.Double -> value.toString()
        is YolkValue.String -> "\"$value\""
        is YolkValue.Array -> "[${values.joinToString(",") { it.toJson() }}]"
        is YolkValue.Object -> "{${fields.map { "\"${it.key}\":${it.value.toJson()}" }.joinToString(",")}}"
    }
}
