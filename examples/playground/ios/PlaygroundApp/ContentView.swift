import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PlaygroundViewModel()

    var body: some View {
        VStack(spacing: 30) {
            if !viewModel.isReady {
                ProgressView("Initializing...")
            } else if let state = viewModel.state {
                Text("Yolk Playground")
                    .font(.largeTitle)
                    .bold()

                VStack(spacing: 10) {
                    Text("Count: \(Int(state.count))")
                        .font(.system(size: 48, weight: .bold, design: .monospaced))

                    HStack(spacing: 20) {
                        Button(action: { Task { await viewModel.decrement() } }) {
                            Image(systemName: "minus.circle.fill")
                                .font(.system(size: 44))
                        }
                        .disabled(!state.canDecrement || viewModel.isLoading)

                        Button("Reset") { Task { await viewModel.reset() } }
                            .buttonStyle(.bordered)
                            .disabled(viewModel.isLoading)

                        Button(action: { Task { await viewModel.increment() } }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 44))
                        }
                        .disabled(!state.canIncrement || viewModel.isLoading)
                    }
                }

                Divider()

                VStack(spacing: 15) {
                    if !state.activity.isEmpty {
                        Text(state.activity)
                            .font(.headline)
                            .multilineTextAlignment(.center)
                            .padding()
                            .background(Color.secondary.opacity(0.1))
                            .cornerRadius(10)
                    }

                    Button(action: { Task { await viewModel.fetchActivity() } }) {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView()
                                    .padding(.trailing, 5)
                            }
                            Text("Random Quote")
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .disabled(viewModel.isLoading)
                }
                .padding(.horizontal)

                Divider()

                VStack(spacing: 10) {
                    Text("Performance")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Button(action: { Task { await viewModel.testBinaryBridge() } }) {
                        Text("Test 1MB Zero-Copy Bridge")
                            .font(.system(size: 14, weight: .semibold))
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.zinc800)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                    .disabled(viewModel.isLoading)
                    
                    Text("See console for timing and pointer verification")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)
            }
        }
        .padding()
        .onAppear {
            Task {
                await viewModel.setup()
            }
        }
    }
}
