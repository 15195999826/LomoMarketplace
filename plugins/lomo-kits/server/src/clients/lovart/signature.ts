/**
 * Lovart.ai WebSocket / HTTP 签名计算
 * 算法: HMAC-SHA256，密钥编译在 WASM 中，此处用提取的 midstate 实现
 * 消息格式: "{send_timestamp}:{req_uuid}:{thread_id}:{project_id}"
 * 签名格式: "1:{64-char hex}"
 */

// SHA-256 round constants
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

// Pre-computed HMAC key midstates (SHA-256 H0-H7 after processing ipad/opad blocks)
const IPAD_MIDSTATE = new Uint32Array([
  0x61789e7f, 0x58cb23b1, 0x3fda7f11, 0x5d128deb,
  0x1317150f, 0x4bc87816, 0x3475749f, 0x7fcb4d68,
]);

const OPAD_MIDSTATE = new Uint32Array([
  0xb6804a2c, 0x51dbca92, 0xeed13b74, 0x21aeb414,
  0x11939fec, 0x634977e6, 0xc1b5be95, 0xe4dfd712,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha256Block(H: Uint32Array<ArrayBuffer>, block: Buffer): Uint32Array<ArrayBuffer> {
  const W = new Uint32Array(64);
  for (let i = 0; i < 16; i++) W[i] = block.readUInt32BE(i * 4);
  for (let i = 16; i < 64; i++) {
    const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
    const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
    W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
  }
  let [a, b, c, d, e, f, g, h] = H;
  for (let i = 0; i < 64; i++) {
    const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
    const ch = ((e & f) ^ (~e & g)) >>> 0;
    const T1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
    const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
    const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
    const T2 = (S0 + maj) >>> 0;
    h = g; g = f; f = e; e = (d + T1) >>> 0;
    d = c; c = b; b = a; a = (T1 + T2) >>> 0;
  }
  return new Uint32Array([
    (H[0] + a) >>> 0, (H[1] + b) >>> 0,
    (H[2] + c) >>> 0, (H[3] + d) >>> 0,
    (H[4] + e) >>> 0, (H[5] + f) >>> 0,
    (H[6] + g) >>> 0, (H[7] + h) >>> 0,
  ]);
}

function hmacSha256(message: string): string {
  const msg = Buffer.from(message, "utf8");

  // Inner hash: continue from IPAD_MIDSTATE (ipad block already processed)
  const totalInner = 64 + msg.length;
  const innerBlockCount = Math.ceil((msg.length + 9) / 64);
  const innerPadded = Buffer.alloc(innerBlockCount * 64);
  msg.copy(innerPadded);
  innerPadded[msg.length] = 0x80;
  innerPadded.writeBigUInt64BE(BigInt(totalInner * 8), innerPadded.length - 8);

  let H: Uint32Array<ArrayBuffer> = new Uint32Array(IPAD_MIDSTATE);
  for (let off = 0; off < innerPadded.length; off += 64) {
    H = sha256Block(H, innerPadded.subarray(off, off + 64) as unknown as Buffer);
  }

  const innerHash = Buffer.alloc(32);
  for (let i = 0; i < 8; i++) innerHash.writeUInt32BE(H[i], i * 4);

  // Outer hash: continue from OPAD_MIDSTATE (opad block already processed)
  const outerPadded = Buffer.alloc(64);
  innerHash.copy(outerPadded);
  outerPadded[32] = 0x80;
  outerPadded.writeBigUInt64BE(BigInt(96 * 8), 56); // total = 64 + 32 = 96

  let H2: Uint32Array<ArrayBuffer> = new Uint32Array(OPAD_MIDSTATE);
  H2 = sha256Block(H2, outerPadded);

  const result = Buffer.alloc(32);
  for (let i = 0; i < 8; i++) result.writeUInt32BE(H2[i], i * 4);
  return result.toString("hex");
}

/**
 * 计算 WebSocket 消息签名
 * @returns 格式 "1:{hex_sha256}"
 */
export function computeSignature(
  sendTimestamp: string,
  reqUuid: string,
  threadId: string = "",
  projectId: string = ""
): string {
  const message = `${sendTimestamp}:${reqUuid}:${threadId}:${projectId}`;
  return `1:${hmacSha256(message)}`;
}

/** 生成 HTTP API 请求签名头 */
export function generateHttpHeaders(serverTimeOffset: number = 0): Record<string, string> {
  const sendTimestamp = `${Math.floor(Date.now() + serverTimeOffset)}`;
  const reqUuid = generateUuid();
  const signature = computeSignature(sendTimestamp, reqUuid, "", "");
  return {
    "X-Send-Timestamp": sendTimestamp,
    "X-Req-Uuid": reqUuid,
    "X-Client-Signature": signature,
  };
}

/** 生成 32 字节 hex UUID (无横杠) */
export function generateUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
