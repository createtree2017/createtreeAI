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