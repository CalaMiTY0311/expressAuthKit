require('dotenv').config(); // .env 파일 로드
const ControlMongo = require("../src/util/mongoDB");
const { createClient } = require('redis');

// =========================================================
// Redis 연결 설정
// =========================================================
const REDIS_URL = process.env.REDIS_URL || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = createClient({
    url: `redis://localhost:${REDIS_PORT}`
});

// Redis 연결 초기화
(async () => {
    try {
        await redisClient.connect();
        console.log(`✅ Redis 연결 성공 - ${REDIS_URL}:${REDIS_PORT}`);
    } catch (err) {
        console.error(`❌ Redis 연결 오류: ${err}`);
    }
})();

// =========================================================
// MongoDB 연결 설정
// =========================================================
const DB_NAME = process.env.DB_NAME || 'Server';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'Users';
const TEST_COLLECTION_NAME = process.env.TEST_COLLECTION_NAME || 'testauth';

// 프로덕션 DB
const mongo = new ControlMongo(DB_NAME, COLLECTION_NAME);

// 테스트 DB
const testmongo = new ControlMongo(DB_NAME, TEST_COLLECTION_NAME);

// 의존성 내보내기
module.exports = {
    // MongoDB 인스턴스
    mongo,
    testmongo,
    
    // Redis 클라이언트
    redisClient,
    
    // 연결 설정
    connections: {
        redis: {
            url: REDIS_URL,
            port: REDIS_PORT
        },
        mongodb: {
            dbName: DB_NAME,
            collectionName: COLLECTION_NAME,
            testCollectionName: TEST_COLLECTION_NAME
        }
    }
};