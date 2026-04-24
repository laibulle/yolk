package com.yolk.runtime

import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets

/**
 * A custom binary protocol (TLV) that matches the TypeScript and Swift `YolkBin`.
 * This is the exclusive way data is transferred in Yolk's buffer-only architecture.
 */
object YolkBin {
    fun encode(value: Any?): ByteBuffer {
        val size = sizeOf(value)
        val buffer = ByteBuffer.allocateDirect(size).order(ByteOrder.LITTLE_ENDIAN)
        write(value, buffer)
        buffer.flip()
        return buffer
    }

    fun decode(buffer: ByteBuffer): Any? {
        buffer.order(ByteOrder.LITTLE_ENDIAN)
        return read(buffer)
    }

    private fun sizeOf(value: Any?): Int {
        return when (value) {
            null -> 1
            is Boolean -> 2
            is Double -> 9
            is Int -> 9 // We encode all numbers as Double (Float64) for TLV consistency
            is Float -> 9
            is String -> 5 + value.toByteArray(StandardCharsets.UTF_8).size
            is ByteBuffer -> 5 + value.remaining()
            is ByteArray -> 5 + value.size
            is List<*> -> {
                var size = 5 // Type + count
                for (item in value) size += sizeOf(item)
                size
            }
            is Map<*, *> -> {
                var size = 5 // Type + count
                for ((key, item) in value) {
                    size += sizeOf(key) + sizeOf(item)
                }
                size
            }
            else -> 1 // Fallback to null
        }
    }

    private fun write(value: Any?, buffer: ByteBuffer) {
        when (value) {
            null -> buffer.put(0x00.toByte())
            is Boolean -> {
                buffer.put(0x01.toByte())
                buffer.put((if (value) 1 else 0).toByte())
            }
            is Double -> {
                buffer.put(0x03.toByte())
                buffer.putDouble(value)
            }
            is Int -> {
                buffer.put(0x03.toByte())
                buffer.putDouble(value.toDouble())
            }
            is Float -> {
                buffer.put(0x03.toByte())
                buffer.putDouble(value.toDouble())
            }
            is String -> {
                buffer.put(0x04.toByte())
                val bytes = value.toByteArray(StandardCharsets.UTF_8)
                buffer.putInt(bytes.size)
                buffer.put(bytes)
            }
            is ByteBuffer -> {
                buffer.put(0x07.toByte())
                buffer.putInt(value.remaining())
                buffer.put(value)
            }
            is ByteArray -> {
                buffer.put(0x07.toByte())
                buffer.putInt(value.size)
                buffer.put(value)
            }
            is List<*> -> {
                buffer.put(0x05.toByte())
                buffer.putInt(value.size)
                for (item in value) write(item, buffer)
            }
            is Map<*, *> -> {
                buffer.put(0x06.toByte())
                buffer.putInt(value.size)
                // Sort keys for consistency if they are strings
                val keys = value.keys.filterIsInstance<String>().sorted()
                for (key in keys) {
                    write(key, buffer)
                    write(value[key], buffer)
                }
            }
        }
    }

    private fun read(buffer: ByteBuffer): Any? {
        val type = buffer.get().toInt()
        return when (type) {
            0x00 -> null
            0x01 -> buffer.get().toInt() == 1
            0x03 -> buffer.getDouble()
            0x04 -> {
                val len = buffer.getInt()
                val bytes = ByteArray(len)
                buffer.get(bytes)
                String(bytes, StandardCharsets.UTF_8)
            }
            0x07 -> {
                val len = buffer.getInt()
                val bytes = ByteArray(len)
                buffer.get(bytes)
                ByteBuffer.allocateDirect(len).put(bytes).flip()
            }
            0x05 -> {
                val count = buffer.getInt()
                val list = mutableListOf<Any?>()
                for (i in 0 until count) list.add(read(buffer))
                list
            }
            0x06 -> {
                val count = buffer.getInt()
                val map = mutableMapOf<String, Any?>()
                for (i in 0 until count) {
                    val key = read(buffer) as String
                    val value = read(buffer)
                    map[key] = value
                }
                map
            }
            else -> throw Exception("YolkBin: Unknown type $type")
        }
    }
}
