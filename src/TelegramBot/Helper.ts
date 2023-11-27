import TelegramBot, { InlineKeyboardButton, User } from "node-telegram-bot-api";
import Logger from "../Logger/Logger";
import Db from "../Db/Db";
import { EActivity, EAuthorization, IUserDb } from "../Db/User";
import { EMessages, taskIdToEMessagesMap } from "./TelegramBotApp";
import { ETaskStatus } from "../Db/Task";
import axios from "axios";

class Helper {

    /**
    * Проверка, создание и возвращение пользователя в базе
    * @param user - Пользователь полученный от телеграмма
    */
    static async checkUser(user: User): Promise<IUserDb | null> {
        try {
            const dbUser = await Db.query('SELECT * FROM users WHERE id = ?', [user.id]);

            if (!Array.isArray(dbUser) || dbUser.length === 0) {
                const username = user.username || '';
                const firstName = user.first_name || '';
                const lastName = user.last_name || '';

                await Db.query('INSERT IGNORE INTO users SET id = ?, username = ?, first_name = ?, last_name = ?', [user.id, username, firstName, lastName]);

                const newUser = await Db.query('SELECT * FROM users WHERE id = ?', [user.id]);
                return newUser[0];
            }

            return dbUser[0];
        } catch (error) {
            Logger.error('[Helper] Error checking user:', error);
            return null;
        }
    }

    /**
     * Получение пользователя по ID из базы данных
     * @param userId - ID пользователя
     */
    static async getUserById(userId: number): Promise<IUserDb | null> {
        try {
            const dbUser = await Db.query('SELECT * FROM users WHERE id = ?', [userId]);

            if (Array.isArray(dbUser) && dbUser.length > 0) {
                return dbUser[0];
            }

            return null;
        } catch (error) {
            Logger.error('[Helper] Error getting user by ID:', error);
            return null;
        }
    }

    /**
    * Функция для установки кнопок для пользователя
    * @param dbUser - Пользователь из базы данных
    * @param newButtons - Новые кнопки в формате JSON
    * @returns Обновленный объект пользователя
    */
    static async setButtons(dbUser: IUserDb, newButtons: InlineKeyboardButton[][]): Promise<void> {
        try {
            if (dbUser) {
                await Db.query('UPDATE users SET buttons = ? WHERE id = ?', [JSON.stringify(newButtons), dbUser.id]);

                const updatedUser = await Db.query('SELECT * FROM users WHERE id = ?', [dbUser.id]);
                return updatedUser[0];
            } else {
                Logger.error('[Helper] No user for setting buttons');
            }
        }
        catch (error) {
            Logger.error('[Helper] Error set buttons:', error);
            return null;
        }
    }

    /**
    * Функция для проверки реферала и установки связи между пользователями
    * @param  currentUser - Текущий пользователь
    * @param  referralId - Идентификатор реферала
    */
    static async checkReferral(currentUser: IUserDb, referralId: number, bot: TelegramBot): Promise<void> {
        try {
            const dbUser = await Db.query('SELECT * FROM users WHERE id = ?', [referralId]);

            if (Array.isArray(dbUser) && dbUser.length === 1 && referralId !== null && referralId !== currentUser.id) {
                const referralCount = await Db.query('SELECT refs FROM users WHERE id = ?', [referralId]);
                const currentRefs = referralCount[0]?.refs
                if (referralCount[0].refs < 10) {
                    await Db.query('UPDATE users SET referral = ? WHERE id = ?', [referralId, currentUser.id]);
                    await Db.query('UPDATE users SET refs = ? WHERE id = ?', [currentRefs + 1, referralId]);
                } else {
                    const refUser = await Db.query('SELECT * FROM users WHERE id = ?', [referralId]);
                    const text = 'Ты пригласил всех друзей! Лимит на использование реферальной ссылки закончился.'
                    bot.sendMessage(referralId, text, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: refUser[0].buttons,
                        }
                    })
                }
            }
        } catch (error) {
            Logger.error('[Helper] Error checking referral:', error);
        }
    }

    /**
   * Обновление свойства sent у пользователя по ID в базе данных
   * @param userId - ID пользователя
   */
    static async updateSentStatus(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET sent = 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error updating sent status:', error);
        }
    }

    /**
    * Обновление свойства agree у пользователя по ID в базе данных
    * @param userId - ID пользователя
    */
    static async updateAgreeStatus(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET agree = 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error updating agree status:', error);
        }
    }

    /**
    * Обновление свойства disagree у пользователя по ID в базе данных
    * @param userId - ID пользователя
    */
    static async updateDisagreeStatus(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET disagree = 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error updating disagree status:', error);
        }
    }

    /**
    * Обновление свойства authorization у пользователя по ID в базе данных
    * @param userId - ID пользователя
    */
    static async updateAuthorizationStatus(userId: number, status: EAuthorization): Promise<void> {
        try {
            await Db.query('UPDATE users SET authorization = ? WHERE id = ?', [status, userId]);
        } catch (error) {
            Logger.error('[Helper] Error updateAuthorizationStatus:', error);
        }
    }

    /**
    * Обновление свойства authorization_id у пользователя по ID в базе данных
    * @param userId - ID пользователя
    * @param authorizationId - новое значение для authorization_id
    */
    static async updateAuthorizationId(userId: number, authorizationId: string): Promise<void> {
        try {
            // Update the 'authorization_id' field in the 'users' table
            await Db.query('UPDATE users SET authorization_id = ? WHERE id = ?', [authorizationId, userId]);
        } catch (error) {
            Logger.error('[Helper] Error updateAuthorizationId:', error);
        }
    }

    /**
    * Функция для проверки и обновления статуса авторизации пользователя
    * Если статус авторизации равен 0, обновляет его на 2
    * @param userId - ID пользователя
    */
    static async authorizationCheck(userId: number): Promise<void> {
        try {
            const user = await this.getUserById(userId);

            if (user && user.authorization === EAuthorization.NO) {
                // Если статус авторизации равен 0, обновляем его на 2
                await this.updateAuthorizationStatus(userId, EAuthorization.SKIP);
            }
        } catch (error) {
            Logger.error('[Helper] Error in authorizationCheck:', error);
        }
    }

    /**
    * Обновление свойства subscribe у пользователя по ID в базе данных
    * @param userId - ID пользователя
    */
    static async updateSubscribeStatus(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET subscribe = 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error updateSubscribeStatus:', error);
        }
    }

    /**
   * Обновление свойства final у пользователя по ID в базе данных
   * @param userId - ID пользователя
   */
    static async updateFinalStatus(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET final = 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error updateFinalStatus:', error);
        }
    }


    /**
    * Метод для изменения activity у пользователя
    * @param userId - ID пользователя из базы данных
    * @param newActivity - Новое значение activity из EActivity
    */
    static async changeUserActivity(userId: number, newActivity: EActivity): Promise<void> {
        try {
            // Обновление activity у пользователя
            await Db.query('UPDATE users SET activity = ? WHERE id = ?', [newActivity, userId]);
        } catch (error) {
            Logger.error('[Helper] Error changing user activity:', error);
        }
    }



    /**
    * Функция для получения кнопок пользователя
    * @param userId - ID пользователя из базы данных
    * @returns Массив кнопок пользователя
    */
    static async getButtons(userId: number): Promise<InlineKeyboardButton[][] | null> {
        try {
            const user = await Db.query('SELECT * FROM users WHERE id = ?', [userId]);

            if (user && user.length > 0) {
                const buttonsJson = user[0].buttons;

                if (buttonsJson) {
                    const buttons = buttonsJson;
                    return buttons;
                }
            }

            return null;
        } catch (error) {
            Logger.error('[Helper] Error getting buttons:', error);
            return null;
        }
    }



    /**
     * Функция для проверки наличия у пользователя задачи со статусом 0
     * @param userId - ID пользователя из базы данных
     * @returns true, если у пользователя есть задача со статусом 0, иначе false
     */
    static async getHasPendingTask(userId: number): Promise<boolean> {
        try {
            // Проверяем наличие пользователя в таблице users_tasks
            const userExists = await Db.query('SELECT 1 FROM users_tasks WHERE user_id = ? LIMIT 1', [userId]);

            // Возвращаем результат проверки наличия записей с пользователем в таблице
            return userExists && userExists.length > 0;
        } catch (error) {
            Logger.error('[Helper] Error checking for user in users_tasks table:', error);
            return false;
        }
    }

    /**
    * Функция для получения последней задачи пользователя со статусом 0 или создания новой задачи
    * @param userId - ID пользователя из базы данных
    * @returns Объект с информацией о задаче
    */
    static async getLastPendingTask(userId: number): Promise<{ id: number, type: EMessages }> {
        try {
            // Получение последней задачи со статусом 0
            const lastTask = await Db.query('SELECT * FROM users_tasks WHERE user_id = ? AND status = 0 ORDER BY id DESC LIMIT 1', [userId]);

            if (lastTask && lastTask.length > 0) {
                return {
                    id: lastTask[0].task_id,
                    type: taskIdToEMessagesMap[lastTask[0].task_id] || null,
                };
            }

            // Получение последней задачи пользователя
            const lastUserTask = await Db.query('SELECT MAX(task_id) as lastTaskId FROM users_tasks WHERE user_id = ?', [userId]);

            // Определение следующего task_id
            const nextTaskId = lastUserTask && lastUserTask.length > 0 ? lastUserTask[0].lastTaskId + 1 : 1;
            if (nextTaskId > 5) return {
                id: 6,
                type: EMessages.FINAL,
            };
            // Если нет задач со статусом 0, создаем новую задачу со статусом 0
            const newTaskId = await Db.query('INSERT INTO users_tasks (user_id, status, task_id) VALUES (?, 0, ?)', [userId, nextTaskId]);

            // Получаем информацию о только что созданной задаче
            const newTask = await Db.query('SELECT * FROM users_tasks WHERE id = ?', [newTaskId.insertId]);

            if (newTask && newTask.length > 0) {
                return {
                    id: newTask.task_id,
                    type: taskIdToEMessagesMap[newTask[0].task_id] || null,
                };
            }

            return null;
        } catch (error) {
            Logger.error('[Helper] Error getting or creating task:', error);
            return null;
        }
    }

    /**
    * Функция для завершения последней задачи пользователя и возврата её айди и типа
    * @param userId - ID пользователя из базы данных
    * @returns Объект с айди и типом завершенной задачи
    */
    static async confirmLastTask(userId: number, status: ETaskStatus, score: number): Promise<void> {
        try {
            // Получение последней задачи со статусом 0
            const lastTask = await Db.query('SELECT * FROM users_tasks WHERE user_id = ? AND status = 0 ORDER BY id DESC LIMIT 1', [userId]);

            if (lastTask && lastTask.length > 0) {
                const taskId = lastTask[0].id;
                // Обновление статуса последней задачи на 1
                if (taskId === 5) {
                    await Db.query('UPDATE users_tasks SET status = ? WHERE id = ?', [status, taskId]);
                } else {
                    await Db.query('UPDATE users_tasks SET status = ?, score = ? WHERE id = ?', [status, score, taskId]);
                }
            }

        } catch (error) {
            Logger.error('[Helper] Error confirm last task:', error);

        }
    }


    /**
    * Функция для проверки строки и преобразования в булевое значение
    * @param user - пользователь из базы данных
    * @param value - Строковое значение
    * @returns true, если строка равна '1', иначе false
    */
    static async checkCode(user: IUserDb, value: string): Promise<boolean> {
        try {
            const currentDate = new Date();
            const task = await this.getLastPendingTask(user.id)
            if (value === '1') return true

            const code = await Db.query(`SELECT * FROM codes WHERE name = ? AND type = ? AND start_date <= ? AND end_date >= ?`,
                [value, task.id, currentDate, currentDate]);


            return code.length > 0;
        } catch (error) {
            Logger.error('[Helper] Error checkCode:', error);
        }
    }

    /**
     * Метод для проверки авторизации пользователя на основе запроса к внешнему API
     * @param userId - ID пользователя в Telegram
     * @returns true, если запрос успешен и есть данные пользователя, иначе false
     */
    static async checkAuthorization(userId: number): Promise<boolean> {
        try {
            const user = await Helper.getUserById(userId);

            if (user?.authorization === 1) {
                if (user?.authorization_id) {
                    try {
                        Logger.debug('check', user.id, user.authorization_id)
                        const checkAuthorization = await axios.post('https://omniapi-dev.mega.ru/telegram/registerUser',
                            {
                                telegramId: `${user.id}`,
                                keycloakId: user.authorization_id
                            },
                            {
                                headers: {
                                    'x-api-key': process.env.API_KEY
                                }
                            }
                        );

                        if (checkAuthorization?.data?.username || checkAuthorization?.data?.firstName || checkAuthorization?.data?.email) {
                            return true
                        } else {
                            return false
                        }
                    } catch (error) {
                        Logger.error('[Helper] Error checkAuthorization:', error);
                        return false;
                    }
                } else {
                    return false
                }
            } else {
                return false
            }

        } catch (error) {
            Logger.error('[Helper] Error checkAuthorization:', error);
            return false;
        }
    }



    /**
    * Функция для добавления очков пользователю
    * @param userId - ID пользователя из базы данных
    * @param pointsToAdd - Количество очков для добавления
    * @param last - Флаг, указывающий, что это последняя задача
    */
    static async addPointsToUser(user: IUserDb, pointsToAdd: number, last?: boolean): Promise<void> {
        try {
            if (user) {
                const currentUser = await this.getUserById(user.id)
                const currentPoints = currentUser.score || 0;
                // Обновление количества очков пользователя
                await Db.query('UPDATE users SET score = ?, time = NOW() WHERE id = ?', [Number(currentPoints) + Number(pointsToAdd), currentUser.id]);
            }

            if (last) {
                // Добавление score для последней задачи в таблице users_tasks
                const lastTask = await Db.query('SELECT * FROM users_tasks WHERE user_id = ? AND status = 0 ORDER BY id DESC LIMIT 1', [user.id]);
                if (lastTask && lastTask.length > 0) {
                    const taskId = lastTask[0].id;
                    const currentTaskScore = lastTask[0].score || 0;
                    // Добавление очков к уже имеющимся
                    await Db.query('UPDATE users_tasks SET score = ? WHERE id = ?', [Number(currentTaskScore) + Number(pointsToAdd), taskId]);
                }
            }
        } catch (error) {
            Logger.error('[Helper] Error adding points to user:', error);
        }
    }

    /**
     * Метод для сохранения проблемы в базе данных
     * @param userId - ID пользователя из базы данных
     * @param text - Текст проблемы
     * @param groupId - ID медиагруппы
     */
    static async saveProblem(userId: number, text: string, groupId?: string): Promise<void> {
        try {
            // Вставка новой проблемы в таблицу problems
            await Db.query('INSERT INTO problems (user_id, text, group_id) VALUES (?, ?, ?)', [userId, text, groupId || null]);
        } catch (error) {
            Logger.error('[Helper] Error saving problem:', error);
        }
    }

    /**
    * Метод для сохранения данных файла в таблице problems_files
    * @param url - URL файла
    * @param groupId - Групповой идентификатор (опционально)
    * @param name - название файла
    */
    static async saveProblemFile(url: string, groupId: string, name: string): Promise<void> {
        try {
            await Db.query('INSERT INTO problems_files (url, group_id, name) VALUES (?, ?, ?)', [url, groupId, name]);
        } catch (error) {
            Logger.error('[Helper] Error saving problem file:', error);
        }
    }

    /**
    * Метод для обновления данных пользователя в таблице users
    * @param userId - Идентификатор пользователя
    * @param platform - Новое значение для поля platform
    * @param channel - Новое значение для поля channel
    * @param creative - Новое значение для поля creative
    */
    static async updateUserDetails(userId: number, platform: string, channel: string, creative: string): Promise<void> {
        try {
            await Db.query('UPDATE users SET platform = ?, channel = ?, creative = ? WHERE id = ?', [platform, channel, creative, userId]);
        } catch (error) {
            Logger.error('[Helper] Error updating user details:', error);
        }
    }

    /**
    * Метод для увеличения значения total на 1 в таблице main
    */
    static async incrementTotal(): Promise<void> {
        try {
            await Db.query('UPDATE main SET total = total + 1 WHERE id = 1');
        } catch (error) {
            Logger.error('[Helper] Error incrementing total:', error);
        }
    }

    /**
    * Метод для увеличения значения total на 1 в таблице main
    */
    static async incrementWebApp(): Promise<void> {
        try {
            await Db.query('UPDATE main SET webapp = webapp + 1 WHERE id = 1');
        } catch (error) {
            Logger.error('[Helper] Error incrementing total:', error);
        }
    }

    /**
    * Обновление свойства webapp у пользователя по ID в базе данных
    * @param userId - ID пользователя
    */
    static async incrementWebappStatus(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET web_app = web_app + 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error incrementWebappStatus:', error);
        }
    }

    /**
    * Increment the start field for a user by 1.
    * @param userId - ID of the user
    */
    static async incrementStartField(userId: number): Promise<void> {
        try {
            await Db.query('UPDATE users SET start = start + 1 WHERE id = ?', [userId]);
        } catch (error) {
            Logger.error('[Helper] Error incrementStartField:', error);
        }
    }

    /**
    * Создание чека в таблице checks
    *  @param qrCode - QR-код чека
    * @param userId - айди пользователя
    */
    static async createCheck(qrCode: string, userId: number): Promise<void> {
        try {
            // Создаем новый чек и получаем его айди
            const result = await Db.query('INSERT INTO checks (qr) VALUES (?)', [qrCode]);
            const checkId = result.insertId;

            // Добавляем запись в таблицу users_checks
            await Db.query('INSERT INTO users_checks (user_id, check_id) VALUES (?, ?)', [userId, checkId]);
        } catch (error) {
            Logger.error('[Helper] Error creating check:', error);
        }
    }


    /**
     * Проверка наличия чека в таблице checks по QR-коду
     * @param qrCode - QR-код чека
     * @returns true, если чек существует; false в противном случае
     */
    static async checkIfCheckExists(qrCode: string): Promise<boolean> {
        try {
            const result = await Db.query('SELECT * FROM checks WHERE qr = ?', [qrCode]);
            console.log(result)
            return result.length > 0;
        } catch (error) {
            Logger.error('[Helper] Error checking if check exists:', error);
            return false;
        }
    }

    /**
    * Обновление данных чека в таблице users_checks по QR-коду
    * @param qrCode - QR-код чека
    * @param updateData - Объект с данными для обновления
    * @returns true, если обновление прошло успешно; false в противном случае
    */
    static async updateCheck(qrCode: string, updateData: {
        status?: number,
        amount?: number,
        score?: number,
        receipt_info?: any,
        url?: string,
        img?: string
    }): Promise<boolean> {
        try {
            // Проверяем, существует ли чек с заданным QR-кодом
            const checkExists = await this.checkIfCheckExists(qrCode);

            if (!checkExists) {
                // Чек не существует
                Logger.error('[Helper] Check not found for update');
                return false;
            }

            // Генерируем SQL-запрос на обновление данных
            const updateQuery = 'UPDATE users_checks SET ' +
                (updateData.status !== undefined ? 'status = ?, ' : '') +
                (updateData.amount !== undefined ? 'amount = ?, ' : '') +
                (updateData.score !== undefined ? 'score = ?, ' : '') +
                (updateData.receipt_info !== undefined ? 'receipt_info = ?, ' : '') +
                (updateData.url !== undefined ? 'url = ?, ' : '') +
                (updateData.img !== undefined ? 'img = ?, ' : '') +
                'time = CURRENT_TIMESTAMP ' +
                'WHERE check_id IN (SELECT id FROM checks WHERE qr = ?)';


            // Формируем массив значений для запроса
            const values = [];
            if (updateData.status !== undefined) values.push(updateData.status);
            if (updateData.amount !== undefined) values.push(updateData.amount);
            if (updateData.score !== undefined) values.push(updateData.score);
            if (updateData.receipt_info !== undefined) values.push(JSON.stringify(updateData.receipt_info));
            if (updateData.url !== undefined) values.push(updateData.url);
            if (updateData.img !== undefined) values.push(updateData.img);
            values.push(qrCode);

            // Выполняем SQL-запрос
            await Db.query(updateQuery, values);

            return true;
        } catch (error) {
            Logger.error('[Helper] Error updating check:', error);
            return false;
        }
    }

    /**
     * Проверка на пакет в товарах чека, если он есть возвращает false
     * @param items - товары
     * @returns true, если обновление прошло успешно; false в противном случае
     */
    static hasNoPackage(items: any) {
        for (const item of items) {
            if (item.Name.toLowerCase().includes('пакет')) {
                return false;
            }
        }
        return true;
    }

    /**
    * Обновление времени skip_task для пользователя в таблице users
    * @param userId - Идентификатор пользователя
    * @param skipTime - Новое значение времени skip_task
    * @returns true, если обновление прошло успешно; false в противном случае
    */
    static async updateSkipTaskTime(userId: number, skipTime: Date): Promise<boolean> {
        try {
            // Генерируем SQL-запрос на обновление времени skip_task
            const updateQuery = 'UPDATE users SET skip_task = ? WHERE id = ?';

            // Формируем массив значений для запроса
            const values = [skipTime, userId];

            // Выполняем SQL-запрос
            await Db.query(updateQuery, values);

            return true;
        } catch (error) {
            Logger.error('[Helper] Error updating skip_task time:', error);
            return false;
        }
    }
}

export default Helper;