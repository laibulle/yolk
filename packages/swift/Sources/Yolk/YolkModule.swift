import Foundation

/// A native module that TypeScript code can call into using zero-copy buffers.
/// Implementations receive and return raw binary Data.
public protocol YolkModule: Sendable {
    static var moduleName: String { get }

    /// Dispatch a method call from JS. Receives a single binary buffer containing arguments.
    /// Returns a binary buffer containing the result.
    func handle(method: String, args: Data) async throws -> Data
}

/// Allows a type to provide its fields as a dictionary for YolkBin encoding,
/// bypassing JSON serialization.
public protocol YolkBinEncodable {
    func yolkBinFields() -> [String: Any?]
}

public enum YolkError: Error, Sendable {
    case moduleNotFound(String)
    case invalidArgs(String)
    case runtimeError(String)
    case jsException(String)
}
