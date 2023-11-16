import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Logger from '../Logger/Logger';
import path from 'path';
import Helper from './Helper';
import { IUserDb } from '../Db/IUserDb';

dotenv.config();
process.env["NTBA_FIX_350"] = '1';

enum EMessages {
    START = 'menu',
    MENU = 'menu',
    ABOUT = 'about',
    NOT_WANTED = 'not_wanted'
}

export default class TelegramBotApp {
    private bot: TelegramBot;

    constructor() {
        this._init()
    }

    private async _init(): Promise<void> {
        const token = process.env.TG_TOKEN
        try {
            this.bot = await new TelegramBot(token, { polling: true });
            Logger.debug('[BOT] started')
        } catch (e) {
            Logger.error('[BOT] started error', e)
        }
        this._setupListeners();
    }

    private _setupListeners(): void {
        try {
            this.bot.on('message', async (msg) => {
                const tgUser = msg.from
                const dbUser = await Helper.checkUser(tgUser)

                const text = msg.text
                const chatId = msg.chat.id

                if (text.includes('/start')) {
                    return await this._sendMessageOnStart(chatId, dbUser)
                }

                return await this._sendMessageOnNoCommand(chatId, dbUser)
            })


            this.bot.on('callback_query', async (callbackQuery) => this._handleCallbackQuery(callbackQuery));
        } catch (e) {
            Logger.error('[BOT] setupListeners error', e)
        }
    }

    private async _handleCallbackQuery(callbackQuery: CallbackQuery): Promise<void> {
        const { data, message } = callbackQuery;
    }


    private async _sendMessageOnNoCommand(chatId: number, dbUser: IUserDb,): Promise<Message> {
        try {
            const text = `Пожалуйста, пользуйся кнопками.`
            const buttons = await Helper.getButtons(dbUser.id)
            if (buttons === null) {
                return await this.bot.sendMessage(chatId, text, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: 'Старт', callback_data: EMessages.START }]],
                    }
                })
            } else {
                return await this.bot.sendMessage(chatId, text, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: buttons,
                    }
                })
            }
        } catch (e) {
            Logger.error('[BOT] sendMessageOnNoCommand error', e)
        }
    }

    private async _sendMessageOnStart(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/video/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Я согласен(на)', callback_data: EMessages.MENU }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
                [{ text: 'Не хочу', callback_data: EMessages.NOT_WANTED }]
            ]

            const textFirstMessage = `👋🏻 Привет!\n\nПриглашаем тебя присоединиться к экспедиции в МЕГА Экополис — место, в котором соединились технологии и эко-ответственность. Отправляйся в путешествие, раскрой все тайны экополиса и <b>получи шанс выиграть путевку на двоих в эко-путешествие по Уралу</b>, а также множество других подарков 💚`
            const textSecondMessage = `✅ Чтобы продолжить далее, необходимо принять условия пользования <a href='https://mega.ru/loyalty_rules/ekaterinburg/?att=1'>правила программы лояльности MEGA Friends</a> и <a href='https://mega.ru/loyalty_rules/ekaterinburg/?att=1'>правила акции</a>.`
            
            await this.bot.sendVideo(chatId, videoPath)
            await this.bot.sendMessage(chatId, textFirstMessage, { parse_mode: 'HTML' })
            await this.bot.sendMessage(chatId, textSecondMessage, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)

            return
        } catch (e) {
            Logger.error('[BOT] sendMessageOnStart error', e)
        }
    }

}