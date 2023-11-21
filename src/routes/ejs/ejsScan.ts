import * as core from 'express-serve-static-core';

export default class EjsScanRoute {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        this._app.get('/scan', (req, res) => {
            res.render('scan', { data: 'Some data to pass to the template' });
        });
    }
}