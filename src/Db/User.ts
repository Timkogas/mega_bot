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
    authorization_id: string
    activity: EActivity
    final: number
    skip_task: Date
  }

export enum EActivity {
    BUTTONS = 'buttons',
    CODE = 'code',
    PROBLEM = 'problem',
    AUTHORIZATION = "authorization"
};

export enum EAuthorization {
  NO = 0,
  COMPLETE = 1,
  SKIP = 2,
  LEFT = 3,
};

export enum EFinal {
  NO = 0,
  COMPLETE = 1,
};

export enum ESubscribe {
  NO = 0,
  COMPLETE = 1,
  SKIP = 2,
};


