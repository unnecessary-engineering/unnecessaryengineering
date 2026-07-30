require('dotenv').config();

const express = require('express');
const app = express();

const fs = require("fs");
const path = require("path");
const session = require("express-session");

const db = require('./database/database');

const authRoutes = require("./routes/auth");

const isLoggedIn = require("./middleware/authMiddleware");

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function savePurchase(userId, productName, stripeSessionId, callback) {

    try {

        const existing = await db.query(
            `
            SELECT id
            FROM purchases
            WHERE user_id = $1
            AND stripe_session_id = $2
            `,
            [
                userId,
                stripeSessionId
            ]
        );


        if(existing.rows.length > 0){

            return callback(null, false);

        }


        await db.query(
            `
            INSERT INTO purchases
            (
                user_id,
                product_name,
                stripe_session_id
            )

            VALUES ($1,$2,$3)
            `,
            [
                userId,
                productName,
                stripeSessionId
            ]
        );


        callback(null,true);


    } catch(err){

        callback(err);

    }

}

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
express.raw({type:"*/*"}),    (req,res)=>{

        



       let event;

try {

    console.log("BODY TYPE:", typeof req.body);
console.log("BODY LENGTH:", req.body.length);
console.log("SIGNATURE HEADER:", req.headers["stripe-signature"]);

    event = stripe.webhooks.constructEvent(
    req.body,
    req.headers["stripe-signature"],
    process.env.STRIPE_WEBHOOK_SECRET
);

} catch(err) {

    console.log("WEBHOOK SIGNATURE ERROR:", err.message);

    return res.status(400).send(
        `Webhook Error: ${err.message}`
    );

}



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



            savePurchase(
                userId,
                productName,
                stripeSessionId,
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

        const lineItems = [];

        if(req.body.priceId){

            lineItems.push({
                price: req.body.priceId,
                quantity: 1
            });

        } else if(req.body.amount){

            lineItems.push({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: req.body.productName || 'Product'
                    },
                    unit_amount: Math.round(req.body.amount * 100)
                },
                quantity: 1
            });

        } else {
            return res.status(400).json({
                error: 'Missing checkout price'
            });
        }

        console.log("CREATING CHECKOUT");
console.log(req.body);
console.log("USER SESSION:");
console.log(req.session.user);

        const checkoutSession = await stripe.checkout.sessions.create({


            payment_method_types: ['card'],


            line_items: lineItems,


            mode: 'payment',



            metadata: {

                userId: req.session.user.id,

                productName: req.body.productName

            },



            success_url:
            `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,



            cancel_url:
            `${req.headers.origin}`



        }); 

        console.log("STRIPE SESSION CREATED:");
console.log(checkoutSession.id);
console.log(checkoutSession.metadata);



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





app.get("/account/purchases", isLoggedIn, async (req,res)=>{

    console.log("LOGGED USER:");
    console.log(req.session.user);


    try {

        const result = await db.query(
    `
    SELECT *
    FROM purchases
    WHERE user_id = $1
    AND product_name = $2
    `,
    [
        req.session.user.id,
        product
    ]
);


        console.log("PURCHASES FOUND:");
        console.log(result.rows);


        res.json(result.rows);


    } catch(err){

        console.log("DATABASE ERROR:");
        console.log(err);


        res.status(500).json({
            error:"Database error"
        });

    }

});

app.get("/download/:product", isLoggedIn, async (req,res)=>{

    const product = req.params.product;


  const downloadFiles = {

    "MakerPlot": "https://drive.google.com/file/d/1sYE1aBgbofJ5ocv-1ulS4qIx78fymrZA/view?usp=sharing",

    "MakerPlot 2.0 - A4": "https://drive.google.com/file/d/1zVgjqkrLgpBUQeevoQKbGGSjZmMtHSZD/view?usp=sharing",

    "MakerPlot 2.0 - A3": "https://drive.google.com/file/d/1a6Q82i5w1YjwfooxymIxXofZYM7JNPy1/view?usp=sharing",

    "MakerPlot 2.0 - A2": "https://drive.google.com/file/d/10aZDdwBgCO3anBYLhBnrhza7WEban8KV/view?usp=sharing",

    "MakerPlot 2.0 - Infinite": "https://drive.google.com/file/d/1YU3sYKxMTVdbFlQB7Aqg3udb8a4JbxR6/view?usp=sharing"

};

   const files = downloadFiles[product];


if(!files){

    return res.status(404).send(
        "Product not found"
    );

}



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