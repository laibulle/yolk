"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Playground } from "@/generated/Playground"
import { setupMockBridge } from "@/lib/mock-bridge"

setupMockBridge()
const playground = new Playground()

type LogEntry = { id: number; dir: "call" | "ret" | "err"; text: string }
let seq = 0

export function PlaygroundView() {
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const initialized = useRef(false)

  const push = (dir: LogEntry["dir"], text: string) =>
    setLog((prev) => [{ id: seq++, dir, text }, ...prev].slice(0, 8))

  const exec = useCallback(
    async (label: string, op: () => Promise<number | void>) => {
      if (busy) return
      setBusy(true)
      push("call", label)
      try {
        const result = await op()
        if (typeof result === "number") {
          push("ret", String(result))
          setCount(result)
        } else {
          push("ret", "void")
          const v = await playground.value()
          setCount(v)
        }
      } catch (e) {
        push("err", String(e))
      } finally {
        setBusy(false)
      }
    },
    [busy],
  )

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    playground.value().then(setCount)
  }, [])

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Playground */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 flex flex-col items-center justify-center gap-8">
        <div
          className="text-8xl font-bold tabular-nums text-white transition-all"
          aria-live="polite"
        >
          {count}
        </div>

        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() =>
                exec("playground.decrement(5)", () => playground.decrement(5))
              }
              disabled={busy || count <= 0}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −5
            </button>
            <button
              onClick={() =>
                exec("playground.decrement(1)", () => playground.decrement(1))
              }
              disabled={busy || count <= 0}
              className="flex-1 py-3 text-lg font-semibold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <button
              onClick={() =>
                exec("playground.increment(1)", () => playground.increment(1))
              }
              disabled={busy || count >= 100}
              className="flex-1 py-3 text-lg font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
            <button
              onClick={() =>
                exec("playground.increment(5)", () => playground.increment(5))
              }
              disabled={busy || count >= 100}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +5
            </button>
          </div>
          <button
            onClick={() => exec("playground.reset()", () => playground.reset())}
            disabled={busy || count === 0}
            className="w-full py-2 text-sm text-zinc-500 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Mock bridge active
        </div>
      </div>

      {/* Bridge log */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-4">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Bridge Activity
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
          In production, these calls cross the bridge to a Swift actor on its
          own thread. Here they hit an in-memory mock registered on{" "}
          <code className="text-zinc-500">globalThis</code>.
        </div>
      </div>
    </div>
  )
}
