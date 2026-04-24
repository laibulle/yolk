import Foundation
import Yolk

actor NativeHttpModule: HttpModule {
    func get(url: String) async throws -> String {
        guard let url = URL(string: url) else {
            throw YolkError.invalidArgs("Invalid URL: \(url)")
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let string = String(data: data, encoding: .utf8) else {
            throw YolkError.runtimeError("Failed to decode response as UTF-8")
        }
        
        return string
    }
}
