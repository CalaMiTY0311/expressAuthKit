const bcrypt = require('bcrypt');
const ControlMongo = require('../../src/util/mongoDB');
// const redisClient = require('../config/redis'); // Redis 연결 파일
const {userSchema, userFields} = require("../../src/util/dbSchema");
const { mongo, redisClient } = require("../dependencie")
const { nanoid } = require('nanoid');

class AuthController {

    constructor(mongo, redisClient) {
        this.mongo = mongo;
        this.redisClient = redisClient;
    }
    
    static async register(req) {
        const { email, password } = req.body
        try {

            //이미 가입된 유저인지 이메일 매칭 검사
            const existingUser = await mongo.selectDB({ email });
            if (existingUser.length > 0) {
                return { 
                    status: 409, 
                    data: {
                        msg: "이미 가입된 이메일 입니다."
                    }
                }
            }

            // 몽고DB nanoid 중복 값 충돌 방지
            let _id;
            let flag = false;
            while (!flag) {
                _id = nanoid();
                const existingId = await mongo.selectDB({ _id });
                if (!existingId.length > 0) {
                    flag = true;
                }
            }
            // src/util/dbSchema를 사용해 db 유저 필드 생성
            const newUser = {};
            for (const field of userFields) {
                if (req.body[field] !== undefined) {
                    newUser[field] = req.body[field];
                } else if (userSchema[field]?.default !== undefined) {
                    newUser[field] = typeof userSchema[field].default === "function"
                        ? userSchema[field].default()  // Date 등의 동적 기본값
                        : userSchema[field].default;
                }
            }
            newUser._id = _id;
            const hashedPassword = await bcrypt.hash(password, 10);
            newUser.password = hashedPassword;

            // 스키마 설정 후 mongoDB에 저장
            await mongo.insertDB(newUser);
    
            return {
                status: 201,
                data: {
                    msg: "회원가입 성공",
                    user: newUser
                }
            }
        } catch (registerError) {
            console.error(registerError);
            return {
                status: 500,
                data: {
                    msg: `어스 서버 회원 가입 에러발생 : ${registerError}`
                }
            };
        }
    }
    
    static async login(req) {
        const { email, password } = req.body;
        try {
            const user = await mongo.selectDB({ email });

            if (user.length === 0 || !(await bcrypt.compare(password, user[0].password))) {
                return { 
                    status: 401, 
                    data: {
                        msg: "존재하지 않는 유저입니다."
                    }
                };
            }
            if (user[0].provider !== "local"){
                return {
                    status: 400,
                    data: {
                        msg: "이미 가입된 소셜 로그인 계정입니다."
                    }
                }
            }

            return {
                status: 200,
                data: {
                    msg: "로그인 성공",
                    user: {
                        UID: user[0]._id,
                        email: user[0].email,
                        username: user[0].username,
                        bio: user[0].bio,
                        profilePicURL: user[0].profilePicURL,
                        totpSecret: user[0].totpSecret,
                        totpEnable: user[0].totpEnable
                    }
                }
            }
        } catch (error) {
            console.error(error);
            return { 
                status: 500, 
                data: {
                    msg: "서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요." 
                }
            };
        }
    }
    
    static async logout(req) {
        try {
            const SID = req.cookies.SID;

            if (!SID) {
                return {
                status: 400,
                data: {
                    msg: "세션 ID가 존재하지 않습니다.",
                }
            } 
        }else {
                return {
                    status: 200,
                    data: {
                        msg: "로그아웃 완료",
                        SID: SID
                    }
                }
            }
        } catch (error) {
            console.error(error);
            return {
                status: 500,
                data: {
                    msg: "어스 컨트롤러 에러 서버 확인필요"
                }
            }
        }
    }
    
    static async updateAccount(req) {
        const updateData = req.body;
        if (!updateData || Object.keys(updateData).length === 0) {
            return {
                status: 400,
                data: {
                    msg: "업데이트할 데이터가 없습니다."
                }
            };
        }
        if (updateData.password !== undefined) {
            return {
                status: 400,
                data: {
                    msg: "비밀번호는 이 경로에서 변경할 수 없습니다."
                }
            };
        }
        try {
            const _id = req.cookies.UID;
            const user = await mongo.selectDB({ _id });
            if (!user) {
                return {
                    status: 404,
                    data: {
                        msg: "사용자를 찾을 수 없습니다."
                    }
                };
            } 
            const updatedUser = await mongo.updateDB({ _id }, updateData);
            return {
                status: 200,
                data: {
                    msg: "계정 업데이트 성공",
                    user: updatedUser
                }
            };
        } catch (error) {
            return {
                status: 500,
                data: {
                    msg: `계정 업데이트 에러: ${error}`
                }
            };
        }
    }
    
    static async changePassword(req) {
        const { password } = req.body;
        if (!password) {
            return {
                status: 400,
                data: {
                    msg: "비밀번호가 필요합니다."
                }
            };
        }
        if (Object.keys(req.body).length > 1) {
            return {
                status: 400,
                data: {
                    msg: "비밀번호 변경 요청에는 'password' 필드만 포함되어야 합니다."
                }
            };
        }
        try {
            const { _id } = req.cookies.UID;
            const user = await mongo.selectDB({ _id });
            if (!user) {
                return {
                    status: 404,
                    data: {
                        msg: "사용자를 찾을 수 없습니다."
                    }
                };
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            await mongo.updateDB({ _id }, { password: hashedPassword });
    
            return {
                status: 200,
                data: {
                    msg: "비밀번호 변경 성공"
                }
            };
    
        } catch (error) {
            return {
                status: 500,
                data: {
                    msg: `비밀번호 변경 에러: ${error}`
                }
            };
        }
    }
    
    static async deleteAccount(req) {
        const { id } = req.params; // URL에서 ID 가져오기
        if (!id) {
            return {
                status: 400,
                data: {
                    msg: "잘못된 요청: ID가 없습니다."
                }
            };
        }
        try {
            const user = await mongo.selectDB({ _id: id });
            if (!user) {
                return {
                    status: 404,
                    data: {
                        msg: "사용자를 찾을 수 없습니다."
                    }
                };
            }
            await mongo.deleteDB({ _id: id });
            return {
                status: 200,
                data: {
                    msg: "사용자 회원삭제 완료"
                }
            }
        } catch (error) {
            return {
                status: 500,
                data: {
                    msg: `계정 삭제 에러 : ${error}`
                }
            }
        }
    }
}

// module.exports = new AuthController(mongo, redisClient);
module.exports = AuthController;

