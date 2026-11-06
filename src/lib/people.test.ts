import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import {
  addGift,
  addNote,
  createPerson,
  deleteGift,
  deleteNote,
  deletePerson,
  findPerson,
  isValidBirthday,
  searchPeople,
  toggleGiftRepaid,
  touchLastContact,
  updateNote,
  updatePerson,
} from "./people";

describe("people", () => {
  it("createPerson으로 사람을 추가하면 목록에 하나 늘어난다", () => {
    const v = createPerson(emptyVault(), "민수");
    expect(v.people).toHaveLength(1);
    expect(v.people[0].name).toBe("민수");
    expect(v.people[0].notes).toEqual([]);
  });

  it("updatePerson은 지정한 필드만 바꾸고 나머지는 그대로 둔다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = updatePerson(v, id, { birthday: "03-15" });
    expect(v.people[0].birthday).toBe("03-15");
    expect(v.people[0].name).toBe("민수");
  });

  it("deletePerson은 해당 사람만 지운다", () => {
    let v = createPerson(emptyVault(), "민수");
    v = createPerson(v, "지은");
    const [first] = v.people;
    v = deletePerson(v, first.id);
    expect(v.people).toHaveLength(1);
    expect(v.people[0].name).toBe("지은");
  });

  it("addNote·updateNote·deleteNote가 그 사람의 notes만 건드린다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = addNote(v, id, "커피는 아메리카노");
    expect(findPerson(v, id)?.notes).toHaveLength(1);
    const noteId = findPerson(v, id)!.notes[0].id;

    v = updateNote(v, id, noteId, "커피는 라떼");
    expect(findPerson(v, id)?.notes[0].text).toBe("커피는 라떼");

    v = deleteNote(v, id, noteId);
    expect(findPerson(v, id)?.notes).toHaveLength(0);
  });

  it("touchLastContact은 lastContactAt만 갱신한다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = touchLastContact(v, id, 123456);
    expect(findPerson(v, id)?.lastContactAt).toBe(123456);
  });

  it("searchPeople은 이름·태그·기록 내용으로 찾는다", () => {
    let v = createPerson(emptyVault(), "김민수");
    v = createPerson(v, "이지은");
    v = updatePerson(v, v.people[0].id, { tags: ["대학동기"] });
    v = addNote(v, v.people[1].id, "고양이 두 마리 키움");

    expect(searchPeople(v, "민수").map((p) => p.name)).toEqual(["김민수"]);
    expect(searchPeople(v, "대학동기").map((p) => p.name)).toEqual(["김민수"]);
    expect(searchPeople(v, "고양이").map((p) => p.name)).toEqual(["이지은"]);
    expect(searchPeople(v, "").map((p) => p.name)).toEqual(["김민수", "이지은"]);
  });

  it("addGift·toggleGiftRepaid·deleteGift가 그 사람의 gifts만 건드린다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = addGift(v, id, "생일 선물로 향수 받음");
    expect(findPerson(v, id)?.gifts).toHaveLength(1);
    const giftId = findPerson(v, id)!.gifts![0].id;
    expect(findPerson(v, id)?.gifts![0].repaid).toBe(false);

    v = toggleGiftRepaid(v, id, giftId);
    expect(findPerson(v, id)?.gifts![0].repaid).toBe(true);
    expect(findPerson(v, id)?.gifts![0].repaidAt).toBeTypeOf("number");

    v = toggleGiftRepaid(v, id, giftId);
    expect(findPerson(v, id)?.gifts![0].repaid).toBe(false);
    expect(findPerson(v, id)?.gifts![0].repaidAt).toBeUndefined();

    v = deleteGift(v, id, giftId);
    expect(findPerson(v, id)?.gifts).toHaveLength(0);
  });

  it("gifts 필드가 없는(이전 버전) 사람에도 addGift가 안전하게 동작한다", () => {
    let v = createPerson(emptyVault(), "민수");
    const id = v.people[0].id;
    v = { ...v, people: v.people.map((p) => ({ ...p, gifts: undefined })) };
    v = addGift(v, id, "명절 선물 받음");
    expect(findPerson(v, id)?.gifts).toHaveLength(1);
  });

  it("isValidBirthday는 MM-DD 형식과 실제 존재하는 날짜만 통과시킨다", () => {
    expect(isValidBirthday("03-15")).toBe(true);
    expect(isValidBirthday("02-29")).toBe(true);
    expect(isValidBirthday("13-01")).toBe(false);
    expect(isValidBirthday("02-30")).toBe(false);
    expect(isValidBirthday("3-15")).toBe(false);
    expect(isValidBirthday("")).toBe(false);
  });
});
