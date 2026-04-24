import Link from "next/link";
import { Wordmark } from "@/components/Logo";

const GITHUB = "https://github.com/laibulle/yolk";

const nav = [
  {
    group: "Introduction",
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/getting-started", label: "Getting started" },
    ],
  },
  {
    group: "Concepts",
    links: [
      { href: "/docs/concepts/spec-files", label: "Spec files" },
      { href: "/docs/concepts/codegen", label: "Codegen" },
      { href: "/docs/concepts/bridge", label: "The bridge" },
      { href: "/docs/concepts/threading", label: "Threading" },
    ],
  },
  {
    group: "Platforms",
    links: [
      { href: "/docs/platforms/macos", label: "macOS" },
      { href: "/docs/platforms/ios", label: "iOS" },
      { href: "/docs/platforms/android", label: "Android" },
      { href: "/docs/platforms/web", label: "Web (Mock Bridge)" },
    ],
  },
  {
    group: "API",
    links: [
      { href: "/docs/api/runtime", label: "YolkRuntime" },
      { href: "/docs/api/module", label: "YolkModule" },
      { href: "/docs/api/bin", label: "YolkBin" },
      { href: "/docs/api/codegen-cli", label: "yolk-codegen CLI" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10 bg-zinc-950/80 backdrop-blur">
        <Link href="/">
          <Wordmark size={28} />
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/docs" className="text-zinc-100">
            Docs
          </Link>
          <a
            href={GITHUB}
            className="hover:text-zinc-100 transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            laibulle/yolk
          </a>
        </nav>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        <aside className="w-60 shrink-0 border-r border-zinc-800 py-8 px-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          {nav.map((section) => (
            <div key={section.group} className="mb-6">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">
                {section.group}
              </div>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 rounded transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </aside>

        <main className="flex-1 min-w-0 py-12 px-10 prose prose-invert prose-zinc max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
