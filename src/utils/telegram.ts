import TelegramBot from "node-telegram-bot-api";

const token: string = '5791783086:AAHdi-nH7HHQnFG839Cigwtvk_GcF6cn1h0';
const bot: any = new TelegramBot(token, { polling: true });
const receiver: number = 2087303348;

async function messenger (message: string): Promise<any> {
    bot.sendMessage(
      receiver,
      message
    );
};

export default messenger;