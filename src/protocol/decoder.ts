// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'KafkaJSInv... Remove this comment to see the full error message
const { KafkaJSInvalidVarIntError, KafkaJSInvalidLongError } = require('../errors')
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'Long'.
const Long = require('../utils/long')

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'INT8_SIZE'... Remove this comment to see the full error message
const INT8_SIZE = 1
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'INT16_SIZE... Remove this comment to see the full error message
const INT16_SIZE = 2
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'INT32_SIZE... Remove this comment to see the full error message
const INT32_SIZE = 4
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'INT64_SIZE... Remove this comment to see the full error message
const INT64_SIZE = 8
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'DOUBLE_SIZ... Remove this comment to see the full error message
const DOUBLE_SIZE = 8

// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'MOST_SIGNI... Remove this comment to see the full error message
const MOST_SIGNIFICANT_BIT = 0x80 // 128
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'OTHER_BITS... Remove this comment to see the full error message
const OTHER_BITS = 0x7f // 127

// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = class Decoder {
  buffer: any;
  offset: any;
  static int32Size() {
    return INT32_SIZE
  }

  static decodeZigZag(value: any) {
    return (value >>> 1) ^ -(value & 1)
  }

  static decodeZigZag64(longValue: any) {
    return longValue.shiftRightUnsigned(1).xor(longValue.and(Long.fromInt(1)).negate())
  }

  constructor(buffer: any) {
    this.buffer = buffer
    this.offset = 0
  }

  readInt8() {
    const value = this.buffer.readInt8(this.offset)
    this.offset += INT8_SIZE
    return value
  }

  canReadInt16() {
    return this.canReadBytes(INT16_SIZE)
  }

  readInt16() {
    const value = this.buffer.readInt16BE(this.offset)
    this.offset += INT16_SIZE
    return value
  }

  canReadInt32() {
    return this.canReadBytes(INT32_SIZE)
  }

  readInt32() {
    const value = this.buffer.readInt32BE(this.offset)
    this.offset += INT32_SIZE
    return value
  }

  canReadInt64() {
    return this.canReadBytes(INT64_SIZE)
  }

  readInt64() {
    const first = this.buffer[this.offset]
    const last = this.buffer[this.offset + 7]

    const low =
      (first << 24) + // Overflow
      this.buffer[this.offset + 1] * 2 ** 16 +
      this.buffer[this.offset + 2] * 2 ** 8 +
      this.buffer[this.offset + 3]
    const high =
      this.buffer[this.offset + 4] * 2 ** 24 +
      this.buffer[this.offset + 5] * 2 ** 16 +
      this.buffer[this.offset + 6] * 2 ** 8 +
      last
    this.offset += INT64_SIZE

    // @ts-expect-error ts-migrate(2583) FIXME: Cannot find name 'BigInt'. Do you need to change y... Remove this comment to see the full error message
    return (BigInt(low) << 32n) + BigInt(high)
  }

  readDouble() {
    const value = this.buffer.readDoubleBE(this.offset)
    this.offset += DOUBLE_SIZE
    return value
  }

  readString() {
    const byteLength = this.readInt16()

    if (byteLength === -1) {
      return null
    }

    const stringBuffer = this.buffer.slice(this.offset, this.offset + byteLength)
    const value = stringBuffer.toString('utf8')
    this.offset += byteLength
    return value
  }

  readVarIntString() {
    const byteLength = this.readVarInt()

    if (byteLength === -1) {
      return null
    }

    const stringBuffer = this.buffer.slice(this.offset, this.offset + byteLength)
    const value = stringBuffer.toString('utf8')
    this.offset += byteLength
    return value
  }

  readUVarIntString() {
    const byteLength = this.readUVarInt()

    if (byteLength === 0) {
      return null
    }

    const stringBuffer = this.buffer.slice(this.offset, this.offset + byteLength)
    const value = stringBuffer.toString('utf8')
    this.offset += byteLength
    return value
  }

  canReadBytes(length: any) {
    // @ts-expect-error ts-migrate(2552) FIXME: Cannot find name 'Buffer'. Did you mean 'buffer'?
    return Buffer.byteLength(this.buffer) - this.offset >= length
  }

  readBytes(byteLength = this.readInt32()) {
    if (byteLength === -1) {
      return null
    }

    const stringBuffer = this.buffer.slice(this.offset, this.offset + byteLength)
    this.offset += byteLength
    return stringBuffer
  }

  readVarIntBytes() {
    const byteLength = this.readVarInt()

    if (byteLength === -1) {
      return null
    }

    const stringBuffer = this.buffer.slice(this.offset, this.offset + byteLength)
    this.offset += byteLength
    return stringBuffer
  }

  readUVarIntBytes() {
    const byteLength = this.readUVarInt()

    if (byteLength === 0) {
      return null
    }

    const stringBuffer = this.buffer.slice(this.offset, this.offset + byteLength)
    this.offset += byteLength
    return stringBuffer
  }

  readBoolean() {
    return this.readInt8() === 1
  }

  readAll() {
    const result = this.buffer.slice(this.offset)
    // @ts-expect-error ts-migrate(2552) FIXME: Cannot find name 'Buffer'. Did you mean 'buffer'?
    this.offset += Buffer.byteLength(this.buffer)
    return result
  }

  readArray(reader: any) {
    const length = this.readInt32()

    if (length === -1) {
      return []
    }

    const array = new Array(length)
    for (let i = 0; i < length; i++) {
      array[i] = reader(this)
    }

    return array
  }

  readVarIntArray(reader: any) {
    const length = this.readVarInt()

    if (length === -1) {
      return []
    }

    const array = new Array(length)
    for (let i = 0; i < length; i++) {
      array[i] = reader(this)
    }

    return array
  }

  readUVarIntArray(reader: any) {
    const length = this.readUVarInt()

    if (length === 0) {
      return []
    }

    const array = new Array(length - 1)
    for (let i = 0; i < length - 1; i++) {
      array[i] = reader(this)
    }

    return array
  }

  async readArrayAsync(reader: any) {
    const length = this.readInt32()

    if (length === -1) {
      return []
    }

    const array = new Array(length)
    for (let i = 0; i < length; i++) {
      array[i] = await reader(this)
    }

    return array
  }

  readVarInt() {
    let currentByte
    let result = 0
    let i = 0

    do {
      currentByte = this.buffer[this.offset++]
      result += (currentByte & OTHER_BITS) << i
      i += 7
    } while (currentByte >= MOST_SIGNIFICANT_BIT)

    return Decoder.decodeZigZag(result)
  }

  // By default JavaScript's numbers are of type float64, performing bitwise operations converts the numbers to a signed 32-bit integer
  // Unsigned Right Shift Operator >>> ensures the returned value is an unsigned 32-bit integer
  readUVarInt() {
    let currentByte
    let result = 0
    let i = 0
    while (((currentByte = this.buffer[this.offset++]) & MOST_SIGNIFICANT_BIT) !== 0) {
      result |= (currentByte & OTHER_BITS) << i
      i += 7
      if (i > 28) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
        throw new KafkaJSInvalidVarIntError('Invalid VarInt, must contain 5 bytes or less')
      }
    }
    result |= currentByte << i
    return result >>> 0
  }

  readVarLong() {
    let currentByte
    let result = Long.fromInt(0)
    let i = 0

    do {
      if (i > 63) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
        throw new KafkaJSInvalidLongError('Invalid Long, must contain 9 bytes or less')
      }
      currentByte = this.buffer[this.offset++]
      result = result.add(Long.fromInt(currentByte & OTHER_BITS).shiftLeft(i))
      i += 7
    } while (currentByte >= MOST_SIGNIFICANT_BIT)

    return Decoder.decodeZigZag64(result)
  }

  slice(size: any) {
    return new Decoder(this.buffer.slice(this.offset, this.offset + size))
  }

  forward(size: any) {
    this.offset += size
  }
}
