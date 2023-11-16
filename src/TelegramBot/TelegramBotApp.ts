import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Logger from '../Logger/Logger';
import path from 'path';
import Helper from './Helper';
import { EActivity, IUserDb } from '../Db/IUserDb';

dotenv.config();
process.env["NTBA_FIX_350"] = '1';

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

    CODE_INCORRECT = 'code_incorrect',
    // не используются в callback_query
    TASK_1_CORRECT = 'task_1_correct',
}

export const taskIdToEMessagesMap = {
    1: EMessages.TASK_1,
    2: EMessages.TASK_2,
    3: EMessages.TASK_3,
    4: EMessages.TASK_4,
    5: EMessages.TASK_5,
};

export default class TelegramBotApp {
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
                const tgUser = message.from
                const dbUser = await Helper.checkUser(tgUser)
                const text = message.text
                const chatId = message.chat.id

                if (text.includes('/start')) {
                    return await this._sendMessageOnStart(chatId, dbUser)
                }

                switch (dbUser.activity) {
                    case EActivity.BUTTONS:
                        return await this._sendMessageOnNoCommand(chatId, dbUser)
                    case EActivity.CODE:
                        const check = Helper.checkCode(text)

                        if (check) {
                            return await this._sendMessageOnTaskCorrect(chatId, dbUser)
                        } else {
                            return await this._sendMessageOnCodeIncorrect(chatId, dbUser)
                        }
                    case EActivity.PROBLEM:
                        return await this._sendMessageOnProblemConfirm(chatId, dbUser)
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
            case EMessages.TASK_1:
                return await this._sendMessageOnTaskOne(chatId, dbUser)
            case EMessages.TASK_2:
                return await this._sendMessageOnTaskTwo(chatId, dbUser)
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
             
            let taskData
            const hasTasks = await Helper.getHasPendingTask(dbUser.id)

            if (hasTasks) {
                taskData = await Helper.getLastPendingTask(dbUser.id)
            }

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Задания', callback_data: hasTasks ? taskData.type : EMessages.TASKS }],
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

            const text = `Победители акции «МЕГА Экополис» смогут претендовать на главный приз — <b>сказочные выходные в глэмпинге и эко-тур по Уралу для всей семьи</b> ⛰️🌲❄️\n\nТоп-50 пользователей также получат ценные призы:\n● Приз1\n● Приз2\n● Приз3\n● Приз4\n● Приз5\n\nПобедители и призеры будут зафиксированы и объявлены 23 декабря на праздничном концерте в МЕГЕ с участием нашего амбассадора – Мариты Плиевой.\n\nСледите за новостями в нашем канале и чат-боте!`

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
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Круто! Участвую!', callback_data: taskData.type }],
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

    private async _sendMessageOnTaskCorrect(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const videoPath = path.join(__dirname, '../assets/videos/video1.mp4')
             
            await Helper.confirmLastTask(dbUser.id)
            await Helper.addPointsToUser(dbUser.id, 10)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Следующее задание', callback_data: EMessages.TASK_2 }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]
            const text = `<b>Код принят.</b> Спасибо за твой вклад в заботу о планете и людях! ☘️\n\nНа твой игровой счет начислено <b>10 баллов</b>. Поздравляем! Играем дальше?`

            await this.bot.sendVideo(chatId, videoPath)
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
                [{ text: 'Назад', callback_data: EMessages.MENU }],
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

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Где найти станцию?', callback_data: EMessages.WHERE_STATION }],
                [{ text: 'Пропустить задание', callback_data: EMessages.SKIP_TASK }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

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
            await Helper.confirmLastTask(dbUser.id)
            const taskData = await Helper.getLastPendingTask(dbUser.id)
            switch (taskData.type) {
                case EMessages.TASK_1:
                    return await this._sendMessageOnTaskOne(chatId, dbUser)
                case EMessages.TASK_2:
                    return await this._sendMessageOnTaskTwo(chatId, dbUser)
            }
        } catch (e) {
            Logger.error('[BOT] sendMessageOnSkipConfirm error', e)
        }
    }

    private async _sendMessageOnTaskTwo(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            const taskData = await Helper.getLastPendingTask(dbUser.id)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Проверить подписку', callback_data: EMessages.MENU }],
                [{ text: 'Следующее задание', callback_data: EMessages.MENU }],
                [{ text: 'Назад', callback_data: EMessages.MENU }],
            ]

            const text = `Хочешь получить <b>+5 бонусных баллов?</b> 😊\nСкорее подписывайся на наш <a href="https://t.me/megaekat">Телеграм-канал!</a>\n\nВ нем ты найдешь крутые идеи для покупок, информацию об акциях и скидках магазинов МЕГИ, розыгрыши и многое другое!`

            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttons,
                }
            })

            await Helper.setButtons(dbUser, buttons)
        } catch (e) {
            Logger.error('[BOT] sendMessageOnTaskTwo error', e)
        }
    }

    private async _sendMessageOnProblem(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
            await Helper.changeUserActivity(dbUser.id, EActivity.PROBLEM)

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: EMessages.CODE_INCORRECT }],
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
            Logger.error('[BOT] sendMessageOnSkipTask error', e)
        }
    }

    private async _sendMessageOnProblemConfirm(chatId: number, dbUser: IUserDb): Promise<void> {
        try {
             

            const buttons: InlineKeyboardButton[][] = [
                [{ text: 'Назад', callback_data: EMessages.MENU }],
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
            Logger.error('[BOT] sendMessageOnSkipTask error', e)
        }
    }
}