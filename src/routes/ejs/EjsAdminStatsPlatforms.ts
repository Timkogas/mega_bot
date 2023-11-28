// Import необходимых библиотек
import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';


export default class EjsAdminStatsPlatforms {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private async _fetchUserStats(): Promise<any[]> {
        const platformsStats = await Db.query(`
        SELECT
            platform AS id,
            SUM(start) AS total_launches,
            COUNT(DISTINCT id) AS unique_users,
            SUM(web_app) AS total_web_app_launches,
            COUNT(DISTINCT CASE WHEN web_app > 0 THEN id END) AS unique_web_app_users,
            COUNT(DISTINCT CASE WHEN final = 1 THEN id END) AS game_sessions
        FROM
            users
        GROUP BY
            platform;
        `);

        Logger.debug('platformsStats', JSON.stringify(platformsStats))

        const groupedStats: any[] = [];

        return groupedStats;
    }
    private _init(): void {
        try {
            this._app.get('/adminstats/platforms', async (req, res) => {
                try {
                    const userActivityStats = await this._fetchUserStats();
                    Logger.debug('userActivityStats', JSON.stringify(userActivityStats))
                    // Render the adminstatsplatforms template with the retrieved data
                    res.render('adminstatsplatforms', { userActivityStats });
                } catch (error) {
                    Logger.error('Error fetching user stats:', error);
                    res.status(500).send('Internal Server Error');
                }
            });
        } catch (error) {
            Logger.error('Error initializing EjsAdminStatsPlatforms:', error);
        }
    }
}



// const d = [
//     {
//         "id": "tg", "total_launches": "5", "unique_users": 3, "total_web_app_launches": "9", "unique_web_app_users": 1, "game_sessions": 0,
//         "channels": [
//             {
//                 "id": "il", "total_launches": "2", "unique_users": 2, "total_web_app_launches": "0", "unique_web_app_users": 0, "game_sessions": 0,
//                 "creatives": [{ "id": "post", "total_launches": "2", "unique_users": 2, "total_web_app_launches": "0", "unique_web_app_users": 0, "game_sessions": 0 }]
//             },

//             {
//                 "id": "sblr", "total_launches": "3", "unique_users": 1, "total_web_app_launches": "8", "unique_web_app_users": 1, "game_sessions": 0,
//                 "creatives":
//  [{ "id": "post", "total_launches": "3", "unique_users": 1, "total_web_app_launches": "8", "unique_web_app_users": 1, "game_sessions": 0 }]
//             }
//         ]
//     }]
