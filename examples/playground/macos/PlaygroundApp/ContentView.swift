import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PlaygroundViewModel()

    var body: some View {
        VStack(spacing: 20) {
            if !viewModel.isReady {
                VStack {
                    ProgressView()
                    Text("Initializing Yolk...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let state = viewModel.state {
                Text("Yolk macOS Playground")
                    .font(.title)
                    .bold()

                GroupBox("Counter") {
                    VStack(spacing: 15) {
                        Text("\(Int(state.count))")
                            .font(.system(size: 64, weight: .bold, design: .monospaced))

                        HStack(spacing: 20) {
                            Button(action: { Task { await viewModel.decrement() } }) {
                                Image(systemName: "minus")
                                    .frame(width: 30, height: 30)
                            }
                            .disabled(!state.canDecrement || viewModel.isLoading)
                            .buttonStyle(.bordered)

                            Button("Reset") { Task { await viewModel.reset() } }
                                .disabled(viewModel.isLoading)
                                .buttonStyle(.bordered)

                            Button(action: { Task { await viewModel.increment() } }) {
                                Image(systemName: "plus")
                                    .frame(width: 30, height: 30)
                            }
                            .disabled(!state.canIncrement || viewModel.isLoading)
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                }

                GroupBox("Quotes (Fetch API)") {
                    VStack(spacing: 15) {
                        if !state.activity.isEmpty {
                            Text(state.activity)
                                .font(.headline)
                                .multilineTextAlignment(.center)
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Color.primary.opacity(0.05))
                                .cornerRadius(8)
                        } else {
                            Text("No quote fetched yet.")
                                .foregroundColor(.secondary)
                                .italic()
                                .padding()
                        }

                        Button(action: { Task { await viewModel.fetchActivity() } }) {
                            HStack {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .controlSize(.small)
                                        .padding(.trailing, 5)
                                }
                                Text("Fetch Random Quote")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(viewModel.isLoading)
                    }
                    .padding()
                }

                GroupBox("Performance (Zero-Copy)") {
                    VStack {
                        Button(action: { Task { await viewModel.testBinaryBridge() } }) {
                            Text("Process 1MB Buffer (No-Copy)")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .disabled(viewModel.isLoading)
                        
                        Text("Check console for timing results")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                }
            } else {
                VStack {
                    ProgressView()
                    Text("Synchronizing State...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .padding()
        .frame(minWidth: 400, minHeight: 450)
        .onAppear {
            Task {
                await viewModel.setup()
            }
        }
    }
}
