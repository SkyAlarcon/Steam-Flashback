const axios = require("axios");
const moment = require("moment");

const STEAMKEY = process.env.STEAMKEY;

const profileModel = require ("../models/profileModel");


const autoUpdate = async (id) => {
    const userToBeUpdated = await profileModel.findById(id, ["steamID", "days", "id"]);
    await axios.get (`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${userToBeUpdated.steamID}&include_appinfo=true&format=json`)
        .then(async res=> {
            const gamesList = res.data.response.games;
            if (!gamesList) return;
            userToBeUpdated.library = [];
            for (let libraryIndex = 0; libraryIndex < gamesList.length; libraryIndex++){
                if (gamesList[libraryIndex].playtime_forever != 0){
                    userToBeUpdated.library.push(
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
    if (!userToBeUpdated.library) return
    const date = moment().format("DDMMYY");
    userToBeUpdated.temp = [];
    for (let appidIndex = 0; appidIndex < userToBeUpdated.library.length; appidIndex++){
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${userToBeUpdated.library[appidIndex].appid}&key=${STEAMKEY}&steamid=${userToBeUpdated.steamID}`)
            .then(async res => {
                userToBeUpdated.temp.push({
                    title: res.data.playerstats.gameName,
                    appid: userToBeUpdated.library[appidIndex].appid,
                    achievements: res.data.playerstats.achievements,
                    playtime: userToBeUpdated.library[appidIndex].playtime
                });
            })
            .catch(err => {
                return //console.log(err);
            });
    };
    userToBeUpdated.days.push([{[date]: userToBeUpdated.temp}]);
    await profileModel.findByIdAndUpdate(id, {days: userToBeUpdated.days});
    return;
};

module.exports = autoUpdate;