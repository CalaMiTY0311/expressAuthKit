const { MongoClient } = require('mongodb');
require('dotenv').config(); // .env 파일 로드

class ControlMongo {
    constructor( dbName, collName) {
        const username = process.env.MONGODB_USERNAME
        const password = process.env.MONGODB_PASSWORD
        const mongoPort = process.env.MONGODB_PORT;

        // const conn = `mongodb://${username}:${password}@${mongoUrl}:${mongoPort}/${dbName}?authSource=admin`;
        // const conn = `mongodb://${username}:${password}@mongodb:${mongoPort}/${dbName}?authSource=admin`;
        const conn = `mongodb://${username}:${password}@localhost:${mongoPort}/${dbName}?authSource=admin`;
        console.log(conn);

        MongoClient.connect(conn)
            .then(client => {
                this.db = client.db(dbName);
                this.coll = this.db.collection(collName);
                console.log(`Connected to MongoDB: ${dbName}`);
            })
            .catch(err => {
                console.error(`DB Connection ERROR: ${err}`);
            });
    }

    async selectDB(queryDict = {}) {
        try {
            const results = await this.coll.find(queryDict).toArray();
            return results;
        } catch (err) {
            console.error(`DB Query ERROR: ${err}`);
            return [];
        }
    }

    async insertDB(insertDict) {
        try {
            await this.coll.insertOne(insertDict);
            return true;
        } catch (err) {
            console.error(`DB insert ERROR: ${err}`);
            return false;
        }
    }

    async deleteDB(queryDict, isMulti = false) {
        try {
            if (isMulti) {
                await this.coll.deleteMany(queryDict);
            } else {
                await this.coll.deleteOne(queryDict);
            }
            return [true, ""];
        } catch (err) {
            return [false, `DB remove ERROR: ${err}`];
        }
    }

    async updateDB(queryDict, modifyDict, isMulti = false, isUpsert = false) {
        try {
            if (isMulti) {
                await this.coll.updateMany(queryDict, { $set: modifyDict }, { upsert: isUpsert });
            } else {
                await this.coll.updateOne(queryDict, { $set: modifyDict }, { upsert: isUpsert });
            }
            return true;
        } catch (err) {
            console.error(`DB update ERROR: ${err}`);
            return false;
        }
    }
}

module.exports = ControlMongo;