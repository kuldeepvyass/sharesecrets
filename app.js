//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
const { engine } = require("express/lib/application");
app.use(bodyParser.urlencoded({extended: true}));
const mongoose = require('mongoose');
const encrypt =require("mongoose-encryption")
const session =require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
mongoose.connect('mongodb+srv://admin-kuldeep:<password>@cluster0.bmtbm.mongodb.net/toDoDB');
const findOrCreate = require('mongoose-findorcreate')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
app.use(session({
    secret: 'my secret string',
    resave: false,
    saveUninitialized: false
  }))
  app.use(passport.initialize());
  app.use(passport.session()); 


const userSchema= new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=mongoose.model("User",userSchema);
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
   
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",function(req,res){
    res.render("home");
  });
  app.get("/auth/google",passport.authenticate("google",{scope:["profile"]})); 
app.get("/login",function(req,res){
    res.render("login");
});
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });
 app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
     User.find({"secret": {$ne:null}},function(err,found){
      if(err)
      console.log(err);
      else {
        if(found)
        {
            res.render("secrets",{userswithsecret:found})
        }
      }
     });
});
app.get("/submit",function(req,res){
    if(req.isAuthenticated())
    res.render("submit");
    else
     res.redirect("/login");
 });
app.post("/register",function(req,res){
   User.register({username:req.body.username},req.body.password,function(err,user){
     if(err)
     {
        console.log(err);
        res.redirect("/register");
     }
     else {
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
     }
   });
   
});
app.post("/submit",function(req,res){
     const submittedsecret=req.body.secret;
     console.log(req.user);
     User.findById(req.user.id,function(err,found){
       if(err)
       console.log(err);
       else{
        if(found)
        {
            found.secret=submittedsecret;
            found.save(function(){
                res.redirect("secrets");
            });
        }
       }
     });
});
app.get("/logout",function(req,res){
    req.logout(function(err){});
    res.redirect("/");
}); 
app.post("/login",function(req,res){
    const user= new User({
        username:req.body.username,
         password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })
   
});
const port = process.env.PORT ||3000
app.listen(port, function() {
    console.log("Server started on port 3000");
  });
