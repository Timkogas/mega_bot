import * as core from 'express-serve-static-core';
import Logger from '../../Logger/Logger';
import Db from '../../Db/Db';
import multer from 'multer'
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/messages'));
    },
    filename: (req, file, cb) => {
        const randomName = uuidv4();
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const uniqueFilename = `${randomName}${fileExtension}`;
        cb(null, uniqueFilename);
    },
});

const upload = multer({ storage });

interface MulterRequest extends Request {
    files: any;
}

export default class EjsAdminStatsSend {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        try {
            this._app.get('/adminstats/send', async (req, res) => {
                const currentDate = new Date();
                currentDate.setHours(currentDate.getHours() + 3);

                const formattedCurrentDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');

                res.render('adminstatssend', { time: formattedCurrentDate });
            });

            this._app.post('/adminstats/sendMessage', upload.array('files'), async (req: any, res) => {
                try {
                    const { text, time, type } = req.body;
                    if (text && time && type) {
                        const messageInsertQuery = `
                            INSERT INTO messages (text, time, type, sended)
                            VALUES (?, ?, ?, ?);
                        `;
                        const messageValues = [text, time, type, 0]; 
                        const messageResult = await Db.query(messageInsertQuery, messageValues);
    
    
                        const messageId = messageResult.insertId;
    
                        if (req.files && req.files.length > 0) {
                            const filesInsertQuery = `
                            INSERT INTO messages_files (message_id, file_name)
                            VALUES (?, ?);
                        `;
                            const filesValues = req.files.map((file: any) => [messageId, file.filename]);
    
                            await Promise.all(filesValues.map((values: any) => Db.query(filesInsertQuery, values)));
                        }
                    }
                } catch (error) {
                    Logger.error('Error fetching user stats:', error);
                    res.status(500).send('Internal Server Error');
                }
            });
        } catch (error) {
            Logger.error('Error EjsAdminStatsSend:', error);
        }
    }
}