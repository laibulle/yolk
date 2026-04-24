package com.yolk.runtime

interface YolkModule {
    val name: String
    suspend fun handle(method: String, args: List<YolkValue>): YolkValue
}
