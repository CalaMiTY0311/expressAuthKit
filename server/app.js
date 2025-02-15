// express 불러오기
const express = require('express');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const registerRouter = require('./apis/auth/register')
const loginRouter = require('./apis/auth/login')
const logoutRouter = require('./apis/auth/logout')
// const googleLogin = require('./apis/auth/googleLogin');

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
app.use('/auth', logoutRouter)

app.get('/', (req, res) => {
  res.json({ message: `Server is running on port ${req.secure ? HTTPS_PORT : HTTP_PORT}` });
});

// app.post('/post', (req, res) => {
//   res.cookie('myCookie', 'exampleValue', {
//     httpOnly: true,      // 브라우저 접근 제한
//     // sameSite: 'None',    // 서로 다른 도메인에서도 쿠키 전달 허용
//     secure: true,       // HTTP 환경에서 작동하도록 설정
//     maxAge: 36000 * 1000,
//   });
//   res.send('세션이 설정되었습니다.');
// });

// app.get('/check', async (req, res) => {
//     const sessionId = req.cookies.sessionId;
  
//     if (!sessionId) {
//       return res.send('세션 ID가 없습니다.');
//     }
//     res.send(`세션에 저장된 데이터: ${sessionId}`);
// })

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