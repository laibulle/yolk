"use strict";
(() => {
  // ../../../packages/sdk/dist/bin.js
  var _TextEncoder = typeof TextEncoder !== "undefined" ? TextEncoder : class {
    encode(s) {
      const out = new Uint8Array(s.length * 3);
      let p = 0;
      for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if (c < 128)
          out[p++] = c;
        else if (c < 2048) {
          out[p++] = c >> 6 | 192;
          out[p++] = c & 63 | 128;
        } else {
          out[p++] = c >> 12 | 224;
          out[p++] = c >> 6 & 63 | 128;
          out[p++] = c & 63 | 128;
        }
      }
      return out.subarray(0, p);
    }
  };
  var _TextDecoder = typeof TextDecoder !== "undefined" ? TextDecoder : class {
    decode(u8) {
      let s = "";
      for (let i = 0; i < u8.length; i++) {
        let c = u8[i];
        if (c < 128)
          s += String.fromCharCode(c);
        else if (c > 191 && c < 224)
          s += String.fromCharCode((c & 31) << 6 | u8[++i] & 63);
        else
          s += String.fromCharCode((c & 15) << 12 | (u8[++i] & 63) << 6 | u8[++i] & 63);
      }
      return s;
    }
  };
  var YolkBin = class {
    static encoder = new _TextEncoder();
    static decoder = new _TextDecoder();
    static encode(value) {
      const size = this.sizeOf(value);
      const buffer = new ArrayBuffer(size);
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);
      this.write(value, view, u8, { offset: 0 });
      return buffer;
    }
    static decode(buffer) {
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);
      return this.read(view, u8, { offset: 0 });
    }
    static sizeOf(value) {
      if (value === null || value === void 0)
        return 1;
      if (typeof value === "boolean")
        return 2;
      if (typeof value === "number")
        return 9;
      if (typeof value === "string") {
        const len = this.encoder.encode(value).length;
        return 5 + len;
      }
      if (value instanceof ArrayBuffer)
        return 5 + value.byteLength;
      if (Array.isArray(value)) {
        let size = 5;
        for (const item of value)
          size += this.sizeOf(item);
        return size;
      }
      if (typeof value === "object") {
        let size = 5;
        for (const key in value)
          size += this.sizeOf(key) + this.sizeOf(value[key]);
        return size;
      }
      return 1;
    }
    static write(value, view, u8, state2) {
      if (value === null || value === void 0) {
        view.setUint8(state2.offset++, 0);
        return;
      }
      if (typeof value === "boolean") {
        view.setUint8(state2.offset++, 1);
        view.setUint8(state2.offset++, value ? 1 : 0);
        return;
      }
      if (typeof value === "number") {
        view.setUint8(state2.offset++, 3);
        view.setFloat64(state2.offset, value, true);
        state2.offset += 8;
        return;
      }
      if (typeof value === "string") {
        view.setUint8(state2.offset++, 4);
        const encoded = this.encoder.encode(value);
        view.setUint32(state2.offset, encoded.length, true);
        state2.offset += 4;
        u8.set(encoded, state2.offset);
        state2.offset += encoded.length;
        return;
      }
      if (value instanceof ArrayBuffer) {
        view.setUint8(state2.offset++, 7);
        view.setUint32(state2.offset, value.byteLength, true);
        state2.offset += 4;
        u8.set(new Uint8Array(value), state2.offset);
        state2.offset += value.byteLength;
        return;
      }
      if (Array.isArray(value)) {
        view.setUint8(state2.offset++, 5);
        view.setUint32(state2.offset, value.length, true);
        state2.offset += 4;
        for (const item of value)
          this.write(item, view, u8, state2);
        return;
      }
      if (typeof value === "object") {
        view.setUint8(state2.offset++, 6);
        const keys = Object.keys(value);
        view.setUint32(state2.offset, keys.length, true);
        state2.offset += 4;
        for (const key of keys) {
          this.write(key, view, u8, state2);
          this.write(value[key], view, u8, state2);
        }
        return;
      }
    }
    static read(view, u8, state2) {
      const type = view.getUint8(state2.offset++);
      switch (type) {
        case 0:
          return null;
        case 1:
          return view.getUint8(state2.offset++) === 1;
        case 3: {
          const val = view.getFloat64(state2.offset, true);
          state2.offset += 8;
          return val;
        }
        case 4: {
          const len = view.getUint32(state2.offset, true);
          state2.offset += 4;
          const str = this.decoder.decode(u8.subarray(state2.offset, state2.offset + len));
          state2.offset += len;
          return str;
        }
        case 7: {
          const len = view.getUint32(state2.offset, true);
          state2.offset += 4;
          const buf = u8.slice(state2.offset, state2.offset + len).buffer;
          state2.offset += len;
          return buf;
        }
        case 5: {
          const count2 = view.getUint32(state2.offset, true);
          state2.offset += 4;
          const arr = [];
          for (let i = 0; i < count2; i++)
            arr.push(this.read(view, u8, state2));
          return arr;
        }
        case 6: {
          const count2 = view.getUint32(state2.offset, true);
          state2.offset += 4;
          const obj = {};
          for (let i = 0; i < count2; i++) {
            const key = this.read(view, u8, state2);
            const val = this.read(view, u8, state2);
            obj[key] = val;
          }
          return obj;
        }
        default:
          throw new Error("YolkBin: Unknown type " + type + " at offset " + (state2.offset - 1));
      }
    }
  };

  // ../../../packages/sdk/dist/bridge.js
  function getNative(moduleName) {
    const key = `__yolk_native_${moduleName}`;
    const fn = globalThis[key];
    if (typeof fn !== "function") {
      throw new Error(`[Yolk] Module "${moduleName}" is not registered`);
    }
    return fn;
  }
  function callNative(moduleName, method, args) {
    const argsBuffer = YolkBin.encode(args);
    return getNative(moduleName)(method, argsBuffer).then((resultBuffer) => {
      return YolkBin.decode(resultBuffer);
    });
  }
  var NativeModule = class {
    __name;
    constructor(name) {
      this.__name = name;
    }
    call(method, ...args) {
      return callNative(this.__name, method, args);
    }
  };

  // src/generated/Http.ts
  var Http = class extends NativeModule {
    constructor() {
      super("Http");
    }
    async get(url) {
      const resultBuffer = await this.call("get", url);
      return YolkBin.decode(resultBuffer);
    }
  };

  // src/index.ts
  var http = new Http();
  globalThis.fetch = async (url) => {
    const text = await http.get(url);
    return {
      ok: true,
      text: async () => text,
      json: async () => JSON.parse(text)
    };
  };
  var MAX = 100;
  var MIN = 0;
  var count = 0;
  var activity = "";
  function state() {
    const s = {
      count,
      canIncrement: count < MAX,
      canDecrement: count > MIN,
      activity
    };
    notify(s);
    return s;
  }
  var observerRegistered = false;
  function notify(s) {
    if (observerRegistered) {
      try {
        const argsBuffer = YolkBin.encode([s]);
        globalThis.__yolk_native_Observer?.("onStateChanged", argsBuffer);
      } catch (e) {
        console.error("[Yolk JS] Failed to notify native observer:", e);
      }
    }
  }
  async function subscribe() {
    observerRegistered = true;
    state();
  }
  async function increment(step = 1) {
    count = Math.min(MAX, count + step);
    return state();
  }
  async function decrement(step = 1) {
    count = Math.max(MIN, count - step);
    return state();
  }
  async function reset() {
    count = 0;
    activity = "";
    return state();
  }
  async function getState() {
    return state();
  }
  async function fetchActivity() {
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      const data = await res.json();
      activity = data.quote ? `"${data.quote}" \u2014 ${data.author}` : "Stay inspired!";
    } catch (e) {
      activity = "Failed to fetch quote";
    }
    return state();
  }
  async function processBuffer(buffer) {
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = 255 - view[i];
    }
    return buffer;
  }
  var exports = {
    increment,
    decrement,
    reset,
    getState,
    fetchActivity,
    subscribe,
    processBuffer,
    YolkBin
    // Expose for the __yolk.call dispatcher
  };
  Object.assign(globalThis, exports);
  for (const [key, value] of Object.entries(exports)) {
    globalThis[key] = value;
  }
})();
