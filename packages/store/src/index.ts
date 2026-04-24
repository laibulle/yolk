import { YolkBin } from "@yolk/sdk"

/**
 * @yolk/store — opt-in state management for Yolk apps.
 *
 * Why a separate package, not part of @yolk/sdk:
 *   State management is a choice. Users who prefer Zustand, XState, Redux, or
 *   plain variables should never be forced to pull in this code. Opt-in means
 *   zero cost for non-users — no extra surface area in @yolk/sdk's bundle.
 *
 * Why zero external dependencies:
 *   Yolk's core promise is no dep hell. Every hard dependency is a version
 *   conflict waiting to happen and dead weight you can't escape. @yolk/sdk is
 *   declared as a peer dep — it is already in the user's tree — not a new node
 *   to install. Nothing else is needed.
 *
 * Why `commit` over `dispatch`:
 *   Reducers, action types, and action creators add indirection with no payoff
 *   at this scale. `commit` is direct and self-documenting. The diff is implicit.
 *
 * Why partial merge is supported:
 *   Spreading full state to change one key is noise. Zustand proved that
 *   `set({ count: 1 })` beats `set(s => ({ ...s, count: 1 }))` for ergonomics.
 *   Both forms coexist: use the full updater when you need derived state
 *   (e.g. computing canIncrement from the new count), use partial merge for
 *   simple single-key writes.
 *
 * Why diff is shallow only:
 *   Deep diffing is expensive and the native side mirrors state as a flat
 *   dictionary. Shallow keys are all Swift/Kotlin needs to know what changed.
 *
 * Why no class, no `this`, no `new`:
 *   Closures over a `let` variable are the simplest possible encapsulation —
 *   no binding bugs, no inheritance, no instantiation ceremony.
 *
 * Why JS owns state and pushes to native (not the other way around):
 *   Business logic lives in JS. Native is a render target. Letting native pull
 *   would require synchronous bridge calls — blocking the UI thread. Push keeps
 *   native reactive with no polling.
 *
 * Using your own state management:
 *   If you manage state with Zustand or plain variables, skip createStore and
 *   call notifyNative directly — it is the only coupling point to the bridge:
 *
 *     import { notifyNative } from "@yolk/store"
 *     notifyNative(myState)        // diff defaults to {}
 *     notifyNative(myState, diff)  // pass an explicit diff if you computed one
 */

/** Per-key updater: receives the full previous state, returns a new value for key K. */
type KeyUpdater<S, K extends keyof S> = (prev: S) => S[K]

/**
 * Partial merge descriptor: each key is either a literal new value or a
 * function that receives the full previous state and returns the new value.
 */
type PartialUpdate<S> = {
  [K in keyof S]?: S[K] | KeyUpdater<S, K>
}

type CommitResult<S> = {
  /** The full new state after the commit. */
  state: S
  /** Shallow diff: only the keys whose values changed, with their new values. */
  diff: Partial<S>
}

interface Store<S> {
  /** Returns the current state snapshot without triggering a notification. */
  getState(): S
  /** Full updater: return an entirely new state object from the previous one. */
  commit(updater: (prev: S) => S): CommitResult<S>
  /** Partial merge: supply only the keys you want to change. */
  commit(partial: PartialUpdate<S>): CommitResult<S>
}

/**
 * Notifies the native observer with the current state and an optional diff.
 * The wire payload is [state, diff] encoded as YolkBin — native decodes both.
 *
 * Call this directly if you manage state yourself and do not use createStore.
 */
function notifyNative(state: unknown, diff: Record<string, unknown> = {}): void {
  try {
    const buffer = YolkBin.encode([state, diff])
    ;(globalThis as any).__yolk_native_Observer?.("onStateChanged", buffer)
  } catch (e) {
    console.error("[Yolk] Failed to notify native:", e)
  }
}

/** Returns a shallow diff of two state objects: keys whose values changed. */
function shallowDiff<S extends object>(prev: S, next: S): Partial<S> {
  const diff: Partial<S> = {}
  for (const k in next) {
    const key = k as keyof S
    if (prev[key] !== next[key]) {
      diff[key] = next[key]
    }
  }
  return diff
}

/**
 * Creates a store for state S. The store holds state in a closure, computes a
 * shallow diff on every commit, and pushes [newState, diff] to the native layer.
 */
function createStore<S extends object>(initialState: S): Store<S> {
  let current: S = initialState

  function commit(arg: ((prev: S) => S) | PartialUpdate<S>): CommitResult<S> {
    const prev = current
    let next: S

    if (typeof arg === "function") {
      next = arg(prev)
    } else {
      next = { ...prev }
      for (const key in arg) {
        const val = (arg as any)[key]
        ;(next as any)[key] = typeof val === "function" ? val(prev) : val
      }
    }

    current = next
    const diff = shallowDiff(prev, next)
    notifyNative(next, diff)
    return { state: next, diff }
  }

  return {
    getState: () => current,
    commit,
  }
}

export { createStore, notifyNative }
export type { Store, CommitResult, PartialUpdate }
