import Foundation

/// A custom binary protocol (TLV) that matches the TypeScript `YolkBin`.
/// This is the exclusive way data is transferred in Yolk's buffer-only architecture.
public struct YolkBin {
    public static func encode(_ value: Any?) throws -> Data {
        var data = Data()
        try write(value, to: &data)
        return data
    }
    
    public static func decode<T: Decodable>(_ data: Data, as type: T.Type) throws -> T {
        let anyValue = try decode(data)
        if let val = anyValue as? T { return val }
        
        let jsonData = try JSONSerialization.data(withJSONObject: anyValue as Any, options: .fragmentsAllowed)
        return try JSONDecoder().decode(T.self, from: jsonData)
    }
    
    public static func decode(_ data: Data) throws -> Any? {
        var offset = 0
        return try read(from: data, offset: &offset)
    }
    
    private static func write(_ value: Any?, to data: inout Data) throws {
        if value == nil || value is NSNull {
            data.append(0x00)
            return
        }
        
        if let v = value as? Bool {
            data.append(0x01)
            data.append(v ? 1 : 0)
            return
        }
        
        if let v = value as? Double {
            data.append(0x03)
            var val = v.bitPattern.littleEndian
            withUnsafeBytes(of: &val) { data.append(contentsOf: $0) }
            return
        }
        
        if let v = value as? Int {
            data.append(0x03)
            var val = Double(v).bitPattern.littleEndian
            withUnsafeBytes(of: &val) { data.append(contentsOf: $0) }
            return
        }
        
        if let v = value as? String {
            data.append(0x04)
            let utf8 = v.data(using: .utf8)!
            var len = UInt32(utf8.count).littleEndian
            withUnsafeBytes(of: &len) { data.append(contentsOf: $0) }
            data.append(utf8)
            return
        }

        if let v = value as? Data {
            data.append(0x07)
            var len = UInt32(v.count).littleEndian
            withUnsafeBytes(of: &len) { data.append(contentsOf: $0) }
            data.append(v)
            return
        }
        
        if let v = value as? [Any?] {
            data.append(0x05)
            var count = UInt32(v.count).littleEndian
            withUnsafeBytes(of: &count) { data.append(contentsOf: $0) }
            for item in v {
                try write(item, to: &data)
            }
            return
        }
        
        if let v = value as? [String: Any?] {
            data.append(0x06)
            let keys = v.keys.sorted()
            var count = UInt32(keys.count).littleEndian
            withUnsafeBytes(of: &count) { data.append(contentsOf: $0) }
            for key in keys {
                try write(key, to: &data)
                try write(v[key]!, to: &data)
            }
            return
        }

        // FAST PATH: Use custom binary protocol if available
        if let yolkBinEncodable = value as? YolkBinEncodable {
            try write(yolkBinEncodable.yolkBinFields(), to: &data)
            return
        }

        // LAST RESORT: Handle Complex Encodables via JSON bridge (Warning: Performance overhead)
        if let encodable = value as? Encodable {
            print("[YolkBin] Performance Warning: \(type(of: value)) is using JSON detour. Implement YolkBinEncodable for better performance.")
            let jsonData = try JSONEncoder().encode(encodable)
            var dict = try JSONSerialization.jsonObject(with: jsonData, options: .fragmentsAllowed)
            dict = cleanForJSON(dict)
            try write(dict, to: &data)
            return
        }

        throw NSError(domain: "YolkBin", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unsupported type: \(type(of: value))"])
    }
    
    private static func read(from data: Data, offset: inout Int) throws -> Any? {
        guard offset < data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
        let type = data[offset]
        offset += 1
        
        switch type {
        case 0x00: return nil
        case 0x01:
            guard offset < data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let v = data[offset] == 1
            offset += 1
            return v
        case 0x03:
            guard offset + 8 <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let v = data.subdata(in: offset..<offset+8).withUnsafeBytes { $0.load(as: UInt64.self) }.littleEndian
            offset += 8
            return Double(bitPattern: v)
        case 0x04:
            guard offset + 4 <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let len = Int(data.subdata(in: offset..<offset+4).withUnsafeBytes { $0.load(as: UInt32.self) }.littleEndian)
            offset += 4
            guard offset + len <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let str = String(data: data.subdata(in: offset..<offset+len), encoding: .utf8)!
            offset += len
            return str
        case 0x07:
            guard offset + 4 <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let len = Int(data.subdata(in: offset..<offset+4).withUnsafeBytes { $0.load(as: UInt32.self) }.littleEndian)
            offset += 4
            guard offset + len <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let buf = data.subdata(in: offset..<offset+len)
            offset += len
            return buf
        case 0x05:
            guard offset + 4 <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let count = Int(data.subdata(in: offset..<offset+4).withUnsafeBytes { $0.load(as: UInt32.self) }.littleEndian)
            offset += 4
            var arr: [Any?] = []
            for _ in 0..<count {
                arr.append(try read(from: data, offset: &offset))
            }
            return arr
        case 0x06:
            guard offset + 4 <= data.count else { throw NSError(domain: "YolkBin", code: 2, userInfo: [NSLocalizedDescriptionKey: "EOF"]) }
            let count = Int(data.subdata(in: offset..<offset+4).withUnsafeBytes { $0.load(as: UInt32.self) }.littleEndian)
            offset += 4
            var obj: [String: Any?] = [:]
            for _ in 0..<count {
                guard let key = try read(from: data, offset: &offset) as? String else { 
                    throw NSError(domain: "YolkBin", code: 3, userInfo: [NSLocalizedDescriptionKey: "Key is not string"]) 
                }
                obj[key] = try read(from: data, offset: &offset)
            }
            return obj
        default:
            throw NSError(domain: "YolkBin", code: 4, userInfo: [NSLocalizedDescriptionKey: "Unknown type \(type) at offset \(offset-1)"])
        }
    }

    private static func cleanForJSON(_ value: Any) -> Any {
        if let d = value as? Double {
            return (d.isNaN || d.isInfinite) ? NSNull() : d
        }
        if let arr = value as? [Any] {
            return arr.map(cleanForJSON)
        }
        if let dict = value as? [String: Any] {
            return dict.mapValues(cleanForJSON)
        }
        return value
    }
}
