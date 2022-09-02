import * as dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config({ path: '../.env' });

const token = process.env.TG_API_KEY;
const bot = new TelegramBot(token, { polling: true });
const receiver = process.env.TG_CHAT_ID;

async function messenger (message){
    bot.sendMessage(
      receiver,
      message
    );
};

export default messenger;