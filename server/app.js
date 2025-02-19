// express 불러오기
const express = require('express');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const registerRouter = require('./apis/auth/register')
const loginRouter = require('./apis/auth/login')
const logoutRouter = require('./apis/auth/logout')
const socielLogins = require('./apis/auth/socielLogins');

const { redisClient } = require('./apis/dependencie')

const http = require('http');
const https = require('https');
const fs = require('fs');

const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;

const options = {
  key: fs.readFileSync('./rootca.key'),
  cert: fs.readFileSync('./rootca.crt')
};

const app = express();
app.use(cookieParser()); // 중복 선언 방지
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173', // React 앱의 주소를 명시 (예: http://localhost:3000)
    // origin: 'https://calamity.netlify.app',
    credentials: true
}));
// 포트 정보
const port = 3000;

app.use('/auth', registerRouter);
app.use('/auth', loginRouter);
app.use('/auth', logoutRouter);
app.use('/auth', socielLogins)

app.get('/', (req, res) => {
  res.json({ message: `Server is running on port ${req.secure ? HTTPS_PORT : HTTP_PORT}` });
});

app.get('/reset-redis', async (req, res) => {
  try {
      // Redis 모든 데이터 초기화 (flushAll)
      await redisClient.flushAll(); // 비동기 방식으로 수정
      console.log('Redis 데이터 초기화 완료!');
      res.status(200).send('Redis 데이터 초기화 완료!');
  } catch (error) {
      console.error('Redis 초기화 중 오류 발생:', error);
      res.status(500).send('Redis 초기화 오류');
  }
});

app.get('/redis', async (req, res) => {
  try {
      const keys = await redisClient.keys('*'); // 모든 키 가져오기
      const values = await Promise.all(keys.map(key => redisClient.get(key))); // 각 키에 대한 값 가져오기
      
      const result = keys.reduce((acc, key, index) => {
          acc[key] = values[index];
          return acc;
      }, {});
      
      res.json(result);
  } catch (error) {
      console.error('❌ Error fetching Redis data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 서버 실행
// app.listen(port, () => {
//   console.log(`App running on port ${port}...`);
// });

// Create an HTTP server.
http.createServer(app).listen(HTTP_PORT);

// Create an HTTPS server.
https.createServer(options, app).listen(HTTPS_PORT);