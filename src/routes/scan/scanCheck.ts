import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import TelegramBotApp, { EMessages } from '../../TelegramBot/TelegramBotApp';
import Helper from '../../TelegramBot/Helper';
import { ECheckStatus, EScanErrors } from '../../Db/Check';
import dotenv from 'dotenv';
import axios from 'axios';
import { EAuthorization } from '../../Db/User';
import { ETaskStatus } from '../../Db/Task';

dotenv.config();

const urlOFD = 'https://ofd.ru/api/partner/v3/receipts/GetReceipt';

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
            if (id && qr) {
                const userDb = await Helper.getUserById(id)


                let queryParams = new URLSearchParams(qr);

                let tValue = queryParams.get('t');
                let sValue = queryParams.get('s');
                let fnValue = queryParams.get('fn');
                let iValue = queryParams.get('i');
                let nValue = queryParams.get('n');
                let fpValue = queryParams.get('fp');


                if (tValue && sValue && fnValue && iValue && fpValue && userDb && nValue) {
                    const lastTask = await Helper.getLastPendingTask(userDb.id)

                    if (lastTask.type === EMessages.TASK_1 || lastTask.type === EMessages.TASK_2 || lastTask.type === EMessages.TASK_3) {
                        res.json({
                            error: true,
                            error_text: 'server error',
                            error_type: EScanErrors.SERVER_ERROR,
                            data: {}
                        })
                        return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                    }

                    let points
                    try {

                    } catch {
                        
                    }
                
                    const newQr = queryParams.toString()

                    const isExist = await Helper.checkIfCheckExists(newQr)


                    if (isExist) {
                        res.json({
                            error: true,
                            error_text: 'valid error',
                            error_type: EScanErrors.VALID_ERROR,
                            data: {}
                        })
                        return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                    } else {
                        await Helper.createCheck(newQr, userDb.id)
                    }

                    const sValidValue = sValue.replace('.', '')
                    let originalDate
                    try {
                        const year = tValue.substring(0, 4);
                        const month = tValue.substring(4, 6);
                        const day = tValue.substring(6, 8);
                        const hours = tValue.substring(9, 11);
                        const minutes = tValue.substring(11, 13);
    
                        originalDate = `${year}-${month}-${day}T${hours}:${minutes}:00.000`;
                    } catch {
                        await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR})
                        res.json({
                            error: true,
                            error_text: 'valid error',
                            error_type: EScanErrors.VALID_ERROR,
                            data: {}
                        })
                        return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                    }

                    if (lastTask.type === EMessages.TASK_4) {
                        const sValidValueNumber = Number(sValidValue)

                        if (sValidValueNumber > 10000) {
                            axios.post(urlOFD, {
                                "TotalSum": sValidValue,
                                "DocDateTime": originalDate,
                                "FnNumber": fnValue,
                                "DocNumber": iValue,
                                "DocFiscalSign": fpValue,
                                "tokenSecret": process.env.OFD_TOKEN,
                                "ReceiptOperationType": nValue,
                            }).then(async (response) => {
                                Logger.debug('res')
                                Logger.debug(JSON.stringify(response.data))

                                if (response.data.Success) {
                                    if (
                                        ['665809349631'].includes(response?.data?.Data?.UserInn?.trim()) ||
                                        ['ИП Иванова М. М.'.toLowerCase(), 'ИП Иванова Марина Михайловна'.toLowerCase(), 'Индивидуальный предприниматель Иванова Марина Михайловна'.toLowerCase()]
                                            .includes(response?.data?.Data?.Document?.User?.trim()?.toLowerCase())
                                    ) {
                                        points = Math.round(Math.round(sValidValueNumber / 100) / 10)
                                        const authorization = await Helper.checkAuthorization(userDb.id)
                                        if (authorization === 'error') {
                                            await Helper.confirmLastTask(userDb.id, ETaskStatus.WAIT, points)
                                            res.json({
                                                error: true,
                                                error_text: '',
                                                error_type: EScanErrors.ERROR_AUTO,
                                            })
                                            return await TelegramBotApp.sendMessageOnCheckAuthorizationError(userDb.id, userDb)
                                        }
                                        if (authorization) points = Math.round(points * 1.5)
                                        await Helper.updateCheck(newQr, { status: ECheckStatus.CONFIRM, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data), score: points })
                                        res.json({
                                            error: false,
                                            error_text: '',
                                            error_type: EScanErrors.NO,
                                            data: {
                                                type: 4,
                                                points: points
                                            }
                                        })
                                        return await TelegramBotApp.sendMessageOnTaskCorrect(userDb.id, userDb, points)
                                    } else {
                                        await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_TASK_4, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                        res.json({
                                            error: true,
                                            error_text: 'valid error',
                                            error_type: EScanErrors.VALID_ERROR,
                                            data: {}
                                        })
                                        return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                    }
                                } else {
                                    await Helper.updateCheck(newQr, { status: ECheckStatus.OFD_ERROR, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                    res.json({
                                        error: true,
                                        error_text: 'valid error',
                                        error_type: EScanErrors.VALID_ERROR,
                                        data: {}
                                    })
                                    return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                }

                            }).catch(async (err) => {
                                Logger.debug('err', JSON.stringify(err.response.data))
                                await Helper.updateCheck(newQr, { status: ECheckStatus.OFD_ERROR, amount: sValidValueNumber, receipt_info: JSON.stringify(err.response.data) })
                                res.json({
                                    error: true,
                                    error_text: 'valid error',
                                    error_type: EScanErrors.VALID_ERROR,
                                    data: {}
                                })
                                try {
                                    return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                } catch (e) {
                                    Logger.error('ofd error', e)
                                }
                            });
                        } else {
                            await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_AMOUNT, amount: sValidValueNumber })
                            res.json({
                                error: true,
                                error_text: 'valid error',
                                error_type: EScanErrors.VALID_ERROR,
                                data: {}
                            })
                            return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                        }
                    }

                    if (lastTask.type === EMessages.TASK_5) {
                        const sValidValueNumber = Number(sValidValue)
                        axios.post(urlOFD, {
                            "TotalSum": sValidValue,
                            "DocDateTime": originalDate,
                            "FnNumber": fnValue,
                            "DocNumber": iValue,
                            "DocFiscalSign": fpValue,
                            "ReceiptOperationType": nValue,
                            "tokenSecret": process.env.OFD_TOKEN,
                        }).then(async (response) => {
                            Logger.debug('res')
                            Logger.debug(JSON.stringify(response.data))

                            if (response?.data?.Success) {
                                const innCheck = Helper.checkNumberOfChecksByInn(userDb.id, response?.data?.Data?.UserInn?.trim())
                                if (!innCheck) {
                                    await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_INN, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                    res.json({
                                        error: true,
                                        error_text: 'valid error',
                                        error_type: EScanErrors.VALID_ERROR,
                                        data: {}
                                    })
                                    return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                }

                                if (response?.data?.Data?.RegAddresss?.trim()?.toLowerCase().includes('екатеринбург')) {
                                    if (response?.data?.Data?.RegAddresss?.trim()?.toLowerCase().includes('металлургов')) {
                                        if (response?.data?.Data?.RegAddresss?.trim()?.toLowerCase().includes('87')) {
                                            if (Helper.hasNoPackage(response?.data?.Data?.Document?.Items)) {
                                                points = Math.round(Math.round(sValidValueNumber / 100) / 10)
                                                const authorization = await Helper.checkAuthorization(userDb.id)
                                                if (authorization === 'error') {
                                                    await Helper.confirmLastTask(userDb.id, ETaskStatus.WAIT, points)
                                                    res.json({
                                                        error: true,
                                                        error_text: '',
                                                        error_type: EScanErrors.ERROR_AUTO,
                                                    })
                                                    return await TelegramBotApp.sendMessageOnCheckAuthorizationError(userDb.id, userDb)
                                                }
                                                if (authorization) points = Math.round(points * 1.5)

                                                await Helper.updateCheck(newQr, { status: ECheckStatus.CONFIRM, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data), score: points, inn: response?.data?.Data?.UserInn?.trim() })
                                                res.json({
                                                    error: false,
                                                    error_text: '',
                                                    error_type: EScanErrors.NO,
                                                    data: {
                                                        type: 5,
                                                        points: points

                                                    }
                                                })
                                                return await TelegramBotApp.sendMessageOnTaskCorrect(userDb.id, userDb, points)
                                            } else {
                                                await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_PACKAGE, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                                res.json({
                                                    error: true,
                                                    error_text: 'valid error',
                                                    error_type: EScanErrors.VALID_ERROR,
                                                    data: {}
                                                })
                                                return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                            }
                                        } else {
                                            await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_ADDRESS, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                            res.json({
                                                error: true,
                                                error_text: 'valid error',
                                                error_type: EScanErrors.VALID_ERROR,
                                                data: {}
                                            })
                                            return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                        }
                                    } else {
                                        await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_ADDRESS, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                        res.json({
                                            error: true,
                                            error_text: 'valid error',
                                            error_type: EScanErrors.VALID_ERROR,
                                            data: {}
                                        })
                                        return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                    }
                                } else {
                                    await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR_ADDRESS, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                    res.json({
                                        error: true,
                                        error_text: 'valid error',
                                        error_type: EScanErrors.VALID_ERROR,
                                        data: {}
                                    })
                                    return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                                }
                            } else {
                                await Helper.updateCheck(newQr, { status: ECheckStatus.OFD_ERROR, amount: sValidValueNumber, receipt_info: JSON.stringify(response.data) })
                                res.json({
                                    error: true,
                                    error_text: 'valid error',
                                    error_type: EScanErrors.VALID_ERROR,
                                    data: {}
                                })
                                return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                            }

                        }).catch(async (err) => {

                            Logger.debug('err');
                            Logger.debug(JSON.stringify(err.response.data))
                            await Helper.updateCheck(newQr, { status: ECheckStatus.OFD_ERROR, amount: sValidValueNumber, receipt_info: JSON.stringify(err.response.data) })
                            res.json({
                                error: true,
                                error_text: 'valid error',
                                error_type: EScanErrors.VALID_ERROR,
                                data: {}
                            })
                            try {
                                return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                            } catch (e) {
                                Logger.error('ofd error', e)
                            }
                        });

                    }

                    await Helper.updateCheck(newQr, { status: ECheckStatus.VALID_ERROR })
                    res.json({
                        error: true,
                        error_text: 'server error',
                        error_type: EScanErrors.SERVER_ERROR,
                        data: {}
                    })
                    return await TelegramBotApp.sendMessageOnScanIncorrect(userDb.id, userDb)
                } else {
                    Logger.error('[SCAN] inccorect processing user', qr);
                    res.json({
                        error: true,
                        error_text: 'valid error',
                        error_type: EScanErrors.SERVER_ERROR,
                        data: {}
                    })
                    return await TelegramBotApp.sendMessageOnScanIncorrect(id, userDb)
                }
            } else {
                res.json({
                    error: true,
                    error_text: 'server error',
                    error_type: EScanErrors.SERVER_ERROR,
                    data: {}
                })
            }
        } catch (error) {
            Logger.error('Error processing scan check', error);
            res.json({
                error: true,
                error_text: 'Internal Server Error',
                error_type: EScanErrors.SERVER_ERROR,
                data: {}
            })
        }
    }
}