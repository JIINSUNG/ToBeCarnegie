import { describe, expect, it } from "vitest";
import {
  backupCodeToFile,
  backupFileToCode,
  createBackupFile,
  parseBackupFile,
  restoreMerge,
  restoreOverwrite,
  serializeBackupFile,
} from "./backup";
import type { StoredVault } from "./storage";
import { emptyVault, type Vault } from "../types";
import { createPerson } from "./people";

const sampleStored: StoredVault = {
  iv: "aXY=",
  cipher: "Y2lwaGVy",
  updatedAt: 1000,
  passphrase: { salt: "c2FsdA==", iterations: 310_000, iv: "a3dpdg==", cipher: "a3djaXBoZXI=" },
};

describe("backup file round-trip", () => {
  it("만들고 직렬화한 뒤 다시 파싱하면 같은 내용이 나온다", () => {
    const file = createBackupFile(sampleStored);
    const parsed = parseBackupFile(serializeBackupFile(file));
    expect(parsed).toEqual(file);
  });

  it("관계노트 백업 파일이 아니면 에러", () => {
    expect(() => parseBackupFile(JSON.stringify({ app: "다른앱", vault: sampleStored }))).toThrow();
    expect(() => parseBackupFile("이건 json이 아니야")).toThrow();
    expect(() => parseBackupFile(JSON.stringify({ app: "관계노트-백업" }))).toThrow();
  });
});

describe("backup code round-trip", () => {
  it("코드로 바꿨다가 되돌리면 원래 파일이 나온다", () => {
    const file = createBackupFile(sampleStored);
    const code = backupFileToCode(file);
    expect(backupCodeToFile(code)).toEqual(file);
  });

  it("망가진 코드는 에러", () => {
    expect(() => backupCodeToFile("이건-코드가-아니야!!")).toThrow();
  });
});

describe("restore", () => {
  it("overwrite는 들어온 vault로 완전히 바뀐다", () => {
    const current = createPerson(emptyVault(), "민수");
    const incoming: Vault = { version: 1, people: [] };
    expect(restoreOverwrite(incoming)).toBe(incoming);
    expect(restoreOverwrite(incoming).people).toHaveLength(0);
    void current;
  });

  it("merge는 항목별 최신 우선으로 합친다 (lib/merge.ts에 위임)", () => {
    const current = createPerson(emptyVault(), "민수", "p1");
    const incoming = createPerson(emptyVault(), "지은", "p2");
    const merged = restoreMerge(current, incoming);
    expect(merged.people.map((p) => p.name).sort()).toEqual(["민수", "지은"]);
  });
});
