const { MongoClient } = require('mongodb');
require('dotenv').config(); // .env 파일 로드

/**
 * MongoDB 데이터베이스 작업을 처리하는 클래스
 */
class ControlMongo {
    /**
     * MongoDB 연결 및 컬렉션 설정
     * @param {string} dbName - 데이터베이스 이름
     * @param {string} collName - 컬렉션 이름
     */
    constructor(dbName, collName) {
        // MongoDB 연결 정보
        const username = process.env.MONGODB_USERNAME || 'root';
        const password = process.env.MONGODB_PASSWORD || 'example';
        const mongoHost = process.env.MONGODB_HOST || 'localhost';
        const mongoPort = process.env.MONGODB_PORT || 27017;

        // 연결 문자열 (Connection String)
        const conn = `mongodb://${username}:${password}@${mongoHost}:${mongoPort}/${dbName}?authSource=admin`;

        // MongoDB 연결
        MongoClient.connect(conn)
            .then(client => {
                this.db = client.db(dbName);
                this.coll = this.db.collection(collName);
                console.log(`✅ MongoDB 연결 성공: ${mongoHost}:${mongoPort}/${dbName} (${collName})`);
            })
            .catch(err => {
                console.error(`❌ MongoDB 연결 오류: ${err}`);
            });
    }

    /**
     * 데이터 조회
     * @param {Object} queryDict - 조회 쿼리
     * @returns {Promise<Array>} 조회 결과 배열
     */
    async selectDB(queryDict = {}) {
        try {
            const results = await this.coll.find(queryDict).toArray();
            return results;
        } catch (err) {
            console.error(`❌ 데이터 조회 오류: ${err}`);
            return [];
        }
    }

    /**
     * 데이터 삽입
     * @param {Object} insertDict - 삽입할 데이터
     * @returns {Promise<boolean>} 성공 여부
     */
    async insertDB(insertDict) {
        try {
            await this.coll.insertOne(insertDict);
            return true;
        } catch (err) {
            console.error(`❌ 데이터 삽입 오류: ${err}`);
            return false;
        }
    }

    /**
     * 데이터 삭제
     * @param {Object} queryDict - 삭제 쿼리
     * @param {boolean} isMulti - 다중 삭제 여부
     * @returns {Promise<Array>} [성공 여부, 오류 메시지]
     */
    async deleteDB(queryDict, isMulti = false) {
        try {
            if (isMulti) {
                await this.coll.deleteMany(queryDict);
            } else {
                await this.coll.deleteOne(queryDict);
            }
            return [true, ""];
        } catch (err) {
            console.error(`❌ 데이터 삭제 오류: ${err}`);
            return [false, `데이터 삭제 오류: ${err}`];
        }
    }

    /**
     * 데이터 업데이트
     * @param {Object} queryDict - 업데이트 대상 쿼리
     * @param {Object} modifyDict - 업데이트할 데이터
     * @param {boolean} isMulti - 다중 업데이트 여부
     * @param {boolean} isUpsert - 없으면 삽입 여부
     * @returns {Promise<boolean>} 성공 여부
     */
    async updateDB(queryDict, modifyDict, isMulti = false, isUpsert = false) {
        try {
            const updateOptions = { upsert: isUpsert };
            
            if (isMulti) {
                await this.coll.updateMany(queryDict, { $set: modifyDict }, updateOptions);
            } else {
                await this.coll.updateOne(queryDict, { $set: modifyDict }, updateOptions);
            }
            return true;
        } catch (err) {
            console.error(`❌ 데이터 업데이트 오류: ${err}`);
            return false;
        }
    }
}

module.exports = ControlMongo;