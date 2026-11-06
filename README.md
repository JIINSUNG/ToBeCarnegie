# 관계노트

지인에게 들은 생일·취향·관심사·근황을 빠르게 적어 두고, 다음에 만나기 전에 꺼내 보는 나만 보는 관계 메모 앱.
규칙은 [CLAUDE.md](./CLAUDE.md) 참고.

## 개발

```
npm install
npm run dev
```

```
npm run lint    # oxlint
npm test        # vitest
npm run build   # tsc -b && vite build
```

## 1단계 (암호만으로 쓰기)

별도 설정 없이 바로 됩니다. 첫 실행 시 암호를 만들면 이 기기 안에서만(IndexedDB) 암호화된 채로 저장돼요.

## 2단계 (패스키 / 여러 기기 동기화) — 선택

### 패스키로 잠금 해제

설정 화면에서 바로 등록할 수 있어요. 기기/브라우저가 WebAuthn PRF 확장을 지원해야 버튼이 보입니다.

### 여러 기기 동기화 (Firebase)

운영 비용이 들지 않는 선에서(Spark 무료 요금제) 소유자 한 명만 동기화할 수 있게 만든 기능입니다.

1. Firebase 프로젝트의 **설정(톱니바퀴) → 프로젝트 설정 → 일반**에서 "프로젝트 지원 이메일"을 먼저 지정해둡니다 (이게 안 돼 있으면 로그인 제공업체를 켤 때 저장이 안 되는 경우가 있어요).
2. [Firebase 콘솔](https://console.firebase.google.com) → **Authentication → Sign-in method**에서 "Google" 로그인을 켭니다.
3. **Firestore Database**를 만듭니다(기본 리전 아무거나, 프로덕션 모드).
4. 프로젝트 설정의 "웹 앱 추가"에서 나오는 설정값을 `.env.example`을 복사한 `.env.local`에 채웁니다.
   ```
   cp .env.example .env.local
   ```
5. 앱을 한 번 실행해서 설정 화면의 "지금 동기화"(또는 패스키 등록)를 눌러 구글 로그인 창을 한 번 띄웁니다 — 본인 구글 계정으로 로그인하면 Firebase 콘솔의 Authentication 탭에 그 사용자의 **uid**가 뜹니다. 이게 "나"입니다.
6. `firestore.rules`의 `MY_UID`를 5번에서 확인한 uid로 바꾸고 배포합니다.
   ```
   firebase deploy --only firestore:rules
   ```
   (이 파일은 그대로 커밋해도 되지만, uid를 실제 값으로 바꾼 채로는 커밋하지 마세요 — 로컬에서만 바꿔서 배포까지만 합니다.)
7. 다른 기기에서도 같은 `.env.local`을 넣고, 첫 화면에서 "다른 기기에서 이미 쓰고 있어요"로 같은 암호를 입력하면(구글 로그인은 같은 계정으로) 같은 Vault를 받아갑니다.

uid가 구글 계정에 고정돼 있어서, 브라우저 데이터를 지우거나 기기를 바꿔도 같은 계정으로 로그인하면 그대로 이어집니다.

Firestore·Auth에는 항상 암호화된 블롭만 오갑니다 — 평문 기록은 기기 밖으로 나가지 않아요.

## 배포

정적 사이트(Vercel/Cloudflare Pages)에 `npm run build`의 `dist/`를 올리면 됩니다. 서버 코드는 없습니다.
