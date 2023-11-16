export interface IUserDb {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    referral?: bigint | null;
    sent?: number;
    buttons?: string | null; // JSON string
    web_app?: number;
    score?: number;
    time?: string; // Assuming TIMESTAMP is stored as a string
  }