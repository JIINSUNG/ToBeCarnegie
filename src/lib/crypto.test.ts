import { describe, expect, it } from "vitest";
import { decryptWithKey, deriveKey, encryptWithKey, randomSalt, saltFromBase64, saltToBase64 } from "./crypto";

describe("crypto", () => {
  it("올바른 암호로는 암호화한 내용을 그대로 복호화한다", async () => {
    const salt = randomSalt();
    const key = await deriveKey("올바른 암호", salt, 1000);
    const data = { people: [{ id: "1", name: "민수" }] };
    const blob = await encryptWithKey(key, data);
    const out = await decryptWithKey<typeof data>(key, blob);
    expect(out).toEqual(data);
  });

  it("틀린 암호로 만든 키로 복호화하면 실패한다", async () => {
    const salt = randomSalt();
    const rightKey = await deriveKey("올바른 암호", salt, 1000);
    const wrongKey = await deriveKey("틀린 암호", salt, 1000);
    const blob = await encryptWithKey(rightKey, { ok: true });
    await expect(decryptWithKey(wrongKey, blob)).rejects.toThrow();
  });

  it("salt를 base64로 바꿨다가 되돌려도 같은 바이트가 나온다", () => {
    const salt = randomSalt();
    const b64 = saltToBase64(salt);
    const back = saltFromBase64(b64);
    expect(Array.from(back)).toEqual(Array.from(salt));
  });

  it("암호화할 때마다 iv가 달라서 같은 데이터도 암호문이 매번 다르다", async () => {
    const salt = randomSalt();
    const key = await deriveKey("암호", salt, 1000);
    const a = await encryptWithKey(key, { x: 1 });
    const b = await encryptWithKey(key, { x: 1 });
    expect(a.cipher).not.toEqual(b.cipher);
  });
});
