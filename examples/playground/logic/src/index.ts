import { Http } from "./generated/Http"
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
  let activity: string
  try {
    const res = await fetch("https://dummyjson.com/quotes/random")
    const data = await res.json()
    activity = data.quote ? `"${data.quote}" — ${data.author}` : "Stay inspired!"
  } catch {
    activity = "Failed to fetch quote"
  }
  const { state } = store.commit({ activity })
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
}

Object.assign(globalThis, exports)

for (const [key, value] of Object.entries(exports)) {
  (globalThis as any)[key] = value
}
