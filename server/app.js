require('dotenv').config(); // .env 파일 로드
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const session = require('express-session');
const RedisStore = require('connect-redis').RedisStore;
const passport = require('passport');

// 라우터 불러오기
const registerRouter = require('./apis/auth/register');
const loginRouter = require('./apis/auth/login');
const logoutRouter = require('./apis/auth/logout');
const socielLogins = require('./apis/auth/socielLogins');
const options = require('./apis/auth/options');

// 의존성 불러오기
const { redisClient } = require('./apis/dependencie');
const passportConfig = require('./apis/passport');

// 환경 변수 설정
const HTTP_PORT = process.env.HTTP_PORT || 5050;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'default_secret_key';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 서버 초기화
const app = express();

// Passport 설정 초기화
passportConfig();

// 미들웨어 설정 - 순서 중요
app.use(cookieParser(COOKIE_SECRET));
app.use(express.json()); // 요청 본문 파싱
app.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true
}));

// 세션 설정
app.use(
  session({
    name: "SID",
    store: new RedisStore({ client: redisClient }),
    resave: false,
    saveUninitialized: false,
    secret: COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24, // 1일
    },
  })
);

// Passport 미들웨어 설정
app.use(passport.initialize());
app.use(passport.session());

// 라우터 설정
app.use('/auth', registerRouter);
app.use('/auth', loginRouter);
app.use('/auth', logoutRouter);
app.use('/auth', socielLogins);
app.use('/auth', options);

// 기본 경로
app.get('/', (req, res) => {
    res.json({ 
        msg: `서버가 ${HTTP_PORT} 포트에서 실행 중입니다.`, 
        workerId: process.pid,
        env: process.env.NODE_ENV || 'development'
    });
});

// Redis 관리 API
app.get('/redis/reset', async (req, res) => {
    try {
        await redisClient.flushAll();
        console.log('Redis 데이터 초기화 완료!');
        res.status(200).json({ msg: 'Redis 데이터 초기화 완료!' });
    } catch (error) {
        console.error('Redis 초기화 중 오류 발생:', error);
        res.status(500).json({ msg: 'Redis 초기화 오류' });
    }
});

app.get('/redis/info', async (req, res) => {
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

        res.json({ 
            count: keys.length,
            data: result 
        });
    } catch (error) {
        console.error('Redis 조회 중 오류 발생:', error);
        res.status(500).json({ msg: 'Redis 조회 중 오류 발생' });
    }
});

// 에러 핸들링 미들웨어 - 마지막에 배치
app.use((err, req, res, next) => {
    console.error("서버 오류:", err.message);
    res.status(500).json({ 
        msg: "서버에서 문제가 발생했습니다. 다시 시도해주세요."
    });
});

// 서버 시작
http.createServer(app).listen(HTTP_PORT, () => {
    console.log(`✅ HTTP 서버가 포트 ${HTTP_PORT}에서 실행 중입니다.`);
});

module.exports = app;