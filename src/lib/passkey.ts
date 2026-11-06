// WebAuthn PRF 확장으로 패스키에서 "마스터 키를 감쌀 KEK"를 뽑아내는 브라우저 API 래퍼.
// 실제 키 유도(HKDF)는 crypto.ts의 deriveKeyFromPrf가 하고, 여기서는 navigator.credentials만 다룬다.
// jsdom엔 WebAuthn이 없어서 Vitest로 못 돌린다 — storage.ts의 IndexedDB 래퍼와 같은 사정.
import { fromBase64, toBase64 } from "./crypto";

const RP_NAME = "관계노트";
const PRF_SALT_BYTES = 32;

export function isPasskeySupported(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window && !!navigator.credentials;
}

export interface PasskeyRegistration {
  /** base64 */
  credentialId: string;
  /** base64 — PRF 평가에 쓴 고정 salt. 비밀이 아니다. */
  prfSalt: string;
  prfOutput: ArrayBuffer;
}

interface PrfExtensionResults {
  prf?: { results?: { first?: ArrayBuffer } };
}

function readPrfOutput(cred: PublicKeyCredential): ArrayBuffer | undefined {
  return (cred.getClientExtensionResults() as PrfExtensionResults).prf?.results?.first;
}

/** 새 패스키를 만들고 그 자리에서 PRF 값을 받아온다. 브라우저가 create()에서 안 주면 get()으로 한 번 더 받는다. */
export async function registerPasskey(accountName: string): Promise<PasskeyRegistration> {
  const prfSaltBytes = crypto.getRandomValues(new Uint8Array(PRF_SALT_BYTES));

  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { name: RP_NAME },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: accountName, displayName: accountName },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
      extensions: { prf: { eval: { first: prfSaltBytes } } },
    } as PublicKeyCredentialCreationOptions,
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("패스키를 만들지 못했어요.");

  const credentialId = toBase64(new Uint8Array(credential.rawId));
  const prfSalt = toBase64(prfSaltBytes);

  const prfOutput = readPrfOutput(credential) ?? (await evaluatePrf(credential.rawId, prfSaltBytes));
  if (!prfOutput) throw new Error("이 기기/브라우저는 패스키 PRF를 지원하지 않아요.");

  return { credentialId, prfSalt, prfOutput };
}

async function evaluatePrf(rawId: ArrayBuffer, prfSaltBytes: Uint8Array): Promise<ArrayBuffer | undefined> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: rawId, type: "public-key" }],
      userVerification: "required",
      extensions: { prf: { eval: { first: prfSaltBytes } } },
    } as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null;

  return assertion ? readPrfOutput(assertion) : undefined;
}

/** 저장해둔 패스키로 잠금을 풀 때 PRF 값을 받아온다. */
export async function unlockWithPasskey(credentialId: string, prfSalt: string): Promise<ArrayBuffer> {
  const rawId = fromBase64(credentialId);
  const prfSaltBytes = fromBase64(prfSalt);

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: rawId as BufferSource, type: "public-key" }],
      userVerification: "required",
      extensions: { prf: { eval: { first: prfSaltBytes } } },
    } as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null;

  const prfOutput = assertion ? readPrfOutput(assertion) : undefined;
  if (!prfOutput) throw new Error("패스키로 잠금을 풀지 못했어요.");
  return prfOutput;
}
