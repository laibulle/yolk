import { Http } from "./generated/Http"
import { YolkBin } from "@yolk/sdk"

// Minimal fetch polyfill using our Native Http module
const http = new Http();
(globalThis as any).fetch = async (url: string) => {
  const text = await http.get(url);
  return {
    ok: true,
    text: async () => text,
    json: async () => JSON.parse(text),
  };
};

const MAX = 100
const MIN = 0

let count = 0
let activity = ""

type State = {
  count: number
  canIncrement: boolean
  canDecrement: boolean
  activity: string
}

function state(): State {
  const s = {
    count,
    canIncrement: count < MAX,
    canDecrement: count > MIN,
    activity,
  }
  notify(s)
  return s
}

// Subscription logic
let observerRegistered = false
function notify(s: State) {
    if (observerRegistered) {
        try {
            // We use a convention: a module named "Observer" with an "onStateChanged" method
            // In the buffer-only architecture, we MUST encode the arguments as an ArrayBuffer.
            const argsBuffer = YolkBin.encode([s]);
            (globalThis as any).__yolk_native_Observer?.("onStateChanged", argsBuffer)
        } catch (e) {
            console.error("[Yolk JS] Failed to notify native observer:", e);
        }
    }
}

async function subscribe(): Promise<void> {
    observerRegistered = true
    state() // Push initial state
}

async function increment(step = 1): Promise<State> {
  count = Math.min(MAX, count + step)
  return state()
}

async function decrement(step = 1): Promise<State> {
  count = Math.max(MIN, count - step)
  return state()
}

async function reset(): Promise<State> {
  count = 0
  activity = ""
  return state()
}

async function getState(): Promise<State> {
  return state()
}

async function fetchActivity(): Promise<State> {
  try {
    const res = await fetch("https://dummyjson.com/quotes/random")
    const data = await res.json()
    activity = data.quote ? `"${data.quote}" — ${data.author}` : "Stay inspired!"
  } catch (e) {
    activity = "Failed to fetch quote"
  }
  return state()
}

async function processBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
        view[i] = 255 - view[i]; // Invert bytes
    }
    return buffer;
}

// Expose to the Yolk runtime as top-level globals
const exports = {
  increment,
  decrement,
  reset,
  getState,
  fetchActivity,
  subscribe,
  processBuffer,
  YolkBin, // Expose for the __yolk.call dispatcher
};

Object.assign(globalThis, exports);

// Backup for environments where Object.assign might have issues with globalThis
for (const [key, value] of Object.entries(exports)) {
    (globalThis as any)[key] = value;
}
