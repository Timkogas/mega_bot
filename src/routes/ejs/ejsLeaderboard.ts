import * as core from 'express-serve-static-core';
import Db from '../../Db/Db';
import Logger from '../../Logger/Logger';

export default class EjsLeaderboardRoute {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        this._app.get('/leaderboard', async (req, res) => {
            try {
                // Execute the SQL query to fetch the top 50 users
                const query = `
                SELECT
                    id,
                    first_name,
                    last_name,
                    score,
                    time
                FROM
                    users
                ORDER BY
                    score DESC,
                    time ASC
                LIMIT 50;
            `;

                const topUsers = await Db.query(query);
                Logger.debug('user', topUsers)
                // Render the leaderboard page with the top users
                res.render('leaderboard', { topUsers });
            } catch (error) {
                Logger.error('Error fetching top users:', error);
            }
        });
    }
}