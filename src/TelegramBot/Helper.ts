import { InlineKeyboardButton, User } from "node-telegram-bot-api";
import Logger from "../Logger/Logger";
import Db from "../Db/Db";
import { IUserDb } from "../Db/IUserDb";

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
        if (dbUser) {

            await Db.query('UPDATE users SET buttons = ? WHERE id = ?', [JSON.stringify(newButtons), dbUser.id]);

            const updatedUser = await Db.query('SELECT * FROM users WHERE id = ?', [dbUser.id]);
            return updatedUser[0];
        } else {
            Logger.error('[Helper] No user for setting buttons');
        }
    }


    /**
    * Функция для получения кнопок пользователя
    * @param userId - ID пользователя из базы данных
    * @returns Массив кнопок пользователя в формате JSON
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
}

export default Helper;