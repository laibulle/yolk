// A lightweight custom binary protocol for Yolk: Type-Length-Value (TLV)
// This ensures that all data across the bridge is handled at the byte level.

// Fallback for environments without TextEncoder/TextDecoder (like JSC)
const _TextEncoder = typeof TextEncoder !== "undefined" ? TextEncoder : class {
  encode(s: string) {
    const out = new Uint8Array(s.length * 3);
    let p = 0;
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c < 128) out[p++] = c;
      else if (c < 2048) {
        out[p++] = (c >> 6) | 192;
        out[p++] = (c & 63) | 128;
      } else {
        out[p++] = (c >> 12) | 224;
        out[p++] = ((c >> 6) & 63) | 128;
        out[p++] = (c & 63) | 128;
      }
    }
    return out.subarray(0, p);
  }
};

const _TextDecoder = typeof TextDecoder !== "undefined" ? TextDecoder : class {
  decode(u8: Uint8Array) {
    let s = "";
    for (let i = 0; i < u8.length; i++) {
      let c = u8[i]!;
      if (c < 128) s += String.fromCharCode(c);
      else if (c > 191 && c < 224) s += String.fromCharCode(((c & 31) << 6) | (u8[++i]! & 63));
      else s += String.fromCharCode(((c & 15) << 12) | ((u8[++i]! & 63) << 6) | (u8[++i]! & 63));
    }
    return s;
  }
};

export class YolkBin {
  private static encoder = new _TextEncoder();
  private static decoder = new _TextDecoder();

  static encode(value: any): ArrayBuffer {
    const size = this.sizeOf(value);
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    this.write(value, view, u8, { offset: 0 });
    return buffer;
  }

  static decode(buffer: ArrayBuffer): any {
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    return this.read(view, u8, { offset: 0 });
  }

  private static sizeOf(value: any): number {
    if (value === null || value === undefined) return 1;
    if (typeof value === "boolean") return 2;
    if (typeof value === "number") return 9;
    if (typeof value === "string") {
      const len = this.encoder.encode(value).length;
      return 5 + len;
    }
    if (value instanceof ArrayBuffer) return 5 + value.byteLength;
    if (Array.isArray(value)) {
      let size = 5;
      for (const item of value) size += this.sizeOf(item);
      return size;
    }
    if (typeof value === "object") {
      let size = 5;
      for (const key in value) size += this.sizeOf(key) + this.sizeOf(value[key]);
      return size;
    }
    return 1;
  }

  private static write(value: any, view: DataView, u8: Uint8Array, state: { offset: number }) {
    if (value === null || value === undefined) {
      view.setUint8(state.offset++, 0x00);
      return;
    }
    if (typeof value === "boolean") {
      view.setUint8(state.offset++, 0x01);
      view.setUint8(state.offset++, value ? 1 : 0);
      return;
    }
    if (typeof value === "number") {
      view.setUint8(state.offset++, 0x03);
      view.setFloat64(state.offset, value, true);
      state.offset += 8;
      return;
    }
    if (typeof value === "string") {
      view.setUint8(state.offset++, 0x04);
      const encoded = this.encoder.encode(value);
      view.setUint32(state.offset, encoded.length, true);
      state.offset += 4;
      u8.set(encoded, state.offset);
      state.offset += encoded.length;
      return;
    }
    if (value instanceof ArrayBuffer) {
      view.setUint8(state.offset++, 0x07);
      view.setUint32(state.offset, value.byteLength, true);
      state.offset += 4;
      u8.set(new Uint8Array(value), state.offset);
      state.offset += value.byteLength;
      return;
    }
    if (Array.isArray(value)) {
      view.setUint8(state.offset++, 0x05);
      view.setUint32(state.offset, value.length, true);
      state.offset += 4;
      for (const item of value) this.write(item, view, u8, state);
      return;
    }
    if (typeof value === "object") {
      view.setUint8(state.offset++, 0x06);
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

  private static read(view: DataView, u8: Uint8Array, state: { offset: number }): any {
    const type = view.getUint8(state.offset++);
    switch (type) {
      case 0x00: return null;
      case 0x01: return view.getUint8(state.offset++) === 1;
      case 0x03: {
        const val = view.getFloat64(state.offset, true);
        state.offset += 8;
        return val;
      }
      case 0x04: {
        const len = view.getUint32(state.offset, true);
        state.offset += 4;
        const str = this.decoder.decode(u8.subarray(state.offset, state.offset + len));
        state.offset += len;
        return str;
      }
      case 0x07: {
        const len = view.getUint32(state.offset, true);
        state.offset += 4;
        const buf = u8.slice(state.offset, state.offset + len).buffer;
        state.offset += len;
        return buf;
      }
      case 0x05: {
        const count = view.getUint32(state.offset, true);
        state.offset += 4;
        const arr = [];
        for (let i = 0; i < count; i++) arr.push(this.read(view, u8, state));
        return arr;
      }
      case 0x06: {
        const count = view.getUint32(state.offset, true);
        state.offset += 4;
        const obj: any = {};
        for (let i = 0; i < count; i++) {
          const key = this.read(view, u8, state);
          const val = this.read(view, u8, state);
          obj[key] = val;
        }
        return obj;
      }
      default: throw new Error("YolkBin: Unknown type " + type + " at offset " + (state.offset - 1));
    }
  }
}
