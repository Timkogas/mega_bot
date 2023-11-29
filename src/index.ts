import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import * as core from 'express-serve-static-core';
import Db from './Db/Db';
import Logger from './Logger/Logger';
import path from 'path';
import Routes from './routes';
import cors from 'cors';
import TelegramBotApp from './TelegramBot/TelegramBotApp';


dotenv.config();

class App {
  private _server: http.Server;
  private _app: core.Express;
  private _telegramBot: any


  constructor() {
    this._app = express();
    this._server = http.createServer(this._app);
    this._init();
  }

  private async _init(): Promise<void> {
    try {
      await this._initDb()
      await this._initBot()
      this._startServer();
    } catch (error) {
      Logger.error('Error during initialization:', error);
    }
  }

  private async _initDb(): Promise<void> {
    await this._createTableUsers()
    await this._createTableChecks()
    await this._createTableTasks()
    await this._createTableUsersTasks()
    await this._createTableProblems()
    await this._createTableProblemsFiles()
    await this._createTableMain()
    await this._createTableUsersChecks()
    await this._createTableCodes()
    await this._insertAllCodes()
  }

  private async _initBot(): Promise<void> {
    this._telegramBot = TelegramBotApp
  }

  private _startServer(): void {

    this._app.use(express.json());
    this._app.use(express.urlencoded({ extended: true }));
    this._app.use(cors());
    this._app.use('/uploads', express.static(__dirname + '/uploads'));
    this._app.use(express.static(__dirname + '/public'));
    this._app.set('views', path.join(__dirname, 'views'));
    this._app.set('view engine', 'ejs');

    new Routes(this._app);
    this._server.listen(process.env.PORT, (): void => {
      Logger.debug('Server started on port ' + process.env.PORT);
    });
  }

  private async _createTableUsers(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(250),
        first_name VARCHAR(250),
        last_name VARCHAR(250),
        referral BIGINT DEFAULT NULL,
        sent TINYINT DEFAULT 0,
        buttons JSON DEFAULT NULL,
        web_app INT DEFAULT 0,
        refs INT DEFAULT 0,
        subscribe INT DEFAULT 0,
        authorization INT DEFAULT 0,
        authorization_id VARCHAR(100) DEFAULT null,
        final TINYINT DEFAULT 0,
        activity VARCHAR(50) DEFAULT 'buttons',
        platform VARCHAR(50) DEFAULT NULL,
        channel VARCHAR(150) DEFAULT NULL,
        creative VARCHAR(150) DEFAULT NULL,  
        skip_task DATETIME DEFAULT NULL,
        start INT DEFAULT 0,
        score INT,
        agree TINYINT DEFAULT 0,
        disagree TINYINT DEFAULT 0,
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `
    await Db.query(table)
  }

  private async _createTableChecks(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS checks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        qr VARCHAR (250),
        INDEX idx_qr (qr)
    );
    `
    await Db.query(table)
  }

  private async _createTableUsersChecks(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS users_checks (
       id INT PRIMARY KEY AUTO_INCREMENT,
       user_id BIGINT, 
       check_id INT,
       status INT DEFAULT 0,
       amount INT DEFAULT 0,
       score INT DEFAULT 0,
       time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       receipt_info JSON DEFAULT NULL,
       inn VARCHAR(50) DEFAULT NULL,
       FOREIGN KEY (check_id) REFERENCES checks(id),
       FOREIGN KEY (user_id) REFERENCES users(id)
    );
    `
    await Db.query(table);
  }

  private async _createTableCodes(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS codes (
        name VARCHAR(50) PRIMARY KEY,
        type INT,
        start_date DATETIME,
        end_date DATETIME,
        num INT
    );
    `
    await Db.query(table);
  }

  private async _insertAllCodes(): Promise<void> {
    try {
      await this._insertCodesType1();
      await this._insertCodesType2();
      await this._insertCodesType3();
    } catch (error) {
      console.error('Error inserting codes:', error);
    }
  }

  private async _insertCodesType1(): Promise<void> {
    const insertCodesQueries = [
      // Codes of Type 1
      "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (1, 'ECOEXPSY69O', '2023-11-30 00:00:00', '2023-12-07 07:59:00', 1);",
      "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (2, 'ECOTZ4DYOP3', '2023-12-07 08:00:00', '2023-12-14 07:59:00', 1);",
      "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (3, 'ECOG427NBJR', '2023-12-14 08:00:00', '2023-12-21 07:59:00', 1);",
      "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (4, 'ECOLZN5QHWN', '2023-12-21 08:00:00', '2023-12-30 18:00:00', 1);",
    ];

    for (const query of insertCodesQueries) {
      await Db.query(query);
    }
  }

  private async _insertCodesType2(): Promise<void> {
    const insertCodesQueries = [
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (1, 'MCZ1G70COE', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (2, 'MCL6SRGVFL', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (3, 'MCDQPL2WWN', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (4, 'MCTJMYAD2B', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (5, 'MC8P6US5XR', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (6, 'MCN3M7QGV6', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (7, 'MCHMF9N4MY', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (8, 'MCODKG0RTH', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (9, 'MCIS79N8JE', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (10, 'MC1BGMHNCN', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (11, 'MCBUH3TRLD', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (12, 'MC8BV7LWMI', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (13, 'MCWAL7K240', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (14, 'MCQ0ADB5WI', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (15, 'MCX79XADRH', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (16, 'MC1RZ74LE1', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (17, 'MCX9BA57LB', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (18, 'MCJVWULJA7', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (19, 'MCLQZ3KK1H', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (20, 'MCGI9VSSCK', '2023-11-30 00:00:00', '2023-12-30 18:00:00', 2);",
    ];

    for (const query of insertCodesQueries) {
        await Db.query(query);
    }
}

private async _insertCodesType3(): Promise<void> {
    const insertCodesQueries = [
        // Codes of Type 3
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (1, 'FCVT7Z8Q0B', '2023-11-30 00:00:00', '2023-12-07 07:59:00', 3);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (2, 'FCY1PBXSYW', '2023-12-07 08:00:00', '2023-12-14 07:59:00', 3);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (3, 'FC0B2HW11A', '2023-12-14 08:00:00', '2023-12-21 07:59:00', 3);",
        "INSERT IGNORE INTO codes (num, name, start_date, end_date, type) VALUES (4, 'FCBMASZZJ3', '2023-12-21 08:00:00', '2023-12-30 18:00:00', 3);",
    ];

    for (const query of insertCodesQueries) {
        await Db.query(query);
    }
}

  private async _createTableTasks(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY AUTO_INCREMENT
    );
    `

    const insertTasksQueries = [
      "INSERT IGNORE INTO tasks (id) VALUES (1);",
      "INSERT IGNORE INTO tasks (id) VALUES (2);",
      "INSERT IGNORE INTO tasks (id) VALUES (3);",
      "INSERT IGNORE INTO tasks (id) VALUES (4);",
      "INSERT IGNORE INTO tasks (id) VALUES (5);",
    ];

    await Db.query(table)

    for (const query of insertTasksQueries) {
      await Db.query(query);
    }

  }


  private async _createTableUsersTasks(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS users_tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT,
        task_id INT,
        status INT DEFAULT 0,
        score INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
    `
    await Db.query(table)
  }

  private async _createTableProblems(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS problems (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT,
        text TEXT,
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        group_id VARCHAR(250) DEFAULT NULL,
        INDEX idx_group_id (group_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    `;
    await Db.query(table);
  }

  private async _createTableProblemsFiles(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS problems_files (
        id INT PRIMARY KEY AUTO_INCREMENT,
        url VARCHAR(250),
        group_id VARCHAR(100) DEFAULT NULL,
        name VARCHAR(100),
        INDEX idx_group_id (group_id)
    );
    `;
    await Db.query(table);
  }

  private async _createTableMain(): Promise<void> {
    const table =
      `
      CREATE TABLE IF NOT EXISTS main (
        id INT PRIMARY KEY AUTO_INCREMENT,
        total INT DEFAULT 0,
        webapp INT DEFAULT 0
      );
      `;
    const string = "INSERT IGNORE INTO main (id, total, webapp) VALUES (1, 0, 0)"
    await Db.query(table);
    await Db.query(string);
  }
}

new App();