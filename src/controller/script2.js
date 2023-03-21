const axios = require("axios");
const moment = require("moment")

const STEAMKEY = process.env.STEAMKEY

const wait = (miliseconds = 42000) => {
    setTimeout(()=> {
        return 1
    }, miliseconds);
};

const reformat = (gamesInfo) => {
    for (let index = 0; index < gamesInfo.length; index++){
        const achievs = gamesInfo[index].achievements;
        if (!achievs) continue;
        let achievesDone = 0;
        for (let achievsIndex = 0; achievsIndex < achievs.length; achievsIndex++){
            if (achievs[achievsIndex].achieved == 1) achievesDone += 1;
        };
        gamesInfo[index].achieved = achievesDone;
    };
    return gamesInfo;
};

const prepareGamesInfo = async (steamID, gamesList) => {
    const gamesInfo = []
    for (let gameIndex = 0; gameIndex < gamesList.length; gameIndex++) {
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${gamesList[gameIndex].appid}&key=${STEAMKEY}&steamid=${steamID}`)
            .then(async res => {
                const gameRawInfo = res.data.playerstats
                gamesInfo.push({
                    title: gameRawInfo.gameName,
                    appid: gamesList[gameIndex].appid,
                    achievements: gameRawInfo.achievements,
                    playtime: gamesList.playtime
                });
            })
            .catch(err => {})
    };
    return gamesInfo;
};

const compareLists = (yesterdayList = [], recentlyPlayedList) => {
    if (yesterdayList.length == 0 || recentlyPlayedList.length == 0) return recentlyPlayedList;
    const toUpdateList = [];
    for (let gameIndex = 0; gameIndex < recentlyPlayedList.length; recentlyPlayedList++){
        const gameCheck = yesterdayList.find(game => {
            if (recentlyPlayedList.playtime != game.playtime){
                return
            }
        })
        if (!gameCheck) continue;
        const gameToUpdate = {
            name: recentlyPlayedList[gameIndex].name,
            appid: recentlyPlayedList[gameIndex].appid,
            playtime: recentlyPlayedList[gameIndex].playtime
        }
        toUpdateList.push(gameToUpdate);
    };
    return toUpdateList;
}





const dayMonthYear = (daysFromToday = 0) => {
    const date = {
        day: moment().add((daysFromToday), "days").format("DD"),
        month: moment().add((daysFromToday), "days").format("MM"),
        year: moment().add((daysFromToday), "days").format("YYYY")
    }
    return date
};

const findUser = (telegramID) => {
    const usersList = require("../database/users.json");
    const user = usersList.find(user => { if (user.telegramID == telegramID) return user})
    return user;
};

const validSteamID = (steamID) => {
    const numbers = "0123456789"
    if (steamID.length > 18) return false
    for (let index = 0; index < steamID.length; index++){
        if (!numbers.includes(steamID[index])) return false;
    };
    return true
};

const getSteamUsername = async (steamID) => {
    const profilePersona = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${steamID}`)
        .then(async res => {            
            const profileInfo = await res.data.response.players[0].personaname;
            if (!profileInfo) return false
            return profileInfo
        })
        .catch(err => {
            console.log(err)
            return false
        });
    return profilePersona;
};

const getAllGames = async (steamID) => {
    const gamesList = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
        .then(res => {
            const gamesList = res.data.response.games;
            return gamesList
        })
        .catch(err => {
            console.log(err)
            return false
        });
    return gamesList;
};

const removeGameNoPlaytime = (gamesList) => {
    const playedGames = [];
    for (let index = 0; index < gamesList.length; index++){
        if (!gamesList[index].playtime_forever != 0) continue;
        const newGame = {
            "name": gamesList[index].name,
            "appid": gamesList[index].appid,
            "playtime": gamesList[index].playtime_forever
        };
        playedGames.push(newGame);
    };
    return playedGames;
};

const createGamesList = async (allGames) => {
    const gameList = [];
    for (let gameIndex = 0; gameIndex < allGames.length; gameIndex++){
        const gameInfo = {
            name: allGames[gameIndex].name,
            playtime: allGames[gameIndex].playtime
        };
        gameList.push(gameInfo);
    };
    return gameList;
};

const retrieveGameAchievements = async (steamID, appid) => {
    await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${STEAMKEY}&steamid=${steamID}`)
        .then(res => {
            const achievementsData = res.data.playerstats.achievements;
            if (!achievementsData) return false
            return achievementsData;
        })
        .catch()
}

const countDoneAchievements = (achievsList) => {
    let achievsDone = 0;
    for (let index = 0; index < achievsList.length; index++){
        if (achievsList[index].achieved) achievsDone += 1;
    };
    return achievsDone;
};

module.exports = {
    wait,
    reformat,
    prepareGamesInfo,
    compareLists,


    dayMonthYear,
    validSteamID,
    findUser,
    getSteamUsername,
    getAllGames,
    removeGameNoPlaytime,
    createGamesList,
    retrieveGameAchievements,
    countDoneAchievements
};