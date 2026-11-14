# 더나은 — 프로젝트 규칙

사람을 더 챙기고, 나를 돌아보며 더 나은 사람이 되는 걸 돕는 **나만 보는 개인 성장 앱**.
지인에게 들은 생일·취향·관심사·근황을 기록하는 관계 관리(원래 "관계노트")에, 오늘의 미션·구호·
성장 일기·목표 체크리스트 같은 자기계발 도구를 더했다. 앱 이름이 "관계노트"에서 "더나은"으로
바뀐 역사가 있어 코드 곳곳에 옛 이름 흔적이 남아있을 수 있다(예: 폴더명 human_relationship,
백업 파일의 레거시 app id) — 기능엔 지장 없으니 일부러 지우지 않는다.
UI 문구는 전부 한국어 존댓말. 모바일 우선(390px), 한 손 조작.

## 절대 원칙
1. **운영 비용 0원.** 서버 코드·유료 API·AI API 없음. 정적 호스팅(Vercel/Cloudflare Pages) + Firebase 무료 요금제(Spark)만.
2. **평문은 기기 밖으로도, 저장소에도 남기지 않는다.** IndexedDB·백업 파일·Firestore에는 항상 암호화된 `Vault`만 저장.
   - **로컬(이 기기 안)**: 복호화 키(마스터 키)는 이 기기의 패스프레이즈로 감싸져(wrap) 저장되고, 풀린 키는 메모리에만 두고 잠금 시 버린다. 기기마다 패스프레이즈가 달라도 된다 — 순전히 "이 기기 잠금" 용도다.
   - **클라우드(Firestore, 동기화 켰을 때만)**: 기기마다 다른 패스프레이즈로도 서로 동기화되게 하기 위해, 마스터 키 원본(base64)을 패스프레이즈로 감싸지 않고 그대로 올린다. 그 문서는 `firestore.rules`로 "로그인한 본인(`request.auth.uid`)만" 읽고 쓸 수 있어서 남은 못 보지만, 패스프레이즈를 몰라도 그 구글 계정으로 로그인만 하면 복호화가 가능하다는 뜻이다 — 더 이상 "서버가 절대 복호화 불가능"(zero-knowledge)은 아니며, 접근 제어가 유일한 방어선이다. 사용자가 이 트레이드오프(패스프레이즈 안 맞춰도 되는 편의 vs 서버 측 이론적 접근 가능성)를 명시적으로 선택했다 — 다시 zero-knowledge로 되돌리자고 하지 않는 한 이 구조를 유지한다.
3. **공유 기능 없음.** 남에게 보내기·공개 링크·연락처 가져오기·SNS 연동·사진·위치 기능은 만들지 않는다.
4. **동기화는 계정별로 완전히 분리.** 구글 로그인한 사람은 누구나 쓸 수 있지만, Firestore 규칙에서 `request.auth.uid`가 자기 문서(`vaults/{uid}`)일 때만 읽기/쓰기를 허용 — 남의 Vault는 절대 못 본다. Firebase 설정값은 `.env.local`(VITE_FIREBASE_*)로, `.env.local`은 커밋하지 않는다.
5. **입력 필터:** 주민등록번호, 카드번호(Luhn 통과), "비밀번호·비번·현관·도어락" 뒤의 값은 저장 차단. 그 외 내용은 사용자 자율.
6. 새 의존성은 꼭 필요할 때만, 추가 전에 이유를 말한다.

## 스택
Vite + React 18 + TypeScript(strict) · CSS 변수(라이트/다크) · idb(IndexedDB 래퍼) · nanoid · Web Crypto · Firebase(Auth, Firestore, 2단계에서만) · vite-plugin-pwa · Vitest + Playwright

## 폴더
```
src/
  types.ts            데이터 타입
  lib/crypto.ts       키 생성·감싸기·암복호화 (Vault), exportKeyRaw/importKeyRaw(동기화용 키 공유)
  lib/storage.ts      IndexedDB 저장/불러오기, persist 요청
  lib/backup.ts       백업 파일·코드 내보내기, 복원(합치기/덮어쓰기) — 레거시 앱 id도 복원 허용
  lib/merge.ts        항목별 updatedAt 최신 우선 병합 (백업 복원·동기화 공용)
  lib/filter.ts       입력 필터
  lib/parser.ts       한 줄 기록 파서
  lib/derive.ts       다가오는 생일, 관계 온도, 연락 뜸한 사람, 오늘의 추천 연락, 최근 활동, 브리핑, 백업 알림
  lib/books.ts        읽은 책(독후감·글귀) CRUD
  lib/missions.ts     오늘의 미션(매일 반복) — 체크 미션 + 횟수 미션(target·unit, +/− 카운트) CRUD + 연속일수
  lib/affirmations.ts 오늘의 구호(매일 반복 체크) — missions.ts와 같은 구조
  lib/goals.ts        목표·고치고 싶은 점(한 번 달성하면 끝) CRUD — 같은 Goal 타입, 필드만 다름
  lib/journal.ts       성장 일기(프롬프트 + 자유 기록)
  lib/streak.ts        날짜 연산 + "연속 완료일" 계산 — missions/affirmations 공용
  lib/format.ts        날짜 표시(formatDate/timeAgo) — 화면 여러 곳이 공용으로 씀
  lib/layout.ts         공용 스타일(sticky 헤더, 뒤로가기 링크, 카드 섹션, 기본 버튼)
  lib/sync.ts           Firebase 동기화 — 실시간 구독 + 자동 올리기 (2단계), 오프라인 캐시 켜둠
  screens/              Lock, Home, People, PersonCard, PersonEdit, Briefing, Settings,
                        Quotes(글귀+독후감), Growth(미션+구호+일기), Goals(목표+고칠점)
  components/           TabBar, ChipListField(좋아요/싫어요/책 글귀 등 공용 칩 입력)
```

## 품질
- 로직(lib/)은 화면과 분리하고 Vitest 테스트를 붙인다.
- 화면을 바꾸면 Playwright로 390×844에서 띄워 확인한 뒤 "완료"라고 말한다.
- 단계마다 git 커밋(한국어 짧은 메시지).
