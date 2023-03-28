const STEAMKEY = process.env.STEAMKEY;
const TELEGRAM_KEY = process.env.TELEGRAM_KEY;
const DEV_ID = process.env.DEV_ID;

const axios = require("axios");
const moment = require("moment")
const fs = require("fs");

const { Telegraf } = require("telegraf");
const bot = new Telegraf(TELEGRAM_KEY, {handlerTimeout: 300000});

const script = require("./script2")

bot.start(ctx => {
    return ctx.reply(`Heya!\nTo start, write /create\nAfter that, just follow the instructions provided\nIf you already have an account, you can skip this step!\nBe sure to read the commands, so you can know what I'm capable of!\nJust type /help\n(Please, no caps, I get sad if you shout at me ;-;)\nThis bot is NOT afilliate to Steam!`);
});

bot.help(ctx => {
    return ctx.reply("Here are the commands that I know:\n/create - Create a profile for you Steam Flashback\n/update - Updates Steam ID\n/check - Retrieves Steam ID and Name from DB\n/delete - Deletes your Flashback Account\n/list - list all games on your library\n/game [number of the game] - retrieves game's info (Be sure to write it corrrectly)\n/flashback - W.I.P\n/dev - Dev's info");
});


bot.command("create", async ctx => {
    const telegramID = ctx.from.id.toString();  
    const userRegistered = script.findUser(telegramID);
    if (userRegistered) return ctx.reply(`A Flashback account is already linked to this Telegram account!\nPlease use /check to verify your information ^^`);
    const steamID = ctx.update.message.text.trim().slice(7).trim().toString();
    if (!steamID){
        return ctx.reply(`To create you profile, send "/create [SteamID]".\nIf you don't know your SteamID, access this link https://steamid.xyz/ \nCopy and paste you Steam Profile URL\nThe number under Steam64 ID is the number we're looking for!\nRemember to set your profile games and achievements to "Public"\\!`);
    };
    const validSteamID = script.validSteamID(steamID);
    if (!validSteamID) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help");
    const profileUsername = await script.getSteamUsername(steamID);
    if (!profileUsername) return ctx.reply("No Steam user found. Please check the ID sent");
    ctx.reply(`Steam profile name: ${profileUsername}\nThe account is being set up!\nPlease wait a few seconds :3\nIf this is not your Steam Account, please wait for the proccess to finish and delete the account and set up again!`);
    const newProfile = {
        "telegramID": telegramID,
        "steamID": steamID
    };
    const userList = require("../database/users.json");
    userList.push(newProfile);
    const userListString = JSON.stringify(userList, null, 1);
    let error = fs.writeFileSync("./src/database/users.json", userListString, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User List update\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username} \n${err}`)
            return err
        };
        return false;
    });
    if (error) return ctx.reply("We found an error, please contact the developer for help!");
    ctx.reply("Your basic info was registered in our database!\nNow, let's get look at your library!");
    const allGames = await script.getAllGames(steamID);
    if (allGames === false) {
        bot.telegram.sendMessage(DEV_ID, `botController.js - Username retrieval\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nNo games found with "getAllGames script"`);
        return ctx.reply(`We found an error, please contact the developer for help!`);
    };
    if (allGames.length == 0) return ctx.reply("Couldn't find any games, please check your profile settings to confirm if your game data is set to public\nAny data will be available after the next database update (starts at 00:01 everyday)");
    ctx.replyWithMarkdownV2(`We found *${allGames.length}* games at your library\\!\nSome may not be saved due to no playtime\\!`);
    const playedGames = script.removeGameNoPlaytime(allGames);
    const today = script.getDayMonthYear();
    error = fs.mkdirSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}`, {recursive: true}, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User database file creation\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.update.from.username}\nCreation of user directories failed`);
            return err
        };
        return false;
    });
    if (error) return ctx.reply(`We found an error, please contact the developer for help!`);
    if (playedGames.length == 0) return ctx.reply("Looks like you have not played any games at your account!\nNo worries, just go play a bit, all games info will be set up at the next database update (starts at 00:01 everyday)");
    const allGamesData = [];
    for (let index = 0; index < playedGames.length; index++){
        const gameDataToSave = {
            "name": playedGames[index].name,
            "appid": playedGames[index].appid,
            "playtime": playedGames[index].playtime            
        };
        const gameAchievements = await script.retrieveGameAchievements(steamID, playedGames[index].appid);
        if (gameAchievements){
            gameDataToSave.achievements = gameAchievements;
            gameDataToSave.achieved = script.countDoneAchievements(gameAchievements);
        };
        allGamesData.push(gameDataToSave);
    };
    const allGamesDataStringified = JSON.stringify(allGamesData, null, 1);
    error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, allGamesDataStringified, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User game data saving process\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nSaving games list to database`);
            return err;
        };
        return false;
    });
    if (error) return ctx.reply("We found an error, please contact the developer for help!");
    error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, allGamesDataStringified, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User game list saving process\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nSaving games list to database`);
            return err;
        };
        return false;
    });
    if (error) return ctx.reply("We found an error, please contact the developer for help!");
    return ctx.replyWithMarkdownV2(`We saved ${allGamesData.length} games info\\!\nFeel free to play and we will take care of the rest\\!`);
});


bot.command("check", async ctx => {
    const telegramID = ctx.from.id;
    const userRegistered = script.findUser(telegramID);
    if (!userRegistered) return ctx.reply("Sorry, you don't have an account created.\nTry using /create\nIf you already created an account, please be sure to use the same Telegram user od the created account");
    const profileUsername = await script.getSteamUsername(userRegistered.steamID);
    const firstDay = script.getFirstDay(telegramID);
    const timeElapsed = moment(firstDay,"DDMMYYYY").fromNow();
    const today = script.getDayMonthYear();
    const gamesList = require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`);
    return ctx.replyWithMarkdownV2(`Your Telegram is linked to *${profileUsername}* Steam profile\\!\n\nWe started monitoring the gaming activity *${timeElapsed}*\\!\nThere are *${gamesList.length}* games being watched\\!\nTo see a list of your games, use /list`);
});

bot.command("delete", ctx => {
    const confirmation = ctx.message.text.trim().slice(6).trim();
    if (confirmation != "flashback") return ctx.replyWithMarkdownV2(`To delete your account send:\n/delete flashback\nRemember that *ALL* your data will be deleted\\. Be sure of your decision since it's irreversible\\!`)
});
//To unify with /delete
bot.command("destroy", async ctx => {
    const confirmed = ctx.update.message.text.slice(8).trim();
    if (confirmed != "flashback") return ctx.replyWithMarkdownV2("*This action is irreversible\\!*\n*\\Be certain of your decision\\!*");
    const usersList = require("../database/users.json");
    const profileExistsIndex = usersList.findIndex((user) => { if (user.telegramID == ctx.message.from.id.toString()) return user;});
    if (profileExistsIndex == -1) return ctx.reply("No account found, to create use /create");
    usersList.splice(profileExistsIndex, 1);
    const usersListString = JSON.stringify(usersList, null, 1);
    const error = await fs.writeFileSync("./src/database/users.json", usersListString, err => {
        if (err) return console.log(err);
    });
    if (error) return ctx.reply("Something went wrong, please contact the developer for support - Error 004\nUse /dev for contact info.")
    await fs.rmSync(`./src/database/usersGames/${ctx.message.from.id}`, {recursive: true});
    return ctx.reply("Your data has been deleted from the database.\nWe're sad to see you go ;-;\nWe'll be here if you want to come back!");
});

bot.command("game", async ctx => {
    const telegramID = ctx.from.id;
    const userRegistered = script.findUser(telegramID);
    if (!userRegistered) return ctx.reply(`No profiles found linked to your Telegram\nTo create one, use /create`);
    const today = await script.getDayMonthYear();
    const allGamesList = await require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`);
    if (allGamesList == []) return "Sorry, you don't have any games saved :/\nPlease check you profile and set it to public so we can save your games on the next update <3";
    const gameNumber = ctx.update.message.text.trim().slice(6).trim();
    if (!gameNumber) {
        const gamesListMessage = script.createGameListForUser(allGamesList);
        return ctx.reply(`${gamesListMessage}`);
    };
    if (gameNumber.length > 5) return ctx.reply(`Could not read the number, please enter a number between 1 and ${allGamesList.length}`);
    const isOnlyNumbers = script.verifyOnlyNumbers(gameNumber);
    if (!isOnlyNumbers) return ctx.reply ("Please use only numbers");
    const gameIndex = gameNumber - 1;
    if (gameNumber > allGamesList.length || gameNumber == 0) return ctx.reply (`No game found with this number. Please enter a number between 1 and ${allGamesList.length}`);
    const { name, playtime, achieved, achievements } = allGamesList[gameIndex];
    const playtimeConverted = script.convertMinutesToHours(playtime);
    let message = `${name}\nPlaytime: ${playtimeConverted.hours}h ${playtimeConverted.minutes}`
    if (achievements) message += (`\nAchievements: ${achieved}/${achievements.length}`)
    return ctx.reply(`${message}`);
});


bot.command(["dev", "developer"], ctx => {
    return ctx.reply(`I was created by Sky Alarcon. Be sure to follow on Instagram @_skydoceu!\nAlso, take a peek at her Github profile: https://github.com/SkyAlarcon`)
});

bot.command("update", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    ctx.reply("Starting to update Database!");
    const yesterday = await script.getDayMonthYear(-1);
    const usersList = require("../database/users.json");
    for(let userIndex = 0; userIndex < usersList.length; userIndex++){
        const {steamID, telegramID} = usersList[userIndex];
        console.log(telegramID)
        const steamUsername = await script.getSteamUsername(steamID);
        await ctx.reply(`Profile being updated: ${steamUsername}`);
        const recentGamesList = await script.getRecentGames(steamID);
        const recentGamesListPrepared = await script.prepareGameInfo(recentGamesList);
        const allGamesList = await require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/allGames.json`);
        const gamesToBeUpdated = await script.compareUpdatesLists(recentGamesListPrepared, allGamesList);
        const gamesInfoToSave = [];
        for (let gameIndex = 0; gameIndex < gamesToBeUpdated.length; gameIndex++){
            const { name, playtime, appid } = gamesToBeUpdated[gameIndex];
            const gameDataToSave = {
                name,
                playtime,
                appid
            };
            const achievements = await script.retrieveGameAchievements(steamID, appid);
            console.log(achievements)
            if (achievements) {  
                const achieved = await script.countDoneAchievements(achievements);
                gameDataToSave.achievements = achievements;
                gameDataToSave.achieved = achieved;
            }
            gamesInfoToSave.push(gameDataToSave);
        };
        console.log(gamesInfoToSave)
        const updatedAllGamesList = await script.updateAllGamesList(gamesInfoToSave, allGamesList);
        const today = await script.getDayMonthYear();
        let error = await fs.mkdirSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}`, {recursive: true}, err => {
            if(err) {
                console.log(err);
                return err;
            };
        });
        if (error) return ctx.reply(`Telegram ID: ${telegramID} - mkdir`);
        const gamesInfoToSaveStringfied = JSON.stringify(gamesInfoToSave, null, 1);
        error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, gamesInfoToSaveStringfied, err => {
            if(err) return console.log(err);
        });
        if (error) return ctx.reply(`Telegram ID: ${telegramID} - create day.json`);
        const updatedAllGamesListStringfied = JSON.stringify(updatedAllGamesList, null, 1);
        error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, updatedAllGamesListStringfied, err => {
            if(err) return console.log(err);
        });
        if (error) return ctx.reply(`Telegram ID: ${telegramID} - create allGames.json`);
    };
    console.log("Finished")
    return ctx.reply("Auto updated Database!");
});

//TO BE REFACTORED
bot.command("reformat", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/users.json");
    for(let userIndex = 0; userIndex < usersList.length; userIndex++){
        const { telegramID } = usersList[userIndex];
        const yearsList = await fs.readdirSync(`./src/database/usersGames/${telegramID}`);
        for (let yearsIndex = 0; yearsIndex < yearsList.length; yearsIndex++){
            const monthsList = await fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}`);
            for(let monthsIndex = 0; monthsIndex < monthsList.length; monthsIndex++){
                const daysList = await fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}`);
                for (let daysIndex = 0; daysIndex < daysList.length - 1; daysIndex++){
                    console.log(`Starting ${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`);
                    const gamesInfo = await require(`../database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`);
                    const reformatedInfo = script.reformat(gamesInfo);
                    const gamesInfoString = JSON.stringify(reformatedInfo, null, 1);
                    const error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`, gamesInfoString, err => {
                        if (err){
                            return err
                        };
                    });
                    if (error) {
                        bot.telegram.sendMessage(DEV_ID, `Deu ruim\nID: ${telegramID}\nYear: ${yearsList[yearsIndex]}\nMonth: ${monthsList[monthsIndex]}\nDay: ${daysList[daysIndex]}\n${error}`)
                        ctx.reply (`Deu ruim\nID: ${telegramID}\nYear: ${yearsList[yearsIndex]}\nMonth: ${monthsList[monthsIndex]}\nDay: ${daysList[daysIndex]}`);
                    };
                };
            };
        };
    };
});

bot.command("reformat2", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/users.json");
    for(let userIndex = 0; userIndex < usersList.length; userIndex++){
        const { telegramID } = usersList[userIndex];
        const firstDay = script.getFirstDay(telegramID);
        const daysCounter = script.daysTotalCount(firstDay);
        const firstDate = script.getDayMonthYear(daysCounter);
        const firstGamesList = await require(`../database/usersGames/${telegramID}/${firstDate.year}/${firstDate.month}/${firstDate.day}.json`);
        const firstGamesListStringfied = JSON.stringify(firstGamesList, null, 1);
        let error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${firstDate.year}/${firstDate.month}/allGames.json`, firstGamesListStringfied, err => {
            if (err){
                bot.telegram.sendMessage(DEV_ID, "Deu ruim");
                return err;
            };
        });
        if (error) return ctx.reply(`Telegram ID: ${telegramID}`);       
        for (let dayCount = daysCounter + 1; dayCount <= 0 ; dayCount++){
            const today = script.getDayMonthYear(dayCount);
            const todayGamesList = await require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`);
            const yesterday = script.getDayMonthYear(dayCount - 1);
            const allGames = await require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/allGames.json`);
            const toUpdateGamesList = script.compareUpdatesLists (todayGamesList, allGames);
            const toUpdateGamesListStringfied = JSON.stringify(toUpdateGamesList, null, 1);
            error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, toUpdateGamesListStringfied, err => {
                if (err){
                    bot.telegram.sendMessage(DEV_ID, `Date: ${today.day}/${today.month}/${today.year} - DB\nTelegram ID : ${telegramID}`);
                    return err;
                };
            if (error) return;
            });
            const updatedAllGames = await script.updateAllGamesList(toUpdateGamesList, allGames);
            const updatedAllGamesStringfied = JSON.stringify(updatedAllGames, null, 1);
            error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, updatedAllGamesStringfied, err => {
                if (err){
                    bot.telegram.sendMessage(DEV_ID, `Date: ${today.day}/${today.month}/${today.year} - allGames\nTelegram ID : ${telegramID}`);
                    return err;
                };
            if (error) return;
            });
        };
    };
    ctx.reply("Reformat2 done")
});

/*
const months = {"jan": "01", 
                "feb": "02", 
                "mar": "03", 
                "apr": "04", 
                "may": "05", 
                "jun": "06", 
                "jul": "07", 
                "ago": "08", 
                "sep": "09", 
                "oct": "10", 
                "nov": "11", 
                "dec": "12"};

bot.command("recall", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const monthName = ctx.update.message.text.trim().slice(7).trim();
    const monthNumber = months[monthName];
    if(!monthNumber) return ctx.reply (`No month found. Please try again`);
    const usersList = require("../database/users.json");
    const year = moment().format("YYYY")
    const daysList = await fs.readdirSync(`./src/database/usersGames/${usersList[0].telegramID}/${year}/${monthNumber}`);

    const firstDay = await require(`../database/usersGames/${usersList[0].telegramID}/${year}/${monthNumber}/${daysList[0]}`)
    const lastDay = await require(`../database/usersGames/${usersList[0].telegramID}/${year}/${monthNumber}/${daysList[daysList.length-2]}`);
    console.log (firstDay, lastDay)


    for (let dayIndex = 0; dayIndex < daysList.length; dayIndex++){
        
    }


    //bot.telegram.sendMessage(TELEGRAM_ID, "Deu bom")
});
*/

bot.launch();

module.exports = {
    bot
};