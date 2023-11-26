import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class EjsAdminStatsAll {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats/all', async (req, res) => {
                const totalBotLaunchesResult = await Db.query('SELECT SUM(start) AS total FROM users');
                const uniqueUsersCountResult = await Db.query('SELECT COUNT(DISTINCT id) AS unique_users FROM users');
                const totalWebAppLaunchesResult = await Db.query('SELECT webapp FROM main WHERE id = 1');
                const uniqueWebAppUsersCountResult = await Db.query('SELECT COUNT(DISTINCT id) AS unique_webapp_users FROM users WHERE web_app > 1');
                // Количество сканирований чеков
                const totalScansResult = await Db.query('SELECT COUNT(*) AS total_scans FROM users_checks');

                // Количество принятых чеков (где status = 1)
                const acceptedChecksResult = await Db.query('SELECT COUNT(*) AS accepted_checks FROM users_checks WHERE status = 1');

                // Количество не принятых чеков (где статус равен 2 или 3)
                const rejectedChecksResult = await Db.query('SELECT COUNT(*) AS rejected_checks FROM users_checks WHERE status IN (2, 3)');
                const scanResults = await Db.query(`
                SELECT
                    users.id AS chatID,
                    users.username,
                    users_checks.status AS checkStatus,
                    users_checks.amount,
                    users_checks.score AS checkScore,
                    users_checks.time AS scanTime,
                    checks.qr AS qrCode
                FROM
                    users_checks
                JOIN
                    users ON users.id = users_checks.user_id
                JOIN
                    checks ON checks.id = users_checks.check_id;
            `);

                console.log(scanResults)
                res.render('adminstatsall', {
                    totalBotLaunches: totalBotLaunchesResult[0]?.total,
                    uniqueUsersCount: uniqueUsersCountResult[0]?.unique_users,
                    totalWebAppLaunches: totalWebAppLaunchesResult[0]?.webapp,
                    uniqueWebAppUsersCount: uniqueWebAppUsersCountResult[0]?.unique_webapp_users,
                    totalScans: totalScansResult[0]?.total_scans,
                    acceptedChecks: acceptedChecksResult[0]?.accepted_checks,
                    rejectedChecks: rejectedChecksResult[0]?.rejected_checks,
                    scanResults: scanResults,
                });
            });
        } catch (error) {
            Logger.error('Error fetching top users:', error);
        }
    }
}