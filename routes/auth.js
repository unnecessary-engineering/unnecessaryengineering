const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");

const db = require("../database/database");


// REGISTER USER

router.post("/register", async (req, res) => {


    const {
        name,
        email,
        password
    } = req.body;



    try {


        const hashedPassword = await bcrypt.hash(password, 10);



        try {

    await db.query(
        `
        INSERT INTO users
        (name, email, password)

        VALUES ($1, $2, $3)
        `,
        [
            name,
            email,
            hashedPassword
        ]
    );


    res.json({

        message:
        "Account created successfully!"

    });


} catch(err) {


    res.json({

        message:
        "Email already registered"

    });


}



    } catch(error) {


        res.status(500).json({

            message:
            "Server error"

        });


    }



});

// LOGIN USER

router.post("/login", async (req, res) => {


    const {
        email,
        password
    } = req.body;



    try {

    const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [
            email
        ]
    );


    const user = result.rows[0];


    if(!user) {

        return res.json({

            message:"User not found"

        });

    }


    const match = await bcrypt.compare(

        password,

        user.password

    );


    if(!match) {


        return res.json({

            message:"Wrong password"

        });


    }



    req.session.user = {

        id:user.id,

        name:user.name,

        email:user.email

    };



    res.json({

        message:"Login successful"

    });



} catch(err) {


    console.log("LOGIN DATABASE ERROR:");
    console.log(err);


    res.json({

        message:"Database error"

    });


}


});

module.exports = router;