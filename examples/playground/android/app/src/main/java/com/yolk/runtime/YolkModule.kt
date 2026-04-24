package com.yolk.runtime

import java.nio.ByteBuffer

interface YolkModule {
    val name: String
    suspend fun handle(method: String, args: ByteBuffer): ByteBuffer
}
