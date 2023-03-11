const axios = require("axios");
const moment = require("moment")
const fs = require("fs");

const script = require("./scripts")

const STEAMKEY = process.env.STEAMKEY;

const { Telegraf } = require("telegraf");
const TELEGRAM_KEY = process.env.TELEGRAM_KEY;
const bot = new Telegraf(TELEGRAM_KEY, {handlerTimeout: 300000});

const numbers = "0123456789";

bot.start(ctx => {
    return ctx.reply(`Heya!\nTo start, write /create\nAfter that, just follow the instructions provided\nIf you already have an account, you can skip this step!\nBe sure to read the commands, so you can know what I'm capable of!\nJust type /help\n(Please, no caps, I get sad if you shout at me ;-;)`)
});

bot.help(ctx => {
    return ctx.reply("Here are the commands that I know:\n/create - Create a profile for you Steam Flashback\n/update - Updates Steam ID\n/check - Retrieves Steam ID and Name from DB\n/delete - Deletes your Flashback Account\n/list - list all games on your library\n/game [number of the game] - retrieves game's info (Be sure to write it corrrectly)\n/flashback - W.I.P\n/dev - Dev's info");
});

bot.command("create", async ctx => {
    const userList = require("../database/users.json");
    const accExists = userList.find(user => { if (user.telegramID == ctx.from.id) return user; });
    if (accExists) return ctx.reply(`A Flashback account is already linked to this Telegram account!\nPlease use /check to verify your information ^^`);
    const steamID = ctx.update.message.text.trim().slice(7).trim();
    if (!steamID){
        return ctx.reply(`To create you profile, send "/create [SteamID]".\nIf you don't know your SteamID, access this link https://steamid.xyz/ \nCopy and paste you Steam Profile URL\nThe number under Steam64 ID is the number we're looking for!\nRemember to set your profile games and achievements to "Public"\\!`);
    };
    if (steamID.length > 18) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help")
    let idIsNumber = true;
    for (let checkIndex = 0; checkIndex < steamID.length && idIsNumber; checkIndex++){
        if (!numbers.includes(steamID[checkIndex])) idIsNumber = false;
    };
    if (!idIsNumber) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help")
    await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${steamID}`)
        .then(async res => {
            const profileInfo = res.data.response.players[0];
            if (!profileInfo) return ctx.reply("No Steam user found. Please check the ID sent");
            ctx.replyWithMarkdownV2(`Steam profile name: *${profileInfo.personaname}*\\.\n\nThe account is being set up\\!\nPlease wait a few seconds :3\nIf this is not the account you wanted, please wait for the setup to finish to delete the account\\!\nYou can come back later, I'll be giving you updates :3`);
            const newProfile = {
                "telegramID": ctx.message.from.id.toString(),
                "steamID": steamID
            };
            userList.push(newProfile);
            const userListString = JSON.stringify(userList, null, 1);
            const error = await fs.writeFileSync("./src/database/users.json", userListString, err => {
                if (err) return console.log(err);
            });
            fs.mkdirSync(`./src/database/usersGames/${ctx.message.from.id}`, {recursive: true}, err => {if (err) return console.log (err)});
            if (error) return ctx.reply("Something went wrong, please contact the developer for support - Error 001\nUse /dev for contact info.");
            return ctx.replyWithMarkdownV2(`*Congrats ${ctx.from.first_name}*\\!\n\nFlashback account created successfully\\!`);
        })
        .catch(err => {
            console.log(err);
        });
    const profile = userList.find(user => {if (user.telegramID == ctx.from.id) return user;});
    if (!profile) return;
    profile.library = [];
    await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
        .then(async res => {
            const gamesList = res.data.response.games;
            if (!gamesList || gamesList.length == 0) return ctx.reply("Your profile may be set to private, please verify your settings");
            ctx.reply(`Looking at your games now!\nThis may take a while, we found ${gamesList.length} titles in your library\nWe migth not keep track of everything due no recorded activity`);
            for (let libraryIndex = 0; libraryIndex < gamesList.length; libraryIndex++){
                if (gamesList[libraryIndex].playtime_forever != 0){
                    profile.library.push(
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
        profile.gamesInfo = [];
        profile.list = [];
    for (let appidIndex = 0; appidIndex < profile.library.length; appidIndex++){
        if (appidIndex == Math.floor(profile.library.length/2)) ctx.reply ("Halfway through");
        if (appidIndex == Math.floor(profile.library.length*3/4)) ctx.reply ("Almost done");
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${profile.library[appidIndex].appid}&key=${STEAMKEY}&steamid=${steamID}`)
            .then(async res => {
                profile.gamesInfo.push({
                    title: res.data.playerstats.gameName,
                    appid: profile.library[appidIndex].appid,
                    achievements: res.data.playerstats.achievements,
                    playtime: profile.library[appidIndex].playtime
                });
                profile.list.push({
                    name: res.data.playerstats.gameName,
                    playtime: profile.library[appidIndex].playtime});
            })
            .catch(err => {});
    };
    const today = {
        day: moment().format("DD"),
        month: moment().format("MM"),
        year: moment().format("YYYY"),
    };
    await fs.mkdirSync(`./src/database/usersGames/${ctx.message.from.id}/${today.year}/${today.month}`, {recursive: true}, err => {if (err) return console.log (err)});
    profile.gamesInfo = script.reformat(profile.gamesInfo)
    const gamesInfoString = JSON.stringify(profile.gamesInfo, null, 1);
    const error = await fs.writeFileSync(`./src/database/usersGames/${ctx.message.from.id}/${today.year}/${today.month}/${today.day}.json`, gamesInfoString, err => {
        if (err){
            ctx.reply("Please contact the dev for support - Error 002.0\nUse /dev for contact info.");
            return err
        };
    });
    if (error) return ctx.reply("Something went wrong, please contact the developer for support - Error 003\nUse /dev for contact info.");
    const gamesListString = JSON.stringify(profile.list, null, 1);
    await fs.writeFileSync(`./src/database/usersGames/${ctx.message.from.id}/${today.year}/${today.month}/list.json`, gamesListString, err => {
        if (err){
            ctx.reply("Please contact the dev for support - Error 002.1\nUse /dev for contact info.");
            return err
        };
    });
    return ctx.replyWithMarkdownV2(`We saved ${profile.gamesInfo.length} games info\\!\nFeel free to play and I take care of the rest\\!`);
});

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
const TELEGRAM_ID = process.env.TELEGRAM_ID;

bot.command("update", async ctx => {
    if (ctx.update.message.from.id != TELEGRAM_ID) return;
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
    if (ctx.update.message.from.id != TELEGRAM_ID) return;
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
    if (ctx.update.message.from.id != TELEGRAM_ID) return;
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


bot.hears ("test", async ctx => {
    await axios.get (`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAMKEY}&steamid=76561198175450183&format=json`)
        .then(res => {
            console.log(res.data.response.games)
        })
        .catch( err => {
            console.log(err)
        })
})

bot.launch();

module.exports = {
    bot
};