import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import TelegramBotApp, { EMessages } from '../../TelegramBot/TelegramBotApp';
import Helper from '../../TelegramBot/Helper';

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
                const sValidValue = sValue.replace('.', '')
                Logger.debug('sValidValue', sValidValue)
                const lastTask = await Helper.getLastPendingTask(id)

                if (lastTask.type === EMessages.TASK_4) {

                }

                if (lastTask.type === EMessages.TASK_5) {

                }
                
                TelegramBotApp.sendMessageOnGetDataFromWebApp(id, qr + ' ' + lastTask.type)
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