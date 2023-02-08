const axios = require("axios");
const moment = require("moment")
const fs = require("fs");

const STEAMKEY = process.env.STEAMKEY;

const { Telegraf } = require("telegraf");
const TELEGRAM_KEY = process.env.TELEGRAM_KEY;
const bot = new Telegraf(TELEGRAM_KEY);

bot.start(ctx => {
    return ctx.reply(`Heya!\nTo start, write /create\nAfter that, just follow the instructions provided\nIf you already have an account, you can skip this step!\nBe sure to read the commands, so you can know what I'm capable of!\nJust type /help\n(Please, no caps, I get sad if you shout at me ;-;)`)
});

bot.help(ctx => {
    return ctx.reply("Here are the commands that I know:\n/create - Create a profile for you Steam Flashback\n/update - Updates Steam ID\n/check - Retrieves Steam ID and Name from DB\n/delete - Deletes your Flashback Account\n/list - list all games on your library\n/game [name of the game] - retrieves game's info (Be sure to write it corrrectly)\n/appid - retrieves game's info by appID\n/flashback - W.I.P\n/dev - Dev's info");
});

bot.command("create", async ctx => { //refatctored to local DB
/*
    const accExists = await profileModel.findOne({telegramID: ctx.from.id});
    if (accExists) return ctx.reply(`A Flashback account is already linked to this Telegram account!\nPlease use /check to verify your information ^^`);
    const steamID = ctx.update.message.text.slice(7).trim();
    if (!steamID){
        return ctx.reply(`To create you profile, send "/create [SteamID]".\nIf you don't know your SteamID, access this link https://steamid.xyz/ \nCopy and paste you Steam Profile URL\nThe number under Steam64 ID is the number we're looking for!\nRemember to set your profile games and achievements to "Public"\\!`);
    };
    if (steamID.length > 18) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help")
    let idIsNumber = true;
    const numbers = "0123456789";
    for (let checkIndex = 0; checkIndex < steamID.length && idIsNumber; checkIndex++){
        if (!numbers.includes(steamID[checkIndex])) idIsNumber = false;
    };
    if (!idIsNumber) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help")
*/
    const userList = require("../database/users.json");
    const accExists = userList.find(user => { if (user.telegramID == ctx.from.id) return user; });
    if (accExists) return ctx.reply(`A Flashback account is already linked to this Telegram account!\nPlease use /check to verify your information ^^`);
    const steamID = ctx.update.message.text.slice(7).trim();
    if (!steamID){
        return ctx.reply(`To create you profile, send "/create [SteamID]".\nIf you don't know your SteamID, access this link https://steamid.xyz/ \nCopy and paste you Steam Profile URL\nThe number under Steam64 ID is the number we're looking for!\nRemember to set your profile games and achievements to "Public"\\!`);
    };
    if (steamID.length > 18) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help")
    let idIsNumber = true;
    const numbers = "0123456789";
    for (let checkIndex = 0; checkIndex < steamID.length && idIsNumber; checkIndex++){
        if (!numbers.includes(steamID[checkIndex])) idIsNumber = false;
    };
    if (!idIsNumber) return ctx.reply("Please insert an valid Steam ID!\nUse /create for help")
/*
    await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${steamID}`)
        .then(async res => {
            const profileInfo = res.data.response.players[0];
            if (!profileInfo) return ctx.reply("No Steam user found. Please check the ID sent");
            ctx.replyWithMarkdownV2(`Profile name: *${profileInfo.personaname}*\\.\n\nThe account is being set up\\!\nPlease wait a few seconds :3\nIf this is not the account you wanted, please wait for the setup to finish and update or delete the account\\!\nYou can come back later, I'll be giving you updates :3`);
            const newProfile = new profileModel({
                "telegramID": ctx.from.id,
                "steamID": steamID
            });
            await newProfile.save();
            return ctx.replyWithMarkdownV2(`*Congrats ${ctx.from.first_name}*\\!\n\nFlashback account created successfully\\!`);
        })
        .catch(err => {
            console.log(err);
        });
*/
    fs.mkdirSync(`../src/database/usersGames/${ctx.message.from.id}`, {recursive: true}, err => {if (err) return console.log (err)});
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
            if (error) return ctx.reply("Something went wrong, please contact the developer for support - Error 001\nUse /dev for contact info.");
            return ctx.replyWithMarkdownV2(`*Congrats ${ctx.from.first_name}*\\!\n\nFlashback account created successfully\\!`);
        })
        .catch(err => {
            console.log(err);
        });
    const profile = userList.find(user => {if (user.telegramID == ctx.from.id) return user;});
    if (!profile) return;
    await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
        .then(async res => {
            const gamesList = res.data.response.games;
            profile.library = [];
            if (!gamesList) return ctx.reply("Your profile may be set to private, please verify your settings");
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
    for (let appidIndex = 0; appidIndex < profile.library.length; appidIndex++){
        if (appidIndex == Math.floor(profile.library.length/2)) ctx.reply ("Halfway through");
        if (appidIndex == Math.floor(profile.library.length*3/4)) ctx.reply ("Almost done");
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${profile.library[appidIndex].appid}&key=${STEAMKEY}&steamid=${steamID}`)
            .then(async res => {
                profile.gamesInfo.push({
                    title: res.data.playerstats.gameName,
                    appid: profile.library[appidIndex].appid,
                    achievements: res.data.playerstats.achievements,
                    playtime: profile.library[appidIndex].playtimeb
                });
            })
            .catch(err => {});
    };

    const day = moment().format("DD");
    const month = moment().format("MM");
    const year = moment().format("YYYY");

    const gamesInfoString = JSON.stringify(profile.gamesInfo, null, 1);
    await fs.mkdirSync(`./src/database/usersGames/${ctx.message.from.id}/${year}/${month}`, {recursive: true}, err => {if (err) return console.log (err)});
    const error = await fs.writeFileSync(`./src/database/usersGames/${ctx.message.from.id}/${year}/${month}/${day}.json`, gamesInfoString, err => {
        if (err){
            ctx.reply("Please contact the dev for support - Error 002\nUse /dev for contact info.");
            return err
        };
    });
    if (error) return ctx.reply("Something went wrong, please contact the developer for support - Error 003\nUse /dev for contact info.");
    return ctx.replyWithMarkdownV2(`We saved ${profile.gamesInfo.length} games info\\!\nFeel free to play and I take care of the rest\\!`);
/*
    profile.days = [{[date]:profile.temp}];
    await profileModel.findOneAndUpdate({telegramID: ctx.from.id}, {days: profile.days});
    return ctx.replyWithMarkdownV2(`We saved ${profile.temp.length} games info\\!\nFeel free to play and I take care of the rest\\!`);
*/
});


bot.command("check", async ctx => {//refactored to localDB
    /*
    const profileExists = await profileModel.findOne({telegramID: ctx.from.id});
    */
    const userList = require("../database/users.json");
    const profileExists = userList.find(user => {if (user.telegramID == ctx.message.from.id) return user;});
    if (!profileExists) return ctx.reply("Sorry, you don't have an account created.\nTry using /create\nIf you already created an account, please be sure to use the same Telegram user od the created account");
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
    await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${profileExists.steamID}`)
        .then(res => {
            profileExists.name = res.data.response.players[0].personaname;
        })
        .catch(err => {
            console.log(err);
        });
    return ctx.replyWithMarkdownV2(`Your Telegram is linked to *${profileExists.name}* Steam profile\\!\n\nWe started monitoring the gaming activity *${timeElapsed}*\\!\nThere are *${gamesList.length}* games being watched\\!`);
    

    /*
    const firstDate = Object.keys(profileExists.days[0]);
    const timeElapsed = moment(firstDate, "DDMMYY").fromNow();
    const key = Object.keys(profileExists.days[profileExists.days.length-1]);
    const gamesMonitored = profileExists.days[profileExists.days.length-1][key].length;
    await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${profileExists.steamID}`)
        .then(res => {
            profileExists.name = res.data.response.players[0].personaname;
        })
        .catch(err => {
            console.log(err);
        });
    return ctx.replyWithMarkdownV2(`Your Telegram is linked to *${profileExists.name}* Steam profile\\!\n\nWe started monitoring the gaming activity *${timeElapsed}*\\!\nThere are *${gamesMonitored}* games being watched\\!`);
    */
});

bot.command("delete", ctx => {
    return ctx.replyWithMarkdownV2(`To delete your account send:\n/destroy flashback\nRemember that *ALL* your data will be deleted\\. Be sure of your decision since it's irreversible\\!`)
});

bot.command("destroy", async ctx => {
    const confirmed = ctx.update.message.text.slice(8).trim();
    if (confirmed != "flashback") return ctx.replyWithMarkdownV2("*This action is irreversible\\!*\n*\\Be certain of your decision\\!*");
    const profileExists = await profileModel.findOneAndDelete({"telegramID": ctx.from.id});
    if (!profileExists) return ctx.reply("No profile found linked to this Telegram.\nIf you want to create one, use /create!");
    return ctx.reply("Your data has been deleted from the database.\nWe're sad to see you go ;-;");
});

bot.command("list", ctx => {
    return ctx.reply("You called /list command");
});

bot.command("game", ctx => {
    const game = ctx.update.message.text.slice(6).trim();
    if (game){
        return ctx.reply(`You asked for ${game}`);
    };
    return ctx.reply("Please write the name of the game like this: /game Title");
});

bot.command("appid", ctx => {
    const appid = ctx.update.message.text.slice(6).trim();
    if (appid){
        return ctx.reply(`AppID: ${appid}\nGame: `);
    };
    return ctx.reply("Please write the name of the game like this: /appid ID");
});

bot.command(["dev", "developer"], ctx => {
    return ctx.reply(`I was created by Sky Alarcon. Be sure to follow on Instagram @_skydoceu!\nAlso, take a peek at her Github profile: https://github.com/SkyAlarcon`)
});

const autoUpdate = require("./autoUpdate");
const TELEGRAM_ID = process.env.TELEGRAM_ID;

bot.command("update", async ctx => {
    if (ctx.update.message.from.id != TELEGRAM_ID) return;
    ctx.reply("Starting to update Database!")

    const idList = require("../database/users.json");
    for (let userIndex = 0; userIndex < idList.length; userIndex++){
        await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAMKEY}&steamids=${idList[userIndex].steamID}`)
        .then(async res => {
            if (!res.data.response.players[0]) return ctx.reply("No Steam user found");
            ctx.replyWithMarkdownV2(`Profile being updated: *${res.data.response.players[0].personaname}*\\.`);
            await autoUpdate(idList[userIndex].id);
            ctx.reply(`Updated ${userIndex+1} of ${idList.length}!`);
        })
        .catch(err => {
            console.log(err);
        });
    };
    return ctx.reply("Auto updated Database!");
});

bot.launch();

module.exports = {
    bot
};