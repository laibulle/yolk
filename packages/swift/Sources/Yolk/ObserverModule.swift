import Foundation

/// A standard module for receiving state updates from JavaScript using binary buffers.
public protocol StateObserverModule: YolkModule {
    associatedtype State: Codable & Sendable
    var onStateChanged: @Sendable (State) -> Void { get }
}

public extension StateObserverModule {
    static var moduleName: String { "Observer" }

    func handle(method: String, args: Data) async throws -> Data {
        switch method {
        case "onStateChanged":
            print("[Yolk] Observer.onStateChanged received buffer (\(args.count) bytes)")
            // args is a buffer containing [PlaygroundState]
            do {
                let decoded = try YolkBin.decode(args)
                print("[Yolk] YolkBin.decode raw result: \(String(describing: decoded))")
                
                guard let argArray = decoded as? [Any?],
                      let stateVal = argArray.first else { 
                    print("[Yolk] Error: argArray cast or first element failed. Raw: \(String(describing: decoded))")
                    throw NSError(domain: "Yolk", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing state"])
                }
                
                print("[Yolk] Bridging stateVal (\(type(of: stateVal))) to State struct...")
                let state = try YolkBin.decode(try YolkBin.encode(stateVal), as: State.self)
                print("[Yolk] State successfully decoded: \(state)")
                
                let callback = onStateChanged
                DispatchQueue.main.async {
                    callback(state)
                }
                return try YolkBin.encode(nil as Any?)
            } catch {
                print("[Yolk] ObserverModule ERROR: \(error)")
                throw error
            }
        default:
            throw NSError(domain: "Yolk", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unknown method \(method) on Observer"])
        }
    }
}

/// A concrete implementation of the observer module.
public actor NativeObserverModule<S: Codable & Sendable>: StateObserverModule {
    public typealias State = S
    public let onStateChanged: @Sendable (S) -> Void

    public init(onStateChanged: @escaping @Sendable (S) -> Void) {
        self.onStateChanged = onStateChanged
    }
}
