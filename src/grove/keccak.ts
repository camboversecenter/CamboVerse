/**
 * Keccak-256 — the hash Ethereum (and CSB) uses, in ~90 lines and no dependency.
 *
 * WHY THIS FILE EXISTS. CSB stores a grove under `keccak256(plotId)`, never the
 * plot string: a garden's name is frequently its owner's name, and a permissioned
 * national chain is still readable by everyone on it. To ask the chain about a
 * plot CamboVerse already knows, it has to compute that hash — and Web Crypto
 * does not offer Keccak. (`SHA3-256` is the NIST variant, which differs from
 * Keccak in exactly one padding byte and produces an entirely different digest;
 * substituting it would fail silently, always returning "this plot has never
 * been anchored".)
 *
 * Vendoring 90 lines keeps the rule the rest of this viewer follows: nothing is
 * downloaded, and the whole verification path can be read in one sitting. The
 * implementation is checked against reference vectors in keccak.test.ts,
 * including the message lengths either side of the 136-byte rate boundary where
 * a padding mistake hides.
 *
 * BigInt lanes rather than 32-bit halves: this hashes a handful of short strings
 * per session, so the clearer code is worth more than the speed.
 */

const MASK = (1n << 64n) - 1n;
const RATE = 136; // bytes absorbed per permutation for Keccak-256 (1600 - 2*256)/8

/** Rotation offsets, flat: R[x + 5y]. */
// prettier-ignore
const R = [
  0n, 1n, 62n, 28n, 27n,
  36n, 44n, 6n, 55n, 20n,
  3n, 10n, 43n, 25n, 39n,
  41n, 45n, 15n, 21n, 8n,
  18n, 2n, 61n, 56n, 14n,
];

// prettier-ignore
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

const rotl = (v: bigint, n: bigint) => n === 0n ? v : ((v << n) | (v >> (64n - n))) & MASK;

/** The Keccak-f[1600] permutation, in place. */
function permute(A: bigint[]): void {
  const B = new Array<bigint>(25);
  const C = new Array<bigint>(5);
  const D = new Array<bigint>(5);
  for (let round = 0; round < 24; round++) {
    // θ
    for (let x = 0; x < 5; x++) C[x] = A[x] ^ A[x + 5] ^ A[x + 10] ^ A[x + 15] ^ A[x + 20];
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1n);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) A[x + 5 * y] ^= D[x];
    // ρ and π
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(A[x + 5 * y], R[x + 5 * y]);
      }
    }
    // χ
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        A[x + 5 * y] = B[x + 5 * y] ^ (~B[((x + 1) % 5) + 5 * y] & B[((x + 2) % 5) + 5 * y]) & MASK;
      }
    }
    // ι
    A[0] ^= RC[round];
  }
}

/** Keccak-256 of raw bytes. */
export function keccak256Bytes(input: Uint8Array): Uint8Array {
  // Keccak padding is 0x01 … 0x80 (SHA-3's is 0x06 … 0x80 — the one-byte
  // difference that makes a wrong choice here look like an empty result).
  const padLen = RATE - (input.length % RATE);
  const padded = new Uint8Array(input.length + padLen);
  padded.set(input);
  padded[input.length] = 0x01;
  padded[padded.length - 1] |= 0x80;

  const A = new Array<bigint>(25).fill(0n);
  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE / 8; i++) {
      let lane = 0n;
      // Lanes are little-endian.
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(padded[off + i * 8 + b]);
      A[i] ^= lane;
    }
    permute(A);
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    let lane = A[i];
    for (let b = 0; b < 8; b++) {
      out[i * 8 + b] = Number(lane & 0xffn);
      lane >>= 8n;
    }
  }
  return out;
}

const hex = (b: Uint8Array) => Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("");

/** Keccak-256 of a UTF-8 string, as a 0x-prefixed hex digest. */
export function keccak256(text: string): string {
  return "0x" + hex(keccak256Bytes(new TextEncoder().encode(text)));
}

/**
 * The 32-byte key CSB files a grove under, from the Grove plot id.
 * `keccak256(utf8(plot))` — identical to solidity's `keccak256(bytes(plot))`
 * and to ethers' `id(plot)`, which is how the anchoring side computes it.
 */
export const plotKey = keccak256;
