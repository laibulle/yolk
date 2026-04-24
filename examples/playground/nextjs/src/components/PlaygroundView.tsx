"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Playground } from "@/generated/Playground"
import { setupMockBridge } from "@/lib/mock-bridge"
import { YolkBin } from "@/lib/yolk"

setupMockBridge()
const playground = new Playground()

type LogEntry = { id: number; dir: "call" | "ret" | "err"; text: string }
let seq = 0

export function PlaygroundView() {
  const [state, setState] = useState({
    count: 0,
    canIncrement: true,
    canDecrement: false,
    activity: ""
  })
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const initialized = useRef(false)

  const push = (dir: LogEntry["dir"], text: string) =>
    setLog((prev) => [{ id: seq++, dir, text }, ...prev].slice(0, 8))

  const exec = useCallback(
    async (label: string, op: () => Promise<any>) => {
      if (busy) return
      setBusy(true)
      push("call", label)
      try {
        const result = await op()
        push("ret", typeof result === "object" ? "State" : String(result))
      } catch (e) {
        push("err", String(e))
      } finally {
        setBusy(false)
      }
    },
    [busy],
  )

  const testBuffer = async () => {
    if (busy) return
    setBusy(true)
    push("call", "playground.processBuffer(1MB)")
    try {
      const size = 1024 * 1024
      const buffer = new ArrayBuffer(size)
      const start = performance.now()
      const result = await playground.processBuffer(buffer)
      const end = performance.now()
      const duration = (end - start).toFixed(2)
      push("ret", `Buffer roundtrip: ${duration}ms`)
    } catch (e) {
      push("err", String(e))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Register Native Observer Mock
    ;(globalThis as any)["__yolk_native_Observer"] = (method: string, argsBuffer: ArrayBuffer) => {
        if (method === "onStateChanged") {
            const args = YolkBin.decode(argsBuffer) as any[]
            setState(args[0])
        }
        return Promise.resolve(YolkBin.encode(null))
    }

    playground.subscribe()
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Playground */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 flex flex-col items-center justify-center gap-6">
        <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
           Yolk Web Playground
        </div>

        <div
          className="text-8xl font-bold tabular-nums text-white transition-all"
          aria-live="polite"
        >
          {state.count}
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => exec("decrement(1)", () => playground.decrement(1))}
              disabled={busy || !state.canDecrement}
              className="flex-1 py-3 text-lg font-semibold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <button
              onClick={() => exec("increment(1)", () => playground.increment(1))}
              disabled={busy || !state.canIncrement}
              className="flex-1 py-3 text-lg font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
          
          <button
            onClick={() => exec("reset()", () => playground.reset())}
            disabled={busy}
            className="w-full py-2 text-sm text-zinc-500 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>

          <div className="pt-4 border-t border-zinc-800">
             <button
               onClick={() => exec("fetchActivity()", () => playground.fetchActivity())}
               disabled={busy}
               className="w-full py-2.5 text-sm font-medium bg-zinc-800 text-zinc-100 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors"
             >
               {state.activity || "Fetch Random Activity"}
             </button>
          </div>

          <button
            onClick={testBuffer}
            disabled={busy}
            className="w-full py-2 text-[10px] text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
          >
            Run 1MB Zero-Copy Test
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Binary Mock Bridge Active
        </div>
      </div>

      {/* Bridge log */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-4">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Binary Bridge Activity
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-zinc-600 italic mt-2">
            Interact with the playground to see bridge calls…
          </p>
        ) : (
          <ul className="space-y-1.5 font-[var(--font-geist-mono)] text-sm">
            {log.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.dir === "call"
                    ? "text-zinc-400"
                    : entry.dir === "ret"
                      ? "text-amber-400"
                      : "text-red-400"
                }
              >
                <span className="select-none mr-1 opacity-50">
                  {entry.dir === "call" ? "→" : entry.dir === "ret" ? "←" : "✗"}
                </span>
                {entry.text}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4 border-t border-zinc-800 text-xs text-zinc-600 leading-relaxed">
          In production, these calls are encoded via <span className="text-amber-400/80 font-mono">YolkBin</span> and cross the bridge as raw buffers. Here they hit a binary mock registered on <code className="text-zinc-500">globalThis</code>.
        </div>
      </div>
    </div>
  )
}
