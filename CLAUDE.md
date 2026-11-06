# 관계노트 — 프로젝트 규칙

지인에게 들은 생일·취향·관심사·근황을 빠르게 적어 두고, 다음에 만나기 전에 꺼내 보는 **나만 보는 관계 메모 앱**.
UI 문구는 전부 한국어 존댓말. 모바일 우선(390px), 한 손 조작.

## 절대 원칙
1. **운영 비용 0원.** 서버 코드·유료 API·AI API 없음. 정적 호스팅(Vercel/Cloudflare Pages) + Firebase 무료 요금제(Spark)만.
2. **평문은 기기 밖으로도, 저장소에도 남기지 않는다.** IndexedDB·백업 파일·Firestore에는 항상 암호화된 `Vault`만 저장. 복호화 키는 메모리에만 두고 잠금 시 버린다.
3. **공유 기능 없음.** 남에게 보내기·공개 링크·연락처 가져오기·SNS 연동·사진·위치 기능은 만들지 않는다.
4. **동기화는 계정별로 완전히 분리.** 구글 로그인한 사람은 누구나 쓸 수 있지만, Firestore 규칙에서 `request.auth.uid`가 자기 문서(`vaults/{uid}`)일 때만 읽기/쓰기를 허용 — 남의 Vault는 절대 못 본다. Firebase 설정값은 `.env.local`(VITE_FIREBASE_*)로, `.env.local`은 커밋하지 않는다.
5. **입력 필터:** 주민등록번호, 카드번호(Luhn 통과), "비밀번호·비번·현관·도어락" 뒤의 값은 저장 차단. 그 외 내용은 사용자 자율.
6. 새 의존성은 꼭 필요할 때만, 추가 전에 이유를 말한다.

## 스택
Vite + React 18 + TypeScript(strict) · CSS 변수(라이트/다크) · idb(IndexedDB 래퍼) · nanoid · Web Crypto · WebAuthn(PRF) · Firebase(Auth, Firestore, 2단계에서만) · vite-plugin-pwa · Vitest + Playwright

## 폴더
```
src/
  types.ts            데이터 타입
  lib/crypto.ts       키 생성·감싸기·암복호화 (Vault)
  lib/storage.ts      IndexedDB 저장/불러오기, persist 요청
  lib/backup.ts       백업 파일·코드 내보내기, 복원(합치기/덮어쓰기)
  lib/merge.ts        항목별 updatedAt 최신 우선 병합 (백업 복원·동기화 공용)
  lib/filter.ts       입력 필터
  lib/parser.ts       한 줄 기록 파서
  lib/derive.ts       다가오는 생일, 관계 온도, 연락 뜸한 사람, 브리핑, 백업 알림
  lib/passkey.ts      WebAuthn PRF (2단계)
  lib/sync.ts         Firebase 동기화 (2단계)
  screens/            Lock, Home, People, PersonCard, PersonEdit, Briefing, Settings
  components/
```

## 품질
- 로직(lib/)은 화면과 분리하고 Vitest 테스트를 붙인다.
- 화면을 바꾸면 Playwright로 390×844에서 띄워 확인한 뒤 "완료"라고 말한다.
- 단계마다 git 커밋(한국어 짧은 메시지).
