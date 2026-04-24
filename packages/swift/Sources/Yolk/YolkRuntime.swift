import Foundation
import JavaScriptCore

/// The main entry point. Create one per app, load your compiled JS bundle, register modules.
///
/// All JS execution happens on an internal serial queue (the "JS thread").
/// Swift→JS calls are dispatched there; JS→Swift calls return Promises and
/// resume on that same queue after the Swift actor finishes — so JS never blocks.
public final class YolkRuntime: @unchecked Sendable {

    // MARK: - Internal state (only touched on jsQueue)

    private let jsQueue = DispatchQueue(label: "dev.yolk.js", qos: .userInitiated)
    private var context: JSContext!
    private var modules: [String: any YolkModule] = [:]

    // Promise helpers injected once at startup
    private static let bootstrapScript = """
    var __yolk = (function() {
        var pending = {};
        var nextId = 0;
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
            createPromise: function() {
                var id = nextId++;
                var p = new Promise(function(resolve, reject) {
                    pending[id] = { resolve: resolve, reject: reject };
                });
                return { id: id, promise: p };
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

    public init() {
        jsQueue.sync {
            self.context = JSContext()
            self.context.exceptionHandler = { _, exception in
                if let msg = exception?.toString() {
                    print("[Yolk] Uncaught JS exception: \(msg)")
                }
            }
            self.context.evaluateScript(Self.bootstrapScript)
        }
    }

    // MARK: - Registration

    /// Register a native module before loading the bundle.
    public func register(_ module: some YolkModule) {
        jsQueue.sync {
            let name = type(of: module).moduleName
            modules[name] = module
            installModule(module, name: name)
        }
    }

    // MARK: - Bundle loading

    /// Load a compiled JS bundle synchronously.
    public func load(url: URL) throws {
        let source = try String(contentsOf: url, encoding: .utf8)
        try load(script: source, sourceURL: url)
    }

    public func load(script: String, sourceURL: URL? = nil) throws {
        try jsQueue.sync {
            context.evaluateScript(script, withSourceURL: sourceURL)
            if let ex = context.exception {
                throw YolkError.jsException(ex.toString() ?? "unknown")
            }
        }
    }

    /// Evaluate a script synchronously on the JS thread and return the result as a buffer-encoded value.
    /// Internal use or debugging only.
    public func evaluate(_ script: String) -> Data {
        jsQueue.sync {
            context.evaluateScript(script).toData()
        }
    }

    /// Call a JS function and return immediately without waiting for any result or Promise.
    /// Useful for event-like dispatches where the result is handled via an Observer.
    public func fireAndForget(_ function: String, args: Data) {
        jsQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Use zero-copy JSValue.from instead of hex encoding for better performance
            let jsArgsBuffer = JSValue.from(data: args, in: self.context)
            if let yolk = self.context.objectForKeyedSubscript("__yolk"),
               let callFn = yolk.objectForKeyedSubscript("call"),
               !callFn.isUndefined {
                callFn.call(withArguments: [function, jsArgsBuffer])
            }
            
            self.drainMicrotasks()
        }
    }

    // MARK: - Calling JS from Swift

    /// Call a top-level JS function and await its result (which must be an ArrayBuffer).
    public func call(_ function: String, args: Data) async throws -> Data {
        print("[Yolk] Swift -> JS call: \(function) (\(args.count) bytes)")
        return try await withCheckedThrowingContinuation { continuation in
            jsQueue.async { [self] in
                guard let yolk = context.objectForKeyedSubscript("__yolk"),
                      let callFn = yolk.objectForKeyedSubscript("call"),
                      !callFn.isUndefined else {
                    continuation.resume(throwing: YolkError.runtimeError("__yolk.call not found"))
                    return
                }

                // Wrap Swift Data into a no-copy JS ArrayBuffer
                let jsArgs = [JSValue(object: function, in: context)!, JSValue.from(data: args, in: context)]
                guard let result = callFn.call(withArguments: jsArgs) else {
                    continuation.resume(returning: Data())
                    return
                }

                // If the result is a Promise, wait for it to settle.
                if result.isObject, let thenFn = result.objectForKeyedSubscript("then"), !thenFn.isUndefined {
                    self.awaitPromise(result, continuation: continuation)
                } else {
                    continuation.resume(returning: result.toData())
                }
            }
        }
    }

    // MARK: - Private helpers

    /// Attach .then/.catch handlers to a JS Promise and resume the continuation.
    private func awaitPromise(_ promise: JSValue, continuation: CheckedContinuation<Data, Error>) {
        // Must be called on jsQueue.
        let onFulfilled: @convention(block) (JSValue) -> Void = { [weak self] value in
            guard let self else { return }
            let data = value.toData()
            self.drainMicrotasks()
            continuation.resume(returning: data)
        }
        let onRejected: @convention(block) (JSValue) -> Void = { [weak self] reason in
            guard let self else { return }
            let message = reason.objectForKeyedSubscript("message")?.toString()
                ?? reason.toString()
                ?? "Promise rejected"
            self.drainMicrotasks()
            continuation.resume(throwing: YolkError.jsException(message))
        }

        let result = promise.invokeMethod("then", withArguments: [
            JSValue(object: onFulfilled, in: context)!,
            JSValue(object: onRejected, in: context)!
        ])
        if result != nil { drainMicrotasks() }
    }

    /// Tell JSC to run all queued microtasks (Promise continuations).
    /// JSC won't do this automatically outside a browser run loop.
    private func drainMicrotasks() {
        // Evaluating an empty script is enough to flush the microtask checkpoint in JSC.
        context.evaluateScript("")
    }

    /// Install a module so JS can reach it via the generated bridge stubs.
    private func installModule(_ module: some YolkModule, name: String) {
        let moduleRef = module  // capture

        let dispatch: @convention(block) (String, JSValue) -> JSValue = { [weak self] method, argsValue in
            guard let self else { return JSValue(undefinedIn: self?.context) }

            print("[Yolk] Native call: \(name).\(method)")
            let args = argsValue.toData()
            if args.isEmpty {
                print("[Yolk] Warning: args buffer is empty for \(name).\(method)")
            }

            // Create a JS Promise immediately and return it.
            let handle = self.context.evaluateScript("__yolk.createPromise()")!
            let promiseId = Int(handle.objectForKeyedSubscript("id").toInt32())
            let promise    = handle.objectForKeyedSubscript("promise")!

            // Dispatch the async work; resolve/reject back on jsQueue.
            Task {
                do {
                    let result = try await moduleRef.handle(method: method, args: args)
                    self.jsQueue.async {
                        let jsResult = JSValue.from(data: result, in: self.context)
                        self.context.evaluateScript("__yolk.resolve")!
                            .call(withArguments: [JSValue(int32: Int32(promiseId), in: self.context)!, jsResult])
                        self.drainMicrotasks()
                    }
                } catch {
                    let message = error.localizedDescription
                    self.jsQueue.async {
                        self.context.evaluateScript("__yolk.reject")!
                            .call(withArguments: [
                                JSValue(int32: Int32(promiseId), in: self.context)!,
                                JSValue(object: message, in: self.context)!
                            ])
                        self.drainMicrotasks()
                    }
                }
            }

            return promise
        }

        // Expose as __yolk_native_<ModuleName>(method, args)
        context.setObject(dispatch, forKeyedSubscript: "__yolk_native_\(name)" as NSString)
    }
}
