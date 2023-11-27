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
        statsResult.rows.forEach((row: any) => {
            const platformIndex = groupedStats.findIndex((group) => group.platform === row.platform);
            if (platformIndex === -1) {
                groupedStats.push({
                    platform: row.platform,
                    channels: [{
                        channel: row.channel,
                        creatives: [{
                            creative: row.creative,
                            total_launches: row.total_launches,
                            unique_users: row.unique_users,
                            total_web_app_launches: row.total_web_app_launches,
                            unique_web_app_users: row.unique_web_app_users,
                            game_sessions: row.game_sessions,
                        }],
                    }],
                });
            } else {
                const channelIndex = groupedStats[platformIndex].channels.findIndex((channel) => channel.channel === row.channel);
                if (channelIndex === -1) {
                    groupedStats[platformIndex].channels.push({
                        channel: row.channel,
                        creatives: [{
                            creative: row.creative,
                            total_launches: row.total_launches,
                            unique_users: row.unique_users,
                            total_web_app_launches: row.total_web_app_launches,
                            unique_web_app_users: row.unique_web_app_users,
                            game_sessions: row.game_sessions,
                        }],
                    });
                } else {
                    groupedStats[platformIndex].channels[channelIndex].creatives.push({
                        creative: row.creative,
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