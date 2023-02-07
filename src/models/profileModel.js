const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
    {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: mongoose.Types.ObjectId
        },
        telegramID: {
            type: String,
            required: true
        },
        steamID: {
            type: String,
            required: true
        },
        days: {
            type: [Object]
        }
    });

const Model = mongoose.model("profiles", ProfileSchema);

module.exports = Model;