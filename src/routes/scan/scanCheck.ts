import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import TelegramBotApp from '../../TelegramBot/TelegramBotApp';

export default class ScanCheck {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        this._app.post('/scan/check', async (req, res): Promise<void> => {
            this._route(req, res);
        });
    }

    private async _route(req: core.Request<any>, res: core.Response<any>): Promise<void> {
        try {
            const { id, qr } = req.body
            Logger.debug('qr', qr, id)
            let queryParams = new URLSearchParams(qr);
            Logger.debug('queryParams', queryParams)
            let tValue = queryParams.get('t');
            let sValue = queryParams.get('s');
            let fnValue = queryParams.get('fn');
            let iValue = queryParams.get('i');
            let fpValue = queryParams.get('fp');
            let nValue = queryParams.get('n');
            
            // Проверяем наличие всех параметров
            if (tValue && sValue && fnValue && iValue && fpValue && nValue) {
                console.log("t:", tValue);
                console.log("s:", sValue);
                console.log("fn:", fnValue);
                console.log("i:", iValue);
                console.log("fp:", fpValue);
                console.log("n:", nValue);
                
                TelegramBotApp.sendMessageOnGetDataFromWebApp(id, qr)
            } else {
                Logger.error('[SCAN] inccorect processing user', qr);
            }

            res.json({
                error: false,
                error_text: '',
                data: {}
            })
        } catch (error) {
            Logger.error('Error processing scan check', error);
            res.json({
                error: true,
                error_text: 'Internal Server Error',
                data: {}
            })
        }
    }
}