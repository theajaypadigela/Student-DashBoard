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
    if(req.isAuthenticated()){
        // res.render("page.ejs");
        res.render("sidebar.ejs");
    }else{
        res.redirect("/login");
    }
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

app.get("/dashboard",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("dashboard.ejs");
    }else{
        res.redirect("/login");
    }
});

const attendanceData=[
    {
        subject:"Mathematics",
        present:60,
        absent:40,
        total:100,
        percentage: 60/100*100,
        color:"#e91e63"
    },
    {
        subject:"Physics",
        present:80,
        absent:20,
        total:300,
        percentage: 80/100*100,
        color:"#ff9800"
    },
    {
        subject:"Chemistry",
        present:70,
        absent:30,
        total:100,
        percentage: 70/100*100,
        color:"#3f51b5"
    },
    {
        subject:"Biology",
        present:90,
        absent:10,
        total:100,
        percentage: 90/100*100,
        color:"#4caf50"
    },
    {
        subject:"English",
        present:65,
        absent:35,
        total:100,
        percentage: 65/100*100,
        color:"#9c27b0"
    }   
]

app.get("/attendance",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("attendance.ejs",{
            attendanceData:attendanceData
        });
    }else{
        res.redirect("/login");
    }
});

app.get('/timetable', function(req, res) {
    const subjectColors = {
      "Math": "accent-pink-gradient",
      "Science": "accent-orange-gradient",
      "English": "accent-green-gradient",
      "History": "accent-cyan-gradient",
      "Geography": "accent-blue-gradient",
      "Physics": "accent-purple-gradient",
      "Chemistry": "accent-orange-gradient",
      "Biology": "accent-green-gradient"
    };

    const timetable = {
      "mon1": "Math", "mon3": "English", "mon4": "History",
      "tue2": "Math", "tue4": "Geography",
      "wed1": "Science", "wed3": "Physics", "wed4": "Chemistry",
      "thu1": "Biology", "thu3": "English", "thu4": "History",
      "fri2": "Math", "fri4": "Geography"
    };

    res.render('timetable.ejs', { 
        name: "Guest", 
        subjectColors: subjectColors,
        timetable: timetable
    });
});

const title=["Web Development","Data Structure","Operating System","Computer Network","Database Management System"];

app.get("/study-material",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("study-material.ejs",{
            title:title
        });
    }else{
        res.redirect("/login");
    }
});

const libraryData=[
    {
        title:"Artificial Intelligence: A Modern Approach",
        rack:"1",
        books:5
    },
    {
        title:"The Emotion Machine",
        rack:"1",
        books:3
    },  
    {
        title:"Super Intelligence: Paths,Dangers,Strategies",
        rack:"1",
        books:2
    },
    {   
        title:"The Emotion Machine",
        rack:"1",
        books:3
    },
    {
        title:"The Emotion Machine",
        rack:"1",
        books:3
    },  
    {
        title:"The Emotion Machine",
        rack:"1",
        books:3
    },  
    {
        title:"The Emotion Machine",
        rack:"1",
        books:3
    },    
    {
        title:"The Emotion Machine",
        rack:"1",
        books:3
    },  
    
]

app.get("/library",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("library.ejs",{
            libraryData:libraryData
        });
    }else{
        res.redirect("/login");
    }
});

const opportunitiesData=[
    {
        title:"Google Internship 2025",
        startDate:"24 Mar 2025",
        duration:"1 Month",
        applyBy:"20 Mar 2025",
        description:"Google looking for undergraduate students.",
        skillsRequired:"C, C++, Java, Data Structures and Algorithms"
    },
    {
        title:"Research Intern at MIT",
        startDate:"31 April 2025",
        duration:"3 Months",
        applyBy:"15 April 2025",
        description:"MIT looking for talented researchers.",
        skillsRequired:"Machine Learning, Computer Vision"
    },
    {
        title:"Google Internship 2025",
        startDate:"24 Mar 2025",
        duration:"1 Month",
        applyBy:"20 Mar 2025",
        description:"Google looking for undergraduate students.",
        skillsRequired:"C, C++, Java, Data Structures and Algorithms"
    },
    {
        title:"Research Intern at MIT",
        startDate:"31 April 2025",
        duration:"3 Months",
        applyBy:"15 April 2025",
        description:"MIT looking for talented researchers.",
        skillsRequired:"Machine Learning, Computer Vision"
    },
    {
        title:"Google Internship 2025",
        startDate:"24 Mar 2025",
        duration:"1 Month",
        applyBy:"20 Mar 2025",
        description:"MIT looking for talented researchers."
    }
]

app.get("/opportunities",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("opportunities.ejs",{
            opportunitiesData:opportunitiesData
        });
    }else{
        res.redirect("/login");
    }
});

const date=new Date();
const day=date.getDate();
const month=date.getMonth();
const year=date.getFullYear();

const studentRequestData=[
    {
        choose:"Certificate",
        title:"MEMO",
        description:"Need certificate for applying scholarship",
        status:"RESOLVED",
        date:`${day}/${month}/${year}`
    },
    {
        choose:"CHOOSE",
        title:"TITLE",
        description:"description is written here",
        status:"INITIATED",
        date:`${day}/${month}/${year}`
    },
    {
        choose:"Certificate",
        title:"MEMO",
        description:"Need certificate for applying scholarship",
        status:"RESOLVED",
        date:`${day}/${month}/${year}`
    }
]

app.get("/student-request",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("student-request.ejs",{
            studentRequestData:studentRequestData
        });
    }else{
        res.redirect("/login");
    }
});

app.get("/student-request/req_new",(req,res)=>{
    res.render("req_new.ejs");
});

app.get("/complaints",(req,res)=>{
    res.render("complaints.ejs");
});

app.get("/complaints/comp_new",(req,res)=>{
    res.render("comp_new.ejs");
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