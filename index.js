import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import axios from "axios";
import MongoStore from "connect-mongo";
import { User, Task, Subject, Attendance, Timetable, Student, Library, Opportunity, Request, Complaint, Alumni, StudyMaterial } from './models.js';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 3000;
const saltRounds = 10;
env.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_dashboard';
const isAtlas = mongoURI.includes('mongodb+srv://');

mongoose.connect(mongoURI, {
        ...(isAtlas ? {
            tls: true,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
        } : {}),
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 75000,
    })
    .then(async () => {
        console.log('MongoDB connected successfully');
        
        // Update all existing users to have role 'student' if they don't have a role
        await User.updateMany({ role: { $exists: false } }, { $set: { role: 'student' } });
        
        // Create admin user if it doesn't exist
        const adminExists = await User.findOne({ email: 'adminUser@gmail.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('adminUser', saltRounds);
            await User.create({
                name: 'Admin User',
                email: 'adminUser@gmail.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Admin user created successfully');
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(-1);
    });

app.use(session({
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/student_dashboard',
        touchAfter: 24 * 3600
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.use(bodyParser.json());

let attendanceData = [];

app.get("/", (req, res) => {
    res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.post("/login",
    passport.authenticate("local", {
        successRedirect: "/dashboard",
        failureRedirect: "/fail"
    })
);

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.post("/register", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    try {
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            res.redirect("/login");
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.error(err);
                    res.redirect("/register");
                } else {
                    const user = await User.create({ name, email, password: hash, role: 'student' });
                    req.login(user, (err) => {
                        if (err) {
                            console.error(err);
                            res.redirect("/register");
                        } else {
                            res.redirect("/dashboard");
                        }
                    });
                }
            });

        }
    } catch (err) {
        console.error("Error in registration", err);
        res.redirect("/register");
    }
});

app.get("/fail", (req, res) => {
    res.send("Failed to login");
});

let name;
let userRole;
app.use((req, res, next) => {
    if (req.isAuthenticated()) {
        name = req.user.name;
        userRole = req.user.role;
        next();
    } else {
        res.redirect("/login");
    }
});

app.get("/dashboard", async (req, res) => {
    const taskData = await Task.find({});
    let quote;
    let author;
    try {
        const response = await axios.get('https://zenquotes.io/api/random');
        quote = response.data[0].q;
        author = response.data[0].a;
    } catch (err) {
        console.log(err);
    }

    res.render("dashboard.ejs", {
        name: name,
        role: userRole,
        list: taskData,
        quote: quote,
        author: author
    });
});

app.post("/addTask", async (req, res) => {
    const task = req.body.task;
    const newTask = await Task.create({ task });
    res.json({ success: true, taskId: newTask._id });
});

app.post("/deleteTask", async (req, res) => {
    const taskId = req.body.taskId;
    await Task.findByIdAndDelete(taskId);
    res.json({ success: true });
});


async function fillAttendanceData(email) {
    const user = await User.findOne({ email });
    if (!user) return [];
    
    const attendanceRecords = await Attendance.find({ u_id: user._id })
        .populate('subject_id')
        .exec();

    attendanceData = new Array(attendanceRecords.length + 1);
    let total = 0;
    let present = 0;
    let absent = 0;

    const subjectColors = {
        "Mathematics": "#FF6B6B",
        "Computer Science": "#4ECDC4",
        "Physics": "#FFD166",
        "English": "#118AB2",
        "Chemistry": "#06D6A0"
    };

    for (let i = 0; i < attendanceRecords.length; i++) {
        attendanceData[i] = {};

        attendanceData[i].subject = attendanceRecords[i].subject_id.subject_name;
        attendanceData[i].present = attendanceRecords[i].present;
        present += attendanceData[i].present;
        attendanceData[i].absent = attendanceRecords[i].absent;
        absent += attendanceData[i].absent;
        attendanceData[i].total = attendanceData[i].present + attendanceData[i].absent;
        total += attendanceData[i].total;

        if (attendanceRecords[i].subject_id.color) {
            attendanceData[i].color = attendanceRecords[i].subject_id.color;
        } else {
            attendanceData[i].color = subjectColors[attendanceRecords[i].subject_id.subject_name] || "#" + ((1 << 24) * Math.random() | 0).toString(16);
        }

        const percentage = Math.round((attendanceRecords[i].present / (attendanceRecords[i].present + attendanceRecords[i].absent)) * 100);
        attendanceData[i].percentage = percentage;
    }

    attendanceData[attendanceRecords.length] = {};
    attendanceData[attendanceRecords.length].subject = "Total";
    attendanceData[attendanceRecords.length].total = total;
    attendanceData[attendanceRecords.length].present = present;
    attendanceData[attendanceRecords.length].absent = absent;
    attendanceData[attendanceRecords.length].color = "#FF6B6B";
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    attendanceData[attendanceRecords.length].percentage = percentage;
    return attendanceData;
}

app.get("/attendance", async (req, res) => {
    attendanceData = await fillAttendanceData(req.user.email);
    // console.log(attendanceData);
    res.render("attendance.ejs", {
        name: name,
        role: userRole,
        attendanceData: attendanceData
    });

});

const colors = ["accent-pink-gradient", "accent-orange-gradient", "accent-green-gradient", "accent-cyan-gradient", "accent-blue-gradient", "accent-purple-gradient", "accent-orange-gradient", "accent-green-gradient"];

async function fillSubjectColors() {
    const subjects = await Subject.find({});
    const subjectColors = {};
    for (let i = 0; i < subjects.length; i++) {
        subjectColors[subjects[i].subject_name] = colors[i % colors.length];
    }
    return subjectColors;
}
app.get('/timetable', async function (req, res) {

    const subjectColors = await fillSubjectColors();
    const timetable = {};
    const timetableData = await Timetable.find({}).sort({ period: 1 });
    
    for (let i = 0; i < timetableData.length; i++) {
        const period = i + 1;

        if (timetableData[i].mon != null) {
            let str = "mon" + period;
            timetable[str] = timetableData[i].mon;
        }
        if (timetableData[i].tue != null) {
            let str = "tue" + period;
            timetable[str] = timetableData[i].tue;
        }
        if (timetableData[i].wed != null) {
            let str = "wed" + period;
            timetable[str] = timetableData[i].wed;
        }
        if (timetableData[i].thu != null) {
            let str = "thu" + period;
            timetable[str] = timetableData[i].thu;
        }
        if (timetableData[i].fri != null) {
            let str = "fri" + period;
            timetable[str] = timetableData[i].fri;
        }
        if (timetableData[i].sat != null) {
            let str = "sat" + period;
            timetable[str] = timetableData[i].sat;
        }
    }
    res.render('timetable.ejs', {
        name: name,
        role: userRole,
        subjectColors: subjectColors,
        timetable: timetable
    });
});



app.get("/study-material", async (req, res) => {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
        return res.redirect("/login");
    }

    const student = await Student.findOne({ user_id: user._id });
    
    if (!student) {
        res.render("study-material.ejs", {
            name: name,
            role: userRole,
            title: [],
            materials: []
        });
    } else {
        const class_id = student.class_id;
        const subjects = await Subject.find({ class_id: class_id });
        const title = subjects.map(subject => subject.subject_name);
        
        const subjectIds = subjects.map(s => s._id);
        const materials = await StudyMaterial.find({ subject_id: { $in: subjectIds } })
            .populate('subject_id')
            .sort({ uploaded_date: -1 });

        res.render("study-material.ejs", {
            name: name,
            role: userRole,
            title: title,
            materials: materials
        });
    }
});



app.get("/library", async (req, res) => {
    const libraryData = await Library.find({});
    console.log(libraryData);
    res.render("library.ejs", {
        name: name,
        role: userRole,
        libraryData: libraryData
    });

});



app.get("/opportunities", async (req, res) => {
    const opportunitiesData = await Opportunity.find({});
    console.log(opportunitiesData);
    res.render("opportunities.ejs", {
        name: name,
        role: userRole,
        opportunitiesData: opportunitiesData
    });

});


app.get("/student-request", async (req, res) => {
    const studentRequestData = await Request.find({});
    // Convert date string to Date object for each row - already Date objects in MongoDB
    res.render("student-request.ejs", {
        name: name,
        role: userRole,
        studentRequestData: studentRequestData
    });
});

app.get("/student-request/req_new", (req, res) => {
    res.render("req_new.ejs", {
        name: name,
        role: userRole
    });
});

app.post("/newrequest", async (req, res) => {
    const title = req.body.name;
    const requestType = req.body["request-type"];
    const description = req.body.description;
    await Request.create({ title, requestType, description });
    res.redirect("/student-request");
});

app.get("/complaints", async (req, res) => {
    const complaints = await Complaint.find({});
    // console.log(complaints);
    res.render("complaints.ejs", {
        name: name,
        role: userRole,
        complaints: complaints
    });
});

app.get("/complaints/comp_new", (req, res) => {
    res.render("comp_new.ejs", {
        name: name,
        role: userRole
    });
});

app.post("/newcomplaint", async (req, res) => {
    const title = req.body.name;
    const requestType = req.body["request-type"];
    const description = req.body.description;
    await Complaint.create({ title, requestType, description });
    res.redirect("/complaints");
});

app.get("/alumni", async (req, res) => {

    const alumni = await Alumni.find({}).sort({ _id: 1 });
    const alumniWithImgUrl = alumni.map(alum => ({
        ...alum.toObject(),
        img_url: `/assets/alumini/${alum.img_url}`
    }));
    res.render("alumni.ejs", {
        name: name,
        role: userRole,
        aluminiData: alumniWithImgUrl
    });
});

// Admin Routes
app.get("/admin/register-student", (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    res.render("admin-register-student.ejs", {
        name: name,
        role: userRole
    });
});

app.post("/admin/register-student", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const { name: studentName, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email: email });
        
        if (existingUser) {
            return res.render("admin-register-student.ejs", {
                name: name,
                role: userRole,
                error: "User with this email already exists"
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await User.create({ 
            name: studentName, 
            email, 
            password: hashedPassword, 
            role: 'student' 
        });
        
        res.render("admin-register-student.ejs", {
            name: name,
            role: userRole,
            success: "Student registered successfully"
        });
    } catch (err) {
        console.error("Error in student registration", err);
        res.render("admin-register-student.ejs", {
            name: name,
            role: userRole,
            error: "Error registering student"
        });
    }
});

app.get("/admin/manage-attendance", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const users = await User.find({ role: 'student' });
    const subjects = await Subject.find({});
    
    res.render("admin-manage-attendance.ejs", {
        name: name,
        role: userRole,
        users: users,
        subjects: subjects
    });
});

app.post("/admin/add-attendance", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const { user_id, subject_id, present, absent } = req.body;
    
    try {
        const existingAttendance = await Attendance.findOne({ u_id: user_id, subject_id: subject_id });
        
        if (existingAttendance) {
            existingAttendance.present = parseInt(present);
            existingAttendance.absent = parseInt(absent);
            await existingAttendance.save();
        } else {
            await Attendance.create({
                u_id: user_id,
                subject_id: subject_id,
                present: parseInt(present),
                absent: parseInt(absent)
            });
        }
        
        res.redirect("/admin/manage-attendance");
    } catch (err) {
        console.error("Error in adding attendance", err);
        res.redirect("/admin/manage-attendance");
    }
});

app.get("/admin/manage-requests", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const requests = await Request.find({}).sort({ date: -1 });
    
    res.render("admin-manage-requests.ejs", {
        name: name,
        role: userRole,
        requests: requests
    });
});

app.post("/admin/resolve-request/:id", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        await Request.findByIdAndUpdate(id, { status: parseInt(status) });
        res.redirect("/admin/manage-requests");
    } catch (err) {
        console.error("Error in resolving request", err);
        res.redirect("/admin/manage-requests");
    }
});

app.get("/admin/manage-complaints", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const complaints = await Complaint.find({}).sort({ date: -1 });
    
    res.render("admin-manage-complaints.ejs", {
        name: name,
        role: userRole,
        complaints: complaints
    });
});

app.post("/admin/resolve-complaint/:id", async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.redirect("/dashboard");
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        await Complaint.findByIdAndUpdate(id, { status: parseInt(status) });
        res.redirect("/admin/manage-complaints");
    } catch (err) {
        console.error("Error in resolving complaint", err);
        res.redirect("/admin/manage-complaints");
    }
});


passport.use("local", new Strategy({ usernameField: "email" }, async function verify(email, password, cd) {
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return cd(null, false, { message: "User not found" });
        } else {
            const storedHashedPassword = user.password;
            bcrypt.compare(password, storedHashedPassword, (err, valid) => {
                if (err) {
                    console.log(err);
                    return cd(err);
                } else {
                    if (valid) {
                        return cd(null, user);
                    } else {
                        return cd(null, false, { message: "Invalid password" });
                    }
                }
            });
        }
    } catch (err) {
        console.error("Error in login", err);
        return cd(err);
    }
})

);

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            return done(null, false);
        }
        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.listen(port, () => console.log(`Server is running on port ${port}`));