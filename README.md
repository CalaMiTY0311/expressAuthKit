# NodeJS Auth Startkit

## 프로젝트 소개
Node.js Express를 기반으로 한 세션 기반 사용자 인증 스타터킷입니다.
반복적인 사용자 인증 시스템 개발의 부담과 시간, 노력을 최소화의 목표를 가지고 만들게 되었습니다.

- **기술 스택**: Node.js, Express.js, MongoDB, Redis, Docker

## 사전 요구사항
- Docker

## 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/nodejs-auth-startkit.git
cd nodejs-auth-startkit
```

### 2. 환경 변수 설정
`.env` 파일을 프로젝트 루트에 생성하고 필요한 환경 변수를 설정하세요:
```
MONGODB_URI=mongodb://localhost:27017/authdb
REDIS_URI=redis://localhost:6379
SESSION_SECRET=your_session_secret
```

### 3. Docker로 실행
프로젝트 루트 디렉토리에서 다음 명령어를 실행하세요:
```bash
chmod +x start.sh
./start.sh
```

## 주요 기능
- 사용자 회원가입
- 로그인 / 로그아웃
- 세션 미들웨어 인증
- 사용자 정보 업데이트(단, 패스워드, 계정 삭제는 분리)

## 환경
- express: `http://localhost:5050`
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`

## API 문서는 밑 url을 참고해주세요.
https://expressauthkit.gitbook.io/expressauthkit

## 라이선스
MIT
