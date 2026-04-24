import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Wordmark } from "@/components/Logo";

const GITHUB = "https://github.com/laibulle/yolk";

const specExample = `// playground.spec.ts
export interface PlaygroundState {
  count: number
  activity: string
}

export interface PlaygroundSpec {
  increment(step: number): Promise<PlaygroundState>
  processBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer>
}`;

const tsExample = `// index.ts (Business Logic)
async function increment(step: number): Promise<State> {
  count += step
  return state() // SSOT: JS pushes new state to Native
}

async function processBuffer(buffer: ArrayBuffer) {
  const view = new Uint8Array(buffer)
  // Zero-copy byte manipulation
  view[0] = 255 - view[0]
  return buffer
}`;

const swiftExample = `// Swift Implementation
actor AppPlaygroundModule: PlaygroundModule {
  // Logic is in TS, UI is reactive to State struct
  func increment(step: Double) async throws -> PlaygroundState {
    // ... bridge handles the rest
  }

  func processBuffer(buffer: Data) async throws -> Data {
    // Shared memory pointer access
    return buffer
  }
}`;

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <ExperimentBanner />
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}

function ExperimentBanner() {
  return (
    <div className="bg-amber-400/8 border-b border-amber-400/20 px-4 py-2 text-center">
      <p className="text-xs text-amber-300/80">
        <span className="font-semibold text-amber-300">Experimental.</span> Yolk
        is an early-stage research project. APIs will break. Not
        production-ready.{" "}
        <a
          href={GITHUB}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-amber-200 transition-colors"
        >
          Follow along on GitHub →
        </a>
      </p>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
      <Wordmark size={32} />
      <nav className="flex items-center gap-6 text-sm text-zinc-400">
        <Link href="/docs" className="hover:text-zinc-100 transition-colors">
          Docs
        </Link>
        <a
          href={GITHUB}
          className="hover:text-zinc-100 transition-colors flex items-center gap-1.5"
          target="_blank"
          rel="noreferrer"
        >
          <GitHubIcon />
          laibulle/yolk
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-24 text-center">
      <div className="flex justify-center mb-10">
        <HeroLogo />
      </div>
      <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-400/70 bg-amber-400/8 border border-amber-400/15 rounded-full px-3 py-1 mb-7">
        Zero-Copy · Buffer-Only · High Performance
      </div>
      <h1 className="text-5xl font-bold tracking-tight mb-6 text-white leading-tight">
        High-performance logic.{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
          Shared at the byte level.
        </span>
      </h1>
      <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        Write your app&apos;s logic once in TypeScript. Run it natively with zero-copy
        binary buffers. No JSON overhead. No compromises.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/docs/getting-started"
          className="bg-amber-400 text-zinc-900 font-semibold px-6 py-2.5 rounded-lg hover:bg-amber-300 transition-colors"
        >
          Get started
        </Link>
        <Link
          href="/docs"
          className="text-zinc-400 hover:text-zinc-100 transition-colors px-6 py-2.5"
        >
          Read the docs →
        </Link>
      </div>
    </section>
  );
}

function HeroLogo() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hero-yolk" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="35%" stopColor="#FCD34D" />
          <stop offset="75%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="url(#hero-glow)"
        filter="url(#hero-blur)"
      />

      {/* Outer shell — the native platform layer */}
      <circle
        cx="32"
        cy="32"
        r="29.5"
        stroke="#F59E0B"
        strokeWidth="0.75"
        strokeOpacity="0.2"
      />

      {/* Bridge — dashed ring separating logic from platform */}
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="#FBBF24"
        strokeWidth="0.75"
        strokeDasharray="2.5 3"
        strokeOpacity="0.4"
      />

      {/* The yolk — the pure functional core */}
      <circle cx="32" cy="32" r="13.5" fill="url(#hero-yolk)" />

      {/* Specular highlight */}
      <ellipse
        cx="28.5"
        cy="27.5"
        rx="4"
        ry="2.5"
        fill="white"
        fillOpacity="0.2"
        transform="rotate(-20 28.5 27.5)"
      />

      {/* Nucleus — the irreducible core */}
      <circle cx="32" cy="32" r="2" fill="#92400E" fillOpacity="0.45" />
    </svg>
  );
}

function HowItWorks() {
  const steps = [
    {
      label: "1. Define your Spec & State",
      description:
        "Declare interfaces for your logic and state. Codegen creates native models automatically.",
      code: specExample,
      language: "typescript",
    },
    {
      label: "2. Write Binary Logic",
      description:
        "Logic runs in JS. Move data via YolkBin or raw ArrayBuffers with zero intermediate copies.",
      code: tsExample,
      language: "typescript",
    },
    {
      label: "3. Reactive Native UI",
      description:
        "Native ViewModels are reactive to the JS heap. UI updates automatically when state mutates.",
      code: swiftExample,
      language: "swift",
    },
  ];

  return (
    <section className="border-t border-zinc-800 py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">How it works</h2>
        <p className="text-zinc-400 mb-16 text-lg">
          One source of truth. Binary performance.
        </p>
        <div className="space-y-16">
          {steps.map((step) => (
            <div
              key={step.label}
              className="grid md:grid-cols-2 gap-8 items-start"
            >
              <div>
                <div className="text-sm font-medium text-amber-400 mb-2">
                  {step.label}
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {step.description}
                </p>
              </div>
              <CodeBlock code={step.code} language={step.language} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "Buffer-Only Bridge",
      description:
        "JSON is eliminated. All data crosses the bridge as raw binary buffers using the high-performance YolkBin protocol.",
    },
    {
      title: "Zero-Copy Memory",
      description:
        "Direct shared-memory access between JS and Native. Perfect for media-heavy or real-time data processing.",
    },
    {
      title: "Reactive SSOT",
      description:
        "JavaScript owns the application state. Native is a reactive view, receiving binary updates via a subscription model.",
    },
    {
      title: "End-to-End Typing",
      description:
        "Unified codegen for logic proxies, native protocols, and state models. Mismatches are caught at compile time.",
    },
    {
      title: "Polyglot Runtime",
      description:
        "Production-ready support for JavaScriptCore (Apple) and QuickJS (Android), with a unified binary interface.",
    },
    {
      title: "Async-First",
      description:
        "Naturally bridges Swift async/await and Kotlin coroutines to standard TypeScript Promises.",
    },
  ];

  return (
    <section className="border-t border-zinc-800 py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">
          Architected for Performance
        </h2>
        <p className="text-zinc-400 mb-16 text-lg">
          Bridging the gap between the flexibility of JS and the power of Native.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.title}>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "I have rewritten this in Rust. It is now 0.3ms faster and nobody on my team understands it. Ship it.",
      name: "Linus Thor",
      title: "Maintainer, Penguix OS",
      initials: "LT",
    },
    {
      quote:
        "I asked our 10x engineer to evaluate Yolk. He said it works on his machine. We have been unable to reach him since.",
      name: "Steve Jabs",
      title: "CEO, Fruit Computer Company",
      initials: "SJ",
    },
    {
      quote:
        "Noch ein verdammtes, bescheuertes JS-Framework. Ich werde euch alle abfackeln, ihr degeneriertes Pack!",
      name: "Adolphe H.",
      title: "Estafette, German Silicium AG",
      initials: "AH",
    },
    {
      quote:
        "Look, we tried Excel macros, okay? A total disaster. A catastrophe. They kept crashing all the time, very weak, very sad. But this framework? It’s huge. We built a beautiful wall between the business logic and the UI. The greatest technological wall in history, maybe of all time. The logic is very smart, a very high IQ, believe me. Nobody separates things better than us, it’s incredible.",
      name: "Donald Trompe",
      title: "Former President, Trump Enterprises LLC",
      initials: "DT",
    },
    {
      quote:
        "I told the board that a single drop of TypeScript could detect any bug in the entire application. They believed me. We raised four hundred million dollars. It turns out Yolk actually does what I lied about. I am writing this from a minimum-security facility where I have finally achieved the 'purity' I always talked about. 10/10 would defraud again.",
      name: "Elizabeth H.",
      title: "Former CEO, Theranos-JS",
      initials: "EH",
    },
    {
      quote:
        "I have become death, the destroyer of legacy codebases. I thought we were just building a type-safe bridge, but the chain reaction of Promises was uncontrollable. The entire production environment vanished in a flash of amber-colored light. My conscience is clear: the implementation was elegant, and the fallout was minimal.",
      name: "J. Robert Floppenheimer",
      title: "Director, Manhattan Project (Legacy)",
      initials: "JF",
    },
  ];

  return (
    <section className="border-t border-zinc-800 py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">
          Trusted by industry leaders
        </h2>
        <p className="text-zinc-400 mb-16 text-lg">
          Completely real quotes from completely real people.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {items.map((item) => (
            <figure
              key={item.name}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-4"
            >
              <blockquote className="text-sm text-zinc-300 leading-relaxed flex-1">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-xs font-semibold text-amber-400 shrink-0">
                  {item.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-200">
                    {item.name}
                  </div>
                  <div className="text-xs text-zinc-500">{item.title}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-600">
      Yolk · MIT License ·{" "}
      <a
        href={GITHUB}
        target="_blank"
        rel="noreferrer"
        className="hover:text-zinc-400 transition-colors"
      >
        laibulle/yolk
      </a>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
