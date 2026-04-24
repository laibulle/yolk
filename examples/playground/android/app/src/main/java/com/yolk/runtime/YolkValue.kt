package com.yolk.runtime

sealed class YolkValue {
    object Null : YolkValue()
    data class Bool(val value: Boolean) : YolkValue()
    data class Int(val value: kotlin.Int) : YolkValue()
    data class Double(val value: kotlin.Double) : YolkValue()
    data class String(val value: kotlin.String) : YolkValue()
    data class Array(val values: List<YolkValue>) : YolkValue()
    data class Object(val fields: Map<kotlin.String, YolkValue>) : YolkValue()
}
