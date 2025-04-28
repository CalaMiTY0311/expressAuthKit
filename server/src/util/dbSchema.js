const userSchema = {
    _id:String,
    username:{ type: String, default: "user" },
    email:String,
    password: { type: String, default: null },
    bio:{ type: String, default: "" },
    profilePicURL: { type: String, default: "" },
    createdAt: { type: Number, default: Date.now },
    provider:{ type: String, default: "local" },
    role: { type: String, default: "user" }, // 사용자 역할: 'user', 'moderator', 'admin'

    totpEnable: { type: Boolean, default: false },  // TOTP 활성화 여부
};

const userFields = Object.keys(userSchema);

module.exports = {userSchema,userFields};