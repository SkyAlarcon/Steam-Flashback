const mongoose = require('mongoose')

const GameSchema = new mongoose.Schema(
    {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: mongoose.Types.ObjectId
        },
        appid: {
            type: Number,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        achievements: {
            type: Number,
            required: true
        },
        playtime: {
            type: Number,
            required: true
        }
    }
);

const Model = mongoose.model("games", GameSchema);

module.exports = Model;