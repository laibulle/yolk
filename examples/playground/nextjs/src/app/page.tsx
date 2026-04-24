import { PlaygroundView } from "@/components/PlaygroundView"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <YolkMark />
          <span className="text-sm font-semibold text-zinc-200">Yolk</span>
          <span className="text-zinc-700">/</span>
          <span className="text-sm text-zinc-500">Next.js Playground</span>
        </div>
        <span className="text-xs font-medium text-amber-400/70 bg-amber-400/8 border border-amber-400/15 rounded-full px-3 py-1">
          example
        </span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16 space-y-16">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Test your logic in the browser
          </h1>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            This example runs the same TypeScript playground logic from{" "}
            <code className="text-zinc-300 text-sm bg-zinc-800 px-1.5 py-0.5 rounded">
              examples/playground
            </code>{" "}
            in a Next.js app. A mock bridge replaces the Swift runtime so you
            can develop and test your business logic without a native host.
          </p>
        </section>

        <section>
          <PlaygroundView />
        </section>

        <section className="space-y-8">
          <h2 className="text-xl font-semibold">How the mock bridge works</h2>
          <div className="grid sm:grid-cols-3 gap-px bg-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
            <Step
              number="1"
              title="Spec → generated proxy"
              body="playground.spec.ts defines the interface. Codegen produces Playground.ts — a typed NativeModule subclass that forwards calls through the bridge."
            />
            <Step
              number="2"
              title="Mock replaces Swift"
              body="setupMockBridge() registers __yolk_native_Playground on globalThis with an in-memory playground. The bridge layer is identical to production."
            />
            <Step
              number="3"
              title="Same code, native target"
              body="Your TypeScript logic imports Playground the same way whether it runs in a browser or inside a SwiftUI app. Swap the bridge, not the logic."
            />
          </div>

          <Architecture />
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-600">
        Yolk · MIT License
      </footer>
    </div>
  )
}

function Step({
  number,
  title,
  body,
}: {
  number: string
  title: string
  body: string
}) {
  return (
    <div className="bg-zinc-900/50 p-6 space-y-2">
      <div className="text-xs font-semibold text-amber-400">{number}</div>
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
    </div>
  )
}

function Architecture() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 font-[var(--font-geist-mono)] text-sm">
      <div className="space-y-0">
        <Row label="playground.increment(1)" sublabel="TypeScript (this browser tab)" color="amber" />
        <Arrow />
        <Row label="__yolk_native_Playground" sublabel='globalThis["__yolk_native_Playground"](method, args)' color="zinc" />
        <Arrow />
        <Row label="Mock handler" sublabel="In-memory state — replaces the Swift actor in production" color="emerald" dim />
      </div>
    </div>
  )
}

function Row({
  label,
  sublabel,
  color,
  dim,
}: {
  label: string
  sublabel: string
  color: "amber" | "zinc" | "emerald"
  dim?: boolean
}) {
  const border = {
    amber: "border-amber-500/30 bg-amber-500/5",
    zinc: "border-zinc-700 bg-zinc-800/50",
    emerald: "border-emerald-500/25 bg-emerald-500/5",
  }[color]
  const text = {
    amber: "text-amber-300",
    zinc: "text-zinc-300",
    emerald: "text-emerald-300",
  }[color]

  return (
    <div className={`rounded-lg border px-4 py-3 ${border} ${dim ? "opacity-70" : ""}`}>
      <div className={`font-medium ${text}`}>{label}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{sublabel}</div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex justify-center py-1 text-zinc-700 select-none">↓</div>
  )
}

function YolkMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="22" stroke="#FBBF24" strokeWidth="0.75" strokeDasharray="2.5 3" strokeOpacity="0.4" />
      <circle cx="32" cy="32" r="13.5" fill="url(#mark-yolk)" />
      <circle cx="32" cy="32" r="2" fill="#92400E" fillOpacity="0.45" />
      <defs>
        <radialGradient id="mark-yolk" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="40%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>
    </svg>
  )
}
