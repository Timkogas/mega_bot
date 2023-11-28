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


        const groupedStats: any[] = [];
        statsResult.forEach((row: any) => {
            const platformIndex = groupedStats.findIndex((group) => group.id === row.platform);
            if (platformIndex === -1) {
                groupedStats.push({
                    id: row.platform,
                    total_launches: row.total_launches,
                    unique_users: row.unique_users,
                    total_web_app_launches: row.total_web_app_launches,
                    unique_web_app_users: row.unique_web_app_users,
                    game_sessions: row.game_sessions,
                    channels: [{
                        id: row.channel,
                        total_launches: row.total_launches,
                        unique_users: row.unique_users,
                        total_web_app_launches: row.total_web_app_launches,
                        unique_web_app_users: row.unique_web_app_users,
                        game_sessions: row.game_sessions,
                        creatives: [{
                            id: row.creative,
                            total_launches: row.total_launches,
                            unique_users: row.unique_users,
                            total_web_app_launches: row.total_web_app_launches,
                            unique_web_app_users: row.unique_web_app_users,
                            game_sessions: row.game_sessions,
                        }],
                    }],
                });
            } else {
                const channelIndex = groupedStats[platformIndex].channels.findIndex((channel) => channel.id === row.channel);
                if (channelIndex === -1) {
                    groupedStats[platformIndex].channels.push({
                        id: row.channel,
                        total_launches: row.total_launches,
                        unique_users: row.unique_users,
                        total_web_app_launches: row.total_web_app_launches,
                        unique_web_app_users: row.unique_web_app_users,
                        game_sessions: row.game_sessions,
                        creatives: [{
                            id: row.creative,
                            total_launches: row.total_launches,
                            unique_users: row.unique_users,
                            total_web_app_launches: row.total_web_app_launches,
                            unique_web_app_users: row.unique_web_app_users,
                            game_sessions: row.game_sessions,
                        }],
                    });
                } else {
                    groupedStats[platformIndex].channels[channelIndex].creatives.push({
                        id: row.creative,
                        total_launches: row.total_launches,
                        unique_users: row.unique_users,
                        total_web_app_launches: row.total_web_app_launches,
                        unique_web_app_users: row.unique_web_app_users,
                        game_sessions: row.game_sessions,
                    });
                }
            }
        });

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
const sd = [
    {
        "platform": null,
        "channels":
            [
                {
                    "channel": null, "creatives": [
                        { "creative": null, "total_launches": "8", "unique_users": 6, "total_web_app_launches": "0", "unique_web_app_users": 0, "game_sessions": 0 }
                    ]
                }
            ]
    },

    {
        "platform": "tg",
        "channels": [
            {
                "channel": "sblr",
                "creatives":
                    [
                        { "creative": "post", "total_launches": "1", "unique_users": 1, "total_web_app_launches": "8", "unique_web_app_users": 1, "game_sessions": 0 }
                    ]
            }]
    }]


const d = [

    {
        "id": "tg",
        "total_launches": "1",
        "unique_users": 1,
        "total_web_app_launches": "8",
        "unique_web_app_users": 1,
        "game_sessions": 0,
        "channels": [
            {
                "id": "sblr",
                "total_launches": "1",
                "unique_users": 1,
                "total_web_app_launches": "8",
                "unique_web_app_users": 1,
                "game_sessions": 0,
                "creatives":
                    [
                        { "id": "post", "total_launches": "1", "unique_users": 1, "total_web_app_launches": "8", "unique_web_app_users": 1, "game_sessions": 0 }
                    ]
            }]
    }]