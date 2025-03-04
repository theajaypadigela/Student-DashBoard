import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import axios from "axios";

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


let attendanceData=[];

app.get("/",(req,res)=>{
    res.render("login.ejs");
});

app.get("/sidebar",(req,res)=>{
    res.render("sidebar.ejs");
});

app.get("/login",(req,res)=>{
    res.render("login.ejs");
});

app.get("/register",(req,res)=>{
    res.render("register.ejs");
});

app.post("/login",
    passport.authenticate("local",{
        successRedirect:"/dashboard",
        failureRedirect:"/fail"
    })
);

app.get("/fail",(req,res)=>{
    res.send("Failed to login");
});

app.get("/dashboard",async(req,res)=>{
    if(req.isAuthenticated()){
        const result=await db.query("select * from tasks");
        const taskData=result.rows;
        let quote;
        let author;
        try{
            const response = await axios.get('https://zenquotes.io/api/random');
            quote=response.data[0].q;
            author=response.data[0].a;
            console.log(quote);
            console.log(author);
        }catch(err){
            console.log(err);
        }

        res.render("dashboard.ejs",{
            list:taskData,
            quote:quote,
            author:author
        });
    }else{
        res.redirect("/login");
    }
});

app.post("/addTask", async (req,res)=>{
    const task=req.body.task;
    console.log(task);
    const result=await db.query("insert into tasks(task) values($1)",[task]);
    res.redirect("/dashboard");
});

app.post("/deleteTask",async(req,res)=>{
    const taskId=req.body.taskId;
    const result=await db.query("delete from tasks where id=($1)",[taskId]);
    res.redirect("/dashboard");
})



async function fillAttendanceData(email){
    const result=await db.query("select * from users where email=$1",[email]);
    const id=result.rows[0].id;
    const result2=await db.query("select present,absent,subject_id,color,subject_name from attendance inner join subjects on attendance.subject_id=subjects.id  where u_id=$1",[id]);
    
    attendanceData = new Array(result2.rows.length+1);
    let total=0;
    let present=0;
    let absent=0;
    
    for(let i=0;i<result2.rows.length;i++){

        attendanceData[i] = {};
        
        attendanceData[i].subject=result2.rows[i].subject_name;
        attendanceData[i].present=result2.rows[i].present;
        present+=attendanceData[i].present;
        attendanceData[i].absent=result2.rows[i].absent;
        absent+=attendanceData[i].absent;
        attendanceData[i].total=attendanceData[i].present+attendanceData[i].absent;
        total+=attendanceData[i].total;
        attendanceData[i].color=result2.rows[i].color;
        const percentage=Math.round((result2.rows[i].present / (result2.rows[i].present + result2.rows[i].absent)) * 100);
        attendanceData[i].percentage=percentage;
    }
    attendanceData[result2.rows.length] = {};
    attendanceData[result2.rows.length].subject="Total";
    attendanceData[result2.rows.length].total=total;
    attendanceData[result2.rows.length].present=present;
    attendanceData[result2.rows.length].absent=absent;
    attendanceData[result2.rows.length].color="#FF6B6B";
    const percentage=Math.round((present / total) * 100);
    attendanceData[result2.rows.length].percentage=percentage;
    return attendanceData;
}

app.get("/attendance",async(req,res)=>{
    if(req.isAuthenticated()){
        attendanceData=await fillAttendanceData(req.user.email);
        // console.log(attendanceData);
        res.render("attendance.ejs",{
            attendanceData:attendanceData
        });
    }else{
        res.redirect("/login");
    }
});

const colors=["accent-pink-gradient","accent-orange-gradient","accent-green-gradient","accent-cyan-gradient","accent-blue-gradient","accent-purple-gradient","accent-orange-gradient","accent-green-gradient"];

async function fillSubjectColors(){
    const result=await db.query("select * from subjects");
    const subjectData=result.rows;
    const subjectColors={};
    for(let i=0;i<subjectData.length;i++){
        subjectColors[subjectData[i].subject_name]=colors[i%colors.length];
    }
    return subjectColors;
}
app.get('/timetable', async function(req, res) {
    
    const subjectColors = await fillSubjectColors();
    const timetable={};
    const result=await db.query("select * from timetable");
    const timetableData=result.rows;
    for(let i=0;i<timetableData.length;i++){
       const period = i + 1;  
       
       if(timetableData[i].mon != null){
        let str = "mon" + period;
        timetable[str] = timetableData[i].mon;
       }
       if(timetableData[i].tue != null){
        let str = "tue" + period;
        timetable[str] = timetableData[i].tue;
       }
       if(timetableData[i].wed != null){
        let str = "wed" + period;
        timetable[str] = timetableData[i].wed;
       }
       if(timetableData[i].thu != null){
        let str = "thu" + period;  
        timetable[str] = timetableData[i].thu;
       }
       if(timetableData[i].fri != null){
        let str = "fri" + period;
        timetable[str] = timetableData[i].fri;
       }
       if(timetableData[i].sat != null){
        let str = "sat" + period;
        timetable[str] = timetableData[i].sat;
       }
    }
    res.render('timetable.ejs', { 
        name: "Guest", 
        subjectColors: subjectColors,
        timetable: timetable
    });
});



app.get("/study-material",async(req,res)=>{
    if(req.isAuthenticated()){
        const result1=await db.query("select * from users where email=$1",[req.user.email]);
        const id=result1.rows[0].id;

        const result2=await db.query("select class_id from students where user_id=$1",[id]);
        const class_id=result2.rows[0].class_id;

        const result3=await db.query("select subject_name from subjects where class_id=$1",[class_id]);
        const title=result3.rows.map(row=>row.subject_name);

        
        res.render("study-material.ejs",{
            title:title
        });
    }else{
        res.redirect("/login");
    }
});



app.get("/library",async(req,res)=>{
    if(req.isAuthenticated()){
        const result=await db.query("select * from library");
        const libraryData=result.rows;
        res.render("library.ejs",{
            libraryData:libraryData
        });
    }else{
        res.redirect("/login");
    }
});



app.get("/opportunities",async(req,res)=>{
    if(req.isAuthenticated()){
        const result=await db.query("select * from opportunities");
        const opportunitiesData=result.rows;
        console.log(opportunitiesData);
        res.render("opportunities.ejs",{
            opportunitiesData:opportunitiesData
        });
    }else{
        res.redirect("/login");
    }
});


app.get("/student-request",async(req,res)=>{
    if(req.isAuthenticated()){
        const result=await db.query("select * from requests");
        const studentRequestData=result.rows;
        console.log(studentRequestData);
        res.render("student-request.ejs",{
            studentRequestData:studentRequestData
        });
    }else{
        res.redirect("/login");
    }
});

app.get("/student-request/req_new",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("req_new.ejs");
    }else{
        res.redirect("/login");
    }
});

app.post("/newrequest",async(req,res)=>{
    const title=req.body.name;
    const requestType=req.body["request-type"];
    const description=req.body.description;
    const result=await db.query("insert into requests(title,requestType,description) values($1,$2,$3)",[title,requestType,description]);
    res.redirect("/student-request");
});

app.get("/complaints", async(req,res)=>{
    if(req.isAuthenticated()){
        const result=await db.query("select * from complaints");
        const complaints=result.rows;
        // console.log(complaints);
        res.render("complaints.ejs",{complaints:complaints});
    }else{
        res.redirect("/login");
    }
});

app.get("/complaints/comp_new",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("comp_new.ejs");
    }else{
        res.redirect("/login");
    }
});

app.post("/newcomplaint",async(req,res)=>{
    const title=req.body.name;
    const requestType=req.body["request-type"];
    const description=req.body.description;
    const result=await db.query("insert into complaints(title,requestType,description) values($1,$2,$3)",[title,requestType,description]);
    res.redirect("/complaints");
});

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/dashboard",
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
                            res.redirect("/dashboard");
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