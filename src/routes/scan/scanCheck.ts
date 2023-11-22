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
      TelegramBotApp.sendMessageOnGetDataFromWebApp(id, qr)
      res.json({
        error: false,
        error_text: '',
        data: {}
      })
    } catch (error) {
      Logger.error('Error processing user check', error);
      res.json({
        error: true,
        error_text: 'Internal Server Error',
        data: {}
      })
    }
  }
}