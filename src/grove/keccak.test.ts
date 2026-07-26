/**
 * Keccak-256 against reference vectors.
 *
 * The digests below were produced by ethers' `id()` — the same function the CSB
 * side uses to compute a plot key — so a mismatch here means CamboVerse would
 * ask the chain about a plot that does not exist and quietly render every grove
 * as unanchored. That failure is invisible without this test, which is the
 * reason it exists.
 *
 * The 135/136/137-byte cases straddle the 136-byte rate boundary, where padding
 * bugs live: 136 is the case that needs a whole extra block of padding.
 */
import { describe, it, expect } from "vitest";
import { keccak256, plotKey } from "./keccak";

describe("keccak256", () => {
  const vectors: [string, string][] = [
    ["", "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"],
    ["abc", "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45"],
    ["plot/peam-krasop/mangrove-01", "0x6dc32f8cdbc37520e81cdbe4efd644e15fb5c3bbc53f899f255d0ab9a459240a"],
    ["home-garden-01", "0x6754c1b531705d7b26c6cdd44a266f43691e60a083056ac90406c34a129dc418"],
    // Khmer, because a plot id often is.
    ["ក្បាលថ្នល់", "0x8f5ac472e187d7a3e8ffa21139f466dc0103acd7337bad972ff485af1017a205"],
    ["a".repeat(135), "0x34367dc248bbd832f4e3e69dfaac2f92638bd0bbd18f2912ba4ef454919cf446"],
    ["a".repeat(136), "0xa6c4d403279fe3e0af03729caada8374b5ca54d8065329a3ebcaeb4b60aa386e"],
    ["a".repeat(137), "0xd869f639c7046b4929fc92a4d988a8b22c55fbadb802c0c66ebcd484f1915f39"],
  ];

  for (const [input, expected] of vectors) {
    const label = input.length > 20 ? `${input.slice(0, 12)}… (${input.length} bytes)` : JSON.stringify(input);
    it(`hashes ${label}`, () => {
      expect(keccak256(input)).toBe(expected);
    });
  }

  it("is not SHA3-256 — the padding byte differs and the digest is unrelated", async () => {
    // If someone ever 'simplifies' this to Web Crypto or Node's sha3-256, this
    // fails rather than silently returning a key the chain has never seen.
    const sha3 = "0x3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532"; // SHA3-256("abc")
    expect(keccak256("abc")).not.toBe(sha3);
  });

  it("plotKey is the same function the anchoring side uses", () => {
    expect(plotKey("plot/peam-krasop/mangrove-01"))
      .toBe("0x6dc32f8cdbc37520e81cdbe4efd644e15fb5c3bbc53f899f255d0ab9a459240a");
  });
});
