const bcrypt = require('bcrypt');
const ControlMongo = require('../../src/util/mongoDB');
// const redisClient = require('../config/redis'); // Redis 연결 파일
const { mongo, redisClient } = require("../dependencie")
const { nanoid } = require('nanoid');

class AuthController {

constructor(mongo, redisClient) {
    this.mongo = mongo;
    this.redisClient = redisClient;
}

static async register(req) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(422).json({
            email: "Email is required",
            password: "Password is required",
        });
    }
    try {
        const existingUser = await mongo.selectDB({ email });
        if (existingUser.length > 0) {
            return { status: 409, msg:"이미 가입된 이메일 입니다."}
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            _id: nanoid(),
            email:email,
            password: hashedPassword,
            username:"",
            bio: "",
            profilePicURL: "",
            createdAt: Date.now(),
            // 이 뒤로 사용자 정보에 추가하고싶은 값이 있으면 추가해 나가면됌 ex) 리스트타입의 팔로우 목록 or 친구 목록 등등..
        };
        await mongo.insertDB(newUser);
        return {
            status:200,
            msg:"회원가입 성공"
        }
    } catch (error) {
        console.error(error);
        return {
            status:500,
            msg: `어스 서버 에러발생 : ${error}`
        };
    }
}

static async login(req) {
    const { email, password } = req.body;
    if (!email || !password) {
        return { status: 422, data: { email: "Email is required", password: "Password is required" } };
    }
    try {
        const user = await mongo.selectDB({ email });
        if (user.length === 0) {
            return { status: 401, data: { error: "존재하지않는 유저입니다." } };
        }
        const isPasswordValid = await bcrypt.compare(password, user[0].password);
        if (!isPasswordValid) {
            return { status: 401, data: { error: "존재하지않는 유저입니다." } };
        }
        return {
            status: 200,
            msg: "회원가입 성공",
                user: {
                    _id: user[0]._id,
                    email: user[0].email,
                    username: user[0].username,
                    bio: user[0].bio,
                    profilePicURL: user[0].profilePicURL,
                },
            }
    } catch (error) {
        console.error(error);
        return { status: 500, data: { error: "어스서버 에러 발생" } };
    }
}

static async logout(req, res) {
    try {
        const sessionToken = req.cookies.SID;
        if (!sessionToken || !(await redisClient.get(sessionToken))) {
            // return res.status(400).json({ error: "이미 만료되었거나 존재하지않는 세션입니다." });
            return {
                status:400,
                msg:"이미 만료되었거나 존재하지않는 세션",
            } 
        } else {
            await redisClient.del(sessionToken);
            res.clearCookie('SID');
            return {
                status:200,
                    msg:"로그아웃 완료"
            }
        }
        // return res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error(error);
        return {
            status:500,
                msg:"어스 컨트롤러 에러 서버 확인필요"
        }
        // res.status(500).json({ error: "An error occurred while logging out" });
    }
}

// async updateAccount(req, res){
//     try {
//         const sessionToken = req.cookies.SID;
//         if (!sessionToken || !(await redisClient.get(sessionToken))) {
//             return res.status(400).json({ error: "Invalid session or session not found" });
//         }

//     }
// }

async deleteAccount(req, res){
    
}
}

// module.exports = new AuthController(mongo, redisClient);
module.exports = AuthController;