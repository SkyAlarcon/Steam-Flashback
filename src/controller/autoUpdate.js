const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const script = require("./scripts");

const STEAMKEY = process.env.STEAMKEY;

const autoUpdate = async (telegramID, steamID) => {

    /*
    const yesterday = script.dayMonthYear(-1);
    const yesterdayList = require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/list.json`);
    const gamesRecentlyPlayed = axios.get(`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&format=json`)
                            .then(async res => {
                                const allRecentGames = res.data.response.games
                                const listRecentGames = [];
                                for (let gameIndex = 0; gameIndex < allGames.length; gameIndex++){
                                    const gameInfo = {
                                        name: allRecentGames.name,
                                        appid: allRecentGames.appid,
                                        playtime: allRecentGames.playtime_forever
                                    };
                                    listRecentGames.push(gameInfo)
                                };
                                return listRecentGames
                              })
                            .catch(err => {});
    const toUpdateList = script.createGamesList(yesterdayList, gamesRecentlyPlayed);

    */

    const updatedGames = {}
    updatedGames.library = [];
    await axios.get (`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
        .then(async res => {
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
    updatedGames.list = [];
    for (let appidIndex = 0; appidIndex < updatedGames.library.length; appidIndex++){
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${updatedGames.library[appidIndex].appid}&key=${STEAMKEY}&steamid=${steamID}`)
        .then(async res => {
            updatedGames.gamesInfo.push({
                title: res.data.playerstats.gameName,
                appid: updatedGames.library[appidIndex].appid,
                achievements: res.data.playerstats.achievements,
                playtime: updatedGames.library[appidIndex].playtime
            });
            updatedGames.list.push({
                name: res.data.playerstats.gameName,
                playtime: updatedGames.library[appidIndex].playtime
            });
        })
        .catch(err => {
            return //console.log(err);
        });
    };
    updatedGames.gamesInfo = script.reformat(updatedGames.gamesInfo)
    const today = {
        day: moment().format("DD"),
        month: moment().format("MM"),
        year: moment().format("YYYY")

    }
    await fs.mkdirSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}`, {recursive: true}, err => {if(err) return console.log(err);});
    const updatedGamesString = JSON.stringify(updatedGames.gamesInfo, null, 1);
    await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, updatedGamesString, err => {if(err) return console.log(err)});
    const updatedGamesListString = JSON.stringify(updatedGames.list, null, 1);
    await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/list.json`, updatedGamesListString, err => {
        if (err){
            ctx.reply("Please contact the dev for support - Error 002.1\nUse /dev for contact info.");
            return err
        };
    });
    return;
};

module.exports = autoUpdate;