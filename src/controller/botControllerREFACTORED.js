const axios = require("axios");
const moment = require("moment")
const fs = require("fs");

const script = require("./script2")

const STEAMKEY = process.env.STEAMKEY;

const { Telegraf } = require("telegraf");
const TELEGRAM_KEY = process.env.TELEGRAM_KEY;
const bot = new Telegraf(TELEGRAM_KEY, {handlerTimeout: 300000});
const DEV_ID = process.env.DEV_ID;

const numbers = "0123456789";

bot.start(ctx => {
    return ctx.reply(`Heya!\nTo start, write /create\nAfter that, just follow the instructions provided\nIf you already have an account, you can skip this step!\nBe sure to read the commands, so you can know what I'm capable of!\nJust type /help\n(Please, no caps, I get sad if you shout at me ;-;)\nThis bot is NOT afilliate to Steam!`)
});

bot.help(ctx => {
    return ctx.reply("Here are the commands that I know:\n/create - Create a profile for you Steam Flashback\n/update - Updates Steam ID\n/check - Retrieves Steam ID and Name from DB\n/delete - Deletes your Flashback Account\n/list - list all games on your library\n/game [number of the game] - retrieves game's info (Be sure to write it corrrectly)\n/flashback - W.I.P\n/dev - Dev's info");
});


bot.command("create", async ctx => {
    const userList = require("../database/users.json");
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
    const gamesList = script.createGamesList(playedGames);
    const today = script.dayMonthYear();
    error = fs.mkdirSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}`, {recursive: true}, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User database file creation\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nCreation of user directories failed`);
            return err
        };
        return false;
    });
    if (error) return ctx.reply(`We found an error, please contact the developer for help!`);
    if (playedGames.length == 0) return ctx.reply("Looks like you have not played any games at your account!\nNo worries, just go play a bit, all games info will be set up at the next database update (starts at 00:01 everyday)");
    const gamesListStringfied = JSON.stringify(gamesList, null, 1);
    error = fs.writeFileSync(`./src/database/usersGames/${telegramID}/${today.year}/${today.month}/list.json`, gamesListStringfied, err => {
        if (err) {
            bot.telegram.sendMessage(DEV_ID, `botController.js - User game list saving process\nSteam: ${profileUsername}\nTelegram ID: ${telegramID}\nTelegram Username: ${ctx.from.username}\nSaving games list to database`);
            return err;
        };
        return false;
    });
    if (error) return ctx.reply("We found an error, please contact the developer for help!");

    const allGamesData = [];
    for (let index = 0; index < playedGames.length; index++){
        const gameDataToSave = {
            "name": playedGames[index].name,
            "appid": playedGames[index].appid,
            "playtime": playedGames[index].playtime            
        };
        const gameAchievements = script.retrieveGameAchievements(steamID, playedGames[index].appid);
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
    return ctx.replyWithMarkdownV2(`We saved ${allGamesData.length} games info\\!\nFeel free to play and we will take care of the rest\\!`);
});


//create fail-safe
bot.command("check", async ctx => {
    const userList = require("../database/users.json");
    const profileExists = userList.find(user => {if (user.telegramID == ctx.message.from.id) return user;});
    if (!profileExists) return ctx.reply("Sorry, you don't have an account created.\nTry using /create\nIf you already created an account, please be sure to use the same Telegram user od the created account");
    await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${profileExists.steamID}`)
    .then(res => {
        profileExists.name = res.data.response.players[0].personaname;
    })
    .catch(err => {
        console.log(err);
    });
    const years = fs.readdirSync(`./src/database/usersGames/${ctx.message.from.id}`);
    const months = fs.readdirSync(`./src/database/usersGames/${ctx.message.from.id}/${years[0]}`);
    const days = fs.readdirSync(`./src/database/usersGames/${ctx.message.from.id}/${years[0]}/${months[0]}`);
    const firstDay = days[0].slice(0, 2)+months[0]+years[0];
    const timeElapsed = moment(firstDay,"DDMMYYYY").fromNow();
    const today = {
        day: moment().format("DD"),
        month: moment().format("MM"),
        year: moment().format("YYYY"),
    };
    const gamesList = require(`../database/usersGames/${ctx.message.from.id}/${today.year}/${today.month}/${today.day}.json`);
    return ctx.replyWithMarkdownV2(`Your Telegram is linked to *${profileExists.name}* Steam profile\\!\n\nWe started monitoring the gaming activity *${timeElapsed}*\\!\nThere are *${gamesList.length}* games being watched\\!`);
});

bot.command("delete", ctx => {
    return ctx.replyWithMarkdownV2(`To delete your account send:\n/destroy flashback\nRemember that *ALL* your data will be deleted\\. Be sure of your decision since it's irreversible\\!`)
});

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

//REFACTOR
bot.command("list", ctx => {
    const userList = require("../database/users.json");
    const profileExists = userList.find(user => {if (user.telegramID == ctx.message.from.id) return user;});
    if (!profileExists) return ctx.reply("Sorry, you don't have an account created.\nTry using /create\nIf you already created an account, please be sure to use the same Telegram user od the created account");
    const today = {
        month: moment().format("MM"),
        year: moment().format("YYYY"),
    };
    
    const gamesList = require(`../database/usersGames/${profileExists.telegramID}/${today.year}/${today.month}/list.json`);
    let gamesListFormated = ""
    for (let index = 0; index < gamesList.length; index++){
        gamesListFormated += `${index+1}. ${gamesList[index]}\n`
    }
    gamesListFormated.trim();
    return ctx.reply(`${gamesListFormated}`)
    return ctx.reply("You called /list command");
});

//GAME
bot.command("game", ctx => {
    const userList = require("../database/users.json");
    const profileExists = userList.find(user => { if (user.telegramID == ctx.from.id) return user; });
    if (!profileExists) return ctx.reply(`No profiles found linked to your Telegram\nTo create one, use /create`);
    const gameNumber = ctx.update.message.text.trim().slice(6).trim();
    if (!gameNumber) return ctx.reply(`Please write the number of the game like this: /game [number]\nTo find the game number, use the command /list`);
    if (gameNumber.length > 5) return ctx.reply("Could not read the number, please enter a valid value");
    let isNumber = true;
    for(let checkIndex = 0; checkIndex < gameNumber.length; checkIndex++){
        if (!numbers.includes(gameNumber[checkIndex])){
            isNumber = false;
            break;
        };
    };
    if (!isNumber) return ctx.reply("Please use only numbers to select a game");
    const today = {
        day: moment().format("DD"),
        month: moment().format("MM"),
        year: moment().format("YYYY")
    };
    const gameIndex = gameNumber - 1;
    const gamesList = require(`../database/usersGames/${profileExists.telegramID}/${today.year}/${today.month}/${today.day}.json`);
    if (gameNumber > gamesList.length) return ctx.reply ("No game found with this number")
    const game = gamesList[gameIndex];
    return ctx.reply(`${game.title}\nAchievements: ${game.achieved}/${game.achievements.length}`);
});

bot.command(["dev", "developer"], ctx => {
    return ctx.reply(`I was created by Sky Alarcon. Be sure to follow on Instagram @_skydoceu!\nAlso, take a peek at her Github profile: https://github.com/SkyAlarcon`)
});

const autoUpdate = require("./autoUpdate");

bot.command("update", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    ctx.reply("Starting to update Database!")
    const usersList = require("../database/users.json");
    for (let userIndex = 0; userIndex < usersList.length; userIndex++){
        await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${usersList[userIndex].steamID}`)
        .then(async res => {
            if (!res.data.response.players[0]) return ctx.reply(`No Steam user found for ID ${usersList[userIndex].telegramID}`);
            ctx.replyWithMarkdownV2(`Profile being updated: *${res.data.response.players[0].personaname}*`);
            await autoUpdate(usersList[userIndex].telegramID, usersList[userIndex].steamID);
            await ctx.reply(`Updated ${userIndex+1} of ${usersList.length}!`);
        })
        .catch(err => {
            console.log(err);
        });
    };
    return ctx.reply("Auto updated Database!");
});

bot.command("reformat", async ctx => {
    if (ctx.update.message.from.id != DEV_ID) return;
    const usersList = require("../database/users.json");
    for(let userIndex = 0; userIndex < 1/*usersList.length*/; userIndex++){
        const { telegramID } = usersList[userIndex];
        const yearsList = await fs.readdirSync(`./src/database/usersGames/${telegramID}`);
        for (let yearsIndex = 0; yearsIndex < yearsList.length; yearsIndex++){
            const monthsList = await fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}`);
            for(let monthsIndex = 0; monthsIndex < monthsList.length; monthsIndex++){
                const daysList = await fs.readdirSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}`);
                for (let daysIndex = 0; daysIndex < daysList.length - 1; daysIndex++){
                    console.log(`Starting ${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`)
                    const gamesInfo = await require(`../database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`);
                    const reformatedInfo = script.reformat(gamesInfo);
                    const gamesInfoString = JSON.stringify(reformatedInfo, null, 1);
                    const error = await fs.writeFileSync(`./src/database/usersGames/${telegramID}/${yearsList[yearsIndex]}/${monthsList[monthsIndex]}/${daysList[daysIndex]}`, gamesInfoString, err => {
                        if (err){
                            return err
                        };
                    });
                    if (error) {
                        ctx.reply (`Deu ruim\nID: ${telegramID}\nYear: ${yearsList[yearsIndex]}\nMonth: ${monthsList[monthsIndex]}\nDay: ${daysList[daysIndex]}`);
                    };
                };
            };
        };
    };
});

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

const STEAMID = process.env.STEAM_ID
bot.hears ("test", async ctx => {
    console.log("1")
    await axios.get (`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAMKEY}&steamid=${STEAMID}&format=json`)
        .then(async res => {
            await console.log(res.data.response.games[0])
        })
        .catch( err => {
            console.log(err)
        });
        console.log("2")
    await axios.get (`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${STEAMID}&include_appinfo=true&format=json`)
        .then( async res => {
            await console.log(res.data.response.games[0])
        })
        .catch( err => {
            console.log(err)
        })
})

bot.launch();

module.exports = {
    bot
};