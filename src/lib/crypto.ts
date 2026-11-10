// Vault(평문 데이터 전체)를 암호화해서만 저장하기 위한 순수 암호화 함수들.
// PBKDF2(SHA-256)로 암호(패스프레이즈)에서 AES-GCM 키를 만들고, 그 키로 JSON을 통째로 암복호화한다.
// 세션 중 매번 PBKDF2를 다시 돌리면 느리니, 파생된 CryptoKey를 메모리에 캐시해서 재사용하는 건
// 이 파일을 쓰는 쪽(세션 관리 코드)의 책임이다 — 여기서는 순수 함수만 제공한다.

export const PBKDF2_ITERATIONS = 310_000; // OWASP 2023 권장 하한
const AES_KEY_LENGTH = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface EncryptedBlob {
  /** base64 */
  iv: string;
  /** base64 */
  cipher: string;
}

export function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithKey(key: CryptoKey, data: unknown): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext);
  return { iv: toBase64(iv), cipher: toBase64(new Uint8Array(cipherBuf)) };
}

/** 암호가 틀렸거나 데이터가 손상됐으면 그대로 던진다(AES-GCM은 변조·오복호화를 태그로 걸러낸다). */
export async function decryptWithKey<T>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  const iv = fromBase64(blob.iv);
  const cipherBuf = fromBase64(blob.cipher);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, cipherBuf as BufferSource);
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T;
}

export function saltToBase64(salt: Uint8Array): string {
  return toBase64(salt);
}

export function saltFromBase64(b64: string): Uint8Array {
  return fromBase64(b64);
}

/** Vault를 실제로 암복호화하는 랜덤 마스터 키. 패스프레이즈·패스키 등 "잠금 해제 방법"은
 * 전부 이 키를 감싸는(wrap) KEK일 뿐 — 잠금 방법을 늘려도 Vault를 다시 암호화할 필요가 없다. */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH }, true, ["encrypt", "decrypt"]);
}

export async function wrapKey(kek: CryptoKey, keyToWrap: CryptoKey): Promise<EncryptedBlob> {
  const raw = await crypto.subtle.exportKey("raw", keyToWrap);
  return encryptWithKey(kek, toBase64(new Uint8Array(raw)));
}

export async function unwrapKey(kek: CryptoKey, blob: EncryptedBlob): Promise<CryptoKey> {
  const b64 = await decryptWithKey<string>(kek, blob);
  const raw = fromBase64(b64);
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", true, ["encrypt", "decrypt"]);
}

