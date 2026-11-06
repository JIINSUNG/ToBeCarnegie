// 백업 파일·코드 내보내기/복원. 절대원칙 2번("평문은 저장소에도 남기지 않는다")에 따라 여기서 다루는
// 건 항상 암호화된 StoredVault 한 덩어리뿐 — 복호화는 세션(session.tsx)이 키를 들고 있을 때만 한다.
import type { StoredVault } from "./storage";
import { mergeVaults } from "./merge";
import type { Vault } from "../types";

const BACKUP_APP_ID = "관계노트-백업";
const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: string;
  formatVersion: number;
  exportedAt: number;
  vault: StoredVault;
}

export function createBackupFile(stored: StoredVault): BackupFile {
  return { app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: Date.now(), vault: stored };
}

export function serializeBackupFile(file: BackupFile): string {
  return JSON.stringify(file);
}

export function parseBackupFile(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("백업 파일을 읽을 수 없어요.");
  }
  const file = data as Partial<BackupFile> | null;
  if (!file || file.app !== BACKUP_APP_ID || !file.vault?.cipher) {
    throw new Error("관계노트 백업 파일이 아니에요.");
  }
  return file as BackupFile;
}

/** 파일 대신 복사해서 옮길 수 있는 짧은 텍스트 코드. */
export function backupFileToCode(file: BackupFile): string {
  return btoa(unescape(encodeURIComponent(serializeBackupFile(file))));
}

export function backupCodeToFile(code: string): BackupFile {
  let text: string;
  try {
    text = decodeURIComponent(escape(atob(code.trim())));
  } catch {
    throw new Error("백업 코드를 읽을 수 없어요.");
  }
  return parseBackupFile(text);
}

/** 복원 - 합치기: 항목별 최신 updatedAt 우선으로 현재 Vault와 합친다. */
export function restoreMerge(current: Vault, incoming: Vault): Vault {
  return mergeVaults(current, incoming);
}

/** 복원 - 덮어쓰기: 현재 Vault를 버리고 백업 내용으로 완전히 바꾼다. */
export function restoreOverwrite(incoming: Vault): Vault {
  return incoming;
}
