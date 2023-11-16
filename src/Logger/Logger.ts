import fs from 'fs';
import path from 'path';

class Logger {
    private logFileName: string = 'debug.log';
    private errorsLogFileName: string = 'errors.log';
    private logFilePath: string = path.join('Logs', this.logFileName);
    private errorsLogFilePath: string = path.join('Logs', this.errorsLogFileName);

    constructor() {
        // Ensure the 'Logs' directory exists
        fs.mkdirSync('Logs', { recursive: true });

        // Ensure the log file and errors file exist
        this.ensureLogFile(this.logFilePath);
        this.ensureLogFile(this.errorsLogFilePath);
    }

    private ensureLogFile(filePath: string): void {
        try {
            fs.accessSync(filePath);
        } catch (err) {
            // Log file doesn't exist, create it
            fs.writeFileSync(filePath, '');
        }
    }

    private getCurrentTimestamp(): string {
        const now = new Date();
        return now.toISOString();
    }

    public debug(message: string, ...args: any[]): void {
        const logMessage = `${this.getCurrentTimestamp()} - ${message} ${args.join(' ')}`;

        // Log to the console
        console.debug(message, ...args);

        // Append to the debug log file
        fs.appendFileSync(this.logFilePath, logMessage + '\n');

        // Keep only the last 500 lines in the debug log file
        const lines = fs.readFileSync(this.logFilePath, 'utf-8').split('\n');
        const last500Lines = lines.slice(-500).join('\n');
        fs.writeFileSync(this.logFilePath, last500Lines);
    }

    public error(message: string, error?: Error): void {
        let logMessage

        // Log to the console
        if (error) {
            console.error(message, error);
            logMessage = `${this.getCurrentTimestamp()} - ${message}, ${error}`;
        } else {
            console.error(message);
            logMessage = `${this.getCurrentTimestamp()} - ${message}`;
        }

        // Append to the errors log file
        fs.appendFileSync(this.errorsLogFilePath, logMessage + '\n');

        // Keep only the last 500 lines in the errors log file
        const lines = fs.readFileSync(this.errorsLogFilePath, 'utf-8').split('\n');
        const last500Lines = lines.slice(-500).join('\n');
        fs.writeFileSync(this.errorsLogFilePath, last500Lines);
    }
}

export default new Logger();