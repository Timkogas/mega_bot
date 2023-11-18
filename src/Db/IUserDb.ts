import { InlineKeyboardButton } from "node-telegram-bot-api";


export interface IUserDb {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    referral?: number | null;
    sent?: number;
    buttons?: InlineKeyboardButton[][] | null; // JSON string
    web_app?: number;
    score?: number;
    time?: string; // Assuming TIMESTAMP is stored as a string
    refs: number
    authorization: number
    activity: EActivity
  }

export enum EActivity {
    BUTTONS = 'buttons',
    CODE = 'code',
    PROBLEM = 'problem',
    AUTHORIZATION = "authorization"
};