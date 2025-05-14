# User Preferences
This file contains preferences for how the agent will work with the user. It can be updated by both the user and the agent.

Preferred communication style: Simple, everyday language.

## 작업 지침
이 섹션에는 에이전트가 따라야 할 특정 작업 지침이 포함됩니다.

### API 경로 및 권한 관리
- 병원 관리자용 API는 항상 `/api/hospital/` 경로로 시작해야 함
- 슈퍼 관리자용 API는 항상 `/api/admin/` 경로로 시작해야 함
- 병원 관리자는 자신의 병원 데이터만 접근 가능하도록 서버측에서 항상 검증 필요
- 권한 검사 실패 시 403 Forbidden 응답 반환 필요

### 병원 관리자 기능 개발 지침
- 병원 관리자 기능은 `/hospital/` 경로로 접근해야 함
- 병원 ID는 수정 불가능한 필드로 처리 (읽기 전용)
- 수정/삭제 시 항상 소속 병원 검증 후 처리
- 오류 발생 시 사용자 친화적인 메시지 표시

### React-Query 사용 지침 (2024-05 추가)
- **모든 `useQuery`/`useMutation` 호출에서 `queryKey` 와 `queryFn`을 반드시 함께 명시**한다.  
  - `queryFn` 생략 금지 — 생략 시 "Missing queryFn" 경고가 발생함
- 병원(tenant) 리소스를 조회하는 `queryFn` 내부에서는 **URL 또는 Body에 `hospital_id` 를 포함**한다.
- **서버 API** 역시 동일한 `hospital_id` 를 검증해 403 Forbidden을 반환해야 한다.
- 쿼리 오류 시에는 "현재 이미지생성 서비스가 금일 종료 되었습니다" 등 **사용자 친화적 메시지**를 화면에 표시한다.