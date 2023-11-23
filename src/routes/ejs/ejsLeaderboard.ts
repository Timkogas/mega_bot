import * as core from 'express-serve-static-core';
import Db from '../../Db/Db';
import Logger from '../../Logger/Logger';

import { faker } from '@faker-js/faker';

// Function to generate a random number between min and max (inclusive)
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to generate a random user
const generateRandomUser = (idN: number) => {
    const id = idN;
    const firstName = getRandomInt(10, 100) > 70 ? faker.person.firstName() : '';
    let lastName
    if (firstName !== '') {
        const lastName = getRandomInt(10, 100) > 70 ? faker.person.lastName() : '';
    } else {
        lastName = ''
    }
    
    const score = getRandomInt(10, 600);

    return {
        id,
        first_name: firstName,
        last_name: lastName,
        score,
    };
};

export default class EjsLeaderboardRoute {
    constructor(app: core.Express) {
        this._app = app;
        this._init();
    }

    private _app: core.Express;

    private _init(): void {
        this._app.get('/leaderboard', async (req, res) => {
            try {
                // Execute the SQL query to fetch the top 50 users
                const query = `
                SELECT
                    id,
                    first_name,
                    last_name,
                    score,
                    time
                FROM
                    users
                ORDER BY
                    score DESC,
                    time ASC
                LIMIT 50;
            `;


                // Insert the random users into the database
                const insertQuery = `
                    INSERT IGNORE INTO users (id, first_name, last_name, score)
                    VALUES (?, ?, ?, ?)
                `;

                // Assuming Db.query supports parameterized queries
                for (let i = 0; i < 80; i++) {
                    const user = generateRandomUser(i)
                    await Db.query(insertQuery, [user.id, user.first_name, user.last_name, user.score]);
                }

                const topUsers = await Db.query(query);

                Logger.debug('user', topUsers)

                // Render the leaderboard page with the top users
                res.render('leaderboard', { topUsers: topUsers });
            } catch (error) {
                Logger.error('Error fetching top users:', error);
            }
        });
    }
}