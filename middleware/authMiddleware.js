function isLoggedIn(req, res, next) {


    if(req.session.user) {

        next();

    } else {

        res.redirect("/account/login.html");

    }


}


module.exports = isLoggedIn;