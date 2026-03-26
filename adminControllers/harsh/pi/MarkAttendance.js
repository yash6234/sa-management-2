const AcademyAdmissions = require("../../../models/AcademyAdmissions");
const Attendance = require("../../../models/harsh/Attendance");
const {logger:log} = require("../../../utils/enc_dec_admin");
const markAttendance = async (req, res) => {
    try {

        const { id, rollno } = req.body;

        const SECRET_KEY = "CJeFZwKhvRXjv7YR3UBgpRwRmyp9BExek1W4Cau7e3Qr90Lpy6PSRV4Lp6W5EDpfnQ4qtFQ7dUbSYGkKAHXWRg2MzqiZcmYHeGJvT1SmiB6v11m4yN8QwT9qYh";

        log(`TAKING_ATTENDANCE_${rollno}`);

        // AUTH CHECK
        if (id !== SECRET_KEY) {
            return res.status(403).json({ message: "Unauthorized Attendance" });
        }

        if (!rollno) {
            return res.status(400).json({ message: "Roll number is required." });
        }

        const currentDate = new Date();
        const todayStart = new Date(currentDate.setHours(0, 0, 0, 0));


        if (!String(rollno).startsWith("202")) {
            return res.status(404).json({ message: "Not a valid roll number" });
        }

        const student = await AcademyAdmissions.findOne({ roll_no: rollno });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const planExpiryDate = new Date(student.to);
        const daysLeft = Math.ceil((planExpiryDate - new Date()) / (1000 * 60 * 60 * 24));

        const attendanceExists = await Attendance.findOne({
            rollno,
            date: { $gte: todayStart },
            delete: false
        });

        if (attendanceExists) {
            return res.status(201).json({
                message: "Attendance already marked for today.",
                msg1: "already_marked"
            });
        }

        if (daysLeft < 0) {
            return res.status(201).json({
                message: "Plan expired. Please renew to mark attendance.",
                msg1: "plan_expired"
            });
        }

        const attendanceRecord = new Attendance({
            rollno,
            tap: "IN",
            user_type: "Student",
            source: "PI",
            attendance_status: "present",
            active: true
        });

        await attendanceRecord.save();

        log(`SUCCESSFULLY_MARKED_ATTENDANCE_${rollno}`);

        return res.status(200).json({
            message: `Attendance marked successfully.${daysLeft <= 3 ? ` Note: Plan expiring in ${daysLeft} day(s).` : ''}`,
            attendanceDate: attendanceRecord.date,
            msg1: `plan_${daysLeft <= 3 ? daysLeft : ''}`
        });

    } catch (error) {

        log(`ERROR_MARKING_ATTENDANCE`);
        console.error("Error marking attendance:", error);

        return res.status(500).json({
            message: "An error occurred while marking attendance."
        });
    }
};

module.exports = {
    markAttendance
};
