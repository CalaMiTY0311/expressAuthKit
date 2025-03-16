const { redisClient } = require("./dependencie");

const blockAgainLogin = async (req, res, next) => {
    // console.log("asdf")
    const SID = req.cookies.SID;
    console.log("SID: ",SID)
    //쿠키에 SID라는 세션 값이 존재하면
    if (SID) {
        // redisClient에 SID값 조회
        try{
            const flag = await redisClient.get(`session:${SID}`);
            console.log(flag)
            // redisClient안에 값과 SID 값이 일치하면 이미 로그인 상태이므로 에러 발생
            if (flag) {
                return res.status(403).json( { msg: "이미 로그인된 상태로 로그아웃이 필요" });
            } else {
                next();
            }
    } catch (error) {
        console.log("againLoginCheck Middleware error", error);
        res.status(500).json({msg:"bloackAgainLogin 미들웨어 에러"})
    } 
    } else {
        next();
    }
}

const sessionCheck = async (req, res, next) => {
    const SID = req.cookies.SID;

    if (SID) {
        try {
            const flag = await redisClient.get(`session:${SID}`);
            if (!flag) {
                return res.status(403).json({ msg : "로그아웃 상태 입니다." });
            } else {
                next();
            }
        } catch(error) {
            console.error("Session Check middleware error:", error);
        }
    } else {
        return res.status(403).json({ msg : "로그아웃 상태 입니다." });
    }
};


module.exports = {blockAgainLogin, sessionCheck}

// verifySession
