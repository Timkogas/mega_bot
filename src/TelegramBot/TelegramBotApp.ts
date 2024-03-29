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

    AUTHORIZATION_ERROR = 'authorization_error',
    AUTHORIZATION_CONFIRM_ERROR = 'authorization_confirm_error',
    AUTHORIZATION_WRITE_ERROR = 'authorization_write_error',
    AUTHORIZATION_SKIP_ERROR = ' authorization_skip_error',
    AUTHORIZATION_SKIP_CONFIRM_ERROR = ' authorization_skip_confirm_error',
    AUTHORIZATION_GUIDE_ERROR = 'authorization_guide_error',
    AUTHORIZATION_INCORRECT_ERROR = 'authorization_incorrect_error',

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
                        const checkCode = await Helper.checkCode(dbUser, text)

                        if (checkCode) {
                            return await this.sendMessageOnTaskCorrect(chatId, dbUser)
                        } else {
                            return await this._sendMessageOnCodeIncorrect(chatId, dbUser)
                        }
                    case EActivity.PROBLEM:
                        return await this._onProblemSend(message, chatId, dbUser)
                    case EActivity.AUTHORIZATION:

                        console.log({
                            telegramId: `${dbUser.id}`,
                            keycloakId: text
                        },
                            {
                                headers: {
                                    'x-api-key': process.env.API_KEY
                                }
                            })

                        try {
                            const checkAuthorization = await axios.post('https://omniapi.mega.ru/telegram/registerUser',
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
                                Helper.updateAuthorizationId(dbUser.id, text)
                                return await this._sendMessageOnAuthorizationConfirm(chatId, dbUser)
                            } else {
                                return await this._sendMessageOnAuthorizationIncorrect(chatId, dbUser)
                            }
                        } catch (e) {
                            Logger.error('[AXIOS] MEGA FRIEND REQUEST ERROR', e)
                            return await this._sendMessageOnAuthorizationIncorrect(chatId, dbUser)
                        }
                    case EActivity.AUTHORIZATION_ERROR:

                        try {
                            const checkAuthorization = await axios.post('https://omniapi.mega.ru/telegram/registerUser',
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
                                Helper.updateAuthorizationId(dbUser.id, text)
                                return await this._sendMessageOnConfirmAuthorizationError(chatId, dbUser, false)
                            } else {
                                return await this._sendMessageOnIncorrectAuthorizationError(chatId, dbUser)
                            }
                        } catch (e) {
                            Logger.error('[AXIOS] MEGA FRIEND REQUEST ERROR', e)
                            return await this._sendMessageOnIncorrectAuthorizationError(chatId, dbUser)
                        }

                }
            })


            this.bot.on('callback_query', async (callbackQuery) => await this._handleCallbackQuery(callbackQuery));
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

            case EMessages.AUTHORIZATION_ERROR:
                return await this.sendMessageOnCheckAuthorizationError(chatId, dbUser)
            case EMessages.AUTHORIZATION_GUIDE_ERROR:
                return await this._sendMessageOnGuideAuthorizationError(chatId, dbUser)
            case EMessages.AUTHORIZATION_SKIP_ERROR:
                return await this._sendMessageOnSkipAuthorizationError(chatId, dbUser)
            case EMessages.AUTHORIZATION_SKIP_CONFIRM_ERROR:
                return await this._sendMessageOnConfirmAuthorizationError(chatId, dbUser, true)
            case EMessages.AUTHORIZATION_WRITE_ERROR:
                return await this._sendMessageOnWriteAuthorizationError(chatId, dbUser)
            case EMessages.AUTHORIZATION_INCORRECT_ERROR:
                return await this._sendMessageOnIncorrectAuthorizationError(chatId, dbUser)

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
            await Helper.incrementStartField(dbUser.id)
            const videoPath = path.join(__dirname, '../assets/videos/1.mp4')
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Я согласен(на)', callback_data: EMessages.MENU }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
                [{ text: 'Не хочу', callback_data: EMessages.NOT_WANTED }]
            ]

            const textFirstMessage = `👋🏻 Приветствуем!\n\nПриглашаем вас присоединиться к экспедиции в МЕГА Экополис — место, в котором соединились технологии и эко-ответственность. Вы можете отправиться в путешествие, раскрыть все тайны экополиса и получить шанс выиграть эко-путешествие по Уралу в глэмпинг «Дивий камень», а также 50 других подарков  💚`
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
            const videoPath = path.join(__dirname, '../assets/videos/2.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: dbUser.final === EFinal.COMPLETE ? EMessages.FINAL : EMessages.START_SHORT }],
            ]

            const text = `🌍 <b>«МЕГА Экополис»</b> — акция от МЕГИ Екатеринбург, посвященная заботе о планете и людях через сервисы, услуги и решения, применяемые в центрах.\n\nПравила нашей акции ориентированы на выполнение 5 заданий:\n1. Задание 1. Разделяй с МЕГОЙ\n2. Задание 2. МЕГА Место\n3. Задание 3. МЕГА Станция\n4. Задание 4. МЕГА Благотворительность\n5. Задание 5. МЕГА Эко-шопинг\n\nЗа каждое выполненное задание пользователю начисляются игровые баллы. Система начисления и количество баллов, призовой фонд и условия проведения определяются настоящими <a href='https://mega-ekb-game.ru/rules'>правилами акции.</a>\n\n<i>Организатор акции — ООО «АБК Сервис». ИНН 6671013489</i>\n\n© Все права защищены`

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
            Logger.error('[BOT] sendMessageOnAbout error', e)
        }
    }

    private async _sendMessageOnNotWanted(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/3.mp4')
            Helper.updateDisagreeStatus(dbUser.id)
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Я согласен(на)', callback_data: EMessages.MENU }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
                [{ text: 'Не хочу', callback_data: EMessages.NOT_WANTED }],
            ]

            const text = `В нашем конкурсе нет ничего сложного и небезопасного. Вы можете <b>внимательно ознакомиться с <a href="https://mega-ekb-game.ru/rules">правилами</a></b> и принять решение: играть или нет 🧐\n\n🔒 <b>Участие в акции является добровольным.</b> Организатор не хранит и не передает персональные данные и иные сведения о пользователях, принимающих согласие на коммуникацию с чат-ботом «Доверься МЕГЕ. Экспедиция в Экополис», в пользу третьих лиц.`

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
            Helper.updateAgreeStatus(dbUser.id)
            if (hasTasks) {
                taskData = await Helper.getLastPendingTask(dbUser.id)
                if (taskData.status === ETaskStatus.WAIT) {
                    taskData = { type: EMessages.AUTHORIZATION_ERROR }
                }
            }


            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Задания', callback_data: hasTasks ? taskData.type : EMessages.TASKS }],
                [{ text: 'Пригласить друга', callback_data: EMessages.INVITE }],
                [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                [{ text: 'Призы', callback_data: EMessages.PRIZES }],
            ]

            const text = `✌️<b> Добро пожаловать в МЕГА Экополис!</b>\n\nЭто меню для навигации по чат-боту. <b>Чтобы начать выполнение заданий, жмите на кнопку «Задания» 👇</b>\n\nВы можете <b>пригласить в наш чат-бот своих друзей</b> – вместе путешествовать по просторам МЕГА Экополиса веселее! Чтобы узнать, сколько баллов вы заработали, обращайтесь к «Таблице лидеров».\n\nМЕГА Экополис ждет вас! 💕`

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

            const text = `Победители акции «МЕГА Экополис» смогут претендовать на главный приз — <b>сказочные выходные в глэмпинге “Дивий камень” </b> ⛰️🌲❄️\n\nТоп-50 пользователей также получат ценные призы:\n● 1 место — подарочный сертификат на 50 000 рублей от эко-глэмпинга «Дивий камень» (проживание, экскурсии и развлечения)\n● 2 место — годовая подписка на сервис FITMOST (400 баллов)\n● 3 место — фитнес-браслет с трекером Xiaomi Mi Band 7\n● 4-10 место — набор Re-Feel в подарочной упаковке (состав набора: матча + кофе + какао + чай ассорти из 8 саше, благовония, арома-палочки с цветами и арбузом, подставка под благовония, карточки посланий от Re-Feel)\n● Приз за 11-50 место – набор уходовой эко-косметики\n\nТакже для всех участников акции мы подготовили набор эксклюзивных эко-стикеров в Telegram 🥰\n\nПобедители и призеры будут зафиксированы и объявлены 30 декабря на праздничном награждении в МЕГА Месте с участием ведущей нашего путешествия – Мариты Плиевой.\n\nСледите за новостями в нашем канале и чат-боте!`

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

            const text = `<b>Вы можете пригласить друзей в МЕГА Экополис</b>, чтобы получить больше баллов к рейтингу!\n\nКак это сделать?\n👉🏻 <b>Скопируйте ссылку и отправьте друзьям.</b> Приглашать в бота можно не более 10 человек;\n👉🏻 Как только кто-то из друзей запустит бота и выполнит одно задание, вам будет начислено <b>5 бонусных баллов.</b>\n\nВот ссылка, по которой можно пригласить друзей:\n<code>http://t.me/mega_ekb_bot?start=${dbUser.id}</code>`

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
            const videoPath = path.join(__dirname, '../assets/videos/10.mp4')
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Круто! Участвую!', callback_data: taskData.type }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `🤕 Ежегодно только в России территория свалок увеличивается на 250 000 гектаров! Сортируя и сдавая на переработку свои отходы, вы можете сократить количество мусора и внести свой вклад в заботу о нашей планете.\n\nМЕГА в партнерстве с Немузеем мусора открыла станцию по приему вторсырья.\n💚Если вы уже сортируете отходы дома, приносите их на нашу станцию.\n💚Если вы только новичок в сортировке, предлагаем начать с малого: выделите хотя бы 1 фракцию перерабатываемых отходов (например, незагрязненная бумага или ПЭТ-бутылки из-под воды) и поместите данную фракцию в подходящий контейнер на станции.\n💚А если у вас есть одежда в хорошем состоянии, которую вы хотите выкинуть, то вам точно <b>нужно посетить станцию раздельного сбора</b>. Все вещи, которые попадут в контейнер, пойдут на благотворительность 🥰\n\n<b>Помещайте вещи в контейнер, находите уникальный код рядом со станцией, вводите его в чат-бот и получайте игровые баллы!</b>`

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
            const imgPath = path.join(__dirname, '../assets/images/task_1.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Где найти станцию?', callback_data: EMessages.WHERE_STATION }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #1. Принесите вещи, которые перестали вас радовать в боксы для приема вещей на станции «Разделяй с МЕГОЙ»</b>\n\n<a href="https://mega.ru/service/66188/ekaterinburg/">Что можно сдать на станцию</a>\n\n<b>Поместите вещи в контейнер, найдите уникальный код рядом со станцией и введи его в чат-бот, после чего вы получите баллы. Удачи!</b>`

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

    public async sendMessageOnTaskCorrect(chatId: number, dbUser: IUserDb, scanPoints?: number): Promise<void> {
        try {
            let videoPath
            let text
            let buttons: InlineKeyboardButton[][]
            let points

            const task = await Helper.getLastPendingTask(dbUser.id)

            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            switch (task.type) {
                case EMessages.TASK_1:
                    points = 10
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.SUBSCRIBE }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Код принят.</b> Спасибо за ваш вклад в заботу о планете и людях! ☘️\n\nНа ваш игровой счет начислено <b>10 баллов</b>. Поздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/4.mp4')
                    await Helper.addPointsToUser(dbUser, 10)

                    await this.bot.sendVideoNote(chatId, videoPath)
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
                case EMessages.TASK_2:
                    points = 10
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.AUTHORIZATION }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Код принят.</b> Надеемся, вам понравился наш мастер-класс! 😍\n\nНа ваш игровой счет начислено <b>10 баллов</b>.\nПоздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/6.mp4')
                    await Helper.addPointsToUser(dbUser, 10)

                    await this.bot.sendVideoNote(chatId, videoPath)
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
                case EMessages.TASK_3:
                    points = 10
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.TASK_4 }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    const authorization = await Helper.checkAuthorization(dbUser.id)
                    if (authorization === 'error') {
                        await Helper.confirmLastTask(dbUser.id, ETaskStatus.WAIT, points)
                        return await this.sendMessageOnCheckAuthorizationError(chatId, dbUser)
                    }
                    if (authorization) points = Number((10 * 1.5)).toFixed()
                    else points = 10
                    text = `<b>Код принят.</b> Теперь ты умеешь правильно сортировать отходы! ♻️.\n\nНа ваш игровой счет начислено ${points} баллов. Поздравляем!`
                    videoPath = path.join(__dirname, '../assets/videos/12.mp4')
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    await Helper.addPointsToUser(dbUser, points)

                    await this.bot.sendVideoNote(chatId, videoPath)
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
                case EMessages.TASK_4:
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.TASK_5 }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Чек принят.</b> Это был увлекательный шопинг! 🤗\n\nНа ваш игровой счет начислено ${scanPoints} баллов.\n\nПоздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/9.mp4')
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, scanPoints)
                    await Helper.addPointsToUser(dbUser, scanPoints)

                    await this.bot.sendVideoNote(chatId, videoPath)
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
                case EMessages.TASK_5:
                    buttons = [
                        [{ text: 'Сканировать еще один чек', web_app: { url: webAppScan } }],
                        [{ text: 'Где найти шопперы?', callback_data: EMessages.WHERE_SHOPPERS }],
                        // [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                        [{ text: 'Завершить задание', callback_data: EMessages.FINAL }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Чек принят.</b> Как тебе покупки с шоппером? Скажи, правда приятно? 🌳\n\nНа ваш игровой счет начислено ${scanPoints} баллов.\n\nПоздравляем!`
                    await Helper.addPointsToUser(dbUser, scanPoints, true)

                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
            }
            await this._sendMessageOnReferralComplete(dbUser)
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
            const text = `Что-то пошло не так. <b>Попробуйте ввести код еще раз</b> или сообщи нам о проблеме.`

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

            const imgPath = path.join(__dirname, '../assets/images/where_station.png')

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

            const text = `Введите уникальный код ниже 👇🏻`

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

            const text = `Вы уверены, что хотите пропустить задание? В таком случае мы не начислим вам баллы, и <b>шансы выиграть приз уменьшатся</b>😔`

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
            const newDbUser = await Helper.getUserById(dbUser.id)

            const lastSkipDate = new Date(newDbUser.skip_task).getTime();
            const currentDate = new Date().getTime();
            const twentyFourHours = 24 * 60 * 60 * 1000

            // if (currentDate - lastSkipDate >= twentyFourHours) {
            await Helper.updateSkipTaskTime(newDbUser.id, new Date())
            const taskData = await Helper.getLastPendingTask(dbUser.id)
            await Helper.confirmLastTask(dbUser.id, ETaskStatus.SKIP, 0)
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
            // } else {
            //     return await this._sendMessageOnSkipLimit(chatId, dbUser)
            // }
        } catch (e) {
            Logger.error('[BOT] sendMessageOnSkipConfirm error', e)
        }
    }

    private async _sendMessageOnSkipLimit(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: taskData.type }],
            ]

            const text = `Ты можешь пропустить только одно задание в день. Попробуй выполнить это задание или возвращайся завтра, чтобы приступить к следующему 🙌`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] _sendMessageOnSkipLimit error', e)
        }
    }

    private async _sendMessageOnSubscribe(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Проверить подписку', callback_data: EMessages.SUBSCRIBE_CHECK }],
                [{ text: 'Следующее задание', callback_data: EMessages.TASK_2 }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Хотите  получить <b>+5 бонусных баллов?</b> 😊\nСкорее подписывайся на наш <a href="https://t.me/megaekat">Телеграм-канал!</a>\n\nВ нем вы найдете крутые идеи для покупок, информацию об акциях и скидках магазинов МЕГИ, розыгрыши и многое другое!`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
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
            if (data.status === 'member' || data.status === 'administrator' || data.status === 'creator' || data.status === 'restricted') {
                return await this._sendMessageOnSubscribeConfirm(chatId, dbUser)
            } else {
                return await this._sendMessageOnSubscribeError(chatId, dbUser)
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

            const text = `Видим вашу подписку! Спасибо!\n\nЛови <b>+5 бонусных баллов</b> на ваш игровой счет.`

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

            const text = `Кажется, вы всё еще не наш подписчик. Переходите в <a href="https://t.me/megaekat">Телеграм-канал</a> и жмите «Подписаться»`

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
                case EMessages.AUTHORIZATION_WRITE_ERROR:
                    backType = EMessages.AUTHORIZATION_ERROR;
                    break;
                default:
                    backType = EMessages.SCAN_INCORRECT
            }

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: backType }],
            ]

            const text = `Напишите в чат-бот о своей проблеме, и мы постараемся оперативно её решить. Если у вас есть скриншот, фото или видео, демонстрирующие проблему, можете также прикрепить к сообщению.\n\nПеред отправкой проверьте, указано ли в вашем аккаунте Telegram имя пользователя (@nickname). Без него мы не сможем с вами связаться.`

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

            switch (dbUser?.buttons[0][0]?.callback_data) {
                case EMessages.CODE_INCORRECT:
                    backType = EMessages.CODE_INCORRECT;
                    break;
                case EMessages.AUTHORIZATION_INCORRECT:
                    backType = EMessages.AUTHORIZATION_INCORRECT;
                    break;
                case EMessages.AUTHORIZATION_ERROR:
                    backType = EMessages.AUTHORIZATION_ERROR;
                    break;
                default:
                    backType = EMessages.SCAN_INCORRECT
            }

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: backType }],
            ]

            const text = `Обращение принято. Мы постараемся вернуться к вам с решением в течение 48 часов.`

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
                    const text = `Кто-то из ваших друзей присоединился к путешествию в МЕГА Экополис! За это мы начисляем вам +5 баллов 😎\n\nПродолжим?`

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
            const videoPath = path.join(__dirname, '../assets/videos/5.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Где проходят мастер-классы?', callback_data: EMessages.WHERE_MASTERS }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #2. МЕГА Место</b>\n\nВыставка фарформа, апсайклинг, кастомизация одежды совместно с художником и многое другое ждет вас в МЕГА Месте! \n\nСходите на выставку фарфора от проекта Антихрупкость, которая будет ждать вас с 20 декабря или выбирайте лекции и мастер-классы в МЕГА Месте. Примите участие хотя бы в одном мероприятии и получите уникальный код от куратора, чтобы заработать баллы\n\nРасписание мастер-классов и запись: <a href="https://mega.ru/events/2023/35992/ekaterinburg/">https://mega.ru/events/2023/35992/ekaterinburg/</a>\n\nДобро пожаловать в МЕГА Экополис! 👐`

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
            const imgPath = path.join(__dirname, '../assets/images/where_master.jpg');

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.TASK_2 }],
            ]

            const text = `Мастер-классы проходят в открытом общественном пространстве МЕГА[Место]. Пространство находится на 1 этаже, рядом с магазинами «Читай-город» и Respect.\n\nВ МЕГА[Месте] есть кофейня и уютный коворкинг с быстрым бесплатным Wi-Fi, что делает его идеальным местом для тех, кто ищет комфортное пространство для работы или проведения встреч. Здесь представлены несколько зон, предназначенных для общения или простого отдыха, где каждый сможет расслабиться и зарядиться энергией.`

            await this.bot.sendPhoto(chatId, imgPath, {
                caption: text,
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
            const videoPath = path.join(__dirname, '../assets/videos/NEW_7.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести User ID MEGA Friends', callback_data: EMessages.AUTHORIZATION_WRITE }],
                [{ text: 'Где найти User ID?', callback_data: EMessages.AUTHORIZATION_GUIDE }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Настало время вырваться вперед! Мы даем вам уникальную возможность <b>умножить ваши баллы!</b>\n\nЗарегистрируйтесь или авторизуйтесь в программе лояльности MEGA Friends по ссылке или в мобильном приложении МЕГА: <a href='https://mega.ru/user'>https://mega.ru/user</a>\n\nНайдите в личном кабинете ваш код User ID, введите в чат-бот и получите <b>множитель x1,5 баллов за выполнение будущих заданий!</b> 😯`

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
            const imgPath1 = path.join(__dirname, '../assets/images/guide_1.jpg');
            const imgPath2 = path.join(__dirname, '../assets/images/guide_2.jpg');
            const imgPath3 = path.join(__dirname, '../assets/images/guide_3.jpg');
            const imgPath4 = path.join(__dirname, '../assets/images/guide_4.jpg');

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

            const text = `Итак, инструкция:\n\n1. Перейдите по ссылке или скачайте мобильное приложение МЕГА и пройдите процедуру авторизации или регистрации: <a href="https://mega.ru/user">https://mega.ru/user</a>\n\n2. В личном кабинете или приложении МЕГА найдите кнопку «Твой QR-code» и нажмите на неё\n\n3.  Под QR-кодом вы увидите уникальный код, который выглядит примерно так: f0f08565-13e4-47e4-ab75-b a4850611da3\n\n4. Скопируйте и введите этот код в чат-бот, нажав по кнопке ниже`

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

            const text = `Вы уверены, что хотите пропустить задание? В таком случае мы не начислим вам множитель на баллы, и <b>шансы выиграть приз уменьшатся</b> 😔`

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

            const text = `Скопируйте и введите сюда ваш код User ID.`

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

            const text = `Ура! Теперь вы наш МЕГА ДРУГ! <b>Все ваши будущие баллы будут начисляться с множителем x1,5</b>\n\n<b>Как это работает?</b>\n\nДопустим, следующее задание стоит 10 баллов. Пользователи, которые не прошли авторизацию в программе лояльности, при успешном выполнении задания получат ровно 10 баллов. А вы – 10х1,5 = 15 баллов!\n\nКруто же? <b>Ваши возможности выиграть главный приз стали еще больше!</b>`

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

            const text = `Что-то пошло не так. <b>Попробуйте ввести код User ID</b> или сообщи нам о проблеме.`

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
            const videoPath = path.join(__dirname, '../assets/videos/11.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести код', callback_data: EMessages.WRITE_CODE }],
                [{ text: 'Где находится фудкорт?', callback_data: EMessages.WHERE_FOOD }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #3. Посетите станцию раздельного сбора отходов на «Вкусном бульваре» и введите уникальный код.</b>\n\nРешили перекусить на фудкорте в перерыве между поиском новогодних подарков? Приятного аппетита! Только после этого, не забудьте зайти на станцию раздельного сбора отходов.\n\n<b>Разделите и выбросите отходы и введите уникальный код рядом со станцией в чат-бот.</b>`

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
            const imgPath = path.join(__dirname, '../assets/images/where_food.jpg')

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
            const videoPath = path.join(__dirname, '../assets/videos/8.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Где находится Аистенок?', callback_data: EMessages.WHERE_STORK }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #4. Посетите благотворительный магазин в МЕГЕ и загрузите чек не менее, чем на 100 рублей</b>\n\nНовый год уже совсем близко, а значит настало время подарков. Примите участие в создании новогоднего чуда для других людей и планеты! 🎄\n\n<b>Посетите благотворительный магазин «Аистенок» в МЕГЕ и загрузите чек, чтобы получить баллы!</b>\n\nКаждые 100 рублей в чеке будут равняться 10 игровым баллам, которые мы начислим вам на игровой счет.\n\nПоехали? 🎁`

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
            const imgPath = path.join(__dirname, '../assets/images/where_stork.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>«Аистенок» можно найти на 0 этаже рядом с магазином «Балдёжики» и Центром «Мои документы» (вход с улицы напротив автобусного терминала)</b>\n\n<b>Обратите внимание:</b> на чеке должен обязательно присутствовать QR-код. Без него отсканировать чек и заработать баллы не получится 😢`

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
            const videoPath = path.join(__dirname, '../assets/videos/13.mp4')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Где найти шопперы?', callback_data: EMessages.WHERE_SHOPPERS }],
                // [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>Задание #5. Сходите в магазин с шоппером и загрузите чек на N рублей без позиции «пакет»</b>\n\n🛍️ Собрались за покупками? Мы помогаем сделать шаг навстречу экологичному образу жизни — получите от МЕГИ <b>в подарок шоппер</b>, сделанный в коллаборации с локальным стрит-арт художником Ромой Ink, на столе информации, посетите любой магазин и загрузите чек без пакета, чтобы получить баллы. <i>Шоппер можно получить только при условии выполнения минимум 3-х заданий</i>.\n\nЕсли вы действительно хотите внести свой вклад в экологию и приобщиться к осознанному потреблению, то использование качественного шоппера вместо пакета из пластика — это хорошее начало! ⚡\n\n<i>P.S.: Чеки из магазинов можно сканировать неограниченное количество раз. Как только отсканируете все-все чеки, жмите на кнопку «Завершить задание»</i>`

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
            const imgPath = path.join(__dirname, '../assets/images/where_shoppers.jpg')

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Загрузить чек', web_app: { url: webAppScan } }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                // [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `<b>МЕГА шопперы можно получить на стойке информации</b>, которая расположена перед Центральным входом в МЕГЕ\n\n<i>Обрати внимание: шоппер выдается только участникам, выполнившим минимум 3 задания.</i>`

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
            const videoPathFirst = path.join(__dirname, '../assets/videos/14.mp4')
            const videoPathSecond = path.join(__dirname, '../assets/videos/15.mp4')
            await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, 0)
            const currentUser = await Helper.getUserById(dbUser.id)
            await Helper.updateFinalStatus(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Пригласить друга', callback_data: EMessages.INVITE }],
                [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                [{ text: 'Призы', callback_data: EMessages.PRIZES }],
                [{ text: 'Об акции', callback_data: EMessages.ABOUT }],
            ]

            const text = `<b>Ваше путешествие по МЕГА Экополису закончилось!</b> 🥳\n\nЭто был увлекательный путь. Вам удалось подарить вещам новую жизнь, научиться сортировать отходы, принятие участие в благотворительности и приобрести классный шопер! ❤️‍🔥\n\nСпасибо! <b>За всё время вам удалось набрать ${currentUser.score || 0} баллов.</b> Смотрите вашу позицию среди всех участников конкурса в таблице лидеров.\n\n💃🏻🕺🏽 Приглашаем вас на праздничный концерт в МЕГУ 30 декабря в 15:00, на котором мы подведем итоги и наградим победителей и призеров Экополиса! Гость концерта – наша несравненная Марита Плиева.\n\nДо встречи!`

            await this.bot.sendVideoNote(chatId, videoPathFirst)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })
            await this.bot.sendVideoNote(chatId, videoPathSecond)

            await Helper.setButtons(dbUser, buttons)

            if (currentUser.final === EFinal.COMPLETE) await this._sendMessageOnInviteFinal(chatId, dbUser)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnFinal error', e)
        }
    }


    private async _sendMessageOnInviteFinal(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath = path.join(__dirname, '../assets/images/invite.jpg')

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

            const text = `Что-то пошло не так. <b>Чек не был принят.</b> Возможно, чек уже был использован, либо магазин, в котором была совершена покупка, не участвует в акции.\n\nПопробуйте еще раз или сообщи нам о проблеме.`

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


    public async sendMessageOnCheckAuthorizationError(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести User ID MEGA Friends', callback_data: EMessages.AUTHORIZATION_WRITE_ERROR }],
                [{ text: 'Где найти User ID?', callback_data: EMessages.AUTHORIZATION_GUIDE_ERROR }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP_ERROR }],
                [{ text: 'Сообщить о проблеме', callback_data: EMessages.PROBLEM }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Кажется, возникла ошибка, и ваш множитель баллов за авторизацию в программе MEGA Friends перестал работать.\n\nПроверьте, не удалена или не заблокирована ваша учетная запись по ссылке или в мобильном приложении МЕГА: <a href="https://mega.ru/user/">https://mega.ru/user/</a>\n\nЕсли учетная запись активна, найдите в личном кабинете свой код User ID и введите в чат-бот. Мы восстановим ваш статус участника программы лояльности и <b>начислим вам баллы за выполнение этого задания с множителем х1,5.</b>`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnCheckAuthorizationError error', e)
        }
    }

    private async _sendMessageOnGuideAuthorizationError(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const imgPath1 = path.join(__dirname, '../assets/images/guide_1.jpg');
            const imgPath2 = path.join(__dirname, '../assets/images/guide_2.jpg');
            const imgPath3 = path.join(__dirname, '../assets/images/guide_3.jpg');
            const imgPath4 = path.join(__dirname, '../assets/images/guide_4.jpg');

            const media: InputMediaPhoto[] = [
                { type: 'photo', media: imgPath1 },
                { type: 'photo', media: imgPath2 },
                { type: 'photo', media: imgPath3 },
                { type: 'photo', media: imgPath4 },
            ];

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Ввести User ID MEGA Friends', callback_data: EMessages.AUTHORIZATION_WRITE_ERROR }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP_ERROR }],
                [{ text: 'Назад', callback_data: EMessages.AUTHORIZATION_ERROR }],
            ]

            const text = `Итак, инструкция:\n\n1. Перейдите по ссылке или скачайте мобильное приложение МЕГА и пройдите процедуру авторизации или регистрации: <a href="https://mega.ru/user">https://mega.ru/user</a>\n\n2. В личном кабинете или приложении МЕГА найдите кнопку «Твой QR-code» и нажмите на неё\n\n3.  Под QR-кодом вы увидите уникальный код, который выглядит примерно так: f0f08565-13e4-47e4-ab75-b a4850611da3\n\n4. Скопируйте и введите этот код в чат-бот, нажав по кнопке ниже`

            await this.bot.sendMediaGroup(chatId, media)
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnGuideAuthorizationError error', e)
        }
    }

    private async _sendMessageOnSkipAuthorizationError(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Да, пропустить', callback_data: EMessages.AUTHORIZATION_SKIP_CONFIRM_ERROR }],
                [{ text: 'Нет, сейчас авторизуюсь', callback_data: EMessages.AUTHORIZATION_ERROR }],
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
            Logger.error('[BOT] sendMessageOnSkipAuthorizationError error', e)
        }
    }

    private async _sendMessageOnConfirmAuthorizationError(chatId: number, dbUser: IUserDb, skip: boolean): Promise<void> {
        try {
            let videoPath
            let text
            let buttons: InlineKeyboardButton[][]
            let points

            const task = await Helper.getLastPendingTask(dbUser.id)
            const user = await Helper.getUserById(dbUser.id)
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            if (!skip) {
                points = Math.round(user.paused_score * 1.5)
            } else {
                points = user.paused_score
            }

            switch (task.type) {
                case EMessages.TASK_3:
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.TASK_4 }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]

                    text = `<b>Код принят.</b> Теперь вы умеете правильно сортировать отходы! ♻️.\n\nНа ваш игровой счет начислено ${points} баллов. Поздравляем!`
                    videoPath = path.join(__dirname, '../assets/videos/12.mp4')
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    await Helper.addPointsToUser(dbUser, points)

                    await this.bot.sendVideoNote(chatId, videoPath)
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
                case EMessages.TASK_4:
                    buttons = [
                        [{ text: 'Следующее задание', callback_data: EMessages.TASK_5 }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Чек принят.</b> Это был увлекательный шопинг! 🤗\n\nНа ваш игровой счет начислено ${points} баллов.\n\nПоздравляем! Играем дальше?`
                    videoPath = path.join(__dirname, '../assets/videos/9.mp4')
                    await Helper.confirmLastTask(dbUser.id, ETaskStatus.COMPLETE, points)
                    await Helper.addPointsToUser(dbUser, points)

                    await this.bot.sendVideoNote(chatId, videoPath)
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
                case EMessages.TASK_5:
                    buttons = [
                        [{ text: 'Сканировать еще один чек', web_app: { url: webAppScan } }],
                        [{ text: 'Где найти шопперы?', callback_data: EMessages.WHERE_SHOPPERS }],
                        // [{ text: 'Какие магазины участвуют?', callback_data: EMessages.SHOPS }],
                        [{ text: 'Завершить задание', callback_data: EMessages.FINAL }],
                        [{ text: 'Таблица лидеров', web_app: { url: webAppLeader } }],
                        [{ text: 'Назад', callback_data: EMessages.MENU }],
                    ]
                    text = `<b>Чек принят.</b> Как вам покупки с шоппером? Правда приятно? 🌳\n\nНа ваш игровой счет начислено ${points} баллов.\n\nПоздравляем!`
                    await Helper.addPointsToUser(dbUser, points, true)

                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: buttons,
                        }
                    })

                    break;
            }
            await this._sendMessageOnReferralComplete(dbUser)
            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] _sendMessageOnConfirmAuthorizationError error', e)
        }
    }

    private async _sendMessageOnIncorrectAuthorizationError(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.BUTTONS)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Попробовать ещё раз', callback_data: EMessages.AUTHORIZATION_WRITE_ERROR }],
                [{ text: 'Сообщить о проблеме', callback_data: EMessages.PROBLEM }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP_ERROR }],
            ]

            const text = `Что-то пошло не так. <b>Попробуйте ввести код User ID</b> или сообщи нам о проблеме.`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] _sendMessageOnInccorectAuthorizationError error', e)
        }
    }

    private async _sendMessageOnWriteAuthorizationError(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.AUTHORIZATION_ERROR)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Где найти User ID?', callback_data: EMessages.AUTHORIZATION_GUIDE_ERROR }],
                [{ text: 'Пропустить', callback_data: EMessages.AUTHORIZATION_SKIP_ERROR }],
                [{ text: 'Назад', callback_data: EMessages.AUTHORIZATION_ERROR }],
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
            Logger.error('[BOT] _sendMessageOnWriteAuthorizationError error', e)
        }
    }

    public async sendNotifications(chatId: number, text: string, file: string, selectedType: number): Promise<void> {
        try {
            const filePath = path.join(__dirname, `../uploads/messages/${file}`)

            switch (selectedType) {
                case 0:
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                    })
                    break;
                case 1:
                    await this.bot.sendPhoto(chatId, filePath, {
                        parse_mode: 'HTML',
                        caption: text,
                    })
                    break;
                case 2:
                    await this.bot.sendVideo(chatId, filePath, {
                        parse_mode: 'HTML',
                        caption: text,
                    })
                    break;
                case 3:
                    await this.bot.sendAnimation(chatId, filePath, {
                        parse_mode: 'HTML',
                        caption: text,
                    })
                    break;
                case 4:
                    await this.bot.sendAudio(chatId, filePath, {
                        parse_mode: 'HTML',
                        caption: text,
                    })
                    break;
                default:
                    await this.bot.sendMessage(chatId, text, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                    })
            }
            // const sticker = 'mega_ecology'
            // const result = await this.bot.getStickerSet(sticker)
            // await this.bot.sendSticker(chatId, result?.stickers[6]?.file_id)
        } catch (e) {
            Logger.error('[BOT] sendNotifications error', e)
        }
    }
}

export default new TelegramBotApp()