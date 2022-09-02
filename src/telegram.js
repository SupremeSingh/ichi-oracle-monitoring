require("dotenv").config({ path: "../.env" });
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TG_API_KEY;
const bot = new TelegramBot(token, { polling: true });
const receiver = process.env.TG_CHAT_ID;

exports.messenger = async (message) => {
    bot.sendMessage(
      receiver,
      message
    );
};
