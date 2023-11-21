import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class EjsAdminStats {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats', async (req, res) => {
                const totalBotLaunchesResult = await Db.query('SELECT total FROM main WHERE id = 1');
                const uniqueUsersCountResult = await Db.query('SELECT COUNT(DISTINCT id) AS unique_users FROM users');
                const totalWebAppLaunchesResult = await Db.query('SELECT webapp FROM main WHERE id = 1');
                const uniqueWebAppUsersCountResult = await Db.query('SELECT COUNT(DISTINCT id) AS unique_webapp_users FROM users WHERE web_app = 1');

                res.render('adminstats', {
                    totalBotLaunches: totalBotLaunchesResult[0]?.total,
                    uniqueUsersCount: uniqueUsersCountResult[0]?.unique_users,
                    totalWebAppLaunches: totalWebAppLaunchesResult[0]?.webapp,
                    uniqueWebAppUsersCount: uniqueWebAppUsersCountResult[0]?.unique_webapp_users,
                });
            });
        } catch (error) {
            Logger.error('Error fetching top users:', error);
        }
    }
}