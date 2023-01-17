const axios = require("axios");
const moment = require("moment")

const STEAMKEY = process.env.STEAMKEY;

const TELEGRAM_KEY = process.env.TELEGRAM_KEY;
const { Telegraf } = require("telegraf");
const bot = new Telegraf(TELEGRAM_KEY);

const profileModel = require("../models/profileModel");

bot.start(ctx => {
    return ctx.reply(`Heya!\nTo start, write /create\nAfter that, just follow the instructions provided\nIf you already have an account, you can skip this step!\nBe sure to read the commands, so you can know what I'm capable of!\nJust type /help\n(Please, no caps, I get sad if you shout at me ;-;)`)
});

bot.help(ctx => {
    return ctx.reply("Here are the commands that I know:\n/create - Create a profile for you Steam Flashback\n/update - Updates Steam ID\n/check - Retrieves Steam ID and Name from DB\n/delete - Deletes your Flashback Account\n/list - list all games on your library\n/game [name of the game] - retrieves game's info (Be sure to write it corrrectly)\n/appid - retrieves game's info by appID\n/flashback - W.I.P\n/dev - Dev's info");
});

bot.command("create", async ctx => {
    const accExists = await profileModel.findOne({telegramID: ctx.from.id});
    if (accExists) return ctx.reply(`A Flashback account is already linked to this Telegram account!\nPlease use /check to verify your information ^^`);
    const steamID = ctx.update.message.text.slice(7).trim();
    if (!steamID){
        return ctx.reply(`To create you profile, send "/create [SteamID]".\nIf you don't know your SteamID, access this link https://steamid.xyz/ \nCopy and paste you Steam Profile URL\nThe number under Steam64 ID is the number we're looking for!`);
    };
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
    const profile = profileModel.findOne({"telegramID": ctx.from.id});
    await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAMKEY}&steamid=${steamID}&include_appinfo=true&format=json`)
        .then(async res => {
            const gamesList = res.data.response.games;
            profile.library = [];
            ctx.reply(`Looking at your games now!\nThis may take a while, we found ${gamesList.length} titles in your library`)
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
        const date = moment().format("DDMMYY")
        profile.temp = []
    for (let appidIndex = 0; appidIndex < profile.library.length; appidIndex++){
        await axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${profile.library[appidIndex].appid}&key=${STEAMKEY}&steamid=${steamID}`)
            .then(async res => {
                profile.temp.push({
                    title: res.data.playerstats.gameName,
                    appid: profile.library[appidIndex].appid,
                    achievements: res.data.playerstats.achievements,
                    playtime: profile.library[appidIndex].playtime
                });
            })
            .catch(err => {
                return //console.log(err);
            });
    };
    profile.days = [{[date]:profile.temp}];
    await profileModel.findOneAndUpdate({telegramID: ctx.from.id}, {days: profile.days});
    return ctx.replyWithMarkdownV2(`We saved all your games info\\!\nFeel free to play and let the rest to me\\!`);
});

bot.command("check", async ctx => {
    const profileExists = await profileModel.findOne({telegramID: ctx.from.id});
    if (!profileExists) return ctx.reply("Sorry, you don't have an account created.\nTry using /create\nIf you already created an account, please be sure to use the same Telegram user od the created account");
    const firstDate = Object.keys(profileExists.days[0]);
    const timeElapsed = moment(firstDate, "DDMMYY").fromNow();
    const key = Object.keys(profileExists.days[profileExists.days.length-1]);
    const gamesMonitored = profileExists.days[profileExists.days.length-1][key].length;
    ctx.reply(`We started monitoring your gaming activity ${timeElapsed}!\nThere are ${gamesMonitored} games being monitored in your profile!`)
})

bot.command("delete", ctx => {
    return ctx.replyWithMarkdownV2(`To delete your account send:\n/destroy flashback\nRemember that *ALL* your data will be deleted. Be sure of your decision since it's irreversible!`)
});

bot.command("destroy", async ctx => {
    const confirmed = ctx.update.message.text.slice(8).trim();
    if (confirmed != "flashback") return ctx.replyWithMarkdownV2("*This action is irreversible\\!*\n*\\Be certain of your decision\\!*");
    const profileExists = await profileModel.findOne({"telegramID": ctx.from.id});
    if (!profileExists) return ctx.reply("No profile found linked to this Telegram.\nIf you want to create one, use /create!");
    await profileModel.findOneAndDelete({"telegramID": ctx.from.id});
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


bot.launch();

module.exports = {
    bot
};