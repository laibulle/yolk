import SwiftUI
import Yolk

@MainActor
final class PlaygroundViewModel: ObservableObject {
    @Published private(set) var state: PlaygroundState?
    @Published private(set) var isLoading = false
    @Published private(set) var isReady = false

    private var runtime: YolkRuntime?

    func setup() async {
        let rt = YolkRuntime()
        rt.register(NativeHttpModule())
        
        // Register the observer to get reactive updates
        rt.register(NativeObserverModule<PlaygroundState> { newState in
            Task { @MainActor in
                self.state = newState
            }
        })

        do {
            guard let url = Bundle.main.url(forResource: "logic", withExtension: "js") else {
                print("[Playground] logic.js not found in bundle")
                return
            }
            try rt.load(url: url)
            runtime = rt
            
            // Subscribe to state changes
            _ = try await rt.call("subscribe", args: try YolkBin.encode([]))
            
            isReady = true
        } catch {
            print("[Playground] Setup failed: \(error)")
        }
    }

    func increment() async { await dispatch("increment", args: [1.0]) }
    func decrement() async { await dispatch("decrement", args: [1.0]) }
    func reset()     async { await dispatch("reset") }
    func fetchActivity() async { await dispatch("fetchActivity") }

    private func dispatch(_ fn: String, args: [Any?] = []) async {
        guard let runtime, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await runtime.call(fn, args: try YolkBin.encode(args))
        } catch {
            print("[Playground] \(fn) failed: \(error)")
        }
    }
}
