const DATABASE_URL = process.env.DATABASE_URL

const mongoose = require('mongoose')

const connect = async () => {
    try {
        mongoose.set('strictQuery', false)
        mongoose.connect(DATABASE_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully")
    } catch (error) {
        console.log (error)
    };
};

module.exports = {connect}