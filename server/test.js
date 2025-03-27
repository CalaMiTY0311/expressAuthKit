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

  const extractUID = (response) => {
    const setCookieHeader = response.headers['set-cookie'];
    const sidCookie = setCookieHeader.find(cookie => cookie.startsWith('UID='));
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

  const updateAccount = (sessionId, UID, data, expectedStatus) =>
    request(app)
      .put('/auth/updateAccount')
      .set('Cookie', [`SID=${sessionId}`, `UID=${UID}`]) // 쿠키 방식으로 수정
      .send(data)
      .expect(expectedStatus);

  const changePassword = (sessionId, UID, data, expectedStatus) =>
    request(app)
      .post('/auth/changePassword')
      .set('Cookie', [`SID=${sessionId}`, `UID=${UID}`]) // 쿠키 방식으로 수정
      .send(data)
      .expect(expectedStatus);

  const deleteAccount = (_id, sessionId, UID, expectedStatus) =>
    request(app)
      .delete(`/auth/deleteAccount/${_id}`)
      .set('Cookie', [`SID=${sessionId}`, `UID=${UID}`])
      .expect(expectedStatus);

  // 테스트 종료 후 정리
  afterAll(async () => {
    await mongo.deleteDB({ email: test_user.email });
    // 남은 모든 세션 정리를 위한 코드가 필요하다면 추가
  });

  test('1. 회원가입 프로세스', async () => {
    // 정상 회원가입
    const registerResponse = await register(test_user.email, test_user.password, 201);
    console.log(registerResponse)
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
    const sessionId = extractSessionId(loginResponse);
    expect(sessionId).toBeTruthy();

    const sessionData = await redisClient.get(`session:${sessionId}`);
    expect(sessionData).toBeTruthy();

    // 세션 정리
    await redisClient.del(`session:${sessionId}`);
  });

  test('3. 계정 업데이트 프로세스', async () => {

    // 비로그인 상태 (유효하지 않은 세션) 테스트
    await updateAccount("wrong_SID", "wrong_UID", { "asdf": 'Test' }, 401);

    const updateResponse = await login(test_user.email, test_user.password, 200);
    const sessionId = extractSessionId(updateResponse);
    const UID = extractUID(updateResponse);

    // 비어있는데 필드로 업데이트 시도
    await updateAccount(sessionId, UID, {}, 400);

   // 유효하지 않은 필드로 업데이트 시도
   await updateAccount(sessionId, UID, { "asdf": 'value' }, 422);
   await updateAccount(sessionId, UID, { username: '새이름', bio: '새 자기소개', asdf: 'asdf' }, 422);
   await updateAccount(sessionId, UID, { password: 'NewPassword123', asdf: "asdf" }, 422);

   // 중요 필드 수정방지 테스트
   await updateAccount(sessionId, UID, { password: 'qwer1234' }, 403);
   await updateAccount(sessionId, UID, { _id: 'qwer1234' }, 403);
   await updateAccount(sessionId, UID, { _id: 'qwer1234', createdAt: "asdf" }, 403);

   // 성공적인 업데이트
   await updateAccount(sessionId, UID, { username: '새이름' }, 200);
   await updateAccount(sessionId, UID, { username: '새이름', bio: '새 자기소개' }, 200);
    
   //세션 삭제
    await redisClient.del(`session:${sessionId}`);
  });

  test('4. 비밀번호 변경 프로세스', async () => {

    // 비로그인 상태 (유효하지 않은 세션) 테스트
    await changePassword("wrong_SID", "wrong_SID", { "asdf": 'Test' }, 401);

    const updateResponse = await login(test_user.email, test_user.password, 200);
    const sessionId = extractSessionId(updateResponse);
    const UID = extractUID(updateResponse);

    // 비어있는데 필드또는 패스워드가 미포함된 필드를 보냈을 경우
    await changePassword(sessionId, UID, {}, 400);
    await changePassword(sessionId, UID, { ASDF: "ASDF" }, 400);
    await changePassword(sessionId, UID, { ASDF: "ASDF", FDAS: "FDSA" }, 400);

    // 패스워드가 포함되었지만 그 외의 값도 포함되었을 경우
    await changePassword(sessionId, UID, { password: "asdf1234", asdf: "asdf" }, 400);

    // 패스워드 변경 성공 시 테스트
    await changePassword(sessionId, UID, { password: "asdf1234" }, 200);

    //세션 삭제
    await redisClient.del(`session:${sessionId}`);
  });

  test('5. 로그아웃 프로세스', async () => {

    // 유효하지 않은 세션과 UID 테스트
    await deleteAccount("asdfasdf", "wrong_session", "wrong_UID", 401);

    const updateResponse = await login(test_user.email, "asdf1234", 200);
    const sessionId = extractSessionId(updateResponse);
    const UID = extractUID(updateResponse);

    // 유효하지 않는 세션 테스트
    await deleteAccount(UID, "wrong_session", UID, 401);

    // 유효하지 않는 아이디    
    await deleteAccount("asdfasdf", sessionId, UID, 404);

    //유저 UID 쿠키 변조 체크
    await deleteAccount(UID, sessionId, "asdfase", 401);

    // 성공적인 계정 삭제 테스트
    await deleteAccount(UID, sessionId, UID, 200);

    const user = await mongo.selectDB({ _id: UID });
    expect(user.length).toBe(0);

    const sessionData = await redisClient.get(`session:${sessionId}`);
    expect(sessionData).toBeNull();

    await redisClient.del(`session:${sessionId}`);
  });
});