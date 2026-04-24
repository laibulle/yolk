type Props = {
  code: string
  language: string
}

export function CodeBlock({ code, language }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 text-sm">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">{language}</span>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="font-[var(--font-geist-mono)] text-zinc-300 leading-relaxed whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  )
}
