# Yolk Roadmap

Yolk is a framework designed to run shared TypeScript business logic across native platforms with end-to-end type safety.

## 🚀 Achieved So Far

### Core Architecture
- **Multi-Platform Runtime**: Native support for **iOS**, **macOS**, and **Android**.
- **Polyglot JS Engines**: 
  - **JavaScriptCore** for Apple platforms.
  - **QuickJS** for Android (via `app.cash.quickjs`), optimized for low memory footprint.
- **Unified Value System**: Robust data marshalling between JS and Native (Swift/Kotlin) using a shared `YolkValue` specification.

### Developer Experience (DX)
- **End-to-End Type Safety**: A CLI-based **codegen** system that uses TypeScript interfaces (`.spec.ts`) as the single source of truth for both Native protocols and JS proxies.
- **Async-First Bridge**: Native-to-JS calls are fully asynchronous, bridging JS Promises to Swift `async/await` and Kotlin `coroutines`.

### Cross-Platform Validation
- **Yolk Playground**: A unified business logic core (`logic.js`) running across:
  - **SwiftUI** (iOS & macOS)
  - **Jetpack Compose** (Android) — *Fully configured with modern Gradle 8.10+ and Java 25 compatibility.*
  - **Next.js** (Web Playground)
- **Standard API Support**: Polyfilled `fetch` API in JS logic, allowing standard networking calls while backed by high-performance native implementations.

---

## 🗺️ Future Roadmap

### Phase 1: Stability & Library Extraction
- [ ] **Android SDK Package**: Extract `YolkRuntime` and `YolkValue` from the example into a dedicated `packages/android` library.
- [ ] **Event Loop Parity**: Implement `setTimeout`/`setInterval` and explicit microtask draining for the QuickJS runtime.
- [ ] **Kotlin Codegen**: Expand the `yolk-codegen` CLI to generate Kotlin interfaces and dispatchers for Android native modules.

### Phase 2: Performance & Data
- [ ] **Binary Bridge**: Implement zero-copy transfers for `ArrayBuffer` and `Data` to support media-heavy applications.
- [ ] **Shared State Management**: Standardized hooks for native state observation and persistence (snapshots).

### Phase 3: Tooling & Debugging
- [ ] **DevTools Support**: Enable remote debugging of the JS logic using Chrome DevTools.
- [ ] **Yolk CLI**: A unified CLI for project initialization and module management.

### Phase 4: Expansion
- [ ] **Standard Library**: Core modules for HTTP, Secure Storage, and Device APIs.
- [ ] **Desktop & Embedded**: Explore QuickJS runtimes for Windows, Linux, and resource-constrained devices.
