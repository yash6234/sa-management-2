const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const { VerifySA } = require("./utils/VerifyData");
const { methods } = require("express/lib/utils"); // Import the CORS library
require('dotenv').config();
const Hostel = require('./models/SportsAcademy')
const app = express();
const Setting = require("./models/Setting");
const { logger, decryptData } = require('./utils/enc_dec_admin')
const path = require('path');
const Academy = require("./models/Academy");
const AcademyAdmissions = require("./models/AcademyAdmissions");
const fs = require("fs");
const { validateAdminRequest } = require("./middlewares/adminValidation");
const Staff = require("./models/harsh/Staff");
const Coach = require("./models/harsh/Coach");
const Student = require("./models/AcademyAdmissions");
const Attendance = require("./models/harsh/Attendance");
const Ground = require("./models/Ground")
const Receipts = require("./models/Receipts")
const Admin = require("./models/Admin")
const AttendanceSync = require('./adminControllers/harsh/services/attendanceSync');
// CORS configuration: allow everything
app.use(cors());
// Middleware
app.use(express.json());

const connectToDatabase = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connected');

    // Run once after DB connect
    try {
        const adminExists = await Admin.findOne({
            email: "shivam@nuviontech.com"
        });

        if (!adminExists) {
            await Admin.create({
                name: "SS",
                mobile_no: "8799523738",
                email: "shivam@nuviontech.com",
                date_of_birth: new Date("2003-12-27"),
                gender: "male",
                password: "Ss@27122003", // ⚠️ hash recommended
                isVerified: true,
            });

            logger.info("✅ Default admin created");
        } else {
            logger.info("ℹ️ Default admin already exists");
        }
    } catch (err) {
        logger.error("❌ Error creating default admin:", err);
    }
};

// app.use('/superuser', require("./adminRoutes/superuserRoutes"));


//ADMIN ROUTES
app.use('/acade360/admin/auth', require('./adminRoutes/authRoutes'));
app.use('/acade360/admin/academy', require('./adminRoutes/academyRoutes'));
app.use('/acade360/admin/academy/sports', require('./adminRoutes/academySportsRoutes'));
app.use('/acade360/admin/academy/sessions', require('./adminRoutes/academySessionsRoutes'));
app.use('/acade360/admin/academy/plans', require('./adminRoutes/academyPlanRoutes'));
app.use('/acade360/admin/academy/admission', require('./adminRoutes/academyAdmissionRoutes'));
app.use('/acade360/admin/academy/ground', require('./adminRoutes/groundRoutes'));
app.use('/acade360/admin/academy/ground-booking', require('./adminRoutes/groundBookingRoutes'));
app.use('/acade360/admin/academy/ground-sessions', require('./adminRoutes/groundSessionsRoutes'));
app.use('/acade360/admin/academy/ground-plans', require('./adminRoutes/groundPlansRoutes'));
app.use('/acade360/admin/academy/receipt', require('./adminRoutes/receiptRoutes'));
app.use('/acade360/admin/academy/accounts', require('./adminRoutes/accountRoutes'));
app.use('/acade360/admin/academy/inventory', require('./adminRoutes/inventoryRoutes'));
app.use('/acade360/admin/dashboard', require('./adminRoutes/dashboardRoutes'));
app.use('/acade360/admin/settings', require('./adminRoutes/settingRoutes'));
// app.use('/acade360/admin/reports',require('./adminRoutes/reportRoutes'));

// ------------------------------Harsh's Routes------------------------------
app.use('/acade360/admin/academy/attendance', require('./adminRoutes/harsh/attendanceRoutes'));
app.use('/acade360/admin/academy/staff', require('./adminRoutes/harsh/staffRoutes'));
app.use('/acade360/admin/academy/coach', require('./adminRoutes/harsh/coachRoutes'));
const { markAttendance } = require('./adminControllers/harsh/pi/MarkAttendance');
app.use('/api/manager/mark-attendance', markAttendance);

// ----------------------------- Device Attendance Sync -----------------------------
app.get('/health', (req, res) => res.json({ status: 'OK', lastUserSync: AttendanceSync.lastUserSync, lastPunchSync: AttendanceSync.lastPunchSync }));

// Cron: Every 1 min (adjust to */2 * * * * for users only)
cron.schedule('*/1 * * * *', async () => {
    try {
        console.log('Starting sync at', new Date().toISOString());
        await AttendanceSync.runFullSync();
        console.log('Sync complete');
    } catch (error) {
        console.error('Sync failed:', error); // Add Slack/email alert here
        // Retry? Set up exponential backoff
    }
});
// Start initial sync in background so it doesn't block server startup
AttendanceSync.runFullSync().catch(err => console.error('Initial sync failed:', err));

// Optional: Manual trigger
app.post('/sync', async (req, res) => {
    try {
        await AttendanceSync.runFullSync();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//NOT NEEDED (ONLY FOR PRADIP SPORTS ACADEMY)
// app.use('/acade360/admin/academy/facility',require('./adminRoutes/bookingRoutes'));
// app.use('/acade360/admin/academy/sports',require('./adminRoutes/bookingSports'));
// app.use('/acade360/admin/academy/facility-sessions',require('./adminRoutes/bookingSessionsRoutes'));
// app.use('/acade360/admin/academy/facility-booking',require('./adminRoutes/bookingDetailsRoutes'));
// app.use('/acade360/admin/academy/facility-plans',require('./adminRoutes/bookingPlansRoutes'));

const getTodayISTRange = () => {
    const now = new Date();
    const offset = 5.5 * 60 * 60 * 1000; // IST offset
    const istNow = new Date(now.getTime() + offset);

    const startOfDay = new Date(istNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(istNow);
    endOfDay.setHours(23, 59, 59, 999);

    // Convert back to UTC for MongoDB query
    const startUTC = new Date(startOfDay.getTime() - offset);
    const endUTC = new Date(endOfDay.getTime() - offset);

    return { startUTC, endUTC };
};

cron.schedule('5 0 * * *', async () => {
    logger.info("Daily Absent Cron Job Started (12:05 AM IST)");

    try {
        const { startUTC, endUTC } = getTodayISTRange();

        // Get all active users from 3 collections
        const [students, coaches, staff] = await Promise.all([
            Student.find({ active: true, delete: false }).select("roll_no"),
            Coach.find({ active: true, delete: false }).select("roll_no"),
            Staff.find({ active: true, delete: false }).select("roll_no")
        ]);

        const allUsers = [
            ...students.map(s => ({ rollno: s.roll_no, user_type: "Student" })),
            ...coaches.map(c => ({ rollno: c.roll_no, user_type: "Coach" })),
            ...staff.map(s => ({ rollno: s.roll_no, user_type: "Staff" }))
        ];

        if (!allUsers.length) {
            logger.info("No active users found.");
            return;
        }

        // Find users already marked attendance today
        const attendanceToday = await Attendance.find({
            date: { $gte: startUTC, $lte: endUTC },
            delete: false
        }).select("rollno user_type");

        const presentSet = new Set(
            attendanceToday.map(a => `${a.rollno}-${a.user_type}`)
        );

        // Filter absent users
        const absentUsers = allUsers.filter(
            u => !presentSet.has(`${u.rollno}-${u.user_type}`)
        );

        if (!absentUsers.length) {
            logger.info("All users are marked present today.");
            return;
        }

        // Prepare absent records
        const absentRecords = absentUsers.map(u => ({
            rollno: u.rollno,
            tap: "ABSENT",
            user_type: u.user_type,
            attendance_status: "absent",
            source: "DEVICE",
            date: new Date(),
            createdAt: new Date()
        }));

        // Insert absent records
        await Attendance.insertMany(absentRecords);

        logger.info(`Marked ${absentUsers.length} users as ABSENT`);
        console.log(`Absent marked: ${absentUsers.length}`);

    } catch (error) {
        logger.error(`Absent Cron Job Error: ${error.message}`);
        console.error("Absent Cron Error:", error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

console.log("Cron Job Scheduled: Mark Absent Daily at 12:05 AM IST");


// ------------------------------Harsh's Routes END--------------------------


app.use('/acade360/admin/user/profile', require('./adminRoutes/userProfileRoutes'));

//MANAGER ROUTES
app.use('/acade360/manager/auth', require('./managerRoutes/authRoutes'));

//USER ROUTES
app.use('/acade360/user/auth', require('./userRoutes/authRoutes'));

//OTHER ROUTES
app.use('/acade360/details', require('./routes/logoNameRoutes'));
app.use('/acade360/academy/secure/route', require('./routes/otherRoutes'));

// ------------------------------ CMS (Website Management) ------------------------------
const cmsRouter = express.Router();
const imageEncryptMiddleware = require('./jenil/middlewares/imageEncrypt');
const { optionalDecryptPayload, encryptResponse } = require('./jenil/middlewares/encryptedPayload');
const cmsHomeController = require('./jenil/controllers/homeController');
const { serveImage } = require('./jenil/controllers/imageController');
const { upload, standardizeFilePath } = require('./jenil/middlewares/upload');

// Apply decryption middleware to all CMS routes (supports body/header encrypted payloads)
cmsRouter.use(optionalDecryptPayload);

// Apply image encryption (converts file paths to secure tokens)
cmsRouter.use(imageEncryptMiddleware);

// Always encrypt all CMS responses
cmsRouter.use(encryptResponse);

// 1. Generic Media Upload (for quill editor or standalone admin use)
cmsRouter.post('/upload', upload.any(), standardizeFilePath, (req, res) => {
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) return res.status(400).json({ success: false, error: 'No files uploaded' });

    // Return the raw filenames. Because they start with 'uploads/cms/', 
    // the imageEncryptMiddleware interceptor will detect them and encrypt them 
    // in a single pass before sending the response to the frontend.
    const responses = files.map(file => ({
        url: file.filename
    }));

    if (responses.length === 1) {
        return res.status(200).json({ success: true, url: responses[0].url, data: responses[0] });
    }
    res.status(200).json({ success: true, count: responses.length, files: responses });
});

// 2. Section-specific Admin Routes
cmsRouter.use('/home', require('./jenil/routes/homeRoutes'));
cmsRouter.use('/about', require('./jenil/routes/aboutAcademyRoutes'));
cmsRouter.use('/programs', require('./jenil/routes/programsPageRoutes'));
cmsRouter.use('/gallery', require('./jenil/routes/galleryPageRoutes'));
cmsRouter.use('/playground', require('./jenil/routes/playgroundPageRoutes'));
cmsRouter.use('/admissions', require('./jenil/routes/admissionsPageRoutes'));
cmsRouter.use('/contact', require('./jenil/routes/contactPageRoutes'));
cmsRouter.use('/admin/sections', require('./jenil/routes/adminPageRoutes'));

// 3. Shared Endpoints
cmsRouter.get('/footer', cmsHomeController.getFooterData);
cmsRouter.use('/public', express.static(path.join(__dirname, 'jenil', 'public')));

// 4. Standalone Image Serving (Handles /acade360/:token and anything under /acade360/ that looks like a token)
cmsRouter.get('/img/:token', serveImage);
cmsRouter.get(/(.*\/)?([^/]+\.[^/]+)$/, (req, res, next) => {
    // This matches any path that ends with a filename-like segment (has a dot)
    // and captures the token as the last part.
    return serveImage(req, res, next);
});

// 5. Dynamic Content Pages (Catch-all for sections)
cmsRouter.use('/:page', require('./jenil/routes/dynamicRoutes'));

// CMS Error Handler
cmsRouter.use(require('./jenil/middlewares/errorHandler'));

// Mount CMS under /acade360
app.use('/acade360', cmsRouter);
// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
//LOGO ROUTE
app.get('/acade360/academy/logo/:file_name', (req, res) => {
    const { file_name } = req.params;

    // Sanitize input
    if (file_name.includes('..')) {
        return res.status(400).send('Invalid file name');
    }

    const logoPath = path.join(__dirname, 'Logo', file_name);

    res.sendFile(logoPath, (err) => {
        if (err) {
            if (!res.headersSent) {
                res.status(err.statusCode || 500).send('File not found');
            } else {
                // Optionally log the issue
                console.error('Headers already sent, cannot respond with error:', err.message);
            }
        }
    });
});

app.get('/acade360/file/:data', async (req, res) => {
    // 1) Validate admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt incoming payload
    let decryptedData;
    try {
        decryptedData = decryptData(req.params.data);
    } catch (error) {
        logger.error("Decryption Failed:", error.message);
        return res.status(400).json({ message: "Invalid encrypted data" });
    }

    logger.info("User Verified Successfully");

    const { roll_no, file_name } = decryptedData;

    if (!file_name || file_name.includes("..")) {
        return res.status(400).json({ message: "Invalid file name" });
    }

    // 3) Fields that contain file names
    const fileFields = [
        "trainee_photo",
        "trainee_signature",
        "father_signature",
        "aadhar",
        "self_declaration",
        "medical_form",
        "other_docs"     // array
    ];

    // 4) Find admission and check file existence in any field
    const admission = await AcademyAdmissions.findOne(
        { roll_no, delete: false }
    ).lean();

    if (!admission) {
        return res.status(404).json({ message: "Admission not found" });
    }

    let found = false;

    // 5) Check single-value fields
    for (const field of fileFields) {
        const value = admission[field];

        if (!value) continue;

        // CASE: array field -> other_docs
        if (Array.isArray(value)) {
            if (value.includes(file_name)) {
                found = true;
                break;
            }
        }

        // CASE: single file fields
        if (value === file_name) {
            found = true;
            break;
        }
    }

    if (!found) {
        logger.error("File not found in admission record");
        return res.status(404).json({ message: "File does not exist in database" });
    }

    // 6) Serve from uploads/academy_admissions
    const filePath = path.join(
        __dirname,
        "uploads",
        "academy_admissions",
        file_name
    );


    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
        }
    });
});

app.get('/acade360/id_card/:data', async (req, res) => {
    // 1) Validate admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt incoming payload
    let decryptedData;
    try {
        decryptedData = decryptData(req.params.data);
    } catch (error) {
        logger.error("Decryption Failed:", error.message);
        return res.status(400).json({ message: "Invalid encrypted data" });
    }

    logger.info("User Verified Successfully");

    const { roll_no } = decryptedData;



    // 4) Find admission and check file existence in any field
    const admission = await AcademyAdmissions.findOne(
        { roll_no, delete: false }
    ).lean();

    if (!admission) {
        return res.status(404).json({ message: "Admission not found" });
    }
    const file_name = roll_no + ".jpg"

    // 6) Serve from uploads/academy_admissions
    const filePath = path.join(
        __dirname,
        "id_card_output",
        file_name
    );


    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
        }
    });
});

app.get('/acade360/ground/file/:data', async (req, res) => {
    // 1) Validate admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt incoming payload
    let decryptedData;
    try {
        decryptedData = decryptData(req.params.data);
    } catch (error) {
        logger.error("Decryption Failed:", error.message);
        return res.status(400).json({ message: "Invalid encrypted data" });
    }

    logger.info("User Verified Successfully");

    const { ground_id, file_name } = decryptedData;
    console.log(ground_id)
    if (!file_name || file_name.includes("..")) {
        return res.status(400).json({ message: "Invalid file name" });
    }

    // 3) Fields that contain file names
    const fileFields = [
        "images"     // array
    ];

    // 4) Find admission and check file existence in any field
    const admission = await Ground.findById(ground_id).lean();

    if (!admission || admission.delete == true) {
        logger.error("Ground Not Found")
        return res.status(404).json({ message: "Ground not found" });
    }

    let found = false;

    // 5) Check single-value fields
    for (const field of fileFields) {
        const value = admission[field];

        if (!value) continue;

        // CASE: array field -> other_docs
        if (Array.isArray(value)) {
            if (value.includes(file_name)) {
                found = true;
                break;
            }
        }

        // CASE: single file fields
        if (value === file_name) {
            found = true;
            break;
        }
    }

    if (!found) {
        logger.error("File not found in ground record");
        return res.status(404).json({ message: "File does not exist in database" });
    }

    // 6) Serve from uploads/academy_admissions
    const filePath = path.join(
        __dirname,
        "uploads",
        "ground",
        file_name
    );


    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
        }
    });
});

app.get('/acade360/staff/file/:data', async (req, res) => {
    // 1) Validate admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt incoming payload
    let decryptedData;
    try {
        decryptedData = decryptData(req.params.data);
    } catch (error) {
        logger.error("Decryption Failed:", error.message);
        return res.status(400).json({ message: "Invalid encrypted data" });
    }

    logger.info("User Verified Successfully");

    const { roll_no, file_name } = decryptedData;

    if (!file_name || file_name.includes("..")) {
        return res.status(400).json({ message: "Invalid file name" });
    }

    // 3) Fields that contain file names
    const fileFields = [
        "staff_photo"
    ];

    // 4) Find admission and check file existence in any field
    const staff = await Staff.findOne(
        { roll_no, delete: false }
    ).lean();

    if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
    }

    let found = false;

    // 5) Check single-value fields
    for (const field of fileFields) {
        const value = staff[field];

        if (!value) continue;

        // CASE: array field -> other_docs
        if (Array.isArray(value)) {
            if (value.includes(file_name)) {
                found = true;
                break;
            }
        }

        // CASE: single file fields
        if (value === file_name) {
            found = true;
            break;
        }
    }

    if (!found) {
        logger.error("File not found in Staff record");
        return res.status(404).json({ message: "File does not exist in database" });
    }

    // 6) Serve from uploads/academy_admissions
    const filePath = path.join(
        __dirname,
        "uploads",
        "Staff",
        file_name
    );


    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
        }
    });
});

app.get('/acade360/coach/file/:data', async (req, res) => {
    // 1) Validate admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt incoming payload
    let decryptedData;
    try {
        decryptedData = decryptData(req.params.data);
    } catch (error) {
        logger.error("Decryption Failed:", error.message);
        return res.status(400).json({ message: "Invalid encrypted data" });
    }

    logger.info("User Verified Successfully");

    const { roll_no, file_name } = decryptedData;

    if (!file_name || file_name.includes("..")) {
        return res.status(400).json({ message: "Invalid file name" });
    }

    // 3) Fields that contain file names
    const fileFields = [
        "coach_photo"
    ];

    // 4) Find admission and check file existence in any field
    const staff = await Coach.findOne(
        { roll_no, delete: false }
    ).lean();

    if (!staff) {
        return res.status(404).json({ message: "Coach not found" });
    }

    let found = false;

    // 5) Check single-value fields
    for (const field of fileFields) {
        const value = staff[field];

        if (!value) continue;

        // CASE: array field -> other_docs
        if (Array.isArray(value)) {
            if (value.includes(file_name)) {
                found = true;
                break;
            }
        }

        // CASE: single file fields
        if (value === file_name) {
            found = true;
            break;
        }
    }

    if (!found) {
        logger.error("File not found in Coach record");
        return res.status(404).json({ message: "File does not exist in database" });
    }

    // 6) Serve from uploads/academy_admissions
    const filePath = path.join(
        __dirname,
        "uploads",
        "Coach",
        file_name
    );


    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
        }
    });
});

//Receipt
app.get('/acade360/receipt/:data', async (req, res) => {
    // 1) Validate admin
    const result = await validateAdminRequest(req, res);
    if (result.error) {
        return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt incoming payload
    let decryptedData;
    try {
        decryptedData = decryptData(req.params.data);
    } catch (error) {
        logger.error("Decryption Failed:", error.message);
        return res.status(400).json({ message: "Invalid encrypted data" });
    }

    logger.info("User Verified Successfully");

    const { receipt_no } = decryptedData;

    if (!receipt_no) {
        return res.status(400).json({ message: "Invalid file name" });
    }

    // 4) Find admission and check file existence in any field
    const receipt = await Receipts.findOne(
        { receipt_no, delete: false }
    ).lean();

    if (!receipt) {
        logger.error("Receipt Not Found")
        return res.status(404).json({ message: "Receipt not found" });
    }

    // 6) Serve from uploads/academy_admissions
    const filePath = path.join(
        __dirname,
        "receipts",
        receipt.file_name
    );


    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
        }
    });
});

const updateHostel = async () => {
    try {
        const dt = await VerifySA({
            hostel_id: process.env.sport_sacademy_id,
            origin: process.env.FRONTEND_DOMAIN,
            borigin: process.env.BACKEND_DOMAIN,
        });

        if (!dt) {
            logger.error("❌ VerifySA returned null, skipping hostel update.");
            return;
        }

        const hdt = await Hostel.findById(process.env.sport_sacademy_id);

        if (!hdt) {
            const d1 = new Hostel(dt);
            await d1.save();
            logger.info('🏠 New Academy saved.');
            const sdt = await Setting.findOne({ field: 'academy_name' });
            if (!sdt) {
                const sdt1 = new Setting({
                    field: 'academy_name',
                    value: dt.name
                })
                await sdt1.save()
            }
            else {
                sdt.value = dt.name;
                await sdt.save();
            }
            const ldt = await Setting.findOne({ field: 'logo' });
            if (!ldt) {
                const ldt1 = new Setting({
                    field: 'logo',
                    value: 'logo.png'
                })
                await ldt1.save()
            }
            const adt = await Academy.findOne();
            if (!adt) {
                const adt1 = new Academy({
                    name: dt.name,
                    address: dt.address,
                    contact_no: dt.contact_phone,
                    contact_name: dt.contact_person,
                })
                await adt1.save()
            }
        } else {
            const sdt = await Setting.findOne({ field: 'academy_name' });
            if (!sdt) {
                const sdt1 = new Setting({
                    field: 'academy_name',
                    value: dt.name
                })
                await sdt1.save()
            }
            else {
                sdt.value = dt.name;
                await sdt.save();
            }
            const ldt = await Setting.findOne({ field: 'logo' });
            if (!ldt) {
                const ldt1 = new Setting({
                    field: 'logo',
                    value: 'logo.png'
                })
                await ldt1.save()
            }
            const adt = await Academy.findOne();
            if (!adt) {
                const adt1 = new Academy({
                    name: dt.name,
                    address: dt.address,
                    contact_no: dt.contact_phone,
                    contact_name: dt.contact_person,
                })
                await adt1.save()
            }
            await Hostel.findByIdAndUpdate(process.env.sport_sacademy_id, dt, { new: true });
            logger.info('🔄 Academy updated.');
        }
    } catch (err) {
        logger.error(`❌ Error in someFunction: ${err.message}`);
    }
};
updateHostel();
function scheduleUpdateHostel() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    // Calculate the delay until the next 30-minute mark
    const nextHalfHour = (minutes < 30 ? 30 : 60) - minutes;
    const delay = nextHalfHour * 60 * 1000 - seconds * 1000 - milliseconds;

    setTimeout(() => {
        updateHostel();

        // Set the interval to run every 30 minutes
        setInterval(updateHostel, 30 * 60 * 1000);
    }, delay);
}

// Start the scheduling logic
scheduleUpdateHostel();

async function updateTimeLeft() {
    try {
        const now = new Date();
        // Only update active & non-deleted admissions
        const docs = await AcademyAdmissions.find(
            { active: true, delete: false },
            { expiry_date: 1 }
        );

        const updates = docs.map(doc => {
            const timeLeft = doc.expiry_date - now;
            const isExpired = timeLeft <= 0;

            return AcademyAdmissions.updateOne(
                { _id: doc._id },
                {
                    $set: {
                        time_left: isExpired ? 0 : timeLeft,
                        active: isExpired ? false : true
                    }
                }
            );
        });

        await Promise.all(updates);

    } catch (err) {
        console.error("Time Left Cron Error:", err.message);
    }
}

setInterval(updateTimeLeft, 60 * 1000);

// Start server
const PORT = process.env.PORT || 5005;

const startServer = async () => {
    try {
        await connectToDatabase();
        console.log('🏁 Reached final listen() call on port', PORT);
        app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

startServer();
