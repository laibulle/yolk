/**
 * Registers in-memory native module implementations on globalThis so the
 * Yolk bridge works in the browser (or Node for tests) without a native host.
 *
 * In production the SwiftUI / Kotlin layer provides these globals.
 */

import { YolkBin } from "./yolk"

type NativeHandler = (method: string, argsBuffer: ArrayBuffer) => Promise<ArrayBuffer>

function registerMockModule(name: string, handler: NativeHandler): void {
  ;(globalThis as Record<string, unknown>)[`__yolk_native_${name}`] = handler
}

const MAX = 100
const MIN = 0
let count = 0
let activity = ""

export function setupMockBridge(): void {
  // Mock Playground Module
  registerMockModule("Playground", async (method, argsBuffer) => {
    const args = (YolkBin.decode(argsBuffer) as any[]) || []
    
    // Artificial latency so async behaviour is observable in the UI.
    await new Promise<void>((r) => setTimeout(r, 40))
    
    let result: any = null

    switch (method) {
      case "increment":
        count = Math.min(MAX, count + (args[0] ?? 1))
        result = getStateObj()
        break
      case "decrement":
        count = Math.max(MIN, count - (args[0] ?? 1))
        result = getStateObj()
        break
      case "reset":
        count = 0
        activity = ""
        result = getStateObj()
        break
      case "getState":
        result = getStateObj()
        break
      case "fetchActivity":
        // Simulate fetch
        activity = "Mock Activity from Browser"
        result = getStateObj()
        break
      case "processBuffer":
        // Zero-copy simulation
        const view = new Uint8Array(args[0])
        for (let i = 0; i < view.length; i++) {
          view[i] = 255 - view[i]
        }
        result = args[0]
        break
      case "subscribe":
        // In the mock bridge, we don't have a background thread pushing updates,
        // but we can simulate the initial push.
        setTimeout(() => notifyNative("onStateChanged", [getStateObj()]), 0)
        result = null
        break
      default:
        throw new Error(`[MockBridge] Unknown method: Playground.${method}`)
    }

    return YolkBin.encode(result)
  })

  // Mock Http Module
  registerMockModule("Http", async (method, argsBuffer) => {
    const args = (YolkBin.decode(argsBuffer) as any[]) || []
    if (method === "get") {
        // In browser we could just use real fetch, but we mock it for the bridge test
        return YolkBin.encode(`{"quote": "Mocked Quote", "author": "Browser"}`)
    }
    throw new Error(`[MockBridge] Unknown method: Http.${method}`)
  })
}

function getStateObj() {
    return {
        count,
        canIncrement: count < MAX,
        canDecrement: count > MIN,
        activity
    }
}

function notifyNative(method: string, args: any[]) {
    const handler = (globalThis as any)["__yolk_native_Observer"]
    if (handler) {
        handler(method, YolkBin.encode(args))
    }
}
