import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Logger from '../Logger/Logger';
import path from 'path';
import Helper from './Helper';
import { IUserDb } from '../Db/IUserDb';

dotenv.config();
process.env["NTBA_FIX_350"] = '1';

enum EMessages {
    START = 'start',
    START_SHORT = 'start_short',
    MENU = 'menu',
    ABOUT = 'about',
    NOT_WANTED = 'not_wanted',

    TASKS = 'tasks',
    INVITE = 'invite',
    PRIZES = 'prizes'
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
            this.bot.on('message', async (message) => {
                const tgUser = message.from
                const dbUser = await Helper.checkUser(tgUser)

                const text = message.text
                const chatId = message.chat.id

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
        const { data, message, from } = callbackQuery;

        const tgUser = from
        const dbUser = await Helper.checkUser(tgUser)

        const chatId = message.chat.id

        switch (data) {
            case EMessages.START:
                return await this._sendMessageOnStart(chatId, dbUser)
            case EMessages.START_SHORT:
                return await this._sendMessageOnStart(chatId, dbUser, true)
            case EMessages.ABOUT:
                return await this._sendMessageOnAbout(chatId, dbUser)
            case EMessages.NOT_WANTED:
                return await this._sendMessageOnNotWanted(chatId, dbUser)
            case EMessages.MENU:
                return await this._sendMessageOnMenu(chatId, dbUser)
            case EMessages.PRIZES:
                return await this._sendMessageOnPrizes(chatId, dbUser)
            case EMessages.INVITE:
                return await this._sendMessageOnInvite(chatId, dbUser)
            case EMessages.TASKS:
                return await this._sendMessageOnTasks(chatId, dbUser)

        }
    }


    private async _sendMessageOnNoCommand(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const text = `Пожалуйста, пользуйся кнопками.`
            const buttons = await Helper.getButtons(dbUser.id)

            if (buttons === null) {
                await this.bot.sendMessage(chatId, text, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: 'Старт', callback_data: EMessages.START }]],
                    }
                })
            } else {
                await this.bot.sendMessage(chatId, text, {
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

    private async _sendMessageOnStart(chatId: number, dbUser: IUserDb, short?: boolean): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Я согласен(на)', callback_data: EMessages.MENU }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
                [{ text: 'Не хочу', callback_data: EMessages.NOT_WANTED }]
            ]

            const textFirstMessage = `👋🏻 Привет!\n\nПриглашаем тебя присоединиться к экспедиции в МЕГА Экополис — место, в котором соединились технологии и эко-ответственность. Отправляйся в путешествие, раскрой все тайны экополиса и <b>получи шанс выиграть путевку на двоих в эко-путешествие по Уралу</b>, а также множество других подарков 💚`
            const textSecondMessage = `✅ Чтобы продолжить далее, необходимо принять условия пользования <a href='https://mega.ru/loyalty_rules/ekaterinburg/?att=1'>правила программы лояльности MEGA Friends</a> и <a href='https://mega.ru/loyalty_rules/ekaterinburg/?att=1'>правила акции</a>.`

            if (short) {
                await this.bot.sendMessage(chatId, textSecondMessage, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: buttons,
                    }
                })
            } else {
                await this.bot.sendVideo(chatId, videoPath)
                await this.bot.sendMessage(chatId, textFirstMessage, { parse_mode: 'HTML' })
                await this.bot.sendMessage(chatId, textSecondMessage, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: buttons,
                    }
                })
            }

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnStart error', e)
        }
    }


    private async _sendMessageOnAbout(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: EMessages.START_SHORT }],
            ]

            const text = `🌍 <b>«МЕГА Экополис»</b> — акция от МЕГИ Екатеринбург, посвященная заботе о планете и людях через сервисы, услуги и решения, применяемые в центрах.\n\nПравила нашей акции ориентированы на выполнение 5 заданий:\n1. Задание 1. Разделяй с МЕГОЙ\n2. Задание 2. МЕГА Место\n3. Задание 3. МЕГА Станция\n4. Задание 4. МЕГА Благотворительность\n5. Задание 4. МЕГА Эко шопинг\n\nЗа каждое выполненное задание пользователю начисляются игровые баллы. Система начисления и количество баллов, призовой фонд и условия проведения определяются настоящими <a href='https://ru.wikipedia.org/wiki/%D0%A1%D1%81%D1%8B%D0%BB%D0%BA%D0%B0'>правилами акции.</a>\n\n<i>Организатор акции — ООО «Юрлицо». Реквизиты</i>\n\n© Все права защищены`

            await this.bot.sendVideo(chatId, videoPath)
            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAbout error', e)
        }
    }

    private async _sendMessageOnNotWanted(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Я согласен(на)', callback_data: EMessages.MENU }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
                [{ text: 'Не хочу', callback_data: EMessages.NOT_WANTED }],
            ]

            const text = `В нашем конкурсе нет ничего сложного и небезопасного. Ты можешь <b>внимательно ознакомиться с <a href="https://ru.wikipedia.org/wiki/%D0%A1%D1%81%D1%8B%D0%BB%D0%BA%D0%B0">правилами</a></b> и принять решение: играть или нет 🧐\n\n🔒 <b>Участие в акции является добровольным.</b> Организатор не хранит и не передает персональные данные и иные сведения о пользователях, принимающих согласие на коммуникацию с чат-ботом «Доверься МЕГЕ. Экспедиция в Экополис», в пользу третьих лиц.`

            await this.bot.sendVideo(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnNotWanted error', e)
        }
    }

    private async _sendMessageOnMenu(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Задания', callback_data: EMessages.TASKS }],
                [{ text: 'Пригласить друга', callback_data: EMessages.INVITE }],
                [{ text: 'Таблица лидеров', web_app: { url: 'https://ya.ru' } }],
                [{ text: 'Призы', callback_data: EMessages.PRIZES }],
            ]

            const text = `✌️<b> Добро пожаловать в МЕГА Экополис!</b>\n\nЭто меню для навигации по чат-боту. Мы подготовили для тебя несколько заданий. <b>Чтобы начать их выполнения, жми на кнопку «Задания» 👇</b>\n\nТы можешь <b>пригласить в наш чат-бот своих друзей</b> – вместе путешествовать по просторам МЕГА Экополиса веселее! А чтобы узнать, кто вместе с тобой выполняет задания и сколько набирает баллов, обращайся к «Таблице лидеров».\n\nДоверься МЕГЕ! 💕`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnMenu error', e)
        }
    }

    private async _sendMessageOnPrizes(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Победители акции «МЕГА Экополис» смогут претендовать на главный приз — <b>сказочные выходные в глэмпинге и эко-тур по Уралу для всей семьи</b> ⛰️🌲❄️\n\nТоп-50 пользователей также получат ценные призы:\n • Приз1\n • Приз2\n • Приз3\n • Приз4\n • Приз5\n\nПобедители и призеры будут зафиксированы и объявлены 23 декабря на праздничном концерте в МЕГЕ с участием нашего амбассадора – Мариты Плиевой.\n\nСледите за новостями в нашем канале и чат-боте!`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnPrizes error', e)
        }
    }

    private async _sendMessageOnInvite(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Пригласи друзей в МЕГА Экополис</b>, чтобы получить больше баллов к рейтингу!\n\nКак это сделать?\n👉🏻 <b>Скопируй ссылку и отправь друзьям.</b> Приглашать в бота можно не более 10 человек;\n👉🏻 Как только кто-то из друзей запустит бота и выполнит одно задание, тебе будет начислено <b>5 бонусных баллов.</b>\n\nВот ссылка, по которой можно пригласить друзей:\n<code>http://t.me/mega_ekb_bot?start=${dbUser.id}</code>`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnInvite error', e)
        }
    }

    private async _sendMessageOnTasks(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Круто! Участвую!', callback_data: EMessages.MENU }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `🤕 Ежегодно только в России территория свалок увеличивается на 250 000 гектаров! Сортируя и сдавая на переработку свои отходы, ты сможешь сократить количество мусора и внести свой вклад в заботе о нашей планете.\n\nМЕГА в партнерстве с Немузеем мусора открыла станцию по приему вторсырья. Если ты уже сортируешь отходы дома, приноси их на нашу станцию. Если ты только новичок в сортировке, предлагаем начать с малого: выдели хотя бы 1 фракцию перерабатываемых отходов (например, незагрязненная бумага или ПЭТ-бутылки из-под воды) и помести данную фракцию в подходящий контейнер на станции.\n\nА если у тебя есть одежда в хорошем состоянии, которую ты хочешь выкинуть, то тебе точно <b>нужно посетить станцию раздельного сбора</b>. Все вещи, которые попадут в контейнер, пойдут на благотворительность 🥰\n\n<b>Помещай вещи в контейнер, находи уникальный код рядом со станцией, вводи его в чат-бот и получай игровые баллы!</b>`

            await this.bot.sendVideo(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTasks error', e)
        }
    }
}