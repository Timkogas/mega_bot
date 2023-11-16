import { InlineKeyboardButton, User } from "node-telegram-bot-api";
import Logger from "../Logger/Logger";
import Db from "../Db/Db";
import { EActivity, IUserDb } from "../Db/IUserDb";
import { EMessages, taskIdToEMessagesMap } from "./TelegramBotApp";

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
                    id: lastTask[0].id,
                    type: taskIdToEMessagesMap[lastTask[0].id] || null,
                };
            }

            // Если нет задач со статусом 0, создаем новую задачу со статусом 0
            const newTaskId = await Db.query('INSERT INTO users_tasks (user_id, status) VALUES (?, 0)', [userId]);

            // Получаем информацию о только что созданной задаче
            const newTask = await Db.query('SELECT * FROM users_tasks WHERE id = ?', [newTaskId.insertId]);

            if (newTask && newTask.length > 0) {
                return {
                    id: newTask[0].id,
                    type: taskIdToEMessagesMap[newTask[0].id] || null,
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
    static async confirmLastTask(userId: number): Promise<void> {
        try {
            // Получение последней задачи со статусом 0
            const lastTask = await Db.query('SELECT * FROM users_tasks WHERE user_id = ? AND status = 0 ORDER BY id DESC LIMIT 1', [userId]);

            if (lastTask && lastTask.length > 0) {
                const taskId = lastTask[0].id;

                // Обновление статуса последней задачи на 1
                await Db.query('UPDATE users_tasks SET status = 1 WHERE id = ?', [taskId]);
            }
        } catch (error) {
            Logger.error('[Helper] Error confirm last task:', error);
        }
    }


    /**
    * Функция для проверки строки и преобразования в булевое значение
    * @param value - Строковое значение
    * @returns true, если строка равна '1', иначе false
    */
    static checkCode(value: string): boolean {
        return value === '1';
    }


    /**
    * Функция для добавления очков пользователю
    * @param userId - ID пользователя из базы данных
    * @param pointsToAdd - Количество очков для добавления
    */
    static async addPointsToUser(userId: number, pointsToAdd: number): Promise<void> {
        try {
            // Получение текущего количества очков пользователя
            const user = await Db.query('SELECT * FROM users WHERE id = ?', [userId]);

            if (user && user.length > 0) {
                const currentPoints = user[0].score || 0;

                // Обновление количества очков пользователя
                await Db.query('UPDATE users SET score = ?, time = NOW() WHERE id = ?', [currentPoints + pointsToAdd, userId]);
            }
        } catch (error) {
            Logger.error('[Helper] Error adding points to user:', error);
        }
    }

}

export default Helper;