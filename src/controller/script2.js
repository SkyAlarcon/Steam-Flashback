const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const STEAMKEY = process.env.STEAMKEY

const wait = (miliseconds = 42000) => {
    setTimeout(()=> {
        return 1
    }, miliseconds);
};

const reformat = (gamesInfo) => {
    const gamesInfoFormated =[];
    for (let index = 0; index < gamesInfo.length; index++){
        const { appid, achievements, achieved, playtime } = gamesInfo[index];
        const newFormat = {
            "name": gamesInfo[index].title || gamesInfo[index].name,
            appid,
            playtime,
            achieved,
            achievements
        }
        gamesInfoFormated.push(newFormat);
    };
    return gamesInfoFormated;
};

const getDayMonthYear = (daysFromToday = 0) => {
    const date = {
        day: moment().add((daysFromToday), "days").format("DD"),
        month: moment().add((daysFromToday), "days").format("MM"),
        year: moment().add((daysFromToday), "days").format("YYYY")
    };
    return date;
};

const findUser = (telegramID) => {
    const usersList = require("../database/users.json");
    const user = usersList.find(user => { if (user.telegramID == telegramID) return user})
    return user;
};

const validSteamID = (steamID) => {
    if (steamID.length > 18) return false;
    const onlyNumbers = verifyOnlyNumbers(steamID);
    return onlyNumbers;
};

const verifyOnlyNumbers = (str) => {
    const numbers = "0123456789"
    for (let index = 0; index < str.length; index++){
        if (!numbers.includes(str[index])) return false;
    };
    return true;
}

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

const removeGameNoPlaytime = (gamesList = []) => {
    const playedGames = [];
    for (let index = 0; index < gamesList.length; index++){
        if (gamesList[index].playtime_forever < 1) continue;
        playedGames.push(gamesList[index]);
    };
    const playedGamesPreparedInfo = prepareGameInfo(playedGames);
    return playedGamesPreparedInfo;
};

const prepareGameInfo = (gameList = []) => {
    const gameInfoPrepared = [];
    for (let index = 0; index < gameList.length; index++){
        if (gameList[index].playtime_forever < 1) continue;
        const newGame = {
            "name": gameList[index].name,
            "appid": gameList[index].appid,
            "playtime": gameList[index].playtime_forever
        };
        gameInfoPrepared.push(newGame);
    };
    return gameInfoPrepared;
}

const retrieveGameAchievements = async (steamID, appid) => {
    const gameAchievements = await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${STEAMKEY}&steamid=${steamID}`)
        .then(async res => {
            const achievementsData = await res.data.playerstats.achievements;
            if (!achievementsData) return false;
            return achievementsData;
        })
        .catch(err => {
            return false;
        });
    return gameAchievements;
}

const countDoneAchievements = (achievsList) => {
    let achievsDone = 0;
    for (let index = 0; index < achievsList.length; index++){
        if (achievsList[index].achieved) achievsDone += 1;
    };
    return achievsDone;
};

const getFirstDay = (telegramID) => {
    const years = fs.readdirSync(`./src/database/usersGames/${telegramID}`);
    const months = fs.readdirSync(`./src/database/usersGames/${telegramID}/${years[0]}`);
    const days = fs.readdirSync(`./src/database/usersGames/${telegramID}/${years[0]}/${months[0]}`);
    const firstDay = days[0].slice(0, 2) + months[0] + years[0];
    return firstDay;
};

const daysTotalCount = (date) => {
    const today = moment().format("DDMMYYYY")
    const days = moment(date, "DDMMYYYY").diff(moment(today, "DDMMYYYY"), "days");
    return days;
};

const compareUpdatesLists = (newList = [], oldList) => {
    const playedGames = [];
    for (let newIndex = 0; newIndex < newList.length; newIndex++){
        const newName = newList[newIndex].name;
        const newPlaytime = newList[newIndex].playtime;
        for (let oldIndex = 0; oldIndex < oldList.length; oldIndex++){
            const oldName = oldList[oldIndex].name;
            const oldPlaytime = oldList[oldIndex].playtime;
            if (newName != oldName) continue;
            if (newPlaytime == oldPlaytime) {break;}
            else {
                playedGames.push(newList[newIndex]);
                break;
            };
        };
    };
    return playedGames;
};

const updateAllGamesList = (toUpdate, allGames) => {
    const allGamesUpdated = allGames;
    for (let updIndex = 0; updIndex < toUpdate.length; updIndex++){
        const { name } = toUpdate[updIndex];
        for (let gameIndex = 0; gameIndex < allGamesUpdated.length; gameIndex++){
            if (name == allGamesUpdated[gameIndex].name) {
                allGamesUpdated[gameIndex].playtime = toUpdate[updIndex].playtime;
                allGamesUpdated[gameIndex].achievements = toUpdate[updIndex].achievements;
                allGamesUpdated[gameIndex].achieved = toUpdate[updIndex].achieved;
                break;
            };
        };
    };
    return allGamesUpdated;
};

const getRecentGames = async (steamID) => {
    const gamesList = await axios.get(`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&format=json`)
        .then(async res => {
            const gamesList = await res.data.response.games;
            return gamesList
        })
        .catch(err => {
            console.log(err)
            return false
        });
    return gamesList;
};

const reformat2 = (yesterday, today) => {
    const newList = [];

    for (let tIndex = 0; tIndex < today.length; tIndex++) {
        const game = yesterday.find(yGame => {
            if (yGame.name == today[tIndex].name) return yGame;
        });
        if (!game){
            newList.push(today[tIndex]);
            continue;
        };
        if (game.playtime != today[tIndex].playtime){
            newList.push(today[tIndex]);
        }
    };

    return newList
};

const createGameListForUser = (gamesList = []) => {
    if (gamesList == []) return "Sorry, you don't have any games saved :/\nPlease check you profile and set it to public so we can save your games on the next update <3"
    let message = "";
    for (let index = 0; index < gamesList.length; index++){
        const newGame = `${index + 1}. ${gamesList[index].name}\n`;
        message += newGame;
    };
    message.trim();
    return message;
};

const convertMinutesToHours = (totalMinutes) => {
    const minutesInNumber = totalMinutes
    const time = {
        hours: Math.floor(minutesInNumber / 60),
        minutes: minutesInNumber % 60
    };
    return time;    
};

const removeUser = (telegramID) => {
    const usersList = require("../database/users.json");
    const userIndex = usersList.findIndex((user, index) => {if (telegramID == user.telegramID) return index});
    usersList.splice(userIndex, 1);
    return usersList;
};

module.exports = {
    wait,
    reformat,
    reformat2,


    getDayMonthYear,
    validSteamID,
    findUser,
    getSteamUsername,
    getAllGames,
    removeGameNoPlaytime,
    retrieveGameAchievements,
    countDoneAchievements,
    getFirstDay,
    daysTotalCount,
    compareUpdatesLists,
    updateAllGamesList,
    getRecentGames,
    verifyOnlyNumbers,
    createGameListForUser,
    convertMinutesToHours,
    prepareGameInfo,
    removeUser
};