const TELEGRAM_KEY = process.env.TELEGRAM_KEY;
const DEV_ID = process.env.DEV_ID;

const moment = require("moment")
const fs = require("fs");

const { Telegraf } = require("telegraf");
const bot = new Telegraf(TELEGRAM_KEY, { handlerTimeout: 300000 });

const script = require("./script2");

bot.telegram.sendMessage(DEV_ID, "Up and running!", {disable_notification: true})

bot.start(ctx => {
    return ctx.reply(`Heya!\nTo start, write /create\nAfter that, just follow the instructions provided\nIf you already have an account, you can skip this step!\nBe sure to read the commands, so you can know what I'm capable of!\nJust type /help\n(Please, no caps, I get sad if you shout at me ;-;)\nThis bot is NOT afilliate to Steam!`);
});

bot.help(ctx => {
    return ctx.reply("Here are the commands that I know:\n/create - Create a profile for you Steam Flashback\n/update - Updates Steam ID\n/check - Retrieves basic account info\n/delete - Deletes your Flashback Account\n\n/game [number] - retrieves game's info (Be sure to write it corrrectly)\n/flashback - W.I.P\n/dev - Dev's info");
});

bot.command("create", async ctx => {
    const telegramID = ctx.from.id.toString();
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (userRegistered) return ctx.reply(`A Flashback account is already linked to this Telegram account!\nPlease use /check to verify your information ^^`);
    if (usersList.length >= 15) return ctx.reply("Sorry, but we reached the maximum number of users for now! Be sure to stay tuned on the dev social!\nUse /dev for more info")
    const steamID = ctx.update.message.text.trim().slice(7).trim().toString();
    if (!steamID) return ctx.reply(`To create you profile, send "/create [SteamID]".\nLike this: /create 000000000\nIf you don't know your SteamID, access this link https://steamid.xyz/ \nCopy and paste you Steam Profile URL\nThe number under Steam64 ID is the number we're looking for!\nRemember to set your profile games and achievements to "Public"\\!`);
    const validSteamID = script.validSteamID(steamID);
    if (!validSteamID) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help");
    const profileUsername = await script.getSteamUsername(steamID);
    if (!profileUsername) return ctx.reply("No Steam user found. Please check the ID sent");
    bot.telegram.sendMessage(DEV_ID, `New profile!\nTelegram ID: ${telegramID}\nUsername: ${ctx.from.username}`, {disable_notification: true});
    ctx.reply(`Steam profile name: ${profileUsername}\nThe account is being set up!\nPlease wait a few seconds :3\nIf this is not your Steam Account, please wait for the process to finish and delete the account and set up again!`);
    ctx.reply("Let's get a look at your library!");
    const allGames = await script.getAllGames(steamID);
    if (allGames === false) {
        bot.telegram.sendMessage(DEV_ID, `botController.js - getAllGames retrieval\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nNo games found with "getAllGames script"`);
        return ctx.reply(`We found an error, please contact the developer for help!`);
    };
    if (!allGames || allGames.length == 0) return ctx.reply("Couldn't find any games, please check your profile settings to confirm if your game data is set to public\nAny data will be available after the next database update (starts at 00:01 everyday)");
    ctx.replyWithMarkdownV2(`We found *${allGames.length}* games at your library\\!\nSome may not be saved due to no playtime\\!`);
    const playedGames = script.removeGameNoPlaytime(allGames);
    const today = script.getDayMonthYear();
    fs.mkdirSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}`, { recursive: true }, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User database file creation\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${telegramID}\nCreation of user directories failed`);
            ctx.reply(`We found an error, please contact the developer for help!`);
        };
    });
    if (playedGames.length == 0) return ctx.reply("Looks like you have not played any games at your account!\nNo worries, just go play a bit, all games info will be set up at the next database update (starts at 00:01 everyday)");
    const allGamesData = [];
    for (let index = 0; index < playedGames.length; index++) {
        const gameDataToSave = {
            "name": playedGames[index].name,
            "appid": playedGames[index].appid,
            "playtime": playedGames[index].playtime
        };
        const gameAchievements = await script.retrieveGameAchievements(steamID, playedGames[index].appid);
        if (gameAchievements) {
            gameDataToSave.achievements = gameAchievements;
            gameDataToSave.achieved = script.countDoneAchievements(gameAchievements);
        };
        allGamesData.push(gameDataToSave);
    };
    const newProfile = {
        "telegramID": telegramID,
        "steamID": steamID,
        "telegramUsername": ctx.from.username
    };
    usersList.push(newProfile);
    const usersListString = JSON.stringify(usersList, null, 1);
    fs.writeFileSync("./src/database/users.json", usersListString, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User List update\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username} \n${err}`)
            ctx.reply("We found an error, please contact the developer for help!");
        };
    });
    const allGamesDataStringified = JSON.stringify(allGamesData, null, 1);
    fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, allGamesDataStringified, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User game data saving process\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nSaving games list to database`);
            ctx.reply("We found an error, please contact the developer for help!");
        };
    });
    fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, allGamesDataStringified, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User game list saving process\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nSaving games list to database`);
            ctx.reply("We found an error, please contact the developer for help!");
        };
    });
    bot.telegram.sendMessage(DEV_ID, `New profile created!\nTelegram ID: ${telegramID}\nSteam user: ${profileUsername}\nSteam ID: ${steamID}`, {disable_notification: true});
    return ctx.replyWithMarkdownV2(`We saved ${allGamesData.length} games info\\!\nFeel free to play and we will take care of the rest\\!`);
});

bot.command("check", async ctx => {
    const telegramID = ctx.from.id;
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (!userRegistered) return ctx.reply("Sorry, you don't have an account created.\nTry using /create\nIf you already created an account, please be sure to use the same Telegram user od the created account");
    const profileUsername = await script.getSteamUsername(userRegistered.steamID);
    const firstDay = script.getFirstDay(telegramID);
    const timeElapsed = moment(firstDay, "DDMMYYYY").fromNow();
    const today = script.getDayMonthYear();
    const gamesList = require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`);
    return ctx.replyWithMarkdownV2(`Your Telegram is linked to *${profileUsername}* Steam profile\\!\n\nWe started monitoring the gaming activity *${timeElapsed}*\\!\nThere are *${gamesList.length}* games being watched\\!\nTo see a list of your games, use /game`);
});

bot.command("delete", async ctx => {
    const telegramID = ctx.from.id;
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (!userRegistered) return ctx.reply(`No profiles found linked to your Telegram\nTo create one, use /create`);
    const confirmation = ctx.message.text.trim().slice(7).trim();
    if (confirmation != "flashback") return ctx.replyWithMarkdownV2(`To delete your account send:\n/delete flashback\nRemember that *ALL* your data will be deleted\\. Be sure of your decision since it's irreversible\\!`);
    let error = await fs.rmSync(`./src/database/usersGames/${ctx.message.from.id}`, { recursive: true }, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `TelegramID: ${telegramID} - Delete files`)
            return err;
        };
    });
    if (error) return ctx.reply(`We found an error, please contact the developer for help!`);
    const newUserList = script.removeUser(telegramID, usersList);
    const newUserListStringfied = JSON.stringify(newUserList, null, 1);
    error = await fs.writeFileSync("./src/database/users.json", newUserListStringfied, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `TelegramID: ${telegramID} - Save newUserList after delete`);
            return err;
        };
    });
    if (error) return ctx.reply(`We found an error, please contact the developer for help!`);
    bot.telegram.sendMessage(DEV_ID, `Profile deleted\nTelegram user: ${ctx.from.username}\nTelegram ID: ${telegramID}\nSteam ID: ${userRegistered.steamID}`);
    return ctx.reply("We are sorry to see you go *;\\-;*\nAll your data has been deleted\\!\nWe\\'ll be here if you want to come back \\*<3*");
});

bot.command("game", async ctx => {
    const telegramID = ctx.from.id;
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (!userRegistered) return ctx.reply(`No profiles found linked to your Telegram\nTo create one, use /create`);
    const today = await script.getDayMonthYear();
    const allGamesList = await require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`);
    if (allGamesList == []) return "Sorry, you don't have any games saved :/\nPlease check you profile and set it to public so we can save your games on the next update <3";
    const gameNumber = ctx.update.message.text.trim().slice(6).trim();
    if (!gameNumber) {
        const gamesListMessage = script.createGameListForUser(allGamesList);
        for (let index = 0; index < gamesListMessage.length; index++){
            await ctx.reply(`${gamesListMessage[index]}`);
        }
        return ctx.reply(`To see some basic info of any game, just send: /game [number]`);
    };
    if (gameNumber.length > 5) return ctx.reply(`Could not read the number, please enter a number between 1 and ${allGamesList.length}`);
    const isOnlyNumbers = script.verifyOnlyNumbers(gameNumber);
    if (!isOnlyNumbers) return ctx.reply("Please use only numbers");
    const gameIndex = gameNumber - 1;
    if (gameNumber > allGamesList.length || gameNumber == 0) return ctx.reply(`No game found with this number. Please enter a number between 1 and ${allGamesList.length}`);
    const { name, playtime, achieved, achievements, appid } = allGamesList[gameIndex];
    const playtimeConverted = script.convertMinutesToHours(playtime);
    let message = `${name}\nPlaytime: ${playtimeConverted.hours}h ${playtimeConverted.minutes}min`
    if (achievements) message += (`\nAchievements: ${achieved}/${achievements.length}`)
    const imgUrl = await script.getGameBanner(appid)
    if(imgUrl) await bot.telegram.sendPhoto(telegramID, imgUrl);
    return ctx.reply(`${message}`);
});

bot.command(["dev", "developer"], ctx => {
    return ctx.reply(`I was created by Sky Alarcon. Be sure to follow on Instagram @_skydoceu!\nAlso, take a peek at her Github profile: https://github.com/SkyAlarcon`)
});

const months = {
    "jan": "01",
    "feb": "02",
    "mar": "03",
    "apr": "04",
    "may": "05",
    "jun": "06",
    "jul": "07",
    "aug": "08",
    "sep": "09",
    "oct": "10",
    "nov": "11",
    "dec": "12",
    "january": "01",
    "february": "02",
    "march": "03",
    "april": "04",
    "may": "05",
    "june": "06",
    "july": "07",
    "august": "08",
    "september": "09",
    "october": "10",
    "november": "11",
    "december": "12"
};

bot.command("recall", async ctx => {
    const telegramID = ctx.from.id;
    console.log(telegramID)
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (!userRegistered) return ctx.reply(`No profile found linked to your Telegram\nTo create one, use /create`);
    const recallPeriod = ctx.update.message.text.trim().slice(7).trim();
    if (!recallPeriod) return ctx.reply("To recall a month, use: /recall [month] [year]\nExample: /recall mar 2023\nRemember, you can only recall months after the date you registered your Steam account");
    const monthYear = recallPeriod.split(" ");
    const date = {
        month: monthYear[0],
        year: monthYear[1]
    };
    if (!date.month || !date.year) return ctx.reply("Please use the format: /recall [month] [year]");
    const monthIsNumbers = script.verifyOnlyNumbers(monthYear[0]);
    if (!monthIsNumbers) date.month = months[date.month];
    const yearsList = fs.readdirSync(`./src/database/usersGames/${telegramID}`, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > yearsList`);
            return ctx.reply(`We found an error, please contact the developer for help!`);
        };
    });
    const yearRegistered = yearsList.find(year => {
        if (year == date.year) return year;
    });
    if (!yearRegistered) return ctx.reply("I'm sorry, but the year asked is not at your database");
    const monthsList = fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearRegistered}`, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > monsthsList`);
            return ctx.reply(`We found an error, please contact the developer for help!`);
        };
    });
    const monthRegistered = monthsList.find(month => {
        if (month == date.month) return month;
    });
    if (!monthRegistered) return ctx.reply("I'm sorry, but the month asked is not at your database");
    const daysList = fs.readdirSync(`./src/database/usersGames/${telegramID}/${date.year}/${date.month}`, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > daysList`);
            return ctx.reply(`We found an error, please contact the developer for help!`);
        };
    });
    if (daysList.length <= 2) return ctx.reply("Sorry, we need, at least, two days of the month to be saved before making a recall");
    const allGamesList = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/allGames.json`);
    const firstDayGamesList = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/${daysList[0]}`);
    const recallInfo = script.compareUpdatesLists(firstDayGamesList, allGamesList);
    for (let dayIndex = 1; dayIndex < daysList.length - 1; dayIndex++) {
        const gamesPlayed = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/${daysList[dayIndex]}`);
        for (let gameIndex = 0; gameIndex < gamesPlayed.length; gameIndex++) {
            const gameToSave = await recallInfo.find((game, index) => {
                if (gamesPlayed[gameIndex].name == game.name) {
                    recallInfo[index].playtimeUpdated = gamesPlayed[gameIndex].playtime;
                    if (recallInfo[index].achieved) recallInfo[index].achievedUpdated = gamesPlayed[gameIndex].achieved;
                    return true;
                };
            });
            if (!gameToSave) {
                gamesPlayed[gameIndex].playtimeUpdated = gamesPlayed[gameIndex].playtime;
                if (gamesPlayed[gameIndex].achieved) gamesPlayed[gameIndex].achievedUpdated = gamesPlayed[gameIndex].achieved;
                recallInfo.push(gamesPlayed[gameIndex]);
            };
        };
    };
    let message = ""
    for (let recallIndex = 0; recallIndex < recallInfo.length; recallIndex++) {
        const monthPlaytime = recallInfo[recallIndex].playtimeUpdated - recallInfo[recallIndex].playtime;
        if (monthPlaytime == 0) continue;
        const monthPlaytimeConverted = script.convertMinutesToHours(monthPlaytime);
        const achievementsDone = recallInfo[recallIndex].achievedUpdated - recallInfo[recallIndex].achieved;
        message += `\n${recallInfo[recallIndex].name}\nYou played for ${monthPlaytimeConverted.hours} hours and ${monthPlaytimeConverted.minutes} minutes\nYou also completed ${achievementsDone} new achievements!\n`;
    };
    message.trim();
    return ctx.reply(`${message}`);
});

bot.command("beta", async ctx => {
    return await ctx.reply("Beta testing is a way to help the dev to improve something use, like an app, game or product in general!\nTo join the beta team you just need to send /joinBeta!")
});

/* ----------------- BETA TESTING ----------------- */

bot.command("joinBeta", async ctx => {
    const telegramID = ctx.from.id;
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (!userRegistered) return ctx.reply("Sorry, you are not a user :/\nPlease use /create to join us and request to be a beta tester!");
    const testersList = require("../database/betaTesters.json");
    const testerRegistered = script.findUser(telegramID, testersList);
    if (testerRegistered) {
        if (testerRegistered.status == "pending") return ctx.reply ("You are already requested to be beta tester!\nIf you want to remove the request, just send /leaveBeta!");
        if (testerRegistered.status == "approved") return ctx.reply ("You are already is a beta tester!\nIf you want to stop being a tester, just send /leaveBeta!");
    }
    if (testersList.length >= 6) return ctx.reply("I'm sorry, but we are not accepting more beta testers requests for now :/\nBe sure to pay attention to my messages to not miss out on the next time we call for more testers!")
    const tester = {
        telegramID,
        "username": ctx.from.username,
        "status": "pending",
        "steamID": userRegistered.steamID
    };
    testersList.push(tester);
    const testersListStrigfied = JSON.stringify(testersList, null, 1);
    await fs.writeFileSync(`./src/database/betaTesters.json`, testersListStrigfied, err => {
        if (err) {
            console.log(err);
            return bot.telegram.sendMessage(DEV_ID ,`Telegram ID: ${telegramID} - create betaTesters.json`, { disable_notification: true });
        };
    });
    bot.telegram.sendMessage(DEV_ID, `Beta tester request\nTelegram ID: ${telegramID}\nUsername: ${ctx.from.username}`, { disable_notification: true });
    return await ctx.reply("Thank you for helping this project come to life!\nYour information will be reviewed by the dev and you'll be notified!\nAt any point you can send /leaveBeta to leave the beta team");
});

bot.command("leaveBeta", async ctx => {
    const telegramID = ctx.from.id;
    const usersList = require("../database/users.json");
    const userRegistered = script.findUser(telegramID, usersList);
    if (!userRegistered) return ctx.reply("Sorry, you are not a user :/\nPlease use /create to join us!");
    const testersList = require("../database/betaTesters.json");
    const testerRegistered = script.findUser(telegramID, testersList);
    if (!testerRegistered) return await ctx.reply("You are not a beta tester.\nIf you want to help the develop  ment of this project, just send /joinBeta");
    const newTestersList = script.removeUser(telegramID, testersList);
    const newTestersListStrigfied = JSON.stringify(newTestersList, null, 1);
    await fs.writeFileSync(`./src/database/betaTesters.json`, newTestersListStrigfied, err => {
        if (err) {
            console.log(err);
            return bot.telegram.sendMessage(DEV_ID ,`Telegram ID: ${telegramID} - create betaTesters.json (remove Tester)`);
        };
    });
    bot.telegram.sendMessage(DEV_ID, `Beta tester left\nTelegramID: ${telegramID}\nTelegram username: ${userRegistered.username}`, { disable_notification: true })
    return await ctx.reply("We are sad to see you go ;-;\nAt any point, if you want to join again the beta team, just send /joinBeta");
});

// bot.command("testBeta", async ctx => {
//     return await ctx.reply("We now have the command /recallBeta. To have more details on your recall", { disable_notification: true })
// });

// bot.command("recallBeta", async ctx => {
//         const telegramID = ctx.from.id;
//         const testersList = require("../database/betaTesters.json");
//         const testerRegistered = script.findUser(telegramID, testersList);
//         if (!testerRegistered) return ctx.reply(`You are not a tester, sorry :/\nTo become part of the beta team, send /joinBeta!`);
//         const recallPeriod = ctx.update.message.text.trim().slice(11).trim();
//         if (!recallPeriod) return ctx.reply("To recall a month, use: /recall [month] [year]\nExample: /recall mar 2023\nRemember, you can only recall months after the date you registered your Steam account");
//         const monthYear = recallPeriod.split(" ");
//         const date = {
//             month: monthYear[0],
//             year: monthYear[1]
//         };
//         if (!date.month || !date.year) return ctx.reply("Please use the format: /recall [month] [year]");
//         const monthIsNumbers = script.verifyOnlyNumbers(monthYear[0]);
//         if (!monthIsNumbers) date.month = months[date.month];
//         const yearsList = fs.readdirSync(`./src/database/usersGames/${telegramID}`, err => {
//             if (err) {
//                 bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > yearsList`);
//                 return ctx.reply(`We found an error, please contact the developer for help!`);
//             };
//         });
//         const yearRegistered = yearsList.find(year => {
//             if (year == date.year) return year;
//         });
//         if (!yearRegistered) return ctx.reply("I'm sorry, but the year asked is not at your database");
//         const monthsList = fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearRegistered}`, err => {
//             if (err) {
//                 bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > monsthsList`);
//                 return ctx.reply(`We found an error, please contact the developer for help!`);
//             };
//         });
//         const monthRegistered = monthsList.find(month => {
//             if (month == date.month) return month;
//         });
//         if (!monthRegistered) return ctx.reply("I'm sorry, but the month asked is not at your database");
//         const daysList = fs.readdirSync(`./src/database/usersGames/${telegramID}/${date.year}/${date.month}`, err => {
//             if (err) {
//                 bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > daysList`);
//                 return ctx.reply(`We found an error, please contact the developer for help!`);
//             };
//         });
//         if (daysList.length <= 2) return ctx.reply("Sorry, we need, at least, two days of the month to be saved before making a recall");
//         const allGamesList = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/allGames.json`);
//         const firstDayGamesList = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/${daysList[0]}`);
//         const recallInfo = script.compareUpdatesLists(firstDayGamesList, allGamesList);
//         for (let dayIndex = 1; dayIndex < daysList.length - 1; dayIndex++) {
//             const gamesPlayed = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/${daysList[dayIndex]}`);
//             for (let gameIndex = 0; gameIndex < gamesPlayed.length; gameIndex++) {
//                 const gameToSave = await recallInfo.find((game, index) => {
//                     if (gamesPlayed[gameIndex].name == game.name) {
//                         recallInfo[index].playtimeUpdated = gamesPlayed[gameIndex].playtime;
//                         if (recallInfo[index].achieved) recallInfo[index].achievedUpdated = gamesPlayed[gameIndex].achieved;
//                         return true;
//                     };
//                 });
//                 if (!gameToSave) {
//                     gamesPlayed[gameIndex].playtimeUpdated = gamesPlayed[gameIndex].playtime;
//                     if (gamesPlayed[gameIndex].achieved) gamesPlayed[gameIndex].achievedUpdated = gamesPlayed[gameIndex].achieved;
//                     recallInfo.push(gamesPlayed[gameIndex]);
//                 };
//             };
//         };
//         let message = ""
//         for (let recallIndex = 0; recallIndex < recallInfo.length; recallIndex++) {
//             const monthPlaytime = recallInfo[recallIndex].playtimeUpdated - recallInfo[recallIndex].playtime;
//             if (monthPlaytime == 0) continue;
//             const monthPlaytimeConverted = script.convertMinutesToHours(monthPlaytime);
//             const achievementsDone = recallInfo[recallIndex].achievedUpdated - recallInfo[recallIndex].achieved;
//             message += `\n${recallInfo[recallIndex].name}\nYou played for ${monthPlaytimeConverted.hours} hours and ${monthPlaytimeConverted.minutes} minutes\nYou also completed ${achievementsDone} new achievements!\n`;
//         };
//         message.trim();
//         return ctx.reply(`${message}`);
        
// });

// bot.command("game", async ctx => {
//     const telegramID = ctx.from.id;
//     const testersList = require("../database/betaTesters.json");
//     const testerRegistered = script.findUser(telegramID, testersList);
//     if (!testerRegistered) return ctx.reply(`You are not a tester, sorry :/\nTo become part of the beta team, send /joinBeta!`);
//     const today = await script.getDayMonthYear();
//     const allGamesList = await require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`);
//     if (allGamesList == []) return "Sorry, you don't have any games saved :/\nPlease check you profile and set it to public so we can save your games on the next update <3";
//     const gameNumber = ctx.update.message.text.trim().slice(6).trim();
//     if (!gameNumber) {
//         const gamesListMessage = script.createGameListForUser(allGamesList);
//         for (let index = 0; index < gamesListMessage.length; index++){
//             await ctx.reply(`${gamesListMessage[index]}`);
//         }
//         return ctx.reply(`To see some basic info of any game, just send: /game [number]`);
//     };
//     if (gameNumber.length > 5) return ctx.reply(`Could not read the number, please enter a number between 1 and ${allGamesList.length}`);
//     const isOnlyNumbers = script.verifyOnlyNumbers(gameNumber);
//     if (!isOnlyNumbers) return ctx.reply("Please use only numbers");
//     const gameIndex = gameNumber - 1;
//     if (gameNumber > allGamesList.length || gameNumber == 0) return ctx.reply(`No game found with this number. Please enter a number between 1 and ${allGamesList.length}`);
//     const { name, playtime, achieved, achievements, appid } = allGamesList[gameIndex];
//     const playtimeConverted = script.convertMinutesToHours(playtime);
//     let message = `${name}\nPlaytime: ${playtimeConverted.hours}h ${playtimeConverted.minutes}min`
//     if (achievements) message += (`\nAchievements: ${achieved}/${achievements.length}`)
//     const imgUrl = await script.getGameBanner(appid)
//     if(imgUrl) await bot.telegram.sendPhoto(telegramID, imgUrl);
//     return ctx.reply(`${message}`);
// });

/* ----------------- DEV TOOLS ----------------- */

bot.command("info", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    console.log(ctx.from.username)
    console.log(ctx.from)
});

//TO BE REFACTORED
bot.command("reformat", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/users.json");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++) {
        const { telegramID } = usersList[userIndex];
        const yearsList = await fs.readdirSync(`./src/database/usersGames/${telegramID}`);
        for (let yearsIndex = 0; yearsIndex < yearsList.length; yearsIndex++) {
            const monthsList = await fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}`);
            for (let monthsIndex = 0; monthsIndex < monthsList.length; monthsIndex++) {
                const daysList = await fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}`);
                for (let daysIndex = 0; daysIndex < daysList.length - 1; daysIndex++) {
                    console.log(`Starting ${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`);
                    const gamesInfo = await require(`../database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`);
                    const reformatedInfo = script.reformat(gamesInfo);
                    const gamesInfoString = JSON.stringify(reformatedInfo, null, 1);
                    const error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`, gamesInfoString, err => {
                        if (err) {
                            return err
                        };
                    });
                    if (error) {
                        bot.telegram.sendMessage(DEV_ID, `Deu ruim\nID: ${telegramID}\nYear: ${yearsList[yearsIndex]}\nMonth: ${monthsList[monthsIndex]}\nDay: ${daysList[daysIndex]}\n${error}`)
                        ctx.reply(`Deu ruim\nID: ${telegramID}\nYear: ${yearsList[yearsIndex]}\nMonth: ${monthsList[monthsIndex]}\nDay: ${daysList[daysIndex]}`);
                    };
                };
            };
        };
    };
});

bot.command("reformat2", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/users.json");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++) {
        const { telegramID } = usersList[userIndex];
        const firstDay = script.getFirstDay(telegramID);
        const daysCounter = script.daysTotalCount(firstDay);
        const firstDate = script.getDayMonthYear(daysCounter);
        const firstGamesList = await require(`../database/usersGames/${telegramID}/${firstDate.year}/${firstDate.month}/${firstDate.day}.json`);
        const firstGamesListStringfied = JSON.stringify(firstGamesList, null, 1);
        let error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${firstDate.year}/${firstDate.month}/allGames.json`, firstGamesListStringfied, err => {
            if (err) {
                bot.telegram.sendMessage(DEV_ID, "Deu ruim");
                return err;
            };
        });
        if (error) return ctx.reply(`Telegram ID: ${telegramID}`);
        for (let dayCount = daysCounter + 1; dayCount <= 0; dayCount++) {
            const today = script.getDayMonthYear(dayCount);
            const todayGamesList = await require(`../database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`);
            const yesterday = script.getDayMonthYear(dayCount - 1);
            const allGames = await require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/allGames.json`);
            const toUpdateGamesList = script.compareUpdatesLists(todayGamesList, allGames);
            const toUpdateGamesListStringfied = JSON.stringify(toUpdateGamesList, null, 1);
            error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, toUpdateGamesListStringfied, err => {
                if (err) {
                    bot.telegram.sendMessage(DEV_ID, `Date: ${today.day}/${today.month}/${today.year} - DB\nTelegram ID : ${telegramID}`);
                    return err;
                };
                if (error) return;
            });
            const updatedAllGames = await script.updateAllGamesList(toUpdateGamesList, allGames);
            const updatedAllGamesStringfied = JSON.stringify(updatedAllGames, null, 1);
            error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, updatedAllGamesStringfied, err => {
                if (err) {
                    bot.telegram.sendMessage(DEV_ID, `Date: ${today.day}/${today.month}/${today.year} - allGames\nTelegram ID : ${telegramID}`);
                    return err;
                };
                if (error) return;
            });
        };
    };
    ctx.reply("Reformat2 done")
});

bot.command("DBupdate", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    ctx.reply("Starting to update Database!", {disable_notification: true});
    let time = script.getTime();
    ctx.reply(`${time}`, {disable_notification: true});
    const yesterday = await script.getDayMonthYear(-1);
    const usersList = require("../database/users.json");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++) {
        const { steamID, telegramID } = usersList[userIndex];
        const steamUsername = await script.getSteamUsername(steamID);
        await ctx.reply(`Profile being updated: ${steamUsername}`, {disable_notification: true});
        const recentGamesList = await script.getRecentGames(steamID);
        const recentGamesListPrepared = await script.prepareGameInfo(recentGamesList);
        const allGamesList = await require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/allGames.json`);
        const gamesToBeUpdated = await script.compareUpdatesLists(recentGamesListPrepared, allGamesList);
        const gamesInfoToSave = [];
        for (let gameIndex = 0; gameIndex < gamesToBeUpdated.length; gameIndex++) {
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
                return ctx.reply(`Telegram ID: ${telegramID} - mkdir`);
            };
            return false
        });
        const gamesInfoToSaveStringfied = JSON.stringify(gamesInfoToSave, null, 1);
        await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, gamesInfoToSaveStringfied, err => {
            if (err) {
                console.log(err);
                return ctx.reply(`Telegram ID: ${telegramID} - create day.json`);
            };
        });
        const updatedAllGamesListStringfied = JSON.stringify(updatedAllGamesList, null, 1);
        await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, updatedAllGamesListStringfied, err => {
            if (err) {
                console.log(err);
                return ctx.reply(`Telegram ID: ${telegramID} - create allGames.json`);
            };
        });
    };
    time = script.getTime();
    ctx.reply(`${time}`, {disable_notification: true});
    ctx.reply("Auto updated Database!", {disable_notification: true});
});

bot.command("sdUpdate", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    let time = script.getTime();
    await ctx.reply(`${time}`, {disable_notification: true});
    await ctx.reply("Starting to update Database!", {disable_notification: true});
    const yesterday = await script.getDayMonthYear(-1);
    const usersList = require("../database/users.json");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++) {
        const { steamID, telegramID } = usersList[userIndex];
        const steamUsername = await script.getSteamUsername(steamID);
        await ctx.reply(`Profile being updated: ${steamUsername}`, {disable_notification: true});
        const recentGamesList = await script.getRecentGames(steamID);
        const recentGamesListPrepared = await script.prepareGameInfo(recentGamesList);
        const allGamesList = await require(`../database/usersGames/${telegramID}/${yesterday.year}/${yesterday.month}/allGames.json`);
        const gamesToBeUpdated = await script.compareUpdatesLists(recentGamesListPrepared, allGamesList);
        const gamesInfoToSave = [];
        for (let gameIndex = 0; gameIndex < gamesToBeUpdated.length; gameIndex++) {
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
                return ctx.reply(`Telegram ID: ${telegramID} - mkdir`);
            };
            return false
        });
        const gamesInfoToSaveStringfied = JSON.stringify(gamesInfoToSave, null, 1);
        await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/${today.day}.json`, gamesInfoToSaveStringfied, err => {
            if (err) {
                console.log(err);
                return ctx.reply(`Telegram ID: ${telegramID} - create day.json`);
            };
        });
        const updatedAllGamesListStringfied = JSON.stringify(updatedAllGamesList, null, 1);
        await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/allGames.json`, updatedAllGamesListStringfied, err => {
            if (err) {
                console.log(err);
                return ctx.reply(`Telegram ID: ${telegramID} - create allGames.json`, {disable_notification: true});
            };
        });
    };
    time = script.getTime();
    await ctx.reply("Auto updated Database!", {disable_notification: true});
    await ctx.reply(`${time}`, {disable_notification: true});
    await ctx.reply("Turning off server");
    return script.turnOffSystem(10);
});

bot.command("DEVrecall", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = await require("../database/users.json");
    const recallPeriod = ctx.update.message.text.trim().slice(10).trim();
    if (!recallPeriod) return ctx.reply("To recall a month, use: /recall [month] [year]\nExample: /recall mar 2023\nRemember, you can only recall months after the date you registered your Steam account");
    const monthYear = recallPeriod.split(" ");
    const date = {
        month: monthYear[0],
        year: monthYear[1]
    };
    const monthIsNumbers = script.verifyOnlyNumbers(monthYear[0]);
    if (!monthIsNumbers) date.month = months[date.month];
    if (!date.month || !date.year) return ctx.reply("Please use the format: /recall [month] [year]");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++){
        const { telegramID } = usersList[userIndex];
        const yearsList = fs.readdirSync(`./src/database/usersGames/${telegramID}`, err => {
            if (err) {
                bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > yearsList`);
                return ctx.reply(`We found an error, please contact the developer for help!`);
            };
        });
        const yearRegistered = yearsList.find(year => {
            if (year == date.year) return year;
        });
        if (!yearRegistered) continue;
        const monthsList = fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearRegistered}`, err => {
            if (err) {
                bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > monsthsList`);
                return ctx.reply(`We found an error, please contact the developer for help!`);
            };
        });
        const monthRegistered = monthsList.find(month => {
            if (month == date.month) return month;
        });
        if (!monthRegistered) continue;
        const daysList = fs.readdirSync(`./src/database/usersGames/${telegramID}/${date.year}/${date.month}`, err => {
            if (err) {
                bot.telegram.sendMessage(DEV_ID, `Telegram ID: ${telegramID}\nrecall > daysList`);
                return ctx.reply(`We found an error, please contact the developer for help!`);
            };
        });
        if (daysList.length <= 2) continue;
        const allGamesList = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/allGames.json`);
        const firstDayGamesList = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/${daysList[0]}`);
        const recallInfo = script.compareUpdatesLists(firstDayGamesList, allGamesList);
        for (let dayIndex = 1; dayIndex < daysList.length - 1; dayIndex++) {
            const gamesPlayed = await require(`../database/usersGames/${telegramID}/${date.year}/${date.month}/${daysList[dayIndex]}`);
            for (let gameIndex = 0; gameIndex < gamesPlayed.length; gameIndex++) {
                const gameToSave = await recallInfo.find((game, index) => {
                    if (gamesPlayed[gameIndex].name == game.name) {
                        recallInfo[index].playtimeUpdated = gamesPlayed[gameIndex].playtime;
                        if (recallInfo[index].achieved) recallInfo[index].achievedUpdated = gamesPlayed[gameIndex].achieved;
                        return true;
                    };
                });
                if (!gameToSave) {
                    gamesPlayed[gameIndex].playtimeUpdated = gamesPlayed[gameIndex].playtime;
                    if (gamesPlayed[gameIndex].achieved) gamesPlayed[gameIndex].achievedUpdated = gamesPlayed[gameIndex].achieved;
                    recallInfo.push(gamesPlayed[gameIndex]);
                };
            };
        };
        let message = `This is what you played in ${date.month}/${date.year}\nTo see other months use the command /recall\n(This bot is still in development, so feel free to send a message to the /dev)\n`;
        for (let recallIndex = 0; recallIndex < recallInfo.length; recallIndex++) {
            const monthPlaytime = recallInfo[recallIndex].playtimeUpdated - recallInfo[recallIndex].playtime;
            if (monthPlaytime == 0) continue;
            const monthPlaytimeConverted = script.convertMinutesToHours(monthPlaytime);
            const achievementsDone = recallInfo[recallIndex].achievedUpdated - recallInfo[recallIndex].achieved;
            message += `\n${recallInfo[recallIndex].name}\nYou played for ${monthPlaytimeConverted.hours} hours and ${monthPlaytimeConverted.minutes} minutes\nYou also completed ${achievementsDone} new achievements!\n`;
        };
        message.trim();
        bot.telegram.sendMessage(telegramID, `${message}`, {disable_notification: true});
    };
});

bot.command("messageAll", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/users.json")
    const message = ctx.update.message.text.trim().slice(12).trim();
    if (message == "") return ctx.reply("No message detected");
    for (let index = 0; index < usersList.length; index++){
        const { telegramID } = usersList[index];
        await bot.telegram.sendMessage(telegramID, `${message}`, {disable_notification: true});
    };
});

bot.command("messageBetas", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/betaTesters.json")
    const message = ctx.update.message.text.trim().slice(13).trim();
    if (message == "") return ctx.reply("No message detected");
    for (let index = 0; index < usersList.length; index++){
        const { telegramID } = usersList[index];
        await bot.telegram.sendMessage(telegramID, `${message}`, {disable_notification: true});
    };
});

bot.command("betaRequests", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const testersList = require("../database/betaTesters.json");
    const filteredTesters = script.filterObjectList(testersList, "status", "pending");
    const requestCounter = filteredTesters.length
    ctx.reply(`Number of requests: ${requestCounter}`, { disable_notification: true });
});

bot.command("betaApprove", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const testersList = require("../database/betaTesters.json");
    const betasApproved = []
    for (let index = 0; index < testersList.length; index++){
        if (testersList[index].status != "pending") continue;
        testersList[index].status = "approved";
        const { telegramID } = testersList[index];
        bot.telegram.sendMessage(telegramID, "Congratulations!\nYou now joined the beta team and can try out new features before they launch to everyone else!\nTo see what is new, send /testBeta", { disable_notification: true });
        betasApproved.push(testersList[index].username);
    };
    const testersListStrigfied = JSON.stringify(testersList, null, 1);
    await fs.writeFileSync(`./src/database/betaTesters.json`, testersListStrigfied, err => {
        if (err) {
            console.log(err);
            return bot.telegram.sendMessage(DEV_ID ,`approving all betaTesters.json`, { disable_notification: true });
        };
    });
    ctx.reply(`All beta testers approved!\n${betasApproved}`, { disable_notification: true })
});

bot.command("steam", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const steamID = ctx.update.message.text.trim().slice(6).trim();
    const username = await script.getSteamUsername(steamID)
    ctx.reply(`${username}`)
})

bot.launch();

module.exports = {
    bot
};