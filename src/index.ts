import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import * as core from 'express-serve-static-core';
import Db from './Db/Db';
import Logger from './Logger/Logger';
import TelegramBot from './TelegramBot/TelegramBotApp';

dotenv.config();

class App {
  private _server: http.Server;
  private _app: core.Express;
  private _telegramBot: TelegramBot


  constructor() {
    this._app = express();
    this._server = http.createServer(this._app);
    this._init();
  }

  private async _init(): Promise<void> {
    try {
      await this._initDb()
      this._initBot()
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
  }

  private async _initBot(): Promise<void> {
    this._telegramBot = new TelegramBot()
  }

  private _startServer(): void {
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
        web_app TINYINT DEFAULT 0,
        refs INT DEFAULT 0,
        activity VARCHAR(50) DEFAULT 'buttons',
        score INT,
        time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `
    await Db.query(table)
  }

  private async _createTableChecks(): Promise<void> {
    const table =
      `
    CREATE TABLE IF NOT EXISTS checks (
        qr VARCHAR (250) PRIMARY KEY,
        data JSON
    );
    `
    await Db.query(table)
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
        status TINYINT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
    `
    await Db.query(table)
  }
}

new App();