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

## 코드 스타일 / 품질 가이드라인
- **Lint** : ESLint(airbnb‑typescript) + Prettier 자동 적용  
  - 커밋 전에 `npm run lint && npm run format` 필수
- **타입** : `any` 사용 금지. 필요하면 `unknown` → 좁히기.
- **모듈/파일 규칙**  
  - React 컴포넌트: PascalCase 파일명, 훅: useCamelCase.ts  
  - API 유틸: `/server/services/**`, `/client/lib/api/**`
- **커밋 메시지** : `feat:`, `fix:`, `refactor:`, `chore:` 패턴 유지

## 테스트 & 배포 전략
1. **단위 테스트** (Jest + Testing‑Library)  
   - 훅·유틸 함수는 커버리지 80% 이상
2. **엔드 투 엔드 체크리스트** (매 PR 머지 전)  
   - 로그인 → 캠페인 리스트 → 상세 → 수정 → 로그아웃 흐름
   - 병원 A 관리자가 병원 B 데이터 접근 시 **403** 확인
3. **Replit 워크플로**  
   - `npm run build` 성공 + `npm run test` 통과 시에만 `Redeploy`

## 오류 처리 컨벤션
| 유형 | HTTP Status | 사용자 메시지 | 콘솔/로그 |
|------|------------|---------------|-----------|
| 인증 실패 | 401 | “로그인이 필요합니다.” | warn |
| 권한 부족 | 403 | “접근 권한이 없습니다.” | warn |
| 리소스 없음 | 404 | “요청하신 정보를 찾을 수 없습니다.” | info |
| 서버 예외 | 500 | “잠시 후 다시 시도해주세요.” | error |

> **주의** : 서버에서 5xx 발생 시 Sentry(`server/utils/sentry.ts`)로 자동 전송

## UI/UX 원칙
- **모바일 우선** (최소 360 px) → 데스크톱 확장
- **상태 피드백**   
  - 로딩: Skeleton 또는 Spinner  
  - 성공: Toast(성공) 1.5 s  
  - 실패: Toast(오류) + Retry 버튼
- **불변 필드 시각화** : 읽기 전용 input (`readOnly` + bg‑gray‑100)

## 기능 우선순위(2024‑Q2)
1. 병원 캠페인 CRUD 완결 (권한 검증 포함)
2. 관리자 대시보드 통계(병원별 호출량)
3. 이미지 → 스티커 변환 속도 개선
4. 테스트 자동화 ✅

## 라플이 실수 방지 Guardrails
- **API 경로 체크** 헬퍼 `assertApiPrefix(role, path)` 를 서버 미들웨어에 추가해 잘못된 엔드포인트 사용 시 바로 400 반환.
- **queryFn 누락** 검출: 커스텀 ESLint rule `no-missing-queryfn` 추가.
- **hospital_id 빠짐** 방지: 프론트 훅 `useHospitalFetch` 통일 → 파라미터에 자동 삽입.
- **비밀키 노출** 방지: `.replitignore` + Replit Secrets CI 검사.

