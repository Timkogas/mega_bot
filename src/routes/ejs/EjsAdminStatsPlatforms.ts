import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class EjsAdminStatsPlatforms {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats/platforms', async (req, res) => {
                const statsResult = await Db.query(`
                    SELECT
                        platform,
                        channel,
                        creative,
                        SUM(start) AS total_launches,
                        COUNT(DISTINCT id) AS unique_users,
                        SUM(web_app) AS total_web_app_launches,
                        COUNT(DISTINCT CASE WHEN web_app > 0 THEN id END) AS unique_web_app_users,
                        COUNT(DISTINCT CASE WHEN final = 1 THEN id END) AS game_sessions
                    FROM
                        users
                    GROUP BY
                        platform, channel, creative;
                `);

                // Render the adminstatsplatforms template with the retrieved data
                res.render('adminstatsplatforms', { userActivityStats: statsResult });
            });
        } catch (error) {
            Logger.error('Error fetching top users:', error);
        }
    }
}