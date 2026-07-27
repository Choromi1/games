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
