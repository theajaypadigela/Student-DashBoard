import mongoose from "mongoose";
import bcrypt from "bcrypt";
import env from "dotenv";
import {
  User,
  Task,
  Subject,
  Attendance,
  Timetable,
  Student,
  Library,
  Opportunity,
  Request,
  Complaint,
  Alumni,
  StudyMaterial,
} from "./models.js";

env.config();

const mongoURI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "mongodb://localhost:27017/student_dashboard";
const isAtlas = mongoURI.includes("mongodb+srv://");

const connectOptions = {
  ...(isAtlas
    ? {
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
      }
    : {}),
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 75000,
};

async function upsertMany(model, items, getFilter) {
  for (const item of items) {
    const filter = getFilter(item);
    await model.updateOne(filter, { $set: item }, { upsert: true });
  }
}

async function seed() {
  await mongoose.connect(mongoURI, connectOptions);

  const adminEmail = "admin@gmail.com";
  let adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash("admin", 10);
    adminUser = await User.create({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
  }

  const guestEmail = "guestuser@gmail.com";
  let guestUser = await User.findOne({ email: guestEmail });
  if (!guestUser) {
    const hashedPassword = await bcrypt.hash("guestuser", 10);
    guestUser = await User.create({
      name: "Guest User",
      email: guestEmail,
      password: hashedPassword,
      role: "student",
    });
  }

  const subjectSeeds = [
    { subject_name: "Mathematics", class_id: 1, color: "#FF6B6B" },
    { subject_name: "Computer Science", class_id: 1, color: "#4ECDC4" },
    { subject_name: "Physics", class_id: 1, color: "#FFD166" },
    { subject_name: "English", class_id: 1, color: "#118AB2" },
    { subject_name: "Chemistry", class_id: 1, color: "#06D6A0" },
  ];
  await upsertMany(
    Subject,
    subjectSeeds,
    (item) => ({ subject_name: item.subject_name, class_id: item.class_id })
  );

  const subjects = await Subject.find({ class_id: 1 });
  const subjectByName = new Map(
    subjects.map((subject) => [subject.subject_name, subject])
  );

  await Student.updateOne(
    { user_id: guestUser._id },
    { $set: { class_id: 1 } },
    { upsert: true }
  );

  const attendanceSeeds = [
    { name: "Mathematics", present: 22, absent: 3 },
    { name: "Computer Science", present: 24, absent: 1 },
    { name: "Physics", present: 20, absent: 5 },
    { name: "English", present: 23, absent: 2 },
    { name: "Chemistry", present: 21, absent: 4 },
  ];
  for (const seed of attendanceSeeds) {
    const subject = subjectByName.get(seed.name);
    if (!subject) continue;
    await Attendance.updateOne(
      { u_id: guestUser._id, subject_id: subject._id },
      { $set: { present: seed.present, absent: seed.absent } },
      { upsert: true }
    );
  }

  const timetableSeeds = [
    {
      period: 1,
      mon: "Mathematics",
      tue: "Physics",
      wed: "Chemistry",
      thu: "Computer Science",
      fri: "English",
      sat: "Mathematics",
    },
    {
      period: 2,
      mon: "Computer Science",
      tue: "Mathematics",
      wed: "Physics",
      thu: "Chemistry",
      fri: "English",
      sat: "Physics",
    },
    {
      period: 3,
      mon: "English",
      tue: "Computer Science",
      wed: "Mathematics",
      thu: "Physics",
      fri: "Chemistry",
      sat: "English",
    },
    {
      period: 4,
      mon: "Physics",
      tue: "English",
      wed: "Computer Science",
      thu: "Mathematics",
      fri: "Chemistry",
      sat: "Computer Science",
    },
    {
      period: 5,
      mon: "Chemistry",
      tue: "Physics",
      wed: "English",
      thu: "Computer Science",
      fri: "Mathematics",
      sat: "Chemistry",
    },
    {
      period: 6,
      mon: "Mathematics",
      tue: "Chemistry",
      wed: "Physics",
      thu: "English",
      fri: "Computer Science",
      sat: "Mathematics",
    },
  ];
  await upsertMany(Timetable, timetableSeeds, (item) => ({ period: item.period }));

  const taskSeeds = [
    { task: "Submit mathematics assignment" },
    { task: "Prepare for physics lab" },
    { task: "Review computer science notes" },
  ];
  await upsertMany(Task, taskSeeds, (item) => ({ task: item.task }));

  const librarySeeds = [
    {
      title: "Data Structures and Algorithms",
      author: "Thomas Cormen",
      isbn: "9780262033848",
      available: true,
      category: "Computer Science",
    },
    {
      title: "Calculus: Early Transcendentals",
      author: "James Stewart",
      isbn: "9781285741550",
      available: true,
      category: "Mathematics",
    },
    {
      title: "Physics for Scientists and Engineers",
      author: "Serway and Jewett",
      isbn: "9781133947271",
      available: false,
      category: "Physics",
    },
  ];
  await upsertMany(Library, librarySeeds, (item) => ({ title: item.title }));

  const opportunitySeeds = [
    {
      title: "Summer Internship",
      company: "Tech Solutions Inc.",
      description: "Web development internship opportunity",
      link: "https://example.com/intern",
      deadline: new Date("2026-06-15"),
      type: "Internship",
    },
    {
      title: "Campus Hackathon",
      company: "CodeFest",
      description: "Annual coding competition with exciting prizes",
      link: "https://example.com/hackathon",
      deadline: new Date("2026-07-10"),
      type: "Hackathon",
    },
  ];
  await upsertMany(
    Opportunity,
    opportunitySeeds,
    (item) => ({ title: item.title, company: item.company })
  );

  const requestSeeds = [
    {
      title: "Need extension for assignment",
      requestType: "Academic",
      description: "Requesting a two-day extension due to illness.",
      status: 0,
    },
    {
      title: "Library card renewal",
      requestType: "Library",
      description: "Please renew my library card for the new semester.",
      status: 1,
    },
  ];
  await upsertMany(
    Request,
    requestSeeds,
    (item) => ({ title: item.title, requestType: item.requestType })
  );

  const complaintSeeds = [
    {
      title: "WiFi not working",
      requestType: "Infrastructure",
      description: "Connectivity issues in the main library hall.",
      status: 0,
    },
    {
      title: "Projector malfunction",
      requestType: "Classroom",
      description: "Projector flickers in Lab 2 during lectures.",
      status: 1,
    },
  ];
  await upsertMany(
    Complaint,
    complaintSeeds,
    (item) => ({ title: item.title, requestType: item.requestType })
  );

  const alumniSeeds = [
    {
      name: "Ajay Kumar",
      batch: "2024",
      position: "Software Engineer",
      company: "TechNova",
      img_url: "ajay.jpg",
      linkedin: "https://www.linkedin.com/in/ajay-kumar",
    },
    {
      name: "Chandu R",
      batch: "2023",
      position: "Product Analyst",
      company: "InsightWorks",
      img_url: "chandu.jpg",
      linkedin: "https://www.linkedin.com/in/chandu-r",
    },
    {
      name: "Vamshi R",
      batch: "2022",
      position: "Data Scientist",
      company: "Nimbus AI",
      img_url: "vamshi.jpg",
      linkedin: "https://www.linkedin.com/in/vamshi-r",
    },
    {
      name: "Vignesh S",
      batch: "2021",
      position: "Cloud Engineer",
      company: "Skyline Cloud",
      img_url: "vignesh.jpg",
      linkedin: "https://www.linkedin.com/in/vignesh-s",
    },
  ];
  await upsertMany(Alumni, alumniSeeds, (item) => ({ name: item.name, batch: item.batch }));

  const materialSeeds = [
    {
      subject_name: "Mathematics",
      title: "Limits and Continuity Cheat Sheet",
      description: "Quick reference for core calculus concepts.",
      file_url: "https://example.com/materials/limits.pdf",
      file_type: "pdf",
      uploaded_by: "Admin User",
    },
    {
      subject_name: "Computer Science",
      title: "Big-O Complexity Guide",
      description: "Time complexity examples and practice problems.",
      file_url: "https://example.com/materials/big-o.pdf",
      file_type: "pdf",
      uploaded_by: "Admin User",
    },
    {
      subject_name: "Physics",
      title: "Mechanics Lecture Slides",
      description: "Slides covering motion, force, and energy.",
      file_url: "https://example.com/materials/mechanics.ppt",
      file_type: "ppt",
      uploaded_by: "Admin User",
    },
  ];
  for (const seed of materialSeeds) {
    const subject = subjectByName.get(seed.subject_name);
    if (!subject) continue;
    await StudyMaterial.updateOne(
      { subject_id: subject._id, title: seed.title },
      {
        $set: {
          subject_id: subject._id,
          title: seed.title,
          description: seed.description,
          file_url: seed.file_url,
          file_type: seed.file_type,
          uploaded_by: seed.uploaded_by,
        },
      },
      { upsert: true }
    );
  }

  console.log("MongoDB seed completed.");
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("MongoDB seed failed:", err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
