const userSchema = {
    _id:String,
    username:{ type: String, default: "user" },
    email:String,
    password: String,
    bio:{ type: String, default: "" },
    profilePicURL: { type: String, default: "" },
    createdAt: { type: Date, default: () => new Date() },
    provider:{ type: String, default: "local" }
};

const userFields = Object.keys(userSchema);

module.exports = {userSchema,userFields};