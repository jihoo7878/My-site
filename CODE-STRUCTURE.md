# STUDY FLOW 코드 구조 검토본

이 폴더는 `index.html`의 화면과 기존 데이터·인증 흐름을 유지하면서 코드를 기능별 파일로 나눈 검토 사본입니다. 운영 사이트에 반영된 버전은 아닙니다.

## 파일 구성

- `index.html`: 앱 마크업, Supabase 브라우저 라이브러리와 앱 스크립트 연결
- `css/study-flow.css`: 기존 스타일
- `js/data-model.js`: 기본 데이터, 데이터 정규화, 공통 날짜·시간·DOM 헬퍼
- `js/todo-management.js`: 할 일 상태, 렌더링, 할 일 이벤트 처리
- `js/grade-management.js`: 성적 화면과 성적 이벤트 처리
- `js/calendar.js`: 캘린더 상태, 공휴일, 렌더링, 날짜·일정 이벤트 처리
- `js/school-timetable.js`: 학교 시간표 화면, 설정, NEIS 조회 함수
- `js/app-core.js`: 주간 플래너, 공통 화면·모달, 강의·기록 관리 및 초기 실행
- `js/learning-analytics.js`: 분석 데이터 모델·렌더링, 회고 UI
- `js/auth-sync.js`: 기존 로그인과 계정 데이터 동기화
- `js/navigation.js`: 스와이프 메뉴 이동
- `js/timers.js`: 타이머 보조 처리

## 스크립트 로드 순서

`index.html`의 순서는 전역 함수와 초기화 의존성을 고려해 지정했습니다. `data-model.js`, 할 일·성적·캘린더·시간표 모듈은 `app-core.js`의 초기 렌더보다 먼저 로드합니다. 분석 모듈은 앱 코드 뒤, 인증 복원 코드 앞에 둡니다. `auth-sync.js`가 학교 시간표 초기화를 호출합니다.

```text
data-model → todo-management → grade-management → calendar → school-timetable
→ app-core → learning-analytics → auth-sync → navigation → timers
```

## GitHub 반영 전 확인 사항

1. `index.html`만 바꾸지 말고 `css/`와 `js/` 폴더를 포함해 이 폴더 구조를 함께 유지합니다.
2. `<script>` 순서와 상대 경로를 유지합니다.
3. 운영 `main` 변경은 Cloudflare Pages 배포로 이어질 수 있으므로, 별도 브랜치의 미리보기에서 검증한 뒤 병합합니다.
4. 로컬 검토에서는 초기 화면 렌더, 스크립트 구문, 파일 경로, 중복 ID, CSS 중괄호를 확인했습니다.
5. 로그인, Supabase 데이터 읽기·쓰기, 저장된 학교 설정을 이용한 NEIS 조회는 실행하지 않았습니다.
