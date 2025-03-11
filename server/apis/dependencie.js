require('dotenv').config(); // .env 파일 로드
const ControlMongo = require("../src/util/mongoDB")
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL;  // 기본값: localhost
const REDIS_PORT = process.env.REDIS_PORT || 6379;  // 기본값: 6379

// ✅ MongoDB 연결 설
const mongo = new ControlMongo('Server', 'Users');

const redisClient = createClient({
    // url: `redis://${REDIS_URL}:${REDIS_PORT}`
    url: `redis://localhost:${REDIS_PORT}`
});

redisClient.on('connect', () => console.log(`✅ Redis connected to Port : ${REDIS_PORT}`));
redisClient.on('error', (err) => console.error('❌ Redis connection error:', err));

async function connectRedis() {
    await redisClient.connect();
}

connectRedis().catch(err => console.error("❌ Redis connection failed:", err));

module.exports = {
    mongo,
    redisClient
};
