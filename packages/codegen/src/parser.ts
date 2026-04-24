import * as ts from "typescript"

export interface MethodSpec {
  name: string
  params: Array<{ name: string; type: string }>
  returnType: string  // inner type of Promise<T>
}

export interface PropertySpec {
  name: string
  type: string
}

export interface StateSpec {
  name: string
  properties: PropertySpec[]
}

export interface ModuleSpec {
  name: string        // interface name without "Spec" suffix
  methods: MethodSpec[]
  state?: StateSpec   // optional state interface
}

/**
 * Parse a .spec.ts file and extract all interfaces whose name ends with "Spec".
 * Each method must return Promise<T>.
 */
export function parseSpecFile(filePath: string): ModuleSpec[] {
  const program = ts.createProgram([filePath], { strict: true })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(filePath)
  if (!source) throw new Error(`Cannot open spec file: ${filePath}`)

  const modules: ModuleSpec[] = []

  ts.forEachChild(source, (node: ts.Node) => {
    if (!ts.isInterfaceDeclaration(node)) return
    
    if (node.name.text.endsWith("Spec")) {
      const moduleName = node.name.text.replace(/Spec$/, "")
      const methods: MethodSpec[] = []

      for (const member of node.members) {
        if (!ts.isMethodSignature(member)) continue
        const name = (member.name as ts.Identifier).text

        const params = member.parameters.map((p: ts.ParameterDeclaration) => ({
          name: (p.name as ts.Identifier).text,
          type: typeToString(checker, p.type),
        }))

        const rawReturn = typeToString(checker, member.type)
        const returnType = unwrapPromise(rawReturn)

        methods.push({ name, params, returnType })
      }
      modules.push({ name: moduleName, methods })
    }
  })

  // Second pass: Find state interfaces and link them
  ts.forEachChild(source, (node: ts.Node) => {
    if (!ts.isInterfaceDeclaration(node)) return
    if (!node.name.text.endsWith("State")) return

    const moduleName = node.name.text.replace(/State$/, "")
    const mod = modules.find(m => m.name === moduleName)
    if (!mod) return

    const properties: PropertySpec[] = []
    for (const member of node.members) {
      if (!ts.isPropertySignature(member)) continue
      properties.push({
        name: (member.name as ts.Identifier).text,
        type: typeToString(checker, member.type)
      })
    }
    mod.state = { name: node.name.text, properties }
  })

  return modules
}

function typeToString(checker: ts.TypeChecker, node: ts.TypeNode | undefined): string {
  if (!node) return "void"
  return checker.typeToString(checker.getTypeFromTypeNode(node))
}

function unwrapPromise(t: string): string {
  const m = t.match(/^Promise<(.+)>$/)
  return m ? (m[1] ?? "void") : t
}
