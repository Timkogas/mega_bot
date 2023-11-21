import * as core from 'express-serve-static-core';

export default class EjsLeaderboardRoute {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        this._app.get('/leaderboard', (req, res) => {
            res.render('leaderboard', { data: 'Some data to pass to the template' });
        });
    }
}