# Choromi Game Servers

GitHub Pages에서 게임별 서버 정보와 공용 공지를 제공합니다.

## 주요 주소

- 게임 허브: `https://choromi1.github.io/games/`
- 전체 공지: `https://choromi1.github.io/games/notices/`
- Project Zomboid 공지: `https://choromi1.github.io/games/notices/?game=zomboid`
- Valheim 공지: `https://choromi1.github.io/games/notices/?game=valheim`
- 공지 관리자: `https://choromi1.github.io/games/admin/`
- Project Zomboid: `https://choromi1.github.io/games/zomboid/`
- Valheim: `https://choromi1.github.io/games/Valheim/`

기존 `/zomboid/notices/`와 `/zomboid/admin/` 주소는 공용 페이지로 자동 연결됩니다.

## 폴더 구조

```text
games/
├─ admin/                         # 공용 공지 관리자
├─ notices/                       # 공용 공지 목록·상세
├─ shared/
│  ├─ notice-config.js            # 브라우저용 Supabase 공개 설정
│  ├─ notice-service.js           # 게임별 공지 조회 공용 기능
│  └─ notices.css                 # 공지·관리자 공용 스타일
├─ supabase/
│  ├─ migrations/                 # 운영 DB 변경 이력
│  └─ README.md                   # 로컬 검증과 운영 적용 안내
├─ Valheim/
├─ zomboid/
└─ index.html
```

## 공지 기능

- `game_key`를 기준으로 전체 또는 게임별 공개 공지 조회
- 잘못된 게임 키는 전체 공지로 우회하지 않고 오류 표시
- 공지 상세 URL에서도 게임 문맥 유지
- 게임 메인 페이지에는 해당 게임 공지만 표시
- 관리자에서 대상 게임 선택, 게임별 필터, 작성·수정·삭제
- 공개·예약·임시 저장, Markdown, 대표 이미지, 상단 고정
- Supabase Realtime 자동 새로고침

## 보안 원칙

- 일반 방문자는 공개 시각이 지난 `published` 공지만 조회
- `admin_users`에 등록된 사용자만 공지와 이미지를 변경
- 공개 Storage URL은 사용할 수 있지만 버킷 파일 목록은 공개하지 않음
- 관리자 판별 함수는 Data API에 노출되지 않는 `private` 스키마에 위치
- 브라우저에는 publishable key만 사용하고 `service_role` 키는 넣지 않음

DB 변경과 로컬 검증 방법은 [`supabase/README.md`](supabase/README.md)를 확인합니다.
