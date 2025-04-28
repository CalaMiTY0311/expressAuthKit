const request = require('supertest');
const app = require('./app'); // Express 앱
const { mongo, redisClient } = require('./apis/dependencie');

describe('사용자 인증 테스트', () => {
  // 테스트 데이터 정의
  const test_user = {
    email: 'test@example.com',
    username: 'TestUser',
    password: 'Password123!'
  };

  let userId = null;
  let sessionId = null;

  // 헬퍼 함수들
  const extractCookie = (response, cookieName) => {
    const setCookieHeader = response.headers['set-cookie'];
    if (!setCookieHeader) return null;
    
    const cookie = setCookieHeader.find(cookie => cookie.startsWith(`${cookieName}=`));
    return cookie ? cookie.split('=')[1].split(';')[0] : null;
  };

  // 테스트 종료 후 정리
  afterAll(async () => {
    // 테스트 사용자 삭제
    await mongo.deleteDB({ email: test_user.email });
    
    // 세션 정리
    if (sessionId) {
      await redisClient.del(`sess:${sessionId}`);
    }
    
    // Redis 연결 종료
    await redisClient.quit();
  });

  // 1. 회원가입 테스트
  describe('회원가입 테스트', () => {
    test('정상적인 회원가입 요청이 성공해야 함', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: test_user.email,
          username: test_user.username,
          password: test_user.password
        });

      expect(response.status).toBe(201);
      expect(response.body.msg).toBeTruthy();
      
      // 사용자가 DB에 저장되었는지 확인
      const users = await mongo.selectDB({ email: test_user.email });
      expect(users.length).toBe(1);
      userId = users[0]._id;
    });

    test('이미 존재하는 이메일로 회원가입 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: test_user.email,
          username: 'AnotherUser',
          password: 'AnotherPassword123!'
        });

      expect(response.status).toBe(409);
    });

    test('유효하지 않은 형식의 데이터로 회원가입 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short'
        });

      expect(response.status).toBe(400);
    });
  });

  // 2. 로그인 테스트
  describe('로그인 테스트', () => {
    test('잘못된 이메일로 로그인 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: test_user.password
        });

      expect(response.status).toBe(401);
    });

    test('잘못된 비밀번호로 로그인 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: test_user.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
    });

    test('정상적인 로그인 요청이 성공해야 함', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: test_user.email,
          password: test_user.password
        });

      expect(response.status).toBe(200);
      expect(response.body.msg).toBe('로그인 성공');
      expect(response.body.user).toBeTruthy();
      
      // 세션 쿠키 저장
      sessionId = extractCookie(response, 'SID');
      expect(sessionId).toBeTruthy();
    });
  });

  // 3. 사용자 정보 조회 테스트
  describe('사용자 정보 조회 테스트', () => {
    test('인증 없이 사용자 정보 조회 시 실패해야 함', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });

    test('인증된 사용자의 정보 조회가 성공해야 함', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', [`SID=${sessionId}`]);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeTruthy();
      expect(response.body.user.email).toBe(test_user.email);
    });
  });

  // 4. 계정 정보 업데이트 테스트
  describe('계정 정보 업데이트 테스트', () => {
    test('인증 없이 계정 정보 업데이트 시 실패해야 함', async () => {
      const response = await request(app)
        .put('/auth/updateAccount')
        .send({
          username: 'UpdatedName'
        });

      expect(response.status).toBe(401);
    });

    test('정상적인 계정 정보 업데이트가 성공해야 함', async () => {
      const response = await request(app)
        .put('/auth/updateAccount')
        .set('Cookie', [`SID=${sessionId}`])
        .send({
          username: 'UpdatedName',
          bio: '프로필 자기 소개'
        });

      expect(response.status).toBe(200);
      
      // 정보가 업데이트되었는지 확인
      const users = await mongo.selectDB({ _id: userId });
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('UpdatedName');
      expect(users[0].bio).toBe('프로필 자기 소개');
    });
  });
  
  // 5. 비밀번호 변경 테스트
  describe('비밀번호 변경 테스트', () => {
    test('인증 없이 비밀번호 변경 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/changePassword')
        .send({
          password: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
    });

    test('유효하지 않은 비밀번호로 변경 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/changePassword')
        .set('Cookie', [`SID=${sessionId}`])
        .send({
          password: 'short'
        });

      expect(response.status).toBe(400);
    });

    test('정상적인 비밀번호 변경이 성공해야 함', async () => {
      const response = await request(app)
        .post('/auth/changePassword')
        .set('Cookie', [`SID=${sessionId}`])
        .send({
          password: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      
      // 변경된 비밀번호로 로그인 확인
      await request(app)
        .post('/auth/logout')
        .set('Cookie', [`SID=${sessionId}`]);
      
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: test_user.email,
          password: 'NewPassword123!'
        });
      
      expect(loginResponse.status).toBe(200);
      sessionId = extractCookie(loginResponse, 'SID');
    });
  });

  // 6. 2단계 인증 설정 테스트 (TOTP 없는 일반 테스트)
  describe('2단계 인증 설정 테스트', () => {
    test('인증 없이 2단계 인증 설정 변경 시 실패해야 함', async () => {
      const response = await request(app)
        .post('/auth/toggleTotp')
        .send({
          enable: true
        });

      expect(response.status).toBe(401);
    });

    test('2단계 인증 활성화가 성공해야 함', async () => {
      const response = await request(app)
        .post('/auth/toggleTotp')
        .set('Cookie', [`SID=${sessionId}`])
        .send({
          enable: true
        });

      expect(response.status).toBe(200);
      expect(response.body.totpEnable).toBe(true);
      
      // 사용자 정보 확인
      const users = await mongo.selectDB({ _id: userId });
      expect(users.length).toBe(1);
      expect(users[0].totpEnable).toBe(true);
    });

    test('2단계 인증 비활성화가 성공해야 함', async () => {
      const response = await request(app)
        .post('/auth/toggleTotp')
        .set('Cookie', [`SID=${sessionId}`])
        .send({
          enable: false
        });

      expect(response.status).toBe(200);
      expect(response.body.totpEnable).toBe(false);
      
      // 사용자 정보 확인
      const users = await mongo.selectDB({ _id: userId });
      expect(users.length).toBe(1);
      expect(users[0].totpEnable).toBe(false);
    });
  });

  // 7. 로그아웃 테스트
  describe('로그아웃 테스트', () => {
    test('인증 없이 로그아웃 시 실패하지 않음 (세션이 없어도 성공해야 함)', async () => {
      const response = await request(app)
        .get('/auth/logout');

      expect(response.status).toBe(200);
    });

    test('정상적인 로그아웃이 성공해야 함', async () => {
      // 먼저 로그인
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: test_user.email,
          password: 'NewPassword123!'
        });
      
      expect(loginResponse.status).toBe(200);
      const newSessionId = extractCookie(loginResponse, 'SID');
      
      // 로그아웃
      const response = await request(app)
        .get('/auth/logout')
        .set('Cookie', [`SID=${newSessionId}`]);

      expect(response.status).toBe(200);
      
      // 세션이 삭제되었는지 확인 (세션 쿠키가 클리어되는지)
      expect(response.headers['set-cookie']).toBeTruthy();
      const logoutCookie = response.headers['set-cookie'].find(cookie => cookie.startsWith('SID='));
      expect(logoutCookie).toContain('Max-Age=0');
    });
  });

  // 8. 계정 삭제 테스트
  describe('계정 삭제 테스트', () => {
    let finalSessionId = null;

    beforeEach(async () => {
      // 테스트 실행 전 로그인
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: test_user.email,
          password: 'NewPassword123!'
        });
      
      finalSessionId = extractCookie(loginResponse, 'SID');
    });

    test('인증 없이 계정 삭제 시 실패해야 함', async () => {
      const response = await request(app)
        .delete(`/auth/deleteAccount/${userId}`);

      expect(response.status).toBe(401);
    });

    test('타인의 계정 삭제 시도 시 실패해야 함', async () => {
      const response = await request(app)
        .delete(`/auth/deleteAccount/someOtherId`)
        .set('Cookie', [`SID=${finalSessionId}`]);

      expect(response.status).toBe(403);
    });

    test('정상적인 계정 삭제가 성공해야 함', async () => {
      const response = await request(app)
        .delete(`/auth/deleteAccount/${userId}`)
        .set('Cookie', [`SID=${finalSessionId}`]);

      expect(response.status).toBe(200);
      
      // 계정이 삭제되었는지 확인
      const users = await mongo.selectDB({ _id: userId });
      expect(users.length).toBe(0);
    });
  });
});
