const { redisClient } = require("./dependencie");

const blockAgainLogin = async (req, res, next) => {
    const SID = req.cookies.SID;
    //쿠키에 SID라는 세션 값이 존재하면
    if (SID) {
        // redisClient에 SID값 조회
        try{
            const flag = await redisClient.get(`session:${SID}`);
            // redisClient안에 값과 SID 값이 일치하면 이미 로그인 상태이므로 에러 발생
            if (flag) {
                return res.status(403).json({data : { msg: "이미 로그인된 상태로 로그아웃이 필요" }});
            }
        next();
    } catch (error) {
        console.log("againLoginCheck Middleware error", error);
        res.status(500).json({data:{msg:error}})
    }
    }
}

const sessionCheck = async (req, res, next) => {
    const SID = req.cookies.SID;
    if (!SID) {
        return res.status(403).json({ msg : "존재하지 않거나 세션 만료된 사용자" });
    }
    try {
        const flag = await redisClient.get(`session:${SID}`);
        if (!flag) {
            return res.status(403).json({ msg : "존재하지않는 세션" });
        }
        next();
    } catch (error) {
        console.error("Session Check middleware error:", error);
        res.status(500).json({ msg : error });
    }
};


module.exports = {blockAgainLogin, sessionCheck}
