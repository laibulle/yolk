/**
 * Registers in-memory native module implementations on globalThis so the
 * Yolk bridge works in the browser (or Node for tests) without a native host.
 *
 * In production the SwiftUI / Kotlin layer provides these globals.
 */

type NativeHandler = (method: string, args: unknown[]) => Promise<unknown>

function registerMockModule(name: string, handler: NativeHandler): void {
  ;(globalThis as Record<string, unknown>)[`__yolk_native_${name}`] = handler
}

const MAX = 100
const MIN = 0
let count = 0

export function setupMockBridge(): void {
  registerMockModule("Playground", async (method, args) => {
    // Artificial latency so async behaviour is observable in the UI.
    await new Promise<void>((r) => setTimeout(r, 40))
    switch (method) {
      case "increment":
        count = Math.min(MAX, count + ((args[0] as number) ?? 1))
        return count
      case "decrement":
        count = Math.max(MIN, count - ((args[0] as number) ?? 1))
        return count
      case "reset":
        count = 0
        return
      case "value":
        return count
      default:
        throw new Error(`[MockBridge] Unknown method: Playground.${method}`)
    }
  })
}
