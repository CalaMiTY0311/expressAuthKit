require('dotenv').config(); // .env 파일 로드
const ControlMongo = require("../src/util/mongoDB")
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL;  // 기본값: localhost
const REDIS_PORT = process.env.REDIS_PORT || 6379;  // 기본값: 6379

// ✅ MongoDB 연결 설
const mongo = new ControlMongo('Server', 'Users');
// const testmongo = new ControlMongo('Server', 'testUsers')

const redisClient = createClient({
    // url: `redis://${REDIS_URL}:${REDIS_PORT}`  // 서비스 이름과 포트 사용
    url: `redis://localhost:${REDIS_PORT}`
});

// redisClient.on('connect', () => console.log(`✅ Redis connected to Port : ${REDIS_PORT}`));
// redisClient.on('error', (err) => {
//     console.error('❌ Redis connection error:', err);
//     // 심각한 오류 발생 시 프로세스 종료

//     process.exit(1);
// });

(async () => {
    try {
      await redisClient.connect();
      console.log("redisClient 연결 성공")
    } catch (err) {
      console.log(`❌ Redis connection error: ${err}`);
    }
  })();

module.exports = {
    mongo,
    // testmongo,
    redisClient
};
