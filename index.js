import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
app.use(bodyParser.json());
const port=3000;
const saltRounds = 10;
env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  db.connect();

  app.use(session({
      secret:process.env.SESSION_SECRET,
      resave:false,
      saveUninitialized:true,
      cookie:{
          maxAge:1000*60*60*24  
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());


app.set('view engine','ejs');

app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/",(req,res)=>{
    res.render("login.ejs");
});

app.get("/sidebar",(req,res)=>{
    res.render("sidebar.ejs");
});

app.get("/page",(req,res)=>{
    res.send("Welcome to the page");
});

app.get("/login",(req,res)=>{
    res.render("login.ejs");
});

app.get("/register",(req,res)=>{
    res.render("register.ejs");
});

app.post("/login",
    passport.authenticate("local",{
        successRedirect:"/page",
        failureRedirect:"/fail"
    })
);

app.get("/fail",(req,res)=>{
    res.send("Failed to login");
});

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/page",
    failureRedirect: "/login",
  })
);

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);


app.post("/register",async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const name=req.body.name;
    try{
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
            email,
          ]);
      
          if (checkResult.rows.length > 0) {
            // alert("User already exists");
            res.redirect("/login");
          }else{
            bcrypt.hash(password,saltRounds,async(err,hash)=>{
                if(err){
                    console.log(err);
                    // alert("Error in registration");
                    res.redirect("/register");
                }else{
                    const result = await db.query("insert into users(name,email,password) values($1,$2,$3) RETURNING *", [name, email, hash]);
                    const user=result.rows[0];
                    req.login(user,(err)=>{
                        if(err){
                            console.log(err);
                            // alert("Error in registration");
                            res.redirect("/register");
                        }else{
                            res.redirect("/page");
                        }
                    }); 
                }
            });

          }
        } catch(err) {
            console.error("Error in registration", err);
            res.redirect("/register");
        }
});

passport.use("local",new Strategy({ usernameField: "email" },async function verify(email,password,cd){
    try{
        const result=await db.query("select * from users where email=$1",[email]);
        if(result.rows.length===0){
            return cd("user not found");
        }else{
            const user=result.rows[0];
            const storedHashedPassword=user.password;
            bcrypt.compare(password,storedHashedPassword,(err,valid)=>{
                if(err){
                    console.log(err);
                    return cd(err);
                }else{
                    if(valid){
                        return cd(null,user);
                    }else{
                        return cd(null,false);
                    }
                }
            });
        }
    } catch(err) {
        console.error("Error in login", err);
        return cd(err);
    }
})

);

passport.use("google",
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
          },
    
    async (accessToken, refreshToken, profile, cb) =>{
        try{
            const result=await db.query("select * from users where email=$1 ",[profile.email]);
            if(result.rows===0){
                const newUser=await db.query("insert into users (name,email,password) values ($1,$2,$3) ",[profile.displayName,profile.email,"google"]);
                return cb(null, newUser.rows[0]);
            }else{
                return cb(null,result.rows[0]);
            }
        }catch(err){
           return cb(err);
        }
    }
)
)

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id=$1", [id]);
        if (result.rows.length === 0) {
            return done(null, false);
        }
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});


app.listen(port,()=>console.log(`Server is running on port ${port}`));