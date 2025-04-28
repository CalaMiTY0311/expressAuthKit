const bcrypt = require('bcrypt');
const { userSchema, userFields } = require("./dbSchema");
const { mongo } = require("../../apis/dependencie");
const { nanoid } = require('nanoid');
const { createResponse } = require('./helperFunc');

class AuthController {
    // 사용자 ID로 사용자 정보 조회 및 검증 (중복 코드 제거)
    static async getUserById(id, excludePassword = true) {
        try {
            const users = await mongo.selectDB({ _id: id });
            
            if (!users || users.length === 0) {
                return null;
            }
            
            if (excludePassword) {
                const { password, ...userWithoutPassword } = users[0];
                return userWithoutPassword;
            }
            
            return users[0];
        } catch (error) {
            console.error("사용자 조회 오류:", error);
            throw error;
        }
    }
    
    // 현재 사용자 권한 확인 (자신의 데이터만 수정/삭제 가능)
    static verifyUserAccess(reqUserId, targetUserId) {
        if (reqUserId !== targetUserId) {
            return false;
        }
        return true;
    }

    static async register(req) {
        const { email, password } = req.body;
        try {
            // 이미 가입된 유저인지 이메일 매칭 검사
            const existingUser = await mongo.selectDB({ email });
            if (existingUser.length > 0) {
                return createResponse(409, "이미 가입된 이메일 입니다.");
            }

            // 몽고DB nanoid 중복 값 충돌 방지
            let _id;
            let idExists = true;
            
            while (idExists) {
                _id = nanoid();
                const existingId = await mongo.selectDB({ _id });
                idExists = existingId.length > 0;
            }
            
            // 스키마에 따른 사용자 객체 생성
            const newUser = {};
            for (const field of userFields) {
                if (req.body[field] !== undefined) {
                    newUser[field] = req.body[field];
                } else if (userSchema[field]?.default !== undefined) {
                    newUser[field] = typeof userSchema[field].default === "function"
                        ? userSchema[field].default()
                        : userSchema[field].default;
                }
            }
            
            newUser._id = _id;
            newUser.password = await bcrypt.hash(password, 10);

            // DB에 저장
            await mongo.insertDB(newUser);
            
            // 비밀번호는 응답에서 제외
            const { password: _, ...userWithoutPassword } = newUser;
            
            return createResponse(201, "회원가입 성공", { user: userWithoutPassword });
        } catch (error) {
            console.error("회원가입 오류:", error);
            return createResponse(500, "어스 서버 회원 가입 에러");
        }
    }

    static async updateAccount(req) {
        const updateData = req.body;
        const _id = req.cookies.UID;
        
        // 데이터 유효성 검사
        if (!updateData || Object.keys(updateData).length === 0) {
            return createResponse(400, "비어있는 필드 입니다.");
        }

        // 유효하지 않은 필드 체크
        const validFields = Object.keys(userSchema);
        const invalidFields = Object.keys(updateData).filter(field => !validFields.includes(field));
        
        if (invalidFields.length > 0) {
            return createResponse(422, `유효하지 않은 필드가 있습니다: ${invalidFields.join(', ')}`);
        }

        // 중요 필드 수정 방지
        const sensitiveFields = ['_id', 'email', 'password', 'createdAt', 'provider', 'role'];
        const protectedFieldAttempt = Object.keys(updateData).filter(field => sensitiveFields.includes(field));
        
        if (protectedFieldAttempt.length > 0) {
            return createResponse(403, `보호된 필드는 이 경로에서 수정할 수 없습니다: ${protectedFieldAttempt.join(', ')}`);
        }

        try {
            // 자신의 계정인지 확인
            if (!this.verifyUserAccess(_id, req.user._id)) {
                return createResponse(403, "자신의 계정만 수정할 수 있습니다.");
            }
            
            // 사용자 존재 확인
            const user = await this.getUserById(_id, false);
            if (!user) {
                return createResponse(404, "사용자를 찾을 수 없습니다.");
            }

            // DB 업데이트
            await mongo.updateDB({ _id }, updateData);
            
            // 업데이트된 사용자 정보 반환
            const updatedUser = await this.getUserById(_id);
            return createResponse(200, "계정 업데이트 성공", { user: updatedUser });
        } catch (error) {
            console.error("계정 업데이트 오류:", error);
            return createResponse(500, "어스 서버 유저 업데이트 에러 발생");
        }
    }

    static async changePassword(req) {
        const { password, currentPassword } = req.body;
        const _id = req.cookies.UID;
        
        // 입력 필드 검증
        if (!password) {
            return createResponse(400, "새 비밀번호가 필요합니다.");
        }
        
        // 허용되는 필드 검증
        const allowedFields = ['password', 'currentPassword'];
        const fieldCheckPassword = Object.keys(req.body);
        const invalidFields = fieldCheckPassword.filter(field => !allowedFields.includes(field));
        
        if (invalidFields.length > 0) {
            return createResponse(400, `비밀번호 변경 요청에 유효하지 않은 필드가 포함되어 있습니다: ${invalidFields.join(', ')}`);
        }

        try {
            // 자신의 계정인지 확인
            if (!this.verifyUserAccess(_id, req.user._id)) {
                return createResponse(403, "자신의 비밀번호만 변경할 수 있습니다.");
            }
            
            // 사용자 정보 조회 (비밀번호 포함)
            const user = await this.getUserById(_id, false);
            if (!user) {
                return createResponse(404, "사용자를 찾을 수 없습니다.");
            }
            
            // 현재 비밀번호 확인 (제공된 경우)
            if (currentPassword) {
                const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
                if (!isPasswordValid) {
                    return createResponse(401, "현재 비밀번호가 일치하지 않습니다.");
                }
            }
            
            // 새 비밀번호 해싱 및 저장
            const hashedPassword = await bcrypt.hash(password, 10);
            await mongo.updateDB({ _id }, { password: hashedPassword });

            return createResponse(200, "비밀번호 변경 성공");
        } catch (error) {
            console.error('비밀번호 변경 오류:', error);
            return createResponse(500, "어스 서버 비밀번호 변경 에러 발생");
        }
    }

    static async deleteAccount(req) {
        const { id } = req.params;
        
        if (!id) {
            return createResponse(400, "잘못된 요청: ID가 없습니다.");
        }
        
        try {
            // 자신의 계정인지 확인
            if (!this.verifyUserAccess(id, req.user._id)) {
                return createResponse(403, "본인의 계정만 삭제할 수 있습니다.");
            }

            // 사용자 정보 조회
            const user = await this.getUserById(id, false);
            if (!user) {
                return createResponse(404, "사용자를 찾을 수 없습니다.");
            }

            // 관리자 보호 로직: 유일한 관리자는 삭제 방지
            if (user.role === 'admin') {
                const adminUsers = await mongo.selectDB({ role: 'admin' });
                if (adminUsers && adminUsers.length <= 1) {
                    return createResponse(403, "유일한 관리자 계정은 삭제할 수 없습니다. 다른 관리자를 먼저 생성해주세요.");
                }
            }

            // 계정 삭제 실행
            await mongo.deleteDB({ _id: id });
            
            return createResponse(200, "사용자 계정 삭제 완료");
        } catch (error) {
            console.error("계정 삭제 오류:", error);
            return createResponse(500, `계정 삭제 에러: ${error.message || error}`);
        }
    }
}

module.exports = AuthController;