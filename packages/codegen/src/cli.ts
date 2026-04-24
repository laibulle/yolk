#!/usr/bin/env node
import * as fs from "fs"
import * as path from "path"
import { parseSpecFile } from "./parser"
import { generateSwift } from "./swift-gen"
import { generateTS } from "./ts-gen"

function main() {
  const args = process.argv.slice(2)
  if (args.length < 3) {
    console.error("Usage: yolk-codegen <spec.ts> <swift-out-dir> <ts-out-dir>")
    process.exit(1)
  }

  const [specFile, swiftOut, tsOut] = args as [string, string, string]
  const absSpec = path.resolve(specFile)

  const modules = parseSpecFile(absSpec)
  if (modules.length === 0) {
    console.warn(`No *Spec interfaces found in ${specFile}`)
    process.exit(0)
  }

  fs.mkdirSync(swiftOut, { recursive: true })
  fs.mkdirSync(tsOut, { recursive: true })

  for (const mod of modules) {
    const swiftCode = generateSwift(mod)
    const tsCode = generateTS(mod)

    const swiftPath = path.join(swiftOut, `${mod.name}Module.swift`)
    const tsPath = path.join(tsOut, `${mod.name}.ts`)

    fs.writeFileSync(swiftPath, swiftCode)
    fs.writeFileSync(tsPath, tsCode)

    console.log(`  ✓ ${mod.name} → ${swiftPath}`)
    console.log(`  ✓ ${mod.name} → ${tsPath}`)
  }
}

main()
