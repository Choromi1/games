# Supabase 공지 시스템 설정

## 1. 프로젝트 생성

Supabase에서 새 프로젝트를 만든 뒤 `SQL Editor`에서 `setup.sql` 전체를 실행합니다.

## 2. 관리자 계정 생성

`Authentication → Users → Add user`에서 관리자 이메일과 비밀번호를 생성합니다.
이후 SQL Editor에서 아래 구문의 이메일을 바꿔 실행합니다.

```sql
insert into public.admin_users (user_id, display_name)
select id, 'Choromi'
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (user_id) do update set display_name = excluded.display_name;
```

## 3. 공개 클라이언트 키 입력

`Project Settings → API`에서 Project URL과 anon/publishable key를 확인하고
`../config.js`의 두 값을 교체합니다.

```js
supabaseUrl: "https://프로젝트ID.supabase.co",
supabaseAnonKey: "공개 anon 또는 publishable key"
```

`service_role` 또는 secret key는 브라우저 파일에 절대 넣지 않습니다.

## 4. 로그인

배포 후 아래 주소에서 로그인합니다.

`https://choromi1.github.io/games/zomboid/admin/`

## 포함 기능

- 공개 공지 조회
- 전체 공지 목록·검색·카테고리 필터·페이지 이동
- 관리자 이메일/비밀번호 로그인
- 공지 작성·수정·삭제
- 중요 공지 상단 고정
- 임시 저장·즉시 공개·예약 공개
- Markdown 본문 및 미리보기
- 대표 이미지 업로드(최대 5MB)
- Realtime 자동 갱신
- Row Level Security 기반 권한 분리
