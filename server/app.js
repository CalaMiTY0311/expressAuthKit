const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');
const http = require('http');
const registerRouter = require('./apis/auth/register');
const loginRouter = require('./apis/auth/login');
const logoutRouter = require('./apis/auth/logout');
const socielLogins = require('./apis/auth/socielLogins');
const accountOptions = require('./apis/auth/accountOptions');
const { redisClient } = require('./apis/dependencie');

const HTTP_PORT = 5050;
const HTTPS_PORT = 8443;

    // 워커 프로세스 설정
    const app = express();

    app.use(cookieParser());
    app.use(express.json());
    app.use(cors({
        origin: 'http://localhost:5173',
        credentials: true
    }));

    // 라우터 설정
    app.use('/auth', registerRouter);
    app.use('/auth', loginRouter);
    app.use('/auth', logoutRouter);
    app.use('/auth', socielLogins);
    app.use('/auth', accountOptions);

    // 워커 프로세스 ID 표시 엔드포인트 추가
    app.get('/', (req, res) => {
        res.json({ 
            message: `Server is running on port ${req.secure ? HTTPS_PORT : HTTP_PORT}`, 
            workerId: process.pid 
        });
    });
    app.get('/', async(req,res) => {
      res.status(200).send("asdf")
    })

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
  module.exports = app
// // 클러스터 모드에서 마스터 프로세스 설정
// if (cluster.isPrimary) {
//     console.log(`Primary ${process.pid} is running`);

//     // CPU 코어 수만큼 워커 프로세스 생성
//     const numCPUs = os.cpus().length;
//     console.log(`Forking ${numCPUs} worker processes`);

//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }

//     // 워커 프로세스 종료 시 새로운 워커 생성
//     cluster.on('exit', (worker, code, signal) => {
//         console.log(`Worker ${worker.process.pid} died`);
//         cluster.fork();
//     });

// } else {
//     // 워커 프로세스 설정
//     const app = express();

//     app.use(cookieParser());
//     app.use(express.json());
//     app.use(cors({
//         origin: 'http://localhost:5173',
//         credentials: true
//     }));

//     // 라우터 설정
//     app.use('/auth', registerRouter);
//     app.use('/auth', loginRouter);
//     app.use('/auth', logoutRouter);
//     app.use('/auth', socielLogins);
//     app.use('/auth', accountOptions);

//     // 워커 프로세스 ID 표시 엔드포인트 추가
//     app.get('/', (req, res) => {
//         res.json({ 
//             message: `Server is running on port ${req.secure ? HTTPS_PORT : HTTP_PORT}`, 
//             workerId: process.pid 
//         });
//     });
//     app.get('/', async(req,res) => {
//       res.status(200).send("asdf")
//     })

//     app.get('/reset-redis', async (req, res) => {
//         try {
//             await redisClient.flushAll();
//             console.log('Redis 데이터 초기화 완료!');
//             res.status(200).send('Redis 데이터 초기화 완료!');
//         } catch (error) {
//             console.error('Redis 초기화 중 오류 발생:', error);
//             res.status(500).send('Redis 초기화 오류');
//         }
//     });

//     app.get('/redis', async (req, res) => {
//         try {
//             const keys = await redisClient.keys('*');
//             const result = {};

//             for (const key of keys) {
//                 const type = await redisClient.type(key);
                
//                 if (type === 'string') {
//                     result[key] = await redisClient.get(key);
//                 } else if (type === 'set') {
//                     result[key] = await redisClient.sMembers(key);
//                 } else {
//                     result[key] = `Unsupported type: ${type}`;
//                 }
//             }

//             res.json(result);
//         } catch (error) {
//             console.error('Redis 조회 중 오류 발생:', error);
//             res.status(500).json({ error: 'Redis 조회 중 오류 발생' });
//         }
//     });

//     // HTTP 서버 생성
//     const http = require('http');
//     http.createServer(app).listen(HTTP_PORT, () => {
//         console.log(`Worker ${process.pid} started on port ${HTTP_PORT}`);
//     });

//     // 선택적: HTTPS 서버 생성 (코멘트 해제 시 사용)
//     // const https = require('https');
//     // const fs = require('fs');
//     // const options = {
//     //     key: fs.readFileSync('./rootca.key'),
//     //     cert: fs.readFileSync('./rootca.crt')
//     // };
//     // https.createServer(options, app).listen(HTTPS_PORT, () => {
//     //     console.log(`Worker ${process.pid} started on HTTPS port ${HTTPS_PORT}`);
//     // });
// }