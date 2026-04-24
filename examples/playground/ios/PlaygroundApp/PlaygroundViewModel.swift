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
                self.isLoading = false
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

    func increment() { dispatch("increment", args: [1.0]) }
    func decrement() { dispatch("decrement", args: [1.0]) }
    func reset()     { dispatch("reset") }
    func fetchActivity() { 
        isLoading = true
        dispatch("fetchActivity") 
    }

    func testBinaryBridge() async {
        guard let runtime else { return }
        isLoading = true
        defer { isLoading = false }
        
        let size = 1024 * 1024 // 1MB
        var data = Data(count: size)
        data.withUnsafeMutableBytes { (ptr: UnsafeMutableRawBufferPointer) in
            for i in 0..<size {
                ptr[i] = UInt8(i % 256)
            }
            print("[Playground] Native buffer pointer: \(ptr.baseAddress!)")
        }
        
        let start = CFAbsoluteTimeGetCurrent()
        do {
            let resultBuffer = try await runtime.call("processBuffer", args: try YolkBin.encode([data]))
            let end = CFAbsoluteTimeGetCurrent()
            
            if let returnedData = try YolkBin.decode(resultBuffer) as? Data {
                let duration = (end - start) * 1000
                print("[Playground] Binary bridge roundtrip: \(size) bytes in \(String(format: "%.2f", duration))ms")
                
                returnedData.withUnsafeBytes { ptr in
                    print("[Playground] Returned buffer pointer: \(ptr.baseAddress!)")
                }
                
                // Verify first few bytes
                let firstByte = returnedData[0]
                print("[Playground] Verification: input[0]=0, output[0]=\(firstByte) (expected 255)")
            }
        } catch {
            print("[Playground] Binary test failed: \(error)")
        }
    }

    private func dispatch(_ fn: String, args: [Any?] = []) {
        guard let runtime else { return }
        do {
            runtime.fireAndForget(fn, args: try YolkBin.encode(args))
        } catch {
            print("[Playground] \(fn) failed: \(error)")
        }
    }
}
