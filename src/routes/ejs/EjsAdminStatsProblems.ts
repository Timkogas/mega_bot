import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class EjsAdminStatsProblems {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats/problems', async (req, res) => {
                const problemsResult = await Db.query(`
                    SELECT
                        u.id AS telegram_id,
                        u.username AS telegram_username,
                        p.time AS time,
                        p.text AS text,
                        GROUP_CONCAT(pf.url) AS attachments
                    FROM
                        users AS u
                    JOIN
                        problems AS p ON u.id = p.user_id
                    LEFT JOIN
                        problems_files AS pf ON p.group_id = pf.group_id
                    GROUP BY
                        p.id
                    ORDER BY
                        p.time DESC;
                `);

                // Convert attachments string to an array
                for (const problem of problemsResult) {
                    problem.attachments = problem.attachments ? problem.attachments.split(',') : [];
                }
                console.log(problemsResult)
                // Render the adminstatsproblem template with the retrieved data
                res.render('adminstatsproblems', { problems: problemsResult });
            });
        } catch (error) {
            Logger.error('Error fetching problems:', error);
        }
    }
}