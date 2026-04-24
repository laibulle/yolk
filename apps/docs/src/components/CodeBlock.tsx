import { codeToHtml } from "shiki"

type Props = {
  code: string
  language: string
}

export async function CodeBlock({ code, language }: Props) {
  const html = await codeToHtml(code, {
    lang: language,
    theme: "github-dark",
  })

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#09090b] text-[13px]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">{language}</span>
      </div>
      <div 
        className="p-4 overflow-x-auto shiki-block"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
