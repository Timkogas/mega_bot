import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Helper from '../../TelegramBot/Helper';
import { EMessages } from '../../TelegramBot/TelegramBotApp';

export default class UserWebAppCount {
  constructor(app: core.Express) {
    this._app = app;
    this._init();
  }

  private _app: core.Express;

  private _init(): void {
    this._app.post('/user/webAppCount', async (req, res): Promise<void> => {
      this._route(req, res);
    });
  }

  private async _route(req: core.Request<any>, res: core.Response<any>): Promise<void> {
    try {
      const { id } = req.body
      await Helper.incrementWebApp()
      if (id) {
        await Helper.incrementWebappStatus(id)
        const lastTask = await Helper.getLastPendingTask(id)

        if (lastTask.type === EMessages.TASK_4) {
          res.json({
            error: false,
            error_text: '',
            data: {
              type: 4
            }
          })
          return
        }

        if (lastTask.type === EMessages.TASK_5) {
          res.json({
            error: false,
            error_text: '',
            data: {
              type: 5
            }
          })
          return
        }

        res.json({
          error: false,
          error_text: '',
          data: {
            type: 5
          }
        })
      }

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