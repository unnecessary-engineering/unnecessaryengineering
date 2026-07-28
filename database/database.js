const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/database.sqlite");


db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL

        )
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS purchases (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        product_name TEXT NOT NULL,

        stripe_session_id TEXT,

        purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id) REFERENCES users(id)

    )
`);


});


module.exports = db;