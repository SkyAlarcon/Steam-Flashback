const fs = require("fs")
const script = require("./script2")


const autoUpdate_FailSafe = async () => {
    let time = script.getTime();
    console.log(`${time}`);
    const yesterday = await script.getDayMonthYear(-1);
    const usersList = require("../database/users.json");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++) {
        const { steamID, telegramID } = usersList[userIndex];
        const steamUsername = await script.getSteamUsername(steamID);
        console.log(`Steam username: ${steamUsername}`)
        const recentGamesList = await script.getRecentGames(steamID);
        const recentGamesListPrepared = await script.prepareGameInfo(recentGamesList);
        const allGamesList = await require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/allGames.json`);
        const gamesToBeUpdated = await script.compareUpdatesLists(recentGamesListPrepared, allGamesList);
        const gamesInfoToSave = [];        
        for (let gameIndex = 0; gameIndex <  gamesToBeUpdated.length; gameIndex++) {
            const { name, playtime, appid } = gamesToBeUpdated[gameIndex];
            const gameDataToSave = {
                name,
                playtime,
                appid
            };
            const achievements = await script.retrieveGameAchievements(steamID, appid);
            if (achievements) {
                const achieved = await script.countDoneAchievements(achievements);
                gameDataToSave.achievements = achievements;
                gameDataToSave.achieved = achieved;
            }
            gamesInfoToSave.push(gameDataToSave);
        };
        const updatedAllGamesList = await script.updateAllGamesList(gamesInfoToSave, allGamesList);
        const today = await script.getDayMonthYear();
        await fs.mkdirSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}`, { recursive: true }, err => {
            if (err) {
                console.log(err);
                return err;
            };
            return false
        });
        const gamesInfoToSaveStringfied = JSON.stringify(gamesInfoToSave, null, 1);
        error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, gamesInfoToSaveStringfied, err => {
            if (err) {
                console.log(err);
                return err;
            };
        });
        const updatedAllGamesListStringfied = JSON.stringify(updatedAllGamesList, null, 1);
        error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, updatedAllGamesListStringfied, err => {
            if (err) {
                console.log(err);
                return err;
            };
        });
        if (error) return;
    };
    time = script.getTime();
    console.log(`${time}`);
    return console.log("Fail-safe executed!")
}

autoUpdate_FailSafe()