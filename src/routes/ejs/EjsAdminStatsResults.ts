import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class EjsAdminStatsResults {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats/results', async (req, res) => {
                const usersResult = await Db.query(`
                    SELECT
                        id,
                        username,
                        score
                    FROM
                        users
                    ORDER BY
                        score DESC;
                `);

                res.render('adminstatsresults', { users: usersResult });
            });
        } catch (error) {
            Logger.error('Error fetching top users:', error);
        }
    }
}