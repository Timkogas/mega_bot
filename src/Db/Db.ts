import mysql from 'mysql2';
import dotenv from 'dotenv';
import Logger from '../Logger/Logger';
dotenv.config();

class Db {
    private _connection: mysql.Pool;

    constructor() {
        this.init();
    }


    private init(): void {
        this._connection = mysql.createPool({
            connectionLimit: 10,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        this._connection.getConnection(async (err, connection) => {
            if (err) {
                Logger.error('Error connecting to MySQL:', err)
            } else {
                connection.release();
                Logger.debug('Connected to MySQL database!')
            }
        });
    }




    public async query(query: string, [...params] = []): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (!query || typeof query !== 'string') {
                resolve('bad SQL query');
            }
            this._connection.query(query, params,
                (err, results): void => {
                    if (err) Logger.error('[DB query]', err)
                    err ? resolve(err) : resolve(results);
                }
            );
        });
    }
}

export default new Db();