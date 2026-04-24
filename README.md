# Yolk

A framework for writing app business logic in TypeScript and running it inside a native app. The native layer (currently SwiftUI on macOS) calls into a TypeScript bundle; TypeScript calls back into native modules for platform capabilities.

```
┌─────────────────────────────┐
│  SwiftUI  (you write this)  │
├─────────────────────────────┤
│  YolkRuntime  (Swift)       │  ← loads bundle, dispatches calls
├─────────────────────────────┤
│  JavaScriptCore             │  ← dedicated JS thread
├─────────────────────────────┤
│  TypeScript bundle          │  ← your business logic
└─────────────────────────────┘
```

The boundary is typed end-to-end: a single `.spec.ts` interface is the source of truth, and codegen produces both the Swift protocol and the TypeScript proxy class from it.

---

## Packages

| Package | Description |
|---|---|
| `packages/swift` | Swift package — `YolkRuntime`, `YolkModule`, `YolkValue` |
| `packages/sdk` | `@yolk/sdk` — TypeScript base class for generated module proxies |
| `packages/codegen` | `yolk-codegen` CLI — generates Swift + TS from a spec file |

---

## How it works

### 1. Write a spec

A spec file is a TypeScript interface whose name ends in `Spec`. Every method must return `Promise<T>`.

```typescript
// storage.spec.ts
export interface StorageSpec {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}
```

### 2. Run codegen

```sh
yolk-codegen storage.spec.ts ./macos/Generated ./logic/src/generated
```

This produces:

- `macos/Generated/StorageModule.swift` — a Swift protocol with a generated `handle` dispatcher
- `logic/src/generated/Storage.ts` — a typed TypeScript proxy class

### 3. Implement the Swift side

```swift
actor AppStorageModule: StorageModule {
    private var store: [String: String] = [:]

    func get(key: String) async throws -> String? {
        store[key]
    }

    func set(key: String, value: String) async throws {
        store[key] = value
    }

    func delete(key: String) async throws {
        store.removeValue(forKey: key)
    }
}
```

Using a Swift `actor` is not required by the protocol, but it is the natural fit: the actor's executor enforces serial access without any manual locking.

### 4. Use it from TypeScript

```typescript
import { Storage } from "./generated/Storage"

const storage = new Storage()

export async function saveUser(user: User): Promise<void> {
  await storage.set("currentUser", JSON.stringify(user))
}

export async function loadUser(): Promise<User | null> {
  const raw = await storage.get("currentUser")
  return raw ? JSON.parse(raw) : null
}
```

### 5. Wire it up in Swift

```swift
let runtime = YolkRuntime()
runtime.register(AppStorageModule())
try runtime.load(url: Bundle.main.url(forResource: "logic", withExtension: "js")!)

// Call a top-level exported function
let user = try await runtime.call("loadUser")
```

---

## Threading model

- **JS thread** — a dedicated serial `DispatchQueue`. All JSC calls happen here.
- **Swift actors** — each module runs on its own actor executor. Calls from JS are dispatched there without blocking the JS thread.
- **Main thread** — untouched by the runtime. Your SwiftUI code owns it.

When a Swift module call completes, the result is marshalled back to the JS thread and the microtask queue is drained explicitly. JSC does not have a built-in event loop, so Yolk handles this.

---

## Value types

`YolkValue` is the only type that crosses the bridge:

```swift
public indirect enum YolkValue: Sendable {
    case null
    case bool(Bool)
    case int(Int)
    case double(Double)
    case string(String)
    case array([YolkValue])
    case object([String: YolkValue])
}
```

It is a value type (enum), Codable, and Sendable. No shared mutable references cross the boundary.

---

## Project setup

**Prerequisites:** Node 18+, pnpm, Xcode 15+, Swift 5.9+

```sh
pnpm install
pnpm -r build          # build sdk + codegen

# Swift
cd packages/swift && swift build
```

---

## Deployment

The documentation site (`apps/docs`) can be deployed to Vercel using the provided `Makefile`. We use a "local build" strategy to ensure that your business logic is built in a controlled environment and then pushed to Vercel as a pre-built artifact.

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed (`npm i -g vercel`)
- A Vercel Personal Access Token (`VERCEL_TOKEN`)

### Commands

1.  **Pull project settings:**
    ```bash
    export VERCEL_TOKEN=your_token_here
    make pull
    ```
2.  **Build and Deploy:**
    ```bash
    make deploy-docs
    ```

> [!CAUTION]
> Never commit `.vercel/` or `.env.local` files to your repository. They are ignored by `.gitignore` but take care when manually staging changes.

---

## Roadmap

- [ ] iOS target
- [ ] `setTimeout` / `setInterval` support in the JS event loop
- [ ] Binary data (`ArrayBuffer`) zero-copy transfer
- [ ] Android (V8 / QuickJS)
- [ ] Linux / Windows (QuickJS)
