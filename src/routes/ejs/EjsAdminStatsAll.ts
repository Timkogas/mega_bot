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

                const totalReferralUsersResult = await Db.query('SELECT COUNT(DISTINCT id) AS total_referral_users FROM users WHERE referral IS NOT NULL');
                const totalDisagreeUsersResult = await Db.query('SELECT COUNT(DISTINCT id) AS total_disagree_users FROM users WHERE disagree = 1');
                const totalAgreeUsersResult = await Db.query('SELECT COUNT(DISTINCT id) AS total_agree_users FROM users WHERE agree = 1');
                const totalTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_task_users FROM users_tasks');
                const totalSuccessfulFirstTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_successful_first_task_users FROM users_tasks WHERE task_id = 1 AND status = 1');
                const totalSkippedFirstTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_skipped_first_task_users FROM users_tasks WHERE task_id = 1 AND status = 2');
                const totalSubscriptionPassedUsersResult = await Db.query('SELECT COUNT(DISTINCT id) AS total_subscription_passed_users FROM users WHERE subscribe = 1');
                const totalSuccessfulSecondTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_successful_second_task_users FROM users_tasks WHERE task_id = 2 AND status = 1');
                const totalSkippedSecondTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_skipped_second_task_users FROM users_tasks WHERE task_id = 2 AND status = 2');
                const totalMegaFriendsAuthorizedUsersResult = await Db.query('SELECT COUNT(DISTINCT id) AS total_mega_friends_authorized_users FROM users WHERE authorization = 1');
                const totalMegaFriendsSkippedUsersResult = await Db.query('SELECT COUNT(DISTINCT id) AS total_mega_friends_skipped_users FROM users WHERE authorization = 2');
                const totalSuccessfulThirdTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_successful_third_task_users FROM users_tasks WHERE task_id = 3 AND status = 1');
                const totalSkippedThirdTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_skipped_third_task_users FROM users_tasks WHERE task_id = 3 AND status = 2');
                const totalSuccessfulFourthTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_successful_fourth_task_users FROM users_tasks WHERE task_id = 4 AND status = 1');
                const totalSkippedFourthTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_skipped_fourth_task_users FROM users_tasks WHERE task_id = 4 AND status = 2');
                const totalSuccessfulFifthTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_successful_fifth_task_users FROM users_tasks WHERE task_id = 5 AND status = 1');
                const totalSkippedFifthTaskUsersResult = await Db.query('SELECT COUNT(DISTINCT user_id) AS total_skipped_fifth_task_users FROM users_tasks WHERE task_id = 5 AND status = 2');

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

                    totalReferralUsers: totalReferralUsersResult[0]?.total_referral_users,
                    totalDisagreeUsers: totalDisagreeUsersResult[0]?.total_disagree_users,
                    totalAgreeUsers: totalAgreeUsersResult[0]?.total_agree_users,
                    totalTaskUsers: totalTaskUsersResult[0]?.total_task_users,
                    totalSuccessfulFirstTaskUsers: totalSuccessfulFirstTaskUsersResult[0]?.total_successful_first_task_users,
                    totalSkippedFirstTaskUsers: totalSkippedFirstTaskUsersResult[0]?.total_skipped_first_task_users,
                    totalSubscriptionPassedUsers: totalSubscriptionPassedUsersResult[0]?.total_subscription_passed_users,
                    totalSuccessfulSecondTaskUsers: totalSuccessfulSecondTaskUsersResult[0]?.total_successful_second_task_users,
                    totalSkippedSecondTaskUsers: totalSkippedSecondTaskUsersResult[0]?.total_skipped_second_task_users,
                    totalMegaFriendsAuthorizedUsers: totalMegaFriendsAuthorizedUsersResult[0]?.total_mega_friends_authorized_users,
                    totalMegaFriendsSkippedUsers: totalMegaFriendsSkippedUsersResult[0]?.total_mega_friends_skipped_users,
                    totalSuccessfulThirdTaskUsers: totalSuccessfulThirdTaskUsersResult[0]?.total_successful_third_task_users,
                    totalSkippedThirdTaskUsers: totalSkippedThirdTaskUsersResult[0]?.total_skipped_third_task_users,
                    totalSuccessfulFourthTaskUsers: totalSuccessfulFourthTaskUsersResult[0]?.total_successful_fourth_task_users,
                    totalSkippedFourthTaskUsers: totalSkippedFourthTaskUsersResult[0]?.total_skipped_fourth_task_users,
                    totalSuccessfulFifthTaskUsers: totalSuccessfulFifthTaskUsersResult[0]?.total_successful_fifth_task_users,
                    totalSkippedFifthTaskUsers: totalSkippedFifthTaskUsersResult[0]?.total_skipped_fifth_task_users,
                });
            });
        } catch (error) {
            Logger.error('Error fetching top users:', error);
        }
    }
}