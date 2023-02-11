require("dotenv").config();
const axios = require("axios")

const zero = 1
//if (zero) console.log ("0")

const bom = 1
const dia = 2
console.log (`${bom} ${dia}`)

/*
const moment = require("moment");

console.log(moment().format("LT"))
console.log(moment().format("DDMMYY"))
console.log(moment().format('DMY'))

const fs = require("fs");

const test = [ { a: 1, b: 2, c: 3 }, { a: 2, b: 3, c: 4 } ]

const jString = JSON.stringify(test, null, 1);

fs.writeFileSync("./test.json", jString, err => {
  if (err) console.log (err)
  console.log ("Success")
})

console.log(jString)

const vari = "test"

variavel = 2

const nomes = require(`./${vari}`)
nomes.push({a:30,b:40,c:50})
const strDnv = JSON.stringify(nomes,null,1)/*
console.log(strDnv, "str")
fs.writeFileSync("./test.json", strDnv, err => {
  if (err) console.log (err)
  console.log ("Success")
})/*
const check = require("./test.json")
console.log(check, "check")

console.log(nomes.find (chave => {
  if (chave.c == variavel) {
    console.log("true")
    return chave
  }
}) )*/
/*
console.log(moment().format("MM"))

const files = fs.readdirSync("./src/database/usersGames/992460954")

console.log(files)

const day = moment().format("DD");
const month = moment().format("MM");
const year = moment().format("YYYY");

const date = day+month+year;
console.log(date)

/*
const tentativa = "tentativa"
const variable = {a: 1, [tentativa]: "!" }
const word = "tentativa"
console.log(variable[word])

// middle terra = 241930
// a sala = 288160
//miami 2 = 274170
ident = 76561198175450183
steamID = 76561198175450183
axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${KEY}&steamid=${steamID}&include_appinfo=true&format=json`)
.then(function (res) {
  console.log(res)
  const games = res.data.response.games
  console.log (games)
  console.log(res.data.response.games);
})
.catch(function (error) {
  console.log(error);
})


const appid = 447150
const dataValue = {title: "APE OUT", appid: 447150}

console.log ("-----------------------------------------------------------")

/*
axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${KEY}&steamid=${ID}`)
.then(async function (res) {
  const game = {"playtime": 900}
  const achievesData = await res.data.playerstats.achievements;
  dataValue.achievements = achievesData.length;
  const { appid, title, achievements } = dataValue
  const newGame = new gamesModel ({
      appid, title, achievements
  });
  let achieved = 0;
  achievesData.forEach(achievement => {
    if (achievement.achieved) {achieved += 1}
  })
  const userGameInfo = {"gameID": newGame.id, "achievementsDone": achieved, "playtime": game.playtime};
  const {gameID, achievementsDone, playtime,} = userGameInfo;
  const newUserGameInfo = new userGameInfoModel ({
      gameID, achievementsDone, playtime
  });
  console.log (newUserGameInfo)
  console.log(res.data.playerstats)
})
  .catch(function (error) {
    console.log(error);
  })
*/
 
/*
const game = {"appid": 00001, "name": "APE"}
const newGame = {"appid": game.appid, "title": game.name}
newGame.inDB = true
console.log (newGame)
*/

console.log ("-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-")

/*
const req= {
  body: {
    username: "baby",
    email: "@gmail"
  }
}
const { username, email, password } = req.body;
const tag = {username} || {email};
console.log([tag])
*/
/*
const gamesList = [{name: "0", playtime: 0, appid: 0},{name: "1", playtime: 1, appid: 1},{name: "2", playtime: 2, appid: 2}]
const gamesFilteredInfo = gamesList.forEach( game => {
  console.log("1")
  const newGame = {"appid": game.appid, "title": game.name, "playtime": game.playtime_forever};
  console.log (newGame)
  return newGame
});
console.log (gamesFilteredInfo)

*/