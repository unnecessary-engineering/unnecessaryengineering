const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function initDatabase(){

    await pool.query(`

        CREATE TABLE IF NOT EXISTS users (

            id SERIAL PRIMARY KEY,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL

        )

    `);


    await pool.query(`

        CREATE TABLE IF NOT EXISTS purchases (

            id SERIAL PRIMARY KEY,

            user_id INTEGER NOT NULL,

            product_name TEXT NOT NULL,

            stripe_session_id TEXT,

            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id) REFERENCES users(id)

        )

    `);

}


initDatabase()
.then(()=>{
    console.log("PostgreSQL database ready");
})
.catch(err=>{
    console.log("DATABASE INIT ERROR:");
    console.log(err);
});


module.exports = pool;