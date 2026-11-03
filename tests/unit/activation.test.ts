import { describe, it, expect } from "vitest";
import { hashActivationToken, generateActivationToken } from "@/lib/auth/activation";
import crypto from "crypto";

describe("Phase 3 Activation Token Security Unit Tests", () => {
  it("unit: hashActivationToken generates 64-character SHA-256 hex string", () => {
    const token = "ACT-7K9M-2PXQ";
    const hash = hashActivationToken(token);

    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);

    // Tính nhất quán (Deterministic)
    const expected = crypto.createHash("sha256").update(token).digest("hex");
    expect(hash).toBe(expected);

    // Không phân biệt chữ hoa thường khi so khớp
    expect(hashActivationToken("act-7k9m-2pxq")).toBe(hash);
  });

  it("unit: generateActivationToken returns formatted token and matching hash", () => {
    const { token, hash } = generateActivationToken();

    expect(token).toMatch(/^ACT-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    expect(hash).toHaveLength(64);
    expect(hashActivationToken(token)).toBe(hash);
  });
});
