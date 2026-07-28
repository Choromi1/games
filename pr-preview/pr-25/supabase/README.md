# Supabase migrations

이 폴더가 공용 공지 데이터베이스 구조의 기준입니다. 운영 DB를 직접 수정한 뒤 끝내지 않고 같은 변경을 새 migration으로 기록합니다.

## 로컬 검증

Docker Desktop을 실행한 뒤 저장소 루트에서 실행합니다.

```powershell
npx.cmd --yes supabase@2.109.1 db reset
npx.cmd --yes supabase@2.109.1 db advisors --local
```

`db reset`이 끝나고 advisor 결과가 `No issues found`이면 migration 간 의존성과 기본 보안 검사가 통과한 것입니다.

운영 반영 전에는 다음 명령으로 적용 대상을 확인합니다.

```powershell
npx.cmd --yes supabase@2.109.1 db push --dry-run --linked
```

## 운영 설정 확인

SQL migration으로 관리할 수 없는 항목은 Supabase Dashboard에서 확인합니다.

- Authentication → Attack Protection → Leaked password protection 활성화
- Database Advisor의 Security 및 Performance 항목 재검사
- 적용 전 운영 DB 백업과 dry-run 결과 확인

PR의 migration은 `main`에 병합하기 전 반드시 SQL 내용을 검토합니다.

## Discord 공지 알림

`notify-discord-notice` Edge Function은 공지가 즉시 공개될 때 Discord
웹훅으로 한 번만 전송합니다.

- 임시 저장 공지는 전송하지 않습니다.
- 미래 공개 시각으로 저장한 공지는 자동 전송하지 않습니다.
- 이미 전송된 공지를 수정해도 다시 전송하지 않습니다.
- 기존 공개 공지는 migration 적용 시 소급 전송하지 않습니다.
- Discord의 일시적인 오류는 한 호출 안에서 최대 3회 재시도합니다.

운영 프로젝트의 Edge Function Secrets에는 다음 값을 등록합니다.

```text
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

웹훅 URL은 저장소, 브라우저 JavaScript 또는 SQL migration에 기록하지
않습니다. Database Vault에는 Edge Function 호출용 URL과 임의 토큰을
각각 `notice_discord_function_url`,
`notice_discord_dispatch_token` 이름으로 저장합니다.
