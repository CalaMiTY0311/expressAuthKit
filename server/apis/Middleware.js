const { mongo, redisClient } = require("./dependencie");

const againLoginCheck = async (req, res, next) => {
    try{
        const SID = req.cookies.SID;
        if (SID){
            const flag = await redisClient.get(`session:${SID}`);
            console.log(flag)
            if (flag) {
                return res.status(403).json({ msg: "이미 로그인된 상태입니다." });
            }
        }
        next();
    } catch (error) {
        console.log("againLoginCheck Middleware error", error);
        res.status(500).json({msg:error})
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


module.exports = {againLoginCheck, sessionCheck}
