# Choromi Game Servers

GitHub Pages 주소:

- 발헤임: `https://choromi1.github.io/games/Valheim/`
- 좀보이드: `https://choromi1.github.io/games/zomboid/`
- 좀보이드 공지: `https://choromi1.github.io/games/zomboid/notices/`
- 좀보이드 관리자: `https://choromi1.github.io/games/zomboid/admin/`

## 저장소 조건

저장소 이름은 `games`를 사용합니다. GitHub Pages는 `main` 브랜치의 `/(root)`에서 배포하도록 설정합니다.

## 폴더 구조

```text
games/
├─ index.html
├─ Valheim/
│  ├─ index.html
│  ├─ styles.css
│  ├─ script.js
│  └─ assets/
└─ zomboid/
   ├─ index.html               # 공개 메인 페이지
   ├─ styles.css               # 공개/공지/관리자 공통 스타일
   ├─ config.js                # Supabase 및 서버 정보 설정
   ├─ config.example.js
   ├─ site.js                  # 공통 Supabase·UI 기능
   ├─ app.js                   # 메인 페이지 기능
   ├─ mods-data.js             # 적용 모드 데이터
   ├─ notices/
   │  ├─ index.html            # 전체 공지 및 상세 보기
   │  └─ notices.js
   ├─ admin/
   │  ├─ index.html            # 관리자 로그인·공지 관리
   │  └─ admin.js
   ├─ supabase/
   │  ├─ setup.sql             # DB, RLS, Storage, Realtime 설정
   │  └─ README.md
   └─ assets/
      └─ zomboid-main.webp
```

## 좀보이드 페이지 포함 기능

### 공개 페이지

- 최신 고정 공지와 최근 공지 표시
- 전체 공지 목록, 검색, 분류 필터, 페이지 이동
- 개별 공지 상세 페이지 및 링크 복사
- 서버 주소·포트·비밀번호 안내와 복사
- Steam Workshop 모드팩 링크
- 적용 모드 검색·카테고리 필터
- 진행 구조, 지역 위험도, 플레이 스타일, 운영 규칙, FAQ
- 모바일 반응형 UI
- Supabase Realtime 공지 자동 새로고침

### 관리자 페이지

- Supabase 이메일·비밀번호 로그인
- 관리자 권한 검사
- 공지 작성·수정·삭제
- 임시 저장, 즉시 공개, 예약 공개
- 중요 공지 상단 고정
- Markdown 작성 및 미리보기
- 대표 이미지 업로드·교체·삭제
- 공지 검색·분류·상태 필터
- 공개/예약/임시 저장 통계

### 보안

- 일반 방문자는 공개 시각이 지난 `published` 공지만 조회
- `admin_users`에 등록된 계정만 작성·수정·삭제
- 공지 이미지 Storage도 관리자만 업로드·삭제
- 브라우저에는 공개 anon/publishable key만 사용
- `service_role` 또는 secret key는 코드에 넣지 않음

## 적용 순서

1. 저장소 루트에 이 파일들을 업로드합니다.
2. `zomboid/supabase/setup.sql`을 Supabase SQL Editor에서 실행합니다.
3. Supabase Auth에서 관리자 사용자를 만든 뒤 `admin_users`에 등록합니다.
4. `zomboid/config.js`에 Project URL과 anon/publishable key를 입력합니다.
5. Steam 컬렉션, 디스코드, 서버 주소 등 나머지 설정을 `config.js`에 입력합니다.
6. GitHub Pages 배포 후 `/games/zomboid/admin/`에서 로그인합니다.

자세한 Supabase 설정은 `zomboid/supabase/README.md`를 확인합니다.
