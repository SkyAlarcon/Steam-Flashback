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

module.exports = {
    wait,
    reformat
};