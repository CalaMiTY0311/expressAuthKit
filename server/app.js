const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');

const registerRouter = require('./apis/auth/register');
const loginRouter = require('./apis/auth/login');
const logoutRouter = require('./apis/auth/logout');
const socielLogins = require('./apis/auth/socielLogins');
const accountOptions = require('./apis/auth/accountOptions');

const { redisClient } = require('./apis/dependencie');

const session = require('express-session');
const RedisStore = require('connect-redis').RedisStore;
// 패스포트 설정
const passport = require('passport');
const passportConfig = require('./apis/passport');

const HTTP_PORT = 5050;

    const app = express();
    passportConfig();

    // 미들웨어 설정 - 순서 중요
    app.use(cookieParser(process.env.COOKIE_SECRET || 'default_secret_key'))
    app.use(express.json()); // 요청 본문 파싱
    app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true
    }));
    
    app.use(
      session({
        name: "SID",
        store: new RedisStore({ client: redisClient }),
        resave: false,
        saveUninitialized: false,
        secret: process.env.COOKIE_SECRET || 'default_secret_key',
        cookie: {
          httpOnly: true,
          secure: false,
          maxAge: 1000 * 60 * 60 * 24, // 1일 (필요에 따라 조정)
        },
      })
    )

    app.use(passport.initialize()); // 요청 객체에 passport 설정을 심음
    app.use(passport.session()); // req.session 객체에 passport정보를 추가 저장

    // 라우터 설정
    app.use('/auth', registerRouter);
    app.use('/auth', loginRouter);
    app.use('/auth', logoutRouter);
    app.use('/auth', socielLogins);
    app.use('/auth', accountOptions);
    
    // 에러 핸들링 미들웨어 - 마지막에 배치
    app.use((err, req, res, next) => {
        console.error("Internal Error:", err.message); // 서버 에러 로그
        res.status(500).json({ msg: "서버에서 문제가 발생했습니다. 다시 시도해주세요." });
    });

    // 워커 프로세스 ID 표시 엔드포인트 추가
    app.get('/', (req, res) => {
        res.json({ 
            message: `Server is running on port ${req.secure ? HTTPS_PORT : HTTP_PORT}`, 
            workerId: process.pid 
        });
    });

    app.get('/reset-redis', async (req, res) => {
        try {
            await redisClient.flushAll();
            console.log('Redis 데이터 초기화 완료!');
            res.status(200).send('Redis 데이터 초기화 완료!');
        } catch (error) {
            console.error('Redis 초기화 중 오류 발생:', error);
            res.status(500).send('Redis 초기화 오류');
        }
    });

    app.get('/redis', async (req, res) => {
        try {
            const keys = await redisClient.keys('*');
            const result = {};

            for (const key of keys) {
                const type = await redisClient.type(key);
                
                if (type === 'string') {
                    result[key] = await redisClient.get(key);
                } else if (type === 'set') {
                    result[key] = await redisClient.sMembers(key);
                } else {
                    result[key] = `Unsupported type: ${type}`;
                }
            }

            res.json(result);
        } catch (error) {
            console.error('Redis 조회 중 오류 발생:', error);
            res.status(500).json({ error: 'Redis 조회 중 오류 발생' });
        }
    });
    
    http.createServer(app).listen(HTTP_PORT);
    console.log(HTTP_PORT)
    
  module.exports = app