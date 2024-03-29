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

const gameListFilter = async (steamID) => {
    const games = {}
    const resolution = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
                        .then(async res => {
                            const gamesList = res.data.response.games;
                            if (!gamesList || gamesList.length == 0) return "no games";

                            for (let libraryIndex = 0; libraryIndex < gamesList.length; libraryIndex++){
                                if (gamesList[libraryIndex].playtime_forever != 0){
                                    games.library.push(
                                        {
                                            appid: gamesList[libraryIndex].appid, 
                                            playtime: gamesList[libraryIndex].playtime_forever
                                        }
                                    );
                                };
                            };
                            return games;
                        })
                        .catch(err => {
                            console.log(err);
                        });
    return resolution;
};

const createGamesList = async (allGames) => {
    const gameList = [];
    for (let gameIndex = 0; gameIndex < allGames.length; gameIndex++){
        const gameInfo = {
            name: allGames[gameIndex].title,
            playtime: allGames[gameIndex].playtime
        };
        gameList.push(gameInfo);
    };
    return gameList;
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

const dayMonthYear = (dayCount = 0) => {
    const date = {
        day: moment().subtract(dayCount, "days").format("DD"),
        month: moment().subtract(1, "days").format("MM"),
        year: moment().subtract(1, "days").format("YYYY")
    }
    return date
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


module.exports = {
    wait,
    reformat,
    gameListFilter,
    prepareGamesInfo,
    createGamesList,
    compareLists,
    dayMonthYear
};