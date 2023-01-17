const mongoose = require('mongoose');

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
        totalAchivements: {
            type: Number,
            required: true
        },
        achievements: {
            type: [String]
        },
        playtime: {
            type: Number,
            required: true
        }
    }
);

const Model = mongoose.model("games", GameSchema);

module.exports = Model;