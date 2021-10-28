import mongoose from "mongoose";

const schema = new mongoose.Schema({
    name: { type: String, require: true },
    code: { type: String, require: true },
    multiplier: { type: Number, require: true },
    enable: { type: Boolean, require: true },
    isTest: { type: Boolean, require: true },
    parentId: { type: String, require: true },
    groupId: { type: String, require: true },
});

export default mongoose.model("currencies", schema);
