package com.yolk.runtime

import app.cash.quickjs.QuickJs
import kotlinx.coroutines.*
import java.nio.ByteBuffer
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
            
            val internalDispatch = object : InternalDispatch {
                override fun dispatch(moduleName: String, method: String, args: ByteArray): String {
                    val promiseId = "p_${System.currentTimeMillis()}_${(0..1000).random()}"
                    
                    scope.launch {
                        try {
                            val module = modules[moduleName] ?: throw Exception("Module $moduleName not found")
                            val argsBuffer = ByteBuffer.wrap(args)
                            val resultBuffer = module.handle(method, argsBuffer)
                            
                            val resultBytes = ByteArray(resultBuffer.remaining())
                            resultBuffer.get(resultBytes)
                            resolvePromise(promiseId, resultBytes)
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

    private fun resolvePromise(id: String, value: ByteArray) {
        executor.execute {
            // We pass the byte array to JS which sees it as a Uint8Array
            quickJs.set("__yolk_temp_resolve_val", ByteArray::class.java, value)
            quickJs.evaluate("__yolk.resolve('$id', __yolk_temp_resolve_val.buffer)")
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
                globalThis.__yolk_native_${module.name} = (method, argsBuffer) => {
                    var id = __yolk_internal.dispatch("${module.name}", method, new Uint8Array(argsBuffer));
                    return __yolk.createPromiseWithId(id);
                };
            """.trimIndent())
        }
    }

    suspend fun load(script: String) = withContext(jsDispatcher) {
        quickJs.evaluate(script)
    }

    suspend fun call(function: String, args: ByteBuffer): ByteBuffer = withContext(jsDispatcher) {
        suspendCancellableCoroutine { continuation ->
            val promiseId = "call_${System.currentTimeMillis()}_${(0..1000).random()}"
            
            val callback = object : PromiseCallback {
                override fun resolve(result: ByteArray) {
                    executor.execute {
                        continuation.resume(ByteBuffer.wrap(result))
                    }
                }
                override fun reject(error: String) {
                    executor.execute {
                        continuation.resumeWithException(Exception(error))
                    }
                }
            }
            
            quickJs.set("__yolk_callback_$promiseId", PromiseCallback::class.java, callback)
            
            val argsBytes = ByteArray(args.remaining())
            args.get(argsBytes)
            quickJs.set("__yolk_temp_args", ByteArray::class.java, argsBytes)
            
            val evalScript = """
                (function() {
                    try {
                        var result = __yolk.call("$function", __yolk_temp_args.buffer);
                        if (result instanceof Promise) {
                            result.then(val => __yolk_callback_$promiseId.resolve(new Uint8Array(val)))
                                  .catch(err => __yolk_callback_$promiseId.reject(err.message || err.toString()));
                        } else {
                            __yolk_callback_$promiseId.resolve(new Uint8Array(result));
                        }
                    } catch (e) {
                        __yolk_callback_$promiseId.reject(e.message || e.toString());
                    }
                })()
            """.trimIndent()
            
            quickJs.evaluate(evalScript)
        }
    }

    fun close() {
        executor.execute {
            quickJs.close()
        }
        executor.shutdown()
    }

    interface InternalDispatch {
        fun dispatch(moduleName: String, method: String, args: ByteArray): String
    }

    interface PromiseCallback {
        fun resolve(result: ByteArray)
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
                    },
                    call: function(fnName, argsBuffer) {
                        var fn = globalThis[fnName];
                        if (typeof fn !== "function") throw new Error("JS function '" + fnName + "' not found");
                        var args = globalThis.YolkBin.decode(argsBuffer);
                        var result = fn.apply(null, args);
                        if (result instanceof Promise) {
                            return result.then(function(val) { return globalThis.YolkBin.encode(val); });
                        }
                        return globalThis.YolkBin.encode(result);
                    }
                };
            })();
        """
    }
}
