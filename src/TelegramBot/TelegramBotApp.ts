import TelegramBot, { CallbackQuery, InlineKeyboardButton, InputMediaPhoto, Message } from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Logger from '../Logger/Logger';
import path from 'path';
import Helper from './Helper';
import { EActivity, EAuthorization, EFinal, IUserDb } from '../Db/User';
import { ETaskStatus } from '../Db/Task';
import axios from 'axios';

dotenv.config();
process.env["NTBA_FIX_350"] = '1';
const webAppLeader = 'https://server.mega.irsapp.ru/leaderboard'
const webAppScan = 'https://server.mega.irsapp.ru/scan'
export enum EMessages {
    START = 'start',
    START_SHORT = 'start_short',
    MENU = 'menu',
    ABOUT = 'about',
    NOT_WANTED = 'not_wanted',

    TASKS = 'tasks',
    INVITE = 'invite',
    PRIZES = 'prizes',

    TASK_1 = 'task_1',
    TASK_2 = 'task_2',
    TASK_3 = 'task_3',
    TASK_4 = 'task_4',
    TASK_5 = 'task_5',

    WHERE_STATION = 'where_station',
    WRITE_CODE = 'write_code',
    SKIP_TASK = 'skip_task',
    SKIP_CONFIRM = 'skip_confirm',
    PROBLEM = 'problem',
    PROBLEM_CONFIRM = 'problem_confirm',

    SUBSCRIBE = 'subscribe',
    SUBSCRIBE_CHECK = "subscribe_check",
    SUBSCRIBE_CONFIRM = "subscribe_confirm",
    SUBSCRIBE_ERROR = "subscribe_error",

    WHERE_MASTERS = "where_masters",

    AUTHORIZATION = 'authorization',
    AUTHORIZATION_CONFIRM = 'authorization_confirm',
    AUTHORIZATION_WRITE = 'authorization_write',
    AUTHORIZATION_SKIP = ' authorization_skip',
    AUTHORIZATION_GUIDE = 'authorization_guide',
    AUTHORIZATION_INCORRECT = 'authorization_incorrect',

    WHERE_FOOD = "where_food",
    WHERE_STORK = "where_stork",

    SCAN_INCORRECT = "scan_incorrect",

    WHERE_SHOPPERS = "where_shoppers",
    SHOPS = "shops",
    FINAL = 'final',
    INVITE_FINAL = 'invite_final',

    CODE_INCORRECT = 'code_incorrect',
    TASK_CORRECT = 'task_correct',
}

export const taskIdToEMessagesMap = {
    1: EMessages.TASK_1,
    2: EMessages.TASK_2,
    3: EMessages.TASK_3,
    4: EMessages.TASK_4,
    5: EMessages.TASK_5,
};

class TelegramBotApp {
    private bot: TelegramBot;

    constructor() {
        this._init()
    }

    private _init(): void {
        const token = process.env.TG_TOKEN
        try {
            this.bot = new TelegramBot(token, { polling: true });
            Logger.debug('[BOT] started')
        } catch (e) {
            Logger.error('[BOT] started error', e)
        }
        this._setupListeners();
    }

    private _setupListeners(): void {
        try {
            this.bot.on('message', async (message) => {
                const tgUser = message?.from
                const dbUser = await Helper.checkUser(tgUser)
                const text = message?.text
                const chatId = message?.chat?.id

                if (text) {
                    if (text.includes('/start')) {
                        await Helper.incrementTotal()
                        const textArr = text?.split(' ')
                        if (textArr.length === 2) {
                            if (/^\d+$/.test(textArr[1])) {
                                Helper.checkReferral(dbUser, Number(textArr[1]), this.bot)
                            } else {
                                const stats = textArr[1]?.split('_')
                                if (stats.length === 3) {
                                    await Helper.updateUserDetails(dbUser.id, stats[0], stats[1], stats[2])
                                }
                            }


                        }
                        return await this._sendMessageOnStart(chatId, dbUser)
                    }
                }


                switch (dbUser.activity) {
                    case EActivity.BUTTONS:
                        return await this._sendMessageOnNoCommand(chatId, dbUser)
                    case EActivity.CODE:
                        const checkCode = Helper.checkCode(text)

                        if (checkCode) {
                            return await this.sendMessageOnTaskCorrect(chatId, dbUser)
                        } else {
                            return await this._sendMessageOnCodeIncorrect(chatId, dbUser)
                        }
                    case EActivity.PROBLEM:
                        return await this._onProblemSend(message, chatId, dbUser)
                    case EActivity.AUTHORIZATION:

                        try {
                            const checkAuthorization = await axios.post('https://omniapi-dev.mega.ru/telegram/registerUser',
                                {
                                    telegramId: `${dbUser.id}`,
                                    keycloakId: text
                                },
                                {
                                    headers: {
                                        'x-api-key': process.env.API_KEY
                                    }
                                }
                            )

                            if (checkAuthorization?.data?.username || checkAuthorization?.data?.firstName || checkAuthorization?.data?.email) {
                                return await this._sendMessageOnAuthorizationConfirm(chatId, dbUser)
                            } else {
                                return await this._sendMessageOnAuthorizationIncorrect(chatId, dbUser)
                            }
                        } catch (e) {
                            Logger.error('[AXIOS] MEGA FRIEND REQUEST ERROR', e)
                            return await this._sendMessageOnAuthorizationIncorrect(chatId, dbUser)
                        }

                }
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
        await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

        const chatId = message?.chat?.id
     
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
            case EMessages.TASK_1:
                return await this._sendMessageOnTaskOne(chatId, dbUser)
            case EMessages.SUBSCRIBE:
                return await this._sendMessageOnSubscribe(chatId, dbUser)
            case EMessages.SUBSCRIBE_CHECK:
                return await this._sendMessageSubscribeCheck(chatId, dbUser)
            case EMessages.SUBSCRIBE_CONFIRM:
                return await this._sendMessageOnSubscribeConfirm(chatId, dbUser)
            case EMessages.SUBSCRIBE_ERROR:
                return await this._sendMessageOnSubscribeError(chatId, dbUser)
            case EMessages.WHERE_STATION:
                return await this._sendMessageOnWhereStation(chatId, dbUser)
            case EMessages.WRITE_CODE:
                return await this._sendMessageOnWriteCode(chatId, dbUser)
            case EMessages.SKIP_TASK:
                return await this._sendMessageOnSkipTask(chatId, dbUser)
            case EMessages.SKIP_CONFIRM:
                return await this._sendMessageOnSkipConfirm(chatId, dbUser)
            case EMessages.PROBLEM:
                return await this._sendMessageOnProblem(chatId, dbUser)
            case EMessages.CODE_INCORRECT:
                return await this._sendMessageOnCodeIncorrect(chatId, dbUser)
            case EMessages.TASK_2:
                return await this._sendMessageOnTaskTwo(chatId, dbUser)
            case EMessages.WHERE_MASTERS:
                return await this._sendMessageOnWhereMasters(chatId, dbUser)
            case EMessages.AUTHORIZATION:
                return await this._sendMessageOnAuthorization(chatId, dbUser)
            case EMessages.AUTHORIZATION_GUIDE:
                return await this._sendMessageOnAuthorizationGuide(chatId, dbUser)
            case EMessages.AUTHORIZATION_SKIP:
                return await this._sendMessageOnAuthorizationSkip(chatId, dbUser)
            case EMessages.AUTHORIZATION_WRITE:
                return await this._sendMessageOnAuthorizationWrite(chatId, dbUser)
            case EMessages.AUTHORIZATION_INCORRECT:
                return await this._sendMessageOnAuthorizationIncorrect(chatId, dbUser)
            case EMessages.TASK_3:
                return await this._sendMessageOnTaskThree(chatId, dbUser)
            case EMessages.WHERE_FOOD:
                return await this._sendMessageOnWhereFood(chatId, dbUser)
            case EMessages.TASK_4:
                return await this._sendMessageOnTaskFour(chatId, dbUser)
            case EMessages.WHERE_STORK:
                return await this._sendMessageOnWhereStork(chatId, dbUser)
            case EMessages.SCAN_INCORRECT:
                return await this.sendMessageOnScanIncorrect(chatId, dbUser)
            case EMessages.TASK_5:
                return await this._sendMessageOnTaskFive(chatId, dbUser)
            case EMessages.WHERE_SHOPPERS:
                return await this._sendMessageOnWhereShoppers(chatId, dbUser)
            case EMessages.SHOPS:
                return await this._sendMessageOnShops(chatId, dbUser)
            case EMessages.TASK_CORRECT:
                return await this.sendMessageOnTaskCorrect(chatId, dbUser)
            case EMessages.FINAL:
                return await this._sendMessageOnFinal(chatId, dbUser)
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

            const textFirstMessage = `👋🏻 Привет!\n\nПриглашаем тебя присоединиться к экспедиции в МЕГА Экополис — место, в котором соединились технологии и эко-ответственность. Отправляйся в путешествие, раскрой все тайны экополиса и получи шанс выиграть эко-путешествие на двоих по Уралу, а также 50 других подарков 💚`
            const textSecondMessage = `✅ Чтобы продолжить далее, необходимо принять условия пользования <a href='https://mega.ru/loyalty_rules/ekaterinburg/?att=1'>правила программы лояльности MEGA Friends</a> и <a href='https://mega-ekb-game.ru/rules'>правила акции</a>.`

            if (short) {
                await this.bot.sendMessage(chatId, textSecondMessage, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: buttons,
                    }
                })
            } else {
                await this.bot.sendVideoNote(chatId, videoPath)
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
                [{ text: 'Назад', callback_data: dbUser.final === EFinal.COMPLETE ? EMessages.FINAL : EMessages.START_SHORT }],
            ]

            const text = `🌍 <b>«МЕГА Экополис»</b> — акция от МЕГИ Екатеринбург, посвященная заботе о планете и людях через сервисы, услуги и решения, применяемые в центрах.\n\nПравила нашей акции ориентированы на выполнение 5 заданий:\n1. Задание 1. Разделяй с МЕГОЙ\n2. Задание 2. МЕГА Место\n3. Задание 3. МЕГА Станция\n4. Задание 4. МЕГА Благотворительность\n5. Задание 4. МЕГА Эко-шопинг\n\nЗа каждое выполненное задание пользователю начисляются игровые баллы. Система начисления и количество баллов, призовой фонд и условия проведения определяются настоящими <a href='https://mega-ekb-game.ru/rules'>правилами акции.</a>\n\n<i>Организатор акции — ООО «АБК Сервис». ИНН 6671013489</i>\n\n© Все права защищены`

            await this.bot.sendVideoNote(chatId, videoPath)
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

            const text = `В нашем конкурсе нет ничего сложного и небезопасного. Ты можешь <b>внимательно ознакомиться с <a href="https://mega-ekb-game.ru/rules">правилами</a></b> и принять решение: играть или нет 🧐\n\n🔒 <b>Участие в акции является добровольным.</b> Организатор не хранит и не передает персональные данные и иные сведения о пользователях, принимающих согласие на коммуникацию с чат-ботом «Доверься МЕГЕ. Экспедиция в Экополис», в пользу третьих лиц.`

            await this.bot.sendVideoNote(chatId, videoPath)
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

            let taskData
            const hasTasks = await Helper.getHasPendingTask(dbUser.id)

            if (hasTasks) {
                taskData = await Helper.getLastPendingTask(dbUser.id)
            }


            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Задания', callback_data: hasTasks ? taskData.type : EMessages.TASKS }],
                [{ text: 'Пригласить друга', callback_data: EMessages.INVITE }],
                [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
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
                [{ text: 'Назад', callback_data: dbUser.final === EFinal.COMPLETE ? EMessages.FINAL : EMessages.MENU }],
            ]

            const text = `Победители акции «МЕГА Экополис» смогут претендовать на главный приз — <b>сказочные выходные в глэмпинге и эко-тур по Уралу для двоих</b> ⛰️🌲❄️\n\nТоп-50 пользователей также получат ценные призы:\n● Приз1\n● Приз2\n● Приз3\n● Приз4\n● Приз5\n\nПобедители и призеры будут зафиксированы и объявлены 23 декабря на праздничном награждении в МЕГА Месте с участием ведущей нашего путешествия – Мариты Плиевой.\n\nСледите за новостями в нашем канале и чат-боте!`

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
                [{ text: 'Назад', callback_data: dbUser.final === EFinal.COMPLETE ? EMessages.FINAL : EMessages.MENU }],
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
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Круто! Участвую!', callback_data: taskData.type }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `🤕 Ежегодно только в России территория свалок увеличивается на 250 000 гектаров! Сортируя и сдавая на переработку свои отходы, ты сможешь сократить количество мусора и внести свой вклад в заботе о нашей планете.\n\nМЕГА в партнерстве с Немузеем мусора открыла станцию по приему вторсырья.\n💚Если ты уже сортируешь отходы дома, приноси их на нашу станцию.\n💚Если ты только новичок в сортировке, предлагаем начать с малого: выдели хотя бы 1 фракцию перерабатываемых отходов (например, незагрязненная бумага или ПЭТ-бутылки из-под воды) и помести данную фракцию в подходящий контейнер на станции.\n💚А если у тебя есть одежда в хорошем состоянии, которую ты хочешь выкинуть, то тебе точно <b>нужно посетить станцию раздельного сбора</b>. Все вещи, которые попадут в контейнер, пойдут на благотворительность 🥰\n\n<b>Помещай вещи в контейнер, находи уникальный код рядом со станцией, вводи его в чат-бот и получай игровые баллы!</b>`

            await this.bot.sendVideoNote(chatId, videoPath)
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

    private async _sendMessageOnTaskOne(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Где найти станцию?', callback_data: EMessages.WHERE_STATION }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #1. Принеси вещи, которые перестали тебя радовать в боксы для приема вещей на станции «Разделяй с МЕГОЙ»</b>\n\nЗдесь ты сможешь сдать:\n● Мелкую бытовую технику;\n● Картон и бумагу (♲20, ♲21, ♲22, PAP)\n● Металл, алюминий, фольгу (♲40, ♲41, FE, ALU);\n● Одежду и текстиль;\n● Стекло прозрачное (♲70, ♲71, ♲72, ♲73, GL);\n● Стекло зелёное (♲70, ♲71, ♲72, ♲73, GL);\n● Стекло коричневое (♲70, ♲71, ♲72, ♲73, GL);\n● Тетра пак (♲81, ♲82, ♲84, TETRA PAK, PUREPAC);\n● Пластик мягкий, пакеты и кульки (♲2, ♲4, ♲5, HDPE, PEHT, PEHD, LDPE, PP);\n● Пластик твердый (♲2, ♲4, ♲5, ♲6, HDPE, PEHD, LDPE, PELD, PP, PS);\n● Пластик ПЭТ не бутылки (♲1, PET, PETE, PET-R);\n● ПЭТ-бутылки (♲1, PET, PETE, PET-R);\n● Пластиковые крышки (♲2, ♲4, HDPE, PEHD, LDPE, PELD)\n\nПомести вещи в контейнер, найди <b>уникальный код рядом со станцией и введи его в чат-бот</b>, после чего ты получишь баллы. Удачи!`

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskOne error', e)
        }
    }

    public async sendMessageOnTaskCorrect(chatId: number, dbUser: IUserDb, scanPoints?:number): Promise<void> {
        try {
            let videoPath
            let text
            let buttons: InlineKeyboardButton[][]
            let points

            const task = await Helper.getLastPendingTask(dbUser.id)

            await this._sendMessageOnReferralComplete(dbUser)
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            switch (task.type) {
                case EMessages.TASK_1:
                    points = 10
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.SUBSCRIBE }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Код принят.</b> Спасибо за твой вклад в заботу о планете и людях! ☘️\n\nНа твой игровой счет начислено <b>10 баллов</b>. Поздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
                    await Helper.addPointsToUser(dbUser, 10)
                    break;
                case EMessages.TASK_2:
                    points = 10
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.AUTHORIZATION }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Код принят.</b> Надеемся, тебе понравился наш мастер-класс! 😍\n\nНа твой игровой счет начислено <b>10 баллов</b>.\nПоздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
                    await Helper.addPointsToUser(dbUser, 10)
                    break;
                case EMessages.TASK_3:
                    points = 10
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.TASK_4 }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    if (dbUser.authorization === EAuthorization.COMPLETE) points = Number((10 * 1.5)).toFixed()
                    else points = 10
                    text = `<b>Код принят.</b> Теперь ты умеешь правильно сортировать отходы! ♻️.\n\nНа твой игровой счет начислено ${points} баллов. Поздравляем!`
                    videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    await Helper.addPointsToUser(dbUser, points)
                    break;
                case EMessages.TASK_4:
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.TASK_5 }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Чек принят.</b> Это был увлекательный шопинг! 🤗\n\nНа твой игровой счет начислено ${scanPoints} баллов.\n\nПоздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, scanPoints)
                    await Helper.addPointsToUser(dbUser, scanPoints)
                    break;
                case EMessages.TASK_5:
                    buttons = [
                        [{ text: 'Сканировать еще один чек', web_app: { url: webAppScan } }],
                        [{ text: 'Загрузить чек (success)', callback_data: EMessages.TASK_CORRECT }],
                        [{ text: 'Где найти шопперы?', callback_data: EMessages.WHERE_SHOPPERS }],
                        [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                        [{ text: 'Завершить задание', callback_data: EMessages.FINAL }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Чек принят.</b> Как тебе покупки с шоппером? Скажи, правда приятно? 🌳\n\nНа твой игровой счет начислено ${scanPoints} баллов.\n\nПоздравляем!`
                    videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
                    await Helper.addPointsToUser(dbUser, scanPoints, true)
                    break;
            }


            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskOne error', e)
        }
    }

    private async _sendMessageOnCodeIncorrect(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Попробовать ещё раз', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Сообщить о проблеме', callback_data: EMessages.PROBLEM }],
                [{ text: 'Пропустить', callback_data: EMessages.SKIP_TASK }],
            ]
            const text = `Что-то пошло не так. <b>Попробуй ввести код еще раз</b> или сообщи нам о проблеме.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskOne error', e)
        }
    }

    private async _sendMessageOnWhereStation(chatId: number, dbUser: IUserDb): Promise<void> {
        try {

            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.TASK_1 }],
            ]

            const text = `<b>Станция «Разделяй с МЕГОЙ»</b> расположена на внешней парковке, столбик Б1. К ней удобно подъехать на машине со стороны улицы Металлургов и сразу выгрузить все отходы.`

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWhereStation error', e)
        }
    }

    private async _sendMessageOnWriteCode(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.CODE)
            const task = await Helper.getLastPendingTask(dbUser.id)

            let buttons: InlineKeyboardButton[][]

            switch (task.type) {
                case EMessages.TASK_1:
                    buttons = [
                        [{ text: 'Где найти станцию?', callback_data: EMessages.WHERE_STATION }],
                        [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    break;
                case EMessages.TASK_2:
                    buttons = [
                        [{ text: 'Где находятся мастер-классы?', callback_data: EMessages.WHERE_MASTERS }],
                        [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    break;
                case EMessages.TASK_3:
                    buttons = [
                        [{ text: 'Где находится фудкорт?', callback_data: EMessages.WHERE_FOOD }],
                        [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    break;
            }

            const text = `Введи уникальный код ниже 👇🏻 (1 - correct)`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWriteCode error', e)
        }
    }

    private async _sendMessageOnSkipTask(chatId: number, dbUser: IUserDb): Promise<void> {
        try {

            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Да, пропустить', callback_data: EMessages.SKIP_CONFIRM }],
                [{ text: 'Нет, буду выполнять', callback_data: taskData.type }],
            ]

            const text = `Ты уверен(а), что хочешь пропустить задание? В таком случае мы не начислим тебе баллы, и <b>шансы выиграть приз уменьшатся</b>😔`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnSkipTask error', e)
        }
    }

    private async _sendMessageOnSkipConfirm(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const taskData = await Helper.getLastPendingTask(dbUser.id)
            await Helper.confirmLastTask(dbUser.id, ETaskStatus.SKIP, 0)
            await Helper.getLastPendingTask(dbUser.id)
            switch (taskData.type) {
                case EMessages.TASK_1:
                    return await this._sendMessageOnSubscribe(chatId, dbUser)
                case EMessages.TASK_2:
                    return await this._sendMessageOnAuthorization(chatId, dbUser)
                case EMessages.TASK_3:
                    return await this._sendMessageOnTaskFour(chatId, dbUser)
                case EMessages.TASK_4:
                    return await this._sendMessageOnTaskFive(chatId, dbUser)
                case EMessages.TASK_5:
                    return await this._sendMessageOnFinal(chatId, dbUser)
            }
        } catch (e) {
            Logger.error('[BOT] sendMessageOnSkipConfirm error', e)
        }
    }

    private async _sendMessageOnSubscribe(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Проверить подписку', callback_data: EMessages.SUBSCRIBE_CHECK}],
                [{ text: 'Следующее задание', callback_data: EMessages.TASK_2 }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Хочешь получить <b>+5 бонусных баллов?</b> 😊\nСкорее подписывайся на наш <a href="https://t.me/megaekat">Телеграм-канал!</a>\n\nВ нем ты найдешь крутые идеи для покупок, информацию об акциях и скидках магазинов МЕГИ, розыгрыши и многое другое!`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnSubscribe error', e)
        }
    }

    private async _sendMessageSubscribeCheck(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const data = await this.bot.getChatMember(-1001793675054, dbUser.id)
            if (data.status === 'member' || data.status === 'administrator' ||data.status === 'creator' || data.status === 'restricted') {
                this._sendMessageOnSubscribeConfirm(chatId, dbUser)
            } else {
                this._sendMessageOnSubscribeError(chatId, dbUser)
            }
        } catch (e) {
            Logger.error('[BOT] sendMessageSubscribeCheck error', e)
        }
    }

    private async _sendMessageOnSubscribeConfirm(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.addPointsToUser(dbUser, 5)
            await Helper.updateSubscribeStatus(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Следующее задание', callback_data: EMessages.TASK_2 }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Видим твою подписку! Спасибо!\n\nЛови <b>+5 бонусных баллов</b> на свой игровой счет.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageSubscribeConfirm error', e)
        }
    }

    private async _sendMessageOnSubscribeError(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Проверить подписку', callback_data: EMessages.SUBSCRIBE_CHECK }],
                [{ text: 'Следующее задание', callback_data: EMessages.TASK_2 }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Кажется, ты всё еще не наш подписчик. Переходи в <a href="https://t.me/megaekat">Телеграм-канал</a> и жми «Подписаться»`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageSubscribeError error', e)
        }
    }

    private async _sendMessageOnProblem(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.PROBLEM)
            let backType

            switch (dbUser?.buttons[0][0]?.callback_data) {
                case EMessages.WRITE_CODE:
                    backType = EMessages.CODE_INCORRECT;
                    break;
                case EMessages.AUTHORIZATION_WRITE:
                    backType = EMessages.AUTHORIZATION_INCORRECT;
                    break;
                default:
                    backType = EMessages.SCAN_INCORRECT
            }

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: backType }],
            ]

            const text = `Напиши в чат-бот о своей проблеме, и мы постараемся оперативно её решить. Если у тебя есть скриншот, фото или видео, демонстрирующие проблему, можешь также прикрепить к сообщению.\n\nПеред отправкой проверь, указано ли в твоем аккаунте Telegram имя пользователя (@nickmane). Без него мы не сможем с тобой связаться.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnProblem error', e)
        }
    }

    private async _sendMessageOnProblemConfirm(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)
            let backType
            console.log(dbUser?.buttons[0][0]?.callback_data)
            switch (dbUser?.buttons[0][0]?.callback_data) {
                case EMessages.CODE_INCORRECT:
                    backType = EMessages.CODE_INCORRECT;
                    break;
                case EMessages.AUTHORIZATION_INCORRECT:
                    backType = EMessages.AUTHORIZATION_INCORRECT;
                    break;
                default:
                    backType = EMessages.SCAN_INCORRECT
            }

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: backType }],
            ]

            const text = `Обращение принято. Мы постараемся вернуться к тебе с решением в течение 48 часов.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnProblemConfirm error', e)
        }
    }

    private async _sendMessageOnReferralComplete(currentUser: IUserDb): Promise<void> {
        try {
            const referralId = currentUser?.referral
            if (referralId > 0) {
                const buttons = await Helper.getButtons(referralId)
                const referralUser = await Helper.getUserById(referralId)
                await Helper.updateSentStatus(currentUser.id)
                if (referralUser && currentUser.sent !== 1) {
                    await Helper.addPointsToUser(referralUser, 5)
                    const text = `Кто-то из твоих друзей присоединился к путешествию в МЕГА Экополис! За это мы начисляем тебе +5 баллов 😎\n\nПродолжим?`

                    await this.bot.sendMessage(referralId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })
                }
            }
        } catch (e) {
            Logger.error('[BOT] sendMessageOnReferralComplete error', e)
        }
    }

    private async _sendMessageOnTaskTwo(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Где находятся мастер-классы?', callback_data: EMessages.WHERE_MASTERS }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #2. МЕГА Место</b>\n\nАпсайклинг, кастомизация одежды совместно с художником и многое другое ждет тебя в МЕГА Месте!\n\n<b>Записывайся на мастер-классы по ссылке или в МЕГЕ, прими участие хотя бы в одном</b> и получи уникальный код от куратора, чтобы заработать баллы.\n\nРасписание мастер-классов и запись: <a href="https://megamesto.ru/">https://megamesto.ru/</a>\n\nДоверься МЕГЕ! 👐`

            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskTwo error', e)
        }
    }

    private async _sendMessageOnWhereMasters(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.TASK_2 }],
            ]

            const text = `Мастер-классы проходят в открытом общественном пространстве МЕГА\n{Место}`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWhereMasters error', e)
        }
    }

    private async _sendMessageOnAuthorization(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести User ID MEGA Friends', callback_data: EMessages.AUTHORIZATION_WRITE }],
                [{ text: 'Где найти User ID?', callback_data: EMessages.AUTHORIZATION_GUIDE }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Настало время вырваться вперед! Мы даем тебе уникальную возможность <b>умножить свои баллы!</b>\n\nЗарегистрируйся или авторизуйся в программе лояльности MEGA Friends по ссылке или в мобильном приложении МЕГА: <a href='https://clck.ru/36absA'>https://clck.ru/36absA</a>\n\nНайди в личном кабинете свой код User ID, введи в чат-бот и получи <b>множитель x1,5 баллов за выполнение будущих заданий!</b> 😯`

            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAuthorization error', e)
        }
    }

    private async _sendMessageOnAuthorizationGuide(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath1 = path.join(__dirname, '../assets/images/img1.jpg');
            const imgPath2 = path.join(__dirname, '../assets/images/img1.jpg');
            const imgPath3 = path.join(__dirname, '../assets/images/img1.jpg');
            const imgPath4 = path.join(__dirname, '../assets/images/img1.jpg');

            const media: InputMediaPhoto[] = [
                { type: 'photo', media: imgPath1 },
                { type: 'photo', media: imgPath2 },
                { type: 'photo', media: imgPath3 },
                { type: 'photo', media: imgPath4 },
            ];

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести User ID MEGA Friends', callback_data: EMessages.AUTHORIZATION_WRITE }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP }],
                [{ text: 'Назад', callback_data: EMessages.AUTHORIZATION }],
            ]

            const text = `Итак, инструкция:\n\n1. Перейди по ссылке или скачай мобильное приложение МЕГА и пройди процедуру авторизации или регистрации: <a href="https://clck.ru/36absA">https://clck.ru/36absA</a>\n\n2. В личном кабинете или приложении МЕГА найди кнопку «Твой QR-code» и нажми на неё\n\n3. Под QR-кодом ты увидишь уникальный код, который выглядит примерно так: f0f08565-13e4-47e4-ab75-b a4850611da3\n\n4. Скопируй и введи этот код в чат-бот, нажав по кнопке ниже`

            await this.bot.sendMediaGroup(chatId, media)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAuthorizationGuide error', e)
        }
    }

    private async _sendMessageOnAuthorizationSkip(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Да, пропустить', callback_data: EMessages.TASK_3 }],
                [{ text: 'Нет, сейчас авторизуюсь', callback_data: EMessages.AUTHORIZATION }],
            ]

            const text = `Ты уверен(а), что хочешь пропустить задание? В таком случае мы не начислим тебе множитель на баллы, и <b>шансы выиграть приз уменьшатся</b> 😔`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAuthorizationSkip error', e)
        }
    }

    private async _sendMessageOnAuthorizationWrite(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.AUTHORIZATION)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Где найти User ID?', callback_data: EMessages.AUTHORIZATION_GUIDE }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP }],
                [{ text: 'Назад', callback_data: EMessages.AUTHORIZATION }],
            ]

            const text = `Скопируй и введи сюда свой код User ID.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAuthorizationWrite error', e)
        }
    }

    private async _sendMessageOnAuthorizationConfirm(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)
            await Helper.updateAuthorizationStatus(dbUser.id, EAuthorization.COMPLETE)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Следующее задание', callback_data: EMessages.TASK_3 }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Ура! Теперь ты наш МЕГА ДРУГ! <b>Все твои будущие баллы будут начисляться с множителем x1,5</b>\n\n<b>Как это работает?</b>\n\nДопустим, следующее задание стоит 10 баллов. Пользователи, которые не прошли авторизацию в программе лояльности, при успешном выполнении задания получат ровно 10 баллов. А ты – 10х1,5 = 15 баллов!\n\nКруто же? <b>Твои возможности выиграть главный приз стали еще ближе!</b>`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAuthorizationCorrect error', e)
        }
    }

    private async _sendMessageOnAuthorizationIncorrect(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Попробовать ещё раз', callback_data: EMessages.AUTHORIZATION_WRITE }],
                [{ text: 'Сообщить о проблеме', callback_data: EMessages.PROBLEM }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP }],
            ]

            const text = `Что-то пошло не так. <b>Попробуй ввести код User ID</b> или сообщи нам о проблеме.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnAuthorizationIncorrect error', e)
        }
    }

    private async _sendMessageOnTaskThree(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.authorizationCheck(dbUser.id)
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Где находится фудкорт?', callback_data: EMessages.WHERE_FOOD }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #3. Посети станцию раздельного сбора отходов на «Вкусном бульваре» и введи уникальный код.</b>\n\nРешил(а) перекусить на фудкорте в перерыве между поиском новогодних подарков? Приятного аппетита! Только после этого, не забудь зайти на станцию раздельного сбора отходов.\n\n<b>Раздели и выброси отходы и введи уникальный код рядом со станцией в чат-бот.</b>`

            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskThree error', e)
        }
    }

    private async _sendMessageOnWhereFood(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Вкусный бульвар</b> расположен в центре МЕГИ напротив магазина АШАН`

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWhereFood error', e)
        }
    }

    private async _sendMessageOnTaskFour(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Загрузить чек (success)', callback_data: EMessages.TASK_CORRECT }],
                [{ text: 'Загрузить чек (failed)', callback_data: EMessages.SCAN_INCORRECT }],
                [{ text: 'Где находится Аистенок?', callback_data: EMessages.WHERE_STORK }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #4. Посети благотворительный магазин в МЕГЕ и загрузи чек не менее, чем на 100 рублей</b>\n\nНовый год уже совсем близко, а значит настало время подарков. Прими участие в создании новогоднего чуда для других людей и планеты! 🎄\n\nВ МЕГА Экополисе есть много мест, где можно внести свой вклад в чей-то праздник. <b>Посети благотворительный магазин «Аистенок» в МЕГЕ и загрузи чек, чтобы получить баллы!</b>\n\nКаждые 100 рублей в чеке будут равняться 10 игровым баллам, которые мы начислим тебе на игровой счет.\n\nПоехали? 🎁`

            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskFour error', e)
        }
    }

    private async _sendMessageOnWhereStork(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>«Аистенок» можно найти на…</b>\n\n<b>Обрати внимание:</b> на чеке должен обязательно присутствовать QR-код. Без него отсканировать чек и заработать баллы не получится 😢`

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWhereStork error', e)
        }
    }

    private async _sendMessageOnTaskFive(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Загрузить чек (success)', callback_data: EMessages.TASK_CORRECT }],
                [{ text: 'Загрузить чек (failed)', callback_data: EMessages.SCAN_INCORRECT }],
                [{ text: 'Где найти шопперы?', callback_data: EMessages.WHERE_SHOPPERS }],
                [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #5. Сходите в магазин с шоппером и загрузите чек на N рублей без позиции «пакет»</b>\n\n🛍️ Собрался(ась) за покупками? Мы помогаем сделать шаг навстречу экологичному образу жизни <b>— получи от МЕГИ в подарок шоппер на столе информации, посети любой магазин и загрузи чек без пакета, чтобы получить баллы.</b>\n\nЕсли ты действительно хочешь вносить свой йвклад в экологию и приобщиться к осознанному потреблению, то использование качественного шоппера вместо пакета из пластика — это хорошее начало! ⚡`

            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskFive error', e)
        }
    }

    private async _sendMessageOnWhereShoppers(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>МЕГА шопперы можно получить на стойке информации,</b> которая расположена перед Центральным входом в МЕГЕ`

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWhereShoppers error', e)
        }
    }

    private async _sendMessageOnShops(chatId: number, dbUser: IUserDb): Promise<void> {
        try {

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Где найти шопперы?', callback_data: EMessages.WHERE_SHOPPERS }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `В МЕГА Экополисе ты сможешь посетить и заработать баллы в следующих магазинах:\n\n●  Магазин 1\n\n●  Магазин 2\n\n●  Магазин 3\n\n●  Магазин 4\n\nОбрати внимание: на чеке должен обязательно присутствовать QR-код. Без него отсканировать чек и заработать баллы не получится`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnWhereShops error', e)
        }
    }


    private async _sendMessageOnFinal(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
            await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, 0)
            const currentUser = await Helper.getUserById(dbUser.id)
            await Helper.updateFinalStatus(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Пригласить друга', callback_data: EMessages.INVITE }],
                [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                [{ text: 'Призы', callback_data: EMessages.PRIZES }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
            ]

            const text = `<b> Твоё путешествие по МЕГА Экополису закончилось!</b> 🥳\n\nЭто был увлекательный путь. Тебе удалось подарить вещам новую жизнь, научиться сортировать отходы, принятие участие в благотворительности и приобрести классный шопер! ❤️‍🔥\n\nСпасибо! <b>За всё время тебе удалось набрать ${currentUser.score || 0} баллов.</b> Смотри свою позицию среди всех участников конкурса в таблице лидеров.\n\n💃🏻🕺🏽 Приглашаем тебя на праздничный концерт в МЕГУ 23 декабря в NN:NN, на котором мы подведем итоги и наградим победителей и призеров Экополиса! Гость концерта – наша несравненная Марита Плиева.\n\nДо встречи!`

            await this.bot.sendVideoNote(chatId, videoPath)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)

            if (currentUser.final === EFinal.COMPLETE) await this._sendMessageOnInviteFinal(chatId, dbUser)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnFinal error', e)
        }
    }


    private async _sendMessageOnInviteFinal(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath = path.join(__dirname, '../assets/images/img1.jpg')

            const text = `Поделись этим сообщением с другом 👇`
            const textTwo = `<b>Мне так понравилось путешествовать по МЕГА Экополису! Приглашаю попробовать вместе со мной!</b>\n\n<a href="http://t.me/mega_ekb_bot?start=${dbUser.id}">Скорее запускай бота!</a>`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
            })

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: textTwo,
                parse_mode: 'HTML',
            })
        } catch (e) {
            Logger.error('[BOT] sendMessageOnFinal error', e)
        }
    }

    private async _onProblemSend(message: Message, chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const uploadsPath = path.join(__dirname, '../uploads')
            if (message?.text || message?.caption) {
                if (message?.text) {
                    await Helper.saveProblem(dbUser.id, message?.text)
                }

                if (message?.caption) {
                    const mediaId = message?.media_group_id || message?.message_id.toString()
                    await Helper.saveProblem(dbUser.id, message?.caption, mediaId)
                    let fileLink
                    let fileName
                    if (message?.photo) {
                        fileLink = await this.bot.getFileLink(message?.photo[message?.photo?.length - 1]?.file_id);
                        const fileFullPath = await this.bot.downloadFile(message?.photo[message?.photo?.length - 1]?.file_id, uploadsPath)
                        fileName = path.basename(fileFullPath);
                    }
                    if (message?.video) {
                        fileLink = await this.bot.getFileLink(message.video?.file_id);
                        const fileFullPath = await this.bot.downloadFile(message.video?.file_id, uploadsPath)
                        fileName = path.basename(fileFullPath);
                    }
                    if (message?.animation) {
                        fileLink = await this.bot.getFileLink(message.animation?.file_id);
                        const fileFullPath = await this.bot.downloadFile(message.animation?.file_id, uploadsPath)
                        fileName = path.basename(fileFullPath);
                    }

                    await Helper.saveProblemFile(fileLink, mediaId, fileName)
                }
                return await this._sendMessageOnProblemConfirm(chatId, dbUser)
            }

            if (message?.media_group_id) {
                let fileLink
                let fileName
                if (message?.photo) {
                    fileLink = await this.bot.getFileLink(message?.photo[message?.photo?.length - 1]?.file_id);
                    const fileFullPath = await this.bot.downloadFile(message?.photo[message?.photo?.length - 1]?.file_id, uploadsPath)
                    fileName = path.basename(fileFullPath);
                }
                if (message?.video) {
                    fileLink = await this.bot.getFileLink(message.video?.file_id);
                    const fileFullPath = await this.bot.downloadFile(message.video?.file_id, uploadsPath)
                    fileName = path.basename(fileFullPath);
                }
                if (message?.animation) {
                    fileLink = await this.bot.getFileLink(message.animation?.file_id);
                    const fileFullPath = await this.bot.downloadFile(message.animation?.file_id, uploadsPath)
                    fileName = path.basename(fileFullPath);
                }

                await Helper.saveProblemFile(fileLink, message?.media_group_id, fileName)
                return
            }
        } catch (e) {
            Logger.error('[BOT] onProblemSend error', e)
        }

    }


    public async sendMessageOnGetDataFromWebApp(userId: number, data: string): Promise<void> {
        try {
            this.bot.sendMessage(userId, data)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnGetDataFromWebApp error', e)
        }
    }

    public async sendMessageOnScanIncorrect(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Попробовать ещё раз', web_app: { url: webAppScan } }],
                [{ text: 'Сообщить о проблеме', callback_data: EMessages.PROBLEM }],
                [{ text: 'Пропустить', callback_data: EMessages.SKIP_TASK }],
            ]

            const text = `Что-то пошло не так. <b>Чек не был принят.</b> Возможно, чек уже был использован, либо магазин, в котором была совершена покупка, не участвует в акции.\n\nПопробуй еще раз или сообщи нам о проблеме.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] _sendMessageOnScanIncorrect error', e)
        }
    }
}

export default new TelegramBotApp()