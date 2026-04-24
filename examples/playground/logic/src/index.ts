import { Http } from "./generated/Http"
import { YolkBin } from "@yolk/sdk"
import { createStore, notifyNative } from "@yolk/store"

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

type State = {
  count: number
  canIncrement: boolean
  canDecrement: boolean
  activity: string
}

const store = createStore<State>({
  count: 0,
  canIncrement: true,
  canDecrement: false,
  activity: "",
})

async function subscribe(): Promise<void> {
  notifyNative(store.getState())
}

async function increment(step = 1): Promise<State> {
  const { state } = store.commit(prev => {
    const count = Math.min(MAX, prev.count + step)
    return { ...prev, count, canIncrement: count < MAX, canDecrement: count > MIN }
  })
  return state
}

async function decrement(step = 1): Promise<State> {
  const { state } = store.commit(prev => {
    const count = Math.max(MIN, prev.count - step)
    return { ...prev, count, canIncrement: count < MAX, canDecrement: count > MIN }
  })
  return state
}

async function reset(): Promise<State> {
  const { state } = store.commit({ count: 0, activity: "", canIncrement: true, canDecrement: false })
  return state
}

async function getState(): Promise<State> {
  return store.getState()
}

async function fetchActivity(): Promise<State> {
  console.log("[JS] fetchActivity started");
  let activity: string
  try {
    const res = await fetch("https://dummyjson.com/quotes/random")
    console.log("[JS] fetch completed, status: " + res.ok);
    const data = await res.json()
    console.log("[JS] data received: " + JSON.stringify(data).substring(0, 100) + "...");
    activity = data.quote ? `"${data.quote}" — ${data.author}` : "Stay inspired!"
  } catch (err) {
    console.error("[JS] fetchActivity failed: " + err.message);
    activity = "Failed to fetch quote"
  }
  console.log("[JS] committing activity: " + activity);
  const { state } = store.commit({ activity })
  console.log("[JS] commit finished, current count: " + state.count);
  return state
}

async function processBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    view[i] = 255 - view[i]!
  }
  return buffer
}

const exports = {
  increment,
  decrement,
  reset,
  getState,
  fetchActivity,
  subscribe,
  processBuffer,
  YolkBin,
}

Object.assign(globalThis, exports)

for (const [key, value] of Object.entries(exports)) {
  (globalThis as any)[key] = value
}
