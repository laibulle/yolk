import SwiftUI

@main
struct CounterApplication: App {
    var body: some Scene {
        WindowGroup("Counter") {
            ContentView()
        }
        .windowResizability(.contentSize)
    }
}
