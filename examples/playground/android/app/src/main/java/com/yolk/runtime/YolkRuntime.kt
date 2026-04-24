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
            
            // Explicitly expose a logger and polyfill console in JS
            val logger = object : YolkLogger {
                override fun log(msg: String) { android.util.Log.d("YolkJS", msg) }
                override fun error(msg: String) { android.util.Log.e("YolkJS", msg) }
            }
            quickJs.set("__yolk_logger", YolkLogger::class.java, logger)
            quickJs.evaluate("""
                globalThis.console = {
                    log: function() { 
                        var args = Array.prototype.slice.call(arguments);
                        __yolk_logger.log(args.map(function(a) { 
                            return (typeof a === 'object') ? JSON.stringify(a) : String(a); 
                        }).join(' '));
                    },
                    error: function() {
                        var args = Array.prototype.slice.call(arguments);
                        __yolk_logger.error(args.map(function(a) { 
                            return (typeof a === 'object') ? JSON.stringify(a) : String(a); 
                        }).join(' '));
                    }
                };
                console.log("Yolk Console Initialized");
            """.trimIndent())
            
            quickJs.evaluate(BOOTSTRAP_SCRIPT)

            val internalDispatch = object : InternalDispatch {
                override fun dispatch(moduleName: String, method: String, argsHex: String): String {
                    val promiseId = "p_${System.currentTimeMillis()}_${(0..1000).random()}"
                    val argsBytes = hexToBytes(argsHex)
                    scope.launch {
                        try {
                            val module = modules[moduleName] ?: throw Exception("Module $moduleName not found")
                            val resultBuffer = module.handle(method, ByteBuffer.wrap(argsBytes))
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
        val hex = bytesToHex(value)
        executor.execute {
            quickJs.evaluate("__yolk.resolve('$id', __yolk.fromHex('$hex'))")
            drainMicrotasks()
        }
    }

    private fun rejectPromise(id: String, message: String) {
        executor.execute {
            quickJs.evaluate("__yolk.reject('$id', '${message.replace("'", "\\'")}')")
            drainMicrotasks()
        }
    }

    private fun drainMicrotasks() {
        quickJs.evaluate("")
    }

    fun register(module: YolkModule) {
        modules[module.name] = module
        executor.execute {
            quickJs.evaluate("""
                globalThis.__yolk_native_${module.name} = function(method, argsBuffer) {
                    var hex = __yolk.toHex(argsBuffer);
                    var id = __yolk_internal.dispatch("${module.name}", method, hex);
                    return __yolk.createPromiseWithId(id);
                };
            """.trimIndent())
        }
    }

    suspend fun load(script: String) = withContext(jsDispatcher) {
        try {
            quickJs.evaluate(script)
            drainMicrotasks()
        } catch (e: Exception) {
            android.util.Log.e("YolkRuntime", "JS Exception in load", e)
            throw e
        }
    }

    suspend fun evaluate(script: String) = withContext(jsDispatcher) {
        try {
            quickJs.evaluate(script)
            drainMicrotasks()
        } catch (e: Exception) {
            android.util.Log.e("YolkRuntime", "JS Exception in evaluate", e)
            throw e
        }
    }

    suspend fun fireAndForget(function: String, args: ByteBuffer) = withContext(jsDispatcher) {
        val hexArgs = bytesToHex(args.let { buf ->
            val b = ByteArray(buf.remaining()); buf.get(b); b
        })
        try {
            quickJs.evaluate("""
                (function() {
                    var result = __yolk.call('$function', __yolk.fromHex('$hexArgs'));
                    if (result instanceof Promise) {
                        result.catch(function(err) {
                            console.error("Async error in fireAndForget ($function): " + (err.message || err.toString()));
                        });
                    }
                })()
            """.trimIndent())
            drainMicrotasks()
        } catch (e: Exception) {
            android.util.Log.e("YolkRuntime", "JS Exception in fireAndForget ($function)", e)
        }
    }

    suspend fun call(function: String, args: ByteBuffer): ByteBuffer = withContext(jsDispatcher) {
        suspendCancellableCoroutine { continuation ->
            val promiseId = "call_${System.currentTimeMillis()}_${(0..1000).random()}"
            val hexArgs = bytesToHex(args.let { buf ->
                val b = ByteArray(buf.remaining()); buf.get(b); b
            })

            val callback = object : PromiseCallback {
                override fun resolve(result: String) {
                    executor.execute { continuation.resume(ByteBuffer.wrap(hexToBytes(result))) }
                }
                override fun reject(error: String) {
                    executor.execute { continuation.resumeWithException(Exception(error)) }
                }
            }
            quickJs.set("__yolk_callback_$promiseId", PromiseCallback::class.java, callback)

            try {
                quickJs.evaluate("""
                    (function() {
                        try {
                            var result = __yolk.call("$function", __yolk.fromHex("$hexArgs"));
                            if (result instanceof Promise) {
                                result
                                    .then(function(val) { __yolk_callback_$promiseId.resolve(__yolk.toHex(val)); })
                                    .catch(function(err) { __yolk_callback_$promiseId.reject(err.message || err.toString()); });
                            } else {
                                __yolk_callback_$promiseId.resolve(__yolk.toHex(result));
                            }
                        } catch(e) {
                            __yolk_callback_$promiseId.reject(e.message || e.toString());
                        }
                    })()
                """.trimIndent())
                drainMicrotasks()
            } catch (e: Exception) {
                android.util.Log.e("YolkRuntime", "JS Exception in call ($function)", e)
                continuation.resumeWithException(e)
            }
        }
    }

    fun close() {
        executor.execute { quickJs.close() }
        executor.shutdown()
    }

    interface InternalDispatch {
        fun dispatch(moduleName: String, method: String, argsHex: String): String
    }

    interface PromiseCallback {
        fun resolve(result: String)
        fun reject(error: String)
    }

    interface YolkLogger {
        fun log(msg: String)
        fun error(msg: String)
    }

    companion object {
        private fun bytesToHex(bytes: ByteArray): String {
            val sb = StringBuilder(bytes.size * 2)
            for (b in bytes) {
                val v = b.toInt() and 0xFF
                if (v < 16) sb.append('0')
                sb.append(v.toString(16))
            }
            return sb.toString()
        }

        private fun hexToBytes(hex: String): ByteArray {
            val out = ByteArray(hex.length / 2)
            for (i in out.indices) {
                val h = Character.digit(hex[i * 2], 16)
                val l = Character.digit(hex[i * 2 + 1], 16)
                out[i] = ((h shl 4) or l).toByte()
            }
            return out
        }

        private const val BOOTSTRAP_SCRIPT = """
            var global = globalThis;
            var __yolk = (function() {
                var pending = {};
                return {
                    fromHex: function(hex) {
                        var len = hex.length >> 1;
                        var u8 = new Uint8Array(len);
                        for (var i = 0; i < len; i++) {
                            var high = hex.charCodeAt(i * 2);
                            var low = hex.charCodeAt(i * 2 + 1);
                            u8[i] = ((high < 58 ? high - 48 : (high < 91 ? high - 55 : high - 87)) << 4) |
                                     (low < 58 ? low - 48 : (low < 91 ? low - 55 : low - 87));
                        }
                        return u8.buffer;
                    },
                    toHex: function(buf) {
                        var u8 = new Uint8Array(buf);
                        var hex = new Array(u8.length);
                        for (var i = 0; i < u8.length; i++) {
                            var b = u8[i];
                            hex[i] = (b < 16 ? '0' : '') + b.toString(16);
                        }
                        return hex.join('');
                    },
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
