import { describe, expect, it } from "vitest";
import {
  decryptWithKey,
  deriveKey,
  encryptWithKey,
  exportKeyRaw,
  generateMasterKey,
  importKeyRaw,
  randomSalt,
  saltFromBase64,
  saltToBase64,
  unwrapKey,
  wrapKey,
} from "./crypto";

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

describe("key wrapping", () => {
  it("마스터 키를 KEK로 감쌌다가 풀면 원래 키와 똑같이 동작한다", async () => {
    const salt = randomSalt();
    const kek = await deriveKey("암호", salt, 1000);
    const masterKey = await generateMasterKey();

    const wrapped = await wrapKey(kek, masterKey);
    const unwrapped = await unwrapKey(kek, wrapped);

    const blob = await encryptWithKey(masterKey, { x: 1 });
    expect(await decryptWithKey(unwrapped, blob)).toEqual({ x: 1 });
  });

  it("틀린 KEK로 풀려고 하면 실패한다", async () => {
    const salt = randomSalt();
    const rightKek = await deriveKey("올바른 암호", salt, 1000);
    const wrongKek = await deriveKey("틀린 암호", salt, 1000);
    const masterKey = await generateMasterKey();
    const wrapped = await wrapKey(rightKek, masterKey);
    await expect(unwrapKey(wrongKek, wrapped)).rejects.toThrow();
  });
});

describe("exportKeyRaw/importKeyRaw", () => {
  it("마스터 키를 base64로 꺼냈다가 다시 불러와도 똑같이 동작한다 (패스프레이즈 없이 공유하는 용도)", async () => {
    const masterKey = await generateMasterKey();
    const b64 = await exportKeyRaw(masterKey);
    const restored = await importKeyRaw(b64);
    const blob = await encryptWithKey(masterKey, { shared: true });
    expect(await decryptWithKey(restored, blob)).toEqual({ shared: true });
  });

  it("같은 키를 두 번 꺼내면 항상 같은 base64가 나온다(기기 간 키 비교에 씀)", async () => {
    const masterKey = await generateMasterKey();
    const a = await exportKeyRaw(masterKey);
    const b = await exportKeyRaw(masterKey);
    expect(a).toBe(b);
  });

  it("클라우드 키로 갈아탔으면 로컬 패스프레이즈 wrap도 그 키로 다시 감싸야 한다 — 안 그러면 다음에 암호를 넣었을 때 옛날 키가 풀리고, 그걸로 새 내용을 복호화하려다 실패한다", async () => {
    const salt = randomSalt();
    const kek = await deriveKey("내 기기 암호", salt, 1000);
    const myOldKey = await generateMasterKey();
    const cloudKey = await generateMasterKey(); // 다른 기기가 먼저 올려둔 "진짜" 키
    const vaultEncryptedWithCloudKey = await encryptWithKey(cloudKey, { people: ["합쳐진 결과"] });

    // 버그가 있던 방식: 갈아탄 cloudKey로 내용은 암호화하면서, wrap은 옛날 키(myOldKey)를 감싼
    // 걸 그대로 둠 — 다음에 그 wrap을 풀면 myOldKey가 나오는데, 그걸로 cloudKey로 암호화된
    // 내용을 복호화하려 하니 실패한다(= "암호가 맞지 않아요"로 잘못 보고됨).
    const staleWrap = await wrapKey(kek, myOldKey);
    const unwrappedStale = await unwrapKey(kek, staleWrap);
    await expect(decryptWithKey(unwrappedStale, vaultEncryptedWithCloudKey)).rejects.toThrow();

    // 고친 방식: 갈아탄 cloudKey를 로컬 kek로 다시 감싼다(rewrapIfAdopted가 하는 일) — 그러면
    // 같은 암호를 넣었을 때 cloudKey가 나오고, 방금 그 키로 암호화된 내용도 정상적으로 풀린다.
    const freshWrap = await wrapKey(kek, cloudKey);
    const unwrappedFresh = await unwrapKey(kek, freshWrap);
    expect(await decryptWithKey(unwrappedFresh, vaultEncryptedWithCloudKey)).toEqual({ people: ["합쳐진 결과"] });
  });
});
