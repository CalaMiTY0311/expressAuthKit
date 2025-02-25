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

        // 몽고DB nanoid 중복 값 충돌 방지
        let _id;
        let flag = false;
        while (!flag) {
            _id = nanoid();
            const existingId = await mongo.selectDB({ _id });
            if (!existingId.length > 0) {
                isflag = true;
            }
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            _id,
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
            msg: "로그인 성공",
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

static async logout(req) {
    try {
            const SID = req.cookies.SID;
            // console.log(req.cookies.SID)
            return {
                status:200,
                msg:"로그아웃 완료",
                SID:SID
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

async updateAccount(req, res){
    try {
        const _id = req.cookies.UID;
        if (!_id) {
            return {
                status: 400,
                msg: "잘못된 요청: UID가 없습니다."
            };
        }
        const updateData = req.body;  // 업데이트할 데이터
        if (!updateData || Object.keys(updateData).length === 0) {
            return {
                status: 400,
                msg: "업데이트할 데이터가 없습니다."
            };
        }
        const user = await mongo.selectDB({ _id });
        if (!user) {
            return {
                status: 404,
                msg: "사용자를 찾을 수 없습니다."
            };
        }
        const updatedUser = await mongo.updateDB({ _id }, updateData);

        return {
            status: 200,
            msg: "계정 업데이트 성공",
            user: updatedUser
        };
    } catch (error) {
        return {
            status: 500,
            msg: `계정 업데이트 에러: ${error}`
        };
    
    }
}

static async deleteAccount(req){
    try {
        const { id } = req.params; // URL에서 ID 가져오기
        // const _id = req.cookies.UID;
        if (!id) {
            return {
                status: 400,
                msg: "잘못된 요청: ID가 없습니다."
            };
        }
        const user = await mongo.selectDB({ _id: id });
        if (!user) {
            return {
                status: 404,
                msg: "사용자를 찾을 수 없습니다."
            };
        }
        await mongo.deleteDB({ _id: id });
        const SID = req.cookies.SID;
        if (SID) {
            await redisClient.del(`session:${SID}`);
        }
        return {
            status:200,
            msg:"사용자 회원삭제 완료",
        }
    } catch(error){
        return {
            status:500,
            msg:`계정 삭제 에러 : ${error}`
        }
    }
}

}

// module.exports = new AuthController(mongo, redisClient);
module.exports = AuthController;

