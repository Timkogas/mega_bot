import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';

export default class UserPlaceInLeaderBoard {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {


        this._app.get('/user/place', async (req, res) => {
            try {
                const { id } = req.body
                Logger.debug('id user', id)
                if (id) {
                    const positionQuery = `
                    SELECT
                        id,
                        score,
                        RANK() OVER (ORDER BY score DESC, time ASC) as position
                    FROM
                        users
                    WHERE
                        id = ?;
                `;

                    const userPosition = await Db.query(positionQuery, [id]);
                    Logger.debug('userPosition', userPosition)
                    if (userPosition.length > 0) {
                        return res.json({
                            error: false,
                            error_text: '',
                            data: { 
                                position: userPosition[0].position,
                                score: userPosition[0].score
                             }
                        });
                    } else {
                        return res.json({
                            error: true,
                            error_text: 'Internal Server Error',
                            data: {}
                        })
                    }
                }
            } catch (error) {
                Logger.error('Error fetching user position:', error);
                return res.json({
                    error: true,
                    error_text: 'Internal Server Error',
                    data: {}
                })
            }
        });
    }
}