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

module.exports = {
    wait,
    reformat,
    gameListFilter
};