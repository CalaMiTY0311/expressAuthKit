const request = require('supertest');
const ControlMongo = require("./src/util/mongoDB")
const app = require('./app'); // Express 앱
const AuthController = require('./apis/auth/authController')
const { mongo, redisClient } = require('./apis/dependencie')


describe('사용자 인증 테스트', () => {
  
  const context = {
    user: {
      email: 'test@example.com',
      password: 'Password123!'
    },
    responses: {}
  };
  
    // 테스트 후 정리
    afterAll(async () => {
      // 테스트 후 생성된 테스트 사용자 삭제
      await mongo.deleteDB({ email: context.user.email });
    });
  
    // 회원가입 테스트
    describe('사용자 인증 테스트', () => {
        test('1. 회원 가입', async () => {
          //register 엔드포인트로 테스트계정으로 로그인
          context.responses.register = await request(app)
      .post('/auth/register')
      .send(context.user);
      
      console.log(context)
      const setCookieHeader = context.responses.register.headers['set-cookie'];
      const sidCookie = setCookieHeader.find(cookie => cookie.startsWith('SID='));
      const SID = sidCookie && sidCookie.split('=')[1].split(';')[0];  // SID 값을 추출

      // 세션값이 레디스에 존재하는지 검사
      const checkSID = await redisClient.get(`session:${SID}`);
      // const checkSID = await redisClient.get(`session:"asdf"`);
      // console.log(checkSID)
      expect(checkSID).toBeTruthy();

        // 회원가입 후 사용자가 데이터베이스에 존재하는지 확인
        const users = await mongo.selectDB({ email: context.user.email });
        expect(users.length).toBeGreaterThan(0);
        const user = users[0];
        expect(user.email).toEqual('test@example.com');
        expect(context.responses.register.status).toBe(201);

        // 동일 이메일로 회원가입 시 에러 테스트
        context.responses.register = await request(app)
      .post('/auth/register')
      .send(context.user);
        expect(context.responses.register.status).toEqual(409);
      });

      // test('2. 로그인 테스트', async () => {
      //   // 로그인 유효성 검사
      //   wrong_req = {
      //     body: {
      //       email: 'test@example.com',
      //       password: 'Password123!1'
      //     }
      //   };
      //   let result = await AuthController.login(wrong_req);
      //   expect(result.status).toEqual(401);

      //   // 로그인 검사
      //   result = await AuthController.login(req);

      // });
    });
  });