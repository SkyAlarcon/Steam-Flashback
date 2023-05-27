require("dotenv").config();
require("./controller/botControllerREFACTORED");
// require("./controller/failSafe")

const express = require("express")
const cors = require("cors")

const app = express();

app.use(express.json());
app.use(cors());

module.exports = app