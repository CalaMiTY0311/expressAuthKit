const request = require('supertest');
const ControlMongo = require("./src/util/mongoDB")
const app = require('./app'); // Express 앱
const AuthController = require('./apis/auth/authController')
const { mongo, redisClient } = require('./apis/dependencie')


describe('사용자 인증 테스트', () => {
  // 테스트 데이터 정의
  const test_user = {
    email: 'test@example.com',
    password: 'Password123!'
  };
  
  // 헬퍼 함수들
  const extractSessionId = (response) => {
    const setCookieHeader = response.headers['set-cookie'];
    const sidCookie = setCookieHeader.find(cookie => cookie.startsWith('SID='));
    return sidCookie ? sidCookie.split('=')[1].split(';')[0] : null;
  };

  const register = (email, password, expectedStatus) => 
    request(app)
      .post('/auth/register')
      .send({ email, password })
      .expect(expectedStatus);
  
  const login = (email, password, expectedStatus) => 
    request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(expectedStatus);

      const updateAccount = (sessionId, data, expectedStatus) => 
        request(app)
          .put('/auth/updateAccount')
          .set('Cookie', [`SID=${sessionId}`]) // 쿠키 방식으로 수정
          .send(data)
          .expect(expectedStatus);
  
  // 테스트 종료 후 정리
  afterAll(async () => {
    await mongo.deleteDB({ email: test_user.email });
    // 남은 모든 세션 정리를 위한 코드가 필요하다면 추가
  });
  
  test('1. 회원가입 프로세스', async () => {
    // 정상 회원가입
    const registerResponse = await register(test_user.email, test_user.password, 201);
    
    // 세션 확인
    const sessionId = extractSessionId(registerResponse);
    expect(sessionId).toBeTruthy();
    
    const sessionData = await redisClient.get(`session:${sessionId}`);
    expect(sessionData).toBeTruthy();
    
    // 사용자 DB 확인
    const users = await mongo.selectDB({ email: test_user.email });
    expect(users.length).toBeGreaterThan(0);
    
    // 중복 회원가입 시도
    await register(test_user.email, test_user.password, 409);
    
    // console.log(sessionId)
    // 세션 정리
    await redisClient.del(`session:${sessionId}`);
  });
  
  test('2. 로그인 프로세스', async () => {
    // 잘못된 이메일로 로그인
    await login('wrong@example.com', 'Password123', 401);
    
    // 잘못된 비밀번호로 로그인
    await login(test_user.email, 'WrongPassword123', 401);
    
    // 정상 로그인
    const loginResponse = await login(test_user.email, test_user.password, 200);
    
    // 세션 확인
    const sessionId = extractSessionId(loginResponse);
    expect(sessionId).toBeTruthy();
    
    const sessionData = await redisClient.get(`session:${sessionId}`);
    expect(sessionData).toBeTruthy();
    
    // 세션 정리
    await redisClient.del(`session:${sessionId}`);
  });
  
  test('3. 계정 업데이트 프로세스', async () => {

  // 비로그인 상태 (유효하지 않은 세션) 테스트
    await updateAccount("wrong_SID", {"asdf": 'Test' }, 403);
    
    const updateResponse = await login(test_user.email, test_user.password, 200);
    const sessionId = extractSessionId(updateResponse);
    console.log(sessionId)
    expect(sessionId).toBeTruthy();

    // 비어있는데 필드로 업데이트 시도
    await updateAccount(sessionId, {}, 400);

    // 유효하지 않은 필드로 업데이트 시도
    await updateAccount(sessionId, { "asdf": 'value' }, 422);

    // 비밀번호 변경 시도
    await updateAccount(sessionId, { password: 'NewPassword123' }, 400);
    
  //   // 빈 데이터 업데이트 시도
  //   await updateAccount(sessionId, {}, 400);
    
  //   // 성공적인 업데이트
  //   const validUpdateResponse = await updateAccount(sessionId, { name: '새이름', bio: '새 자기소개' }, 200);
  //   expect(validUpdateResponse.body.user).toHaveProperty('name', '새이름');
  //   expect(validUpdateResponse.body.user).toHaveProperty('bio', '새 자기소개');
    
  //   // 세션 정리
    await redisClient.del(`session:${sessionId}`);
  });
});