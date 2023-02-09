require("dotenv").config();
require("./controller/botController");

const express = require("express")
const cors = require("cors")

const app = express();

app.use(express.json());
app.use(cors());

module.exports = app