# Yolk Roadmap

Yolk is a high-performance framework for running shared TypeScript business logic across native platforms with zero-copy data transfer and end-to-end type safety.

## 🚀 Achieved So Far

### Core Architecture
- **Buffer-Only Bridge**: Completely eliminated JSON-based communication. All data (RPC calls, arguments, and state) crosses the JS/Native boundary as raw binary buffers.
- **YolkBin Protocol**: A custom, high-performance TLV (Type-Length-Value) binary protocol implemented in both Swift and TypeScript.
- **Zero-Copy Memory**: Leverages `JSObjectMakeArrayBufferWithBytesNoCopy` on Apple platforms to allow JS to read/write directly into native-allocated memory with no intermediate copies.
- **Multi-Platform Runtime**: Production-ready support for **iOS**, **macOS**, and a foundational port for **Android** (QuickJS).

### Reactive State Management
- **Single Source of Truth (SSOT)**: JavaScript owns the definitive application state.
- **Reactive Subscription Model**: JS pushes state updates to native observers via the binary bridge. Native ViewModels are "dumb" and reactive, eliminating manual state synchronization boilerplate.
- **State Codegen**: `yolk-codegen` automatically transforms TypeScript `State` interfaces into native `Codable` Swift structs and Kotlin Data classes.

### Developer Experience (DX)
- **End-to-End Type Safety**: Unified codegen for logic proxies, native protocols, and state models.
- **Standard API Support**: Shared TypeScript logic can use standard `fetch` and `ArrayBuffer` APIs, backed by high-performance native implementations.

---

## 🗺️ Future Roadmap

### Phase 1: Android Parity & SDK Extraction
- [ ] **Android YolkBin**: Implement the `YolkBin` binary protocol in Kotlin for the Android runtime.
- [ ] **SDK Package**: Extract the internal `YolkRuntime` and `ObserverModule` from the playground into a reusable `packages/swift` and `packages/android` library.
- [ ] **Event Loop support**: Standardized `setTimeout` / `setInterval` in the QuickJS environment.

### Phase 2: Tooling & Performance
- [ ] **State Snapshots**: Built-in binary serialization for persisting the JS state tree to native disk (instant app resume).
- [ ] **FlatBuffers Integration**: Explore optional support for Schema-based binary protocols like FlatBuffers for massive data models.
- [ ] **DevTools Integration**: Chrome DevTools Protocol support for debugging the JS logic running inside the native process.

### Phase 3: Ecosystem
- [ ] **Standard Library**: Core modules for Secure Storage, Biometrics, and high-performance Database (SQLite) access.
- [ ] **Yolk CLI**: A unified CLI tool for scaffolding projects and generating native bindings.
- [ ] **Desktop & Embedded**: Porting the binary bridge to Windows and Linux using QuickJS.
