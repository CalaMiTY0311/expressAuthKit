## 회원가입 (User Registration)

사용자 계정 생성 및 로그인 세션 설정을 위한 엔드포인트입니다.

### 요청 정보

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **미들웨어**: `blockAgainLogin` (이미 로그인된 사용자 체크)

### 요청 본문 (Request Body)

| 필드명    | 타입     | 필수 여부 | 설명                     |
|---------|----------|---------|-------------------------|
| email   | String   | 필수     | 사용자 이메일 주소 (유효성 검사 적용)  |
| password| String   | 필수     | 사용자 비밀번호 (최소 8자 이상) |

### 응답 정보

#### 성공 (Success)

- **Status Code**: `201 Created`
- **Content-Type**: `application/json`
- **쿠키 설정**: 
  - `SID`: 세션 ID (HttpOnly, Secure)
  - `UID`: 사용자 ID (HttpOnly, Secure)
- **참고**:`개발 환경에서 작동하는 쿠키 설정으로 배포버전에서는 그에 맞게 설정해야함`

```json
{
  "msg": "회원가입 성공",
  "user": {
    "_id": "nanoid로 생성된 고유 ID",
    "email": "사용자 이메일",
    // userSchema에 정의된 다른 필드들...
    // (password는 해시화되어 저장됨)
  }
}
```

#### 오류 (Error)

1. **유효성 검사 실패**
   - **Status Code**: `400 Bad Request`
   - **Content-Type**: `application/json`

   ```json
   
    "data": {
        "msg": "유효한 이메일을 입력하세요" | "비밀번호는 최소 8자 이상이어야 합니다"
    }

   ```

2. **이미 존재하는 이메일**
   - **Status Code**: `409 Conflict`
   - **Content-Type**: `application/json`

   ```json
   "data": {
       "msg": "이미 가입된 이메일 입니다."
    }
   ```

3. **현재 로그인 상태**
   - **Status Code**: `403 Conflict`
   - **Content-Type**: `application/json`

   ```json
   "data": {
        "msg": "이미 로그인된 상태로 로그아웃이 필요"
    }
   ```

4. **서버 오류**
   - **Status Code**: `500 Internal Server Error`
   - **Content-Type**: `application/json`

   ```json
   "data": {
        "msg": "어스 서버 회원 가입 에러발생 : [오류 상세 내용]"
    }
   ```

### 세션 관리

회원가입 성공 시 자동으로 로그인 세션이 생성됩니다:

- 두 개의 쿠키가 설정됩니다:
  - `SID`: 세션 식별자 (UUID v4)
  - `UID`: 사용자 식별자
- 두 쿠키 모두 HttpOnly, Secure 속성이 설정됩니다
- 쿠키 유효 기간: 10시간 (36000초)
- Redis에 세션 정보가 저장됩니다:
  - 키: `session:{SID}`
  - 값: `{ "UID": "사용자_ID" }`
  - 만료 시간: 1시간 (3600초)

### 참고 사항

- 사용자 ID는 `nanoid` 라이브러리를 사용하여 생성되며, 중복 검사를 통해 고유성을 보장합니다.
- 비밀번호는 bcrypt를 사용하여 해시화되어 저장됩니다(해시 강도: 10).
- 요청 본문에 포함되지 않은 필드는 `userSchema`에 정의된 기본값으로 설정됩니다.
- `againLoginCheck` 미들웨어를 통해 이미 로그인된 사용자의 회원가입 시도를 방지합니다.