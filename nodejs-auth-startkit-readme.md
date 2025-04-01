# NodeJS Auth Startkit

## 프로젝트 소개
이 프로젝트는 Node.js Express를 기반으로 한 세션 기반 인증 스타터킷입니다. MongoDB를 데이터베이스로 사용하고, Redis로 세션을 관리합니다.

## 기술 스택
- **Backend**: Node.js, Express.js
- **데이터베이스**: MongoDB
- **세션 관리**: Redis 인메모리 데이터 구조 저장소
- **컨테이너**: Docker

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
- 세션 기반 인증
- 보안 미들웨어
- 사용자 권한 관리

## 보안 기능
- 비밀번호 해싱
- CSRF 보호
- 세션 관리
- 입력값 검증

## 개발 환경
- 개발 서버: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`

## 기여 방법
1. 포크(Fork)를 생성하세요
2. 기능 브랜치를 생성하세요 (`git checkout -b feature/새로운기능`)
3. 변경사항을 커밋하세요 (`git commit -m '새로운 기능 추가'`)
4. 브랜치에 푸시하세요 (`git push origin feature/새로운기능`)
5. 풀 리퀘스트를 생성하세요

## 라이선스
[라이선스 정보 추가]

## 문의 및 지원
문제나 질문이 있으면 [이슈 트래커](https://github.com/your-username/nodejs-auth-startkit/issues)를 확인하세요.
