const bcrypt = require('bcrypt');
const ControlMongo = require('../../src/util/mongoDB');
// const redisClient = require('../config/redis'); // Redis 연결 파일
const { mongo, redisClient } = require("../dependencie")

class AuthController {

    constructor(mongo, redisClient) {
        this.mongo = mongo;
        this.redisClient = redisClient;
    }

    static async register(req, res) {  // static 메서드로 변경
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
                return res.status(409).json({ error: "Email already exists" });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                email,
                password: hashedPassword,
                bio: "",
                profilePicURL: "",
                followers: [],
                following: [],
                posts: [],
                createdAt: Date.now(),
            };
            await mongo.insertDB(newUser);
            res.status(201).json({ message: "User registered successfully", email });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while registering user" });
        }
    }
    static async login(req) {  // static 메소드로 변경
        const { email, password } = req.body;
        if (!email || !password) {
            return { status: 422, data: { email: "Email is required", password: "Password is required" } };
        }
        try {
            const user = await mongo.selectDB({ email });
            if (user.length === 0) {
                return { status: 404, data: { error: "User not found" } };
            }
            const isPasswordValid = await bcrypt.compare(password, user[0].password);
            if (!isPasswordValid) {
                return { status: 401, data: { error: "Invalid credentials" } };
            }
            return {
                status: 200,
                data: {
                    message: "User logged in successfully",
                    user: {
                        email: user[0].email,
                        username: user[0].username,
                        bio: user[0].bio,
                        profilePicURL: user[0].profilePicURL,
                    },
                    // sessionToken,
                    // cookie: { key: 'SID', value: sessionToken }
                }
            };
        } catch (error) {
            console.error(error);
            return { status: 500, data: { error: "An error occurred while logging in" } };
        }
    }

    async logout(req, res) {
        try {
            const sessionToken = req.cookies.SID;
            if (!sessionToken || !(await redisClient.get(sessionToken))) {
                return res.status(400).json({ error: "Invalid session or session not found" });
            }
            await redisClient.del(sessionToken);
    
            // 클라이언트 쿠키 삭제
            res.clearCookie('SID');
    
            return res.status(200).json({ message: "User logged out successfully" });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "An error occurred while logging out" });
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