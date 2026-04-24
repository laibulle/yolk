import JavaScriptCore
import Foundation

extension JSValue {
    /// Zero-copy conversion from JS ArrayBuffer to Swift Data.
    func toData() -> Data {
        if isNull || isUndefined { return Data() }
        
        guard let context = self.context else { 
            print("[Yolk] toData: context is nil")
            return Data() 
        }
        let ctx = context.jsGlobalContextRef
        let val = self.jsValueRef
        
        // Check if it's an ArrayBuffer
        let isBuffer = context.evaluateScript("(function(v) { return v instanceof ArrayBuffer; })").call(withArguments: [self]).toBool()
        
        if isBuffer {
            var ex: JSValueRef? = nil
            if let ptr = JSObjectGetArrayBufferBytesPtr(ctx, val, &ex) {
                let length = JSObjectGetArrayBufferByteLength(ctx, val, &ex)
                return Data(bytes: ptr, count: length)
            } else {
                print("[Yolk] toData: JSObjectGetArrayBufferBytesPtr returned nil for value: \(self.toString() ?? "unknown")")
            }
        } else {
            let typeStr = context.evaluateScript("(function(v) { return Object.prototype.toString.call(v); })").call(withArguments: [self]).toString()
            print("[Yolk] toData: value is NOT an ArrayBuffer. JS type: \(typeStr ?? "unknown"), toString: \(self.toString() ?? "unknown")")
        }
        
        return Data()
    }

    /// Create a zero-copy JS ArrayBuffer from Swift Data.
    static func from(data: Data, in context: JSContext) -> JSValue {
        if data.isEmpty {
            return JSValue(jsValueRef: JSObjectMakeArrayBufferWithBytesNoCopy(context.jsGlobalContextRef, nil, 0, nil, nil, nil), in: context)
        }
        
        let count = data.count
        let pointer = UnsafeMutableRawPointer.allocate(byteCount: count, alignment: 1)
        data.copyBytes(to: pointer.assumingMemoryBound(to: UInt8.self), count: count)
        
        let deallocator: @convention(c) (UnsafeMutableRawPointer?, UnsafeMutableRawPointer?) -> Void = { bytes, _ in
            free(bytes)
        }
        
        var ex: JSValueRef? = nil
        let arrayBuffer = JSObjectMakeArrayBufferWithBytesNoCopy(
            context.jsGlobalContextRef,
            pointer,
            count,
            deallocator,
            nil,
            &ex
        )
        return JSValue(jsValueRef: arrayBuffer, in: context)
    }
}
