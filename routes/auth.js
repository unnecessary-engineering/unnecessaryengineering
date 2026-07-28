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



        db.run(
            `
            INSERT INTO users
            (name, email, password)

            VALUES (?, ?, ?)
            `,
            [
                name,
                email,
                hashedPassword
            ],

            function(err) {


                if(err) {


                    return res.json({

                        message:
                        "Email already registered"

                    });


                }



                res.json({

                    message:
                    "Account created successfully!"

                });



            }

        );



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



    db.get(

        "SELECT * FROM users WHERE email = ?",

        [email],

        async (err, user) => {


            if(err) {

                return res.json({

                    message:"Database error"

                });

            }



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



        }

    );


});

module.exports = router;