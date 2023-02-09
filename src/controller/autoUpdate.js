const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const STEAMKEY = process.env.STEAMKEY;

const autoUpdate = async (telegramID, steamID) => {
    const updatedGames = {}
    updatedGames.library = [];
    await axios.get (`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
        .then(async res=> {
            const gamesList = res.data.response.games;
            if (!gamesList) return;
            for (let libraryIndex = 0; libraryIndex < gamesList.length; libraryIndex++){
                if (gamesList[libraryIndex].playtime_forever != 0){
                    updatedGames.library.push(
                        {
                            appid: gamesList[libraryIndex].appid, 
                            playtime: gamesList[libraryIndex].playtime_forever
                        }
                    );
                };
            };
        })
        .catch(err => {
            console.log(err);
        });
    if (!updatedGames.library) return;
    updatedGames.gamesInfo = [];
    for (let appidIndex = 0; appidIndex < updatedGames.library.length; appidIndex++){
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${updatedGames.library[appidIndex].appid}&key=${STEAMKEY}&steamid=${steamID}`)
        .then(async res => {
            updatedGames.gamesInfo.push({
                title: res.data.playerstats.gameName,
                appid: updatedGames.library[appidIndex].appid,
                achievements: res.data.playerstats.achievements,
                playtime: updatedGames.library[appidIndex].playtime
            });
        })
        .catch(err => {
            return //console.log(err);
        });
    };
    const day = moment().format("DD");
    const month = moment().format("MM");
    const year = moment().format("YYYY");
    await fs.mkdirSync(`./src/database/usersGames/${telegramID}/${year}/${month}`, {recursive: true}, err => {if(err) return console.log(err);});
    const updatedGamesString = JSON.stringify(updatedGames.gamesInfo, null, 1);
    await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${year}/${month}/${day}.json`, updatedGamesString, err => {if(err) return console.log(err)});
    return;
};

module.exports = autoUpdate;