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
    static write(value, view, u8, state) {
      if (value === null || value === void 0) {
        view.setUint8(state.offset++, 0);
        return;
      }
      if (typeof value === "boolean") {
        view.setUint8(state.offset++, 1);
        view.setUint8(state.offset++, value ? 1 : 0);
        return;
      }
      if (typeof value === "number") {
        view.setUint8(state.offset++, 3);
        view.setFloat64(state.offset, value, true);
        state.offset += 8;
        return;
      }
      if (typeof value === "string") {
        view.setUint8(state.offset++, 4);
        const encoded = this.encoder.encode(value);
        view.setUint32(state.offset, encoded.length, true);
        state.offset += 4;
        u8.set(encoded, state.offset);
        state.offset += encoded.length;
        return;
      }
      if (value instanceof ArrayBuffer) {
        view.setUint8(state.offset++, 7);
        view.setUint32(state.offset, value.byteLength, true);
        state.offset += 4;
        u8.set(new Uint8Array(value), state.offset);
        state.offset += value.byteLength;
        return;
      }
      if (Array.isArray(value)) {
        view.setUint8(state.offset++, 5);
        view.setUint32(state.offset, value.length, true);
        state.offset += 4;
        for (const item of value)
          this.write(item, view, u8, state);
        return;
      }
      if (typeof value === "object") {
        view.setUint8(state.offset++, 6);
        const keys = Object.keys(value);
        view.setUint32(state.offset, keys.length, true);
        state.offset += 4;
        for (const key of keys) {
          this.write(key, view, u8, state);
          this.write(value[key], view, u8, state);
        }
        return;
      }
    }
    static read(view, u8, state) {
      const type = view.getUint8(state.offset++);
      switch (type) {
        case 0:
          return null;
        case 1:
          return view.getUint8(state.offset++) === 1;
        case 3: {
          const val = view.getFloat64(state.offset, true);
          state.offset += 8;
          return val;
        }
        case 4: {
          const len = view.getUint32(state.offset, true);
          state.offset += 4;
          const str = this.decoder.decode(u8.subarray(state.offset, state.offset + len));
          state.offset += len;
          return str;
        }
        case 7: {
          const len = view.getUint32(state.offset, true);
          state.offset += 4;
          const buf = u8.slice(state.offset, state.offset + len).buffer;
          state.offset += len;
          return buf;
        }
        case 5: {
          const count = view.getUint32(state.offset, true);
          state.offset += 4;
          const arr = [];
          for (let i = 0; i < count; i++)
            arr.push(this.read(view, u8, state));
          return arr;
        }
        case 6: {
          const count = view.getUint32(state.offset, true);
          state.offset += 4;
          const obj = {};
          for (let i = 0; i < count; i++) {
            const key = this.read(view, u8, state);
            const val = this.read(view, u8, state);
            obj[key] = val;
          }
          return obj;
        }
        default:
          throw new Error("YolkBin: Unknown type " + type + " at offset " + (state.offset - 1));
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

  // ../../../packages/store/src/index.ts
  function notifyNative(state, diff = {}) {
    try {
      const buffer = YolkBin.encode([state, diff]);
      globalThis.__yolk_native_Observer?.("onStateChanged", buffer);
    } catch (e) {
      console.error("[Yolk] Failed to notify native:", e);
    }
  }
  function shallowDiff(prev, next) {
    const diff = {};
    for (const k in next) {
      const key = k;
      if (prev[key] !== next[key]) {
        diff[key] = next[key];
      }
    }
    return diff;
  }
  function createStore(initialState) {
    let current = initialState;
    function commit(arg) {
      const prev = current;
      let next;
      if (typeof arg === "function") {
        next = arg(prev);
      } else {
        next = { ...prev };
        for (const key in arg) {
          const val = arg[key];
          next[key] = typeof val === "function" ? val(prev) : val;
        }
      }
      current = next;
      const diff = shallowDiff(prev, next);
      notifyNative(next, diff);
      return { state: next, diff };
    }
    return {
      getState: () => current,
      commit
    };
  }

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
  var store = createStore({
    count: 0,
    canIncrement: true,
    canDecrement: false,
    activity: ""
  });
  async function subscribe() {
    notifyNative(store.getState());
  }
  async function increment(step = 1) {
    const { state } = store.commit((prev) => {
      const count = Math.min(MAX, prev.count + step);
      return { ...prev, count, canIncrement: count < MAX, canDecrement: count > MIN };
    });
    return state;
  }
  async function decrement(step = 1) {
    const { state } = store.commit((prev) => {
      const count = Math.max(MIN, prev.count - step);
      return { ...prev, count, canIncrement: count < MAX, canDecrement: count > MIN };
    });
    return state;
  }
  async function reset() {
    const { state } = store.commit({ count: 0, activity: "", canIncrement: true, canDecrement: false });
    return state;
  }
  async function getState() {
    return store.getState();
  }
  async function fetchActivity() {
    let activity;
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      const data = await res.json();
      activity = data.quote ? `"${data.quote}" \u2014 ${data.author}` : "Stay inspired!";
    } catch {
      activity = "Failed to fetch quote";
    }
    const { state } = store.commit({ activity });
    return state;
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
  };
  Object.assign(globalThis, exports);
  for (const [key, value] of Object.entries(exports)) {
    globalThis[key] = value;
  }
})();
