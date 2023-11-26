import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class EjsAdminStatsDetail {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats/detail', async (req, res) => {
                const usersResult = await Db.query(`
                SELECT
                    u.id AS telegram_id,
                    u.username AS telegram_username,
                    ut1.score AS score_task1,
                    CASE WHEN u.subscribe = 1 THEN 'да' ELSE 'нет' END AS subscription_status,
                    ut2.score AS score_task2,
                    CASE WHEN u.authorization = 1 THEN 'да' ELSE 'нет' END AS mega_friends_status,
                    u.id AS user_id,
                    ut3.score AS score_task3,
                    ut4.score AS score_task4,
                    ut5.score AS score_task5,
                    u.score AS total_score,
                    u.authorization_id  -- Include authorization_id
                FROM
                    users AS u
                LEFT JOIN
                    users_tasks AS ut1 ON u.id = ut1.user_id AND ut1.task_id = 1
                LEFT JOIN
                    users_tasks AS ut2 ON u.id = ut2.user_id AND ut2.task_id = 2
                LEFT JOIN
                    users_tasks AS ut3 ON u.id = ut3.user_id AND ut3.task_id = 3
                LEFT JOIN
                    users_tasks AS ut4 ON u.id = ut4.user_id AND ut4.task_id = 4
                LEFT JOIN
                    users_tasks AS ut5 ON u.id = ut5.user_id AND ut5.task_id = 5
                ORDER BY
                    u.score DESC;
            `);
                // Render the adminstatsplatforms template with the retrieved data
                res.render('adminstatsdetail', { users: usersResult });
            });
        } catch (error) {
            Logger.error('Error fetching top users:', error);
        }
    }
}