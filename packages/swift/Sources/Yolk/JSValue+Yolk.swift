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
            let ctx = context.jsGlobalContextRef
            let val = self.jsValueRef
            var ex: JSValueRef? = nil
            if let ptr = JSObjectGetArrayBufferBytesPtr(ctx, val, &ex) {
                let length = JSObjectGetArrayBufferByteLength(ctx, val, &ex)
                
                // TRUE ZERO-COPY: Wrap the JS pointer directly.
                // We capture `self` (the JSValue) in the deallocator closure to ensure 
                // the JS ArrayBuffer remains alive as long as the Swift Data object exists.
                let retainedValue = self
                return Data(bytesNoCopy: ptr, count: length, deallocator: .custom({ _, _ in
                    _ = retainedValue // Keep JSValue alive
                }))
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
        
        // BRIDGE TO NSData: We wrap the Swift Data in an NSData object, which is a reference type.
        // This allows us to take a stable pointer to the bytes and manage the lifetime 
        // using a C-compatible deallocator callback.
        let nsData = data as NSData
        let pointer = UnsafeMutableRawPointer(mutating: nsData.bytes)
        
        // Retain the NSData instance so it isn't freed until JS garbage collects the ArrayBuffer.
        let unmanaged = Unmanaged.passRetained(nsData)
        
        let deallocator: @convention(c) (UnsafeMutableRawPointer?, UnsafeMutableRawPointer?) -> Void = { _, ctx in
            if let ctx = ctx {
                let retained = Unmanaged<NSData>.fromOpaque(ctx)
                retained.release()
            }
        }
        
        var ex: JSValueRef? = nil
        let arrayBuffer = JSObjectMakeArrayBufferWithBytesNoCopy(
            context.jsGlobalContextRef,
            pointer,
            count,
            deallocator,
            unmanaged.toOpaque(),
            &ex
        )
        return JSValue(jsValueRef: arrayBuffer, in: context)
    }
}
