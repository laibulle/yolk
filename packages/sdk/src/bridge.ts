import { YolkBin } from "./bin";

/**
 * Raw binary bridge injected by the Swift runtime.
 * Each registered module becomes __yolk_native_<ModuleName>(method, argsBuffer).
 * This file wraps those globals into a typed, promise-based API using YolkBin TLV.
 */

type NativeFn = (method: string, argsBuffer: ArrayBuffer) => Promise<ArrayBuffer>

function getNative(moduleName: string): NativeFn {
  const key = `__yolk_native_${moduleName}`
  const fn = (globalThis as Record<string, unknown>)[key]
  if (typeof fn !== "function") {
    throw new Error(`[Yolk] Module "${moduleName}" is not registered`);
  }
  return fn as NativeFn
}

export function callNative<T>(moduleName: string, method: string, args: any[]): Promise<T> {
  const argsBuffer = YolkBin.encode(args);
  return getNative(moduleName)(method, argsBuffer).then(resultBuffer => {
    return YolkBin.decode(resultBuffer) as T;
  });
}

/** Base class for generated module proxies. */
export abstract class NativeModule {
  protected readonly __name: string
  constructor(name: string) { this.__name = name }

  protected call<T>(method: string, ...args: any[]): Promise<T> {
    return callNative<T>(this.__name, method, args)
  }
}
