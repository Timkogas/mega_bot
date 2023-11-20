import * as core from 'express-serve-static-core';

export default class EjsCheckRoute {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        this._app.get('/check', (req, res) => {
            res.render('check', { data: 'Some data to pass to the template' });
        });
    }
}