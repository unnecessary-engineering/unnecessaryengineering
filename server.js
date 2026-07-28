require('dotenv').config();

const express = require('express');
const app = express();

const session = require("express-session");

const db = require('./database/database');

const authRoutes = require("./routes/auth");

const isLoggedIn = require("./middleware/authMiddleware");

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// =========================
// SESSION
// =========================

app.use(session({

    secret: "unnecessary-engineering-secret",

    resave: false,

    saveUninitialized: false

}));




// =========================
// WEBHOOK STRIPE
// =========================

app.post(
    "/webhook",
    express.raw({type:"application/json"}),
    (req,res)=>{


        const event = JSON.parse(req.body);



        console.log(
            "Stripe event:",
            event.type
        );



        if(event.type === "checkout.session.completed") {



            const checkoutSession = event.data.object;



            const userId = checkoutSession.metadata.userId;

            const productName = checkoutSession.metadata.productName;



            const stripeSessionId = checkoutSession.id;



            console.log("NEW PURCHASE:");

            console.log("User:", userId);

            console.log("Product:", productName);



            db.run(

                `
                INSERT INTO purchases
                (
                    user_id,
                    product_name,
                    stripe_session_id
                )

                VALUES (?, ?, ?)
                `,


                [
                    userId,
                    productName,
                    stripeSessionId
                ],


                function(err){


                    if(err){

                        console.log(
                            "DATABASE ERROR:",
                            err
                        );

                    } else {


                        console.log(
                            "Purchase saved!"
                        );


                    }


                }

            );



        }



        res.json({

            received:true

        });



    }
);




// =========================
// JSON
// =========================

app.use(express.json());


app.get("/check-login", (req,res)=>{

    if(req.session.user){

        res.json({
            loggedIn:true
        });

    } else {

        res.json({
            loggedIn:false
        });

    }

});

// =========================
// STRIPE CHECKOUT
// =========================

app.post('/create-checkout-session', async (req, res) => {


    try {


        const checkoutSession = await stripe.checkout.sessions.create({


            payment_method_types: ['card'],


            line_items: [

                {

                    price: req.body.priceId,

                    quantity: 1

                }

            ],


            mode: 'payment',



            metadata: {

                userId: req.session.user.id,

                productName: req.body.productName

            },



            success_url:
            `${req.headers.origin}/success.html`,



            cancel_url:
            `${req.headers.origin}`



        });



        res.json({

            id: checkoutSession.id

        });



    } catch(error) {


        console.log("STRIPE ERROR:");

        console.log(error);



        res.status(500).json({

            error:error.message

        });


    }


});




// =========================
// AUTH ROUTES
// =========================

app.use(authRoutes);




// =========================
// ACCOUNT
// =========================

app.get("/account/profile.html", isLoggedIn, (req,res)=>{


    res.sendFile(

        __dirname + "/public/account/profile.html"

    );


});




// =========================
// STATIC FILES
// =========================

app.use(express.static('public', {

    index:false

}));




// =========================
// HOME
// =========================

app.get("/", (req,res)=>{


    res.sendFile(

        __dirname + "/public/index.html"

    );


});




// =========================
// SERVER START
// =========================

app.get("/account/user", isLoggedIn, (req,res)=>{

    res.json({

        name: req.session.user.name,

        email: req.session.user.email

    });

});

app.get("/account/purchases", isLoggedIn, (req,res)=>{


  console.log("LOGGED USER:");

    console.log(req.session.user);


    db.all(

        `
        SELECT *
        FROM purchases
        WHERE user_id = ?
        `,

        [
            req.session.user.id
        ],

        (err, rows)=>{

           console.log("PURCHASES FOUND:");

            console.log(rows);


            if(err){

                return res.status(500).json({
                    error:"Database error"
                });

            }


            res.json(rows);


        }

    );


});

app.get("/download/:product", isLoggedIn, (req,res)=>{


    const product = req.params.product;


    db.get(

        `
        SELECT *
        FROM purchases
        WHERE user_id = ?
        AND product_name = ?
        `,

        [

            req.session.user.id,

            product

        ],


        (err, purchase)=>{


            if(err){

                return res.status(500).send(
                    "Database error"
                );

            }



            if(!purchase){


                return res.status(403).send(
                    "You don't own this product"
                );


            }



            const filePath =
            __dirname +
            "/private_downloads/" +
            product +
            ".zip";



            res.download(filePath);


        }

    );


});

app.get("/logout",(req,res)=>{


    req.session.destroy(()=>{


        res.redirect("/");


    });


});

app.listen(3000, ()=>{


    console.log(
        "Server running on port 3000"
    );


});