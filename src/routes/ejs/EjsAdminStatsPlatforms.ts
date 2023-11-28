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
        const statsResult = await Db.query(`
        SELECT
        platform AS id,
        SUM(start) AS total_launches,
        COUNT(DISTINCT id) AS unique_users,
        SUM(web_app) AS total_web_app_launches,
        COUNT(DISTINCT CASE WHEN web_app > 0 THEN id END) AS unique_web_app_users,
        COUNT(DISTINCT CASE WHEN final = 1 THEN id END) AS game_sessions,
        JSON_AGG(JSON_BUILD_OBJECT(
            'id', channel,
            'total_launches', SUM(start),
            'unique_users', COUNT(DISTINCT id),
            'total_web_app_launches', SUM(web_app),
            'unique_web_app_users', COUNT(DISTINCT CASE WHEN web_app > 0 THEN id END),
            'game_sessions', COUNT(DISTINCT CASE WHEN final = 1 THEN id END),
            'creatives', JSON_AGG(JSON_BUILD_OBJECT(
                'id', creative,
                'total_launches', SUM(start),
                'unique_users', COUNT(DISTINCT id),
                'total_web_app_launches', SUM(web_app),
                'unique_web_app_users', COUNT(DISTINCT CASE WHEN web_app > 0 THEN id END),
                'game_sessions', COUNT(DISTINCT CASE WHEN final = 1 THEN id END)
            ))
        )) AS channels
        FROM
            users
        GROUP BY
            platform, channel, creative;
        `);

        Logger.debug('statsResult', JSON.stringify(statsResult))
        const groupedStats: any[] = [];
        // statsResult.forEach((row: any) => {
        //     if (row.platform !== null) {
        //         let platformObj = groupedStats.find((platform) => platform.id === row.platform);

        //         if (!platformObj) {
        //             platformObj = {
        //                 id: row.platform,
        //                 total_launches: row.total_launches,
        //                 unique_users: row.unique_users,
        //                 total_web_app_launches: row.total_web_app_launches,
        //                 unique_web_app_users: row.unique_web_app_users,
        //                 game_sessions: row.game_sessions,
        //                 channels: [],
        //             };

        //             groupedStats.push(platformObj);
        //         }

        //         let channelObj = platformObj.channels.find((channel) => channel.id === row.channel);

        //         if (!channelObj) {
        //             channelObj = {
        //                 id: row.channel,
        //                 total_launches: row.total_launches,
        //                 unique_users: row.unique_users,
        //                 total_web_app_launches: row.total_web_app_launches,
        //                 unique_web_app_users: row.unique_web_app_users,
        //                 game_sessions: row.game_sessions,
        //                 creatives: [],
        //             };

        //             platformObj.channels.push(channelObj);
        //         }

        //         channelObj.creatives.push({
        //             id: row.creative,
        //             total_launches: row.total_launches,
        //             unique_users: row.unique_users,
        //             total_web_app_launches: row.total_web_app_launches,
        //             unique_web_app_users: row.unique_web_app_users,
        //             game_sessions: row.game_sessions,
        //         });
        //     }
        // });

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


const d = [
    {
        "id": "tg", "total_launches": "5", "unique_users": 3, "total_web_app_launches": "9", "unique_web_app_users": 1, "game_sessions": 0,
        "channels": [
            {
                "id": "il", "total_launches": "2", "unique_users": 2, "total_web_app_launches": "0", "unique_web_app_users": 0, "game_sessions": 0,
                "creatives": [{ "id": "post", "total_launches": "2", "unique_users": 2, "total_web_app_launches": "0", "unique_web_app_users": 0, "game_sessions": 0 }]
            },

            {
                "id": "sblr", "total_launches": "3", "unique_users": 1, "total_web_app_launches": "8", "unique_web_app_users": 1, "game_sessions": 0, "creatives":
                    [{ "id": "post", "total_launches": "3", "unique_users": 1, "total_web_app_launches": "8", "unique_web_app_users": 1, "game_sessions": 0 }]
            }
        ]
    }]
