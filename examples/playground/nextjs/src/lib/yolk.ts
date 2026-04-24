/**
 * Inline copy of @yolk/sdk — lets this example run without a build step.
 * In a real app you would import from "@yolk/sdk" instead.
 */

type NativeFn = (method: string, args: unknown[]) => Promise<unknown>

function getNative(moduleName: string): NativeFn {
  const key = `__yolk_native_${moduleName}`
  const fn = (globalThis as Record<string, unknown>)[key]
  if (typeof fn !== "function") {
    throw new Error(`[Yolk] Module "${moduleName}" is not registered`)
  }
  return fn as NativeFn
}

export function callNative<T>(
  moduleName: string,
  method: string,
  args: unknown[],
): Promise<T> {
  return getNative(moduleName)(method, args) as Promise<T>
}

export abstract class NativeModule {
  protected readonly __name: string

  constructor(name: string) {
    this.__name = name
  }

  protected call<T>(method: string, ...args: unknown[]): Promise<T> {
    return callNative<T>(this.__name, method, args)
  }
}
