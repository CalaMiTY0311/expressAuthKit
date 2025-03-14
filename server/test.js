const request = require('supertest');
const ControlMongo = require("./src/util/mongoDB")
const app = require('./app'); // Express 앱
const AuthController = require('./apis/auth/authController')
const { mongo, redisClient } = require('./apis/dependencie')


describe('사용자 인증 테스트', () => {
  
  let SID;
  
  const test_user = {
      email: 'test@example.com',
      password: 'Password123!'
    }

  
    // 테스트 후 정리
    afterAll(async () => {
      // 테스트 후 생성된 테스트 사용자 삭제
      await mongo.deleteDB({ email: 'test@example.com' });
    });
  
    // 회원가입 테스트
    describe('사용자 인증 테스트', () => {
        test('1. 회원 가입', async () => {
          const registerTest = async (email, password, statusCode) => { // statusCode <= 예상 스테이터스 코드
            const response = await request(app)
                .post('/auth/register')
                .send({ email, password });
            expect(response.status).toBe(statusCode); // response.status의 코드와 statusCode 예상 스테이터스 코드가 같으면 테스트 통과
            // console.log(response.header)
            return response;
        };
      
      // 정상 회원가입 
      const response = await registerTest(test_user.email, test_user.password, 201);
      // 정상 회원가입 시 쿠키에 세션값 확인 및 레디스에 세션이 존재하는지 확인
      const setCookieHeader = response.headers['set-cookie'];
      const sidCookie = setCookieHeader.find(cookie => cookie.startsWith('SID='));
      const SID = sidCookie && sidCookie.split('=')[1].split(';')[0];
      const checkSID = await redisClient.get(`session:${SID}`);
      expect(checkSID).toBeTruthy();   // 세션값이 null이 아니면 통과

        // mongoDB 회원가입 후 사용자가 데이터베이스에 존재하는지 확인
        const users = await mongo.selectDB({ email: test_user.email });
        expect(users.length).toBeGreaterThan(0);

        // 테스트 종료 전 레디스에 저장한 세션 제거
        await registerTest(test_user.email, test_user.password, 409);

        await redisClient.del(`session:${SID}`);
      });

      test('2. 로그인 테스트', async () => {

        const loginTest = async (email, password, expectedStatus) => {
          const response = await request(app)
              .post('/auth/login')
              .send({ email, password });
          expect(response.status).toBe(expectedStatus);
          // console.log(response.header)
          return response;
      };

      // 잘못된 이메일로 로그인 시도
    await loginTest('wrong@example.com', 'Password123', 401);

    // 잘못된 비밀번호로 로그인 시도
    await loginTest('test@example.com', 'WrongPassword123', 401);

    // 정상 로그인 시도
    const response = await loginTest('test@example.com', 'Password123!', 200, '비밀번호가 일치하지 않습니다.');
    // 세션 체크
      const setCookieHeader = response.headers['set-cookie'];
      const sidCookie = setCookieHeader.find(cookie => cookie.startsWith('SID='));
      const SID = sidCookie && sidCookie.split('=')[1].split(';')[0];  // SID 값을 추출
      const checkSID = await redisClient.get(`session:${SID}`);
      expect(checkSID).toBeTruthy();
      });
    });

    test('3. ', async () => {
      
    })

  });