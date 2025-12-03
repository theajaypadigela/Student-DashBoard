import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
    task: {
        type: String,
        required: true
    }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
    subject_name: {
        type: String,
        required: true
    },
    class_id: {
        type: Number
    },
    color: {
        type: String
    }
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
    u_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    present: {
        type: Number,
        default: 0
    },
    absent: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const timetableSchema = new mongoose.Schema({
    period: {
        type: Number,
        required: true
    },
    mon: String,
    tue: String,
    wed: String,
    thu: String,
    fri: String,
    sat: String
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    class_id: {
        type: Number
    }
}, { timestamps: true });

const librarySchema = new mongoose.Schema({
    title: String,
    author: String,
    isbn: String,
    available: {
        type: Boolean,
        default: true
    },
    category: String
}, { timestamps: true });

const opportunitySchema = new mongoose.Schema({
    title: String,
    company: String,
    description: String,
    link: String,
    deadline: Date,
    type: String
}, { timestamps: true });

const requestSchema = new mongoose.Schema({
    title: String,
    requestType: String,
    description: String,
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
    title: String,
    requestType: String,
    description: String,
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const alumniSchema = new mongoose.Schema({
    name: String,
    batch: String,
    position: String,
    company: String,
    img_url: String,
    linkedin: String
}, { timestamps: true });

const studyMaterialSchema = new mongoose.Schema({
    subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    file_url: String,
    file_type: {
        type: String,
        enum: ['pdf', 'doc', 'ppt', 'video', 'link', 'other']
    },
    uploaded_by: String,
    uploaded_date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Subject = mongoose.model('Subject', subjectSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Timetable = mongoose.model('Timetable', timetableSchema);
export const Student = mongoose.model('Student', studentSchema);
export const Library = mongoose.model('Library', librarySchema);
export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export const Request = mongoose.model('Request', requestSchema);
export const Complaint = mongoose.model('Complaint', complaintSchema);
export const Alumni = mongoose.model('Alumni', alumniSchema);
export const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
