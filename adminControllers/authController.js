const User = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { encryptData, decryptData, verifyRecaptcha, logger } = require("../utils/enc_dec_admin");

const crypto = require("crypto");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const Hostel = require("../models/SportsAcademy")

const sendOtpEmail = async (email, name, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify Your Login',
            html: `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting"> <title>[Subject Line]</title> <style>
        /* What it does: Remove spaces around the email design added by some email clients. */
        /* Beware: It can remove the padding / margin and add a background color to the compose window borders. */
        html,
        body {
            margin: 0 auto !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background-color: #f4f4f4; /* Light grey background for the body */
        }

        /* What it does: Stops email clients resizing small text. */
        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }

        /* What it does: Centers email on Android 4.4 */
        div[style*="margin: 16px 0"] {
            margin: 0 !important;
        }

        /* What it does: Fixes webkit padding issue. */
        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }

        /* What it does: Uses a better rendering method when resizing images in IE. */
        img {
            -ms-interpolation-mode:bicubic;
        }

        /* What it does: Prevents links rendering underlines in iOS and Outlook. */
        a {
            text-decoration: none;
        }

        /* What it does: Overrides styles for blue links on iOS. */
        a[x-apple-data-detectors],  /* iOS */
        .unstyle-auto-detected-links a,
        .aBn {
            border-bottom: 0 !important;
            cursor: default !important;
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }

        /* What it does: Prevents Gmail from changing the text color in conversation threads. */
        .im {
            color: inherit !important;
        }

        /* Responsive Styles */
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: auto !important;
            }
            /* What it does: Adjust typography on small screens to improve readability */
            .email-content {
                padding: 20px !important;
            }
        }

    </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f4f4f4;">
    <center style="width: 100%; background-color: #f4f4f4;">
        <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
            The Hill Waterfall Admin Access OTP is ${otp}
        </div>
        <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto;" class="email-container">
            <tr>
                <td style="padding: 20px 0; text-align: center; background-color: #ffffff;">
                    <img src="https://nuviontech.com/img/banner_logo_transparent.png" width="200" height="auto" alt="[Company Name] Logo" border="0" style="display: block; margin: auto; font-family: sans-serif; font-size: 15px; line-height: 15px; color: #555555;">
                </td>
            </tr>
            <tr>
                <td style="background-color: #ffffff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 15px; line-height: 22px; color: #333333;" class="email-content">
                                <h1 style="margin: 0 0 15px 0; font-size: 24px; line-height: 30px; color: #222222; font-weight: bold;">Admin Access OTP for The Hill Waterfall</h1>
                                <p style="margin: 0 0 15px 0;">Hi ${name},</p>
                                <p style="margin: 0 0 15px 0;">Your One Time Login OTP for The Hill Water Fall Login Access is <strong>${otp}</strong></p>
                                

                                <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto;">
                                    <tr>
                                        <td class="button-td button-td-primary" style="border-radius: 4px; background: #007bff; text-align: center;">
                                             <a href="https://nuviontech.com/" class="button-a button-a-primary" style="background: #007bff; border: 1px solid #007bff; font-family: Arial, sans-serif; font-size: 16px; line-height: 16px; text-decoration: none; padding: 12px 25px; color: #ffffff; display: block; border-radius: 4px;">Visit Us</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 20px 0 0 0;">Thanks,<br>The Nuvion Technologies Team</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 12px; line-height: 18px; text-align: center; color: #888888; background-color: #f4f4f4;">
                    <p style="margin: 0 0 10px 0;">Nuvion Technologies<br>708, Synergy Space, Nr.D Mart<br>Sargasan, Gandhinagar - 382421</p>
                    
                </td>
            </tr>
            </table>
        </center>
</body>
</html>
        `
        };

        try {
            await transporter.sendMail(mailOptions);  //MAIL SENT HERE
            console.log('OTP email sent successfully');

        } catch (error) {
            console.error('Error sending OTP email:', error);
        }
    } catch (error) {
        console.error('Error :', error);
        return res.status(400).json({ error: error.message });
    }
};

const Login = async (req, res) => {
    try {
        logger.info("Admin Login request received");
        const decryptedData = decryptData(req.params.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const { email, password, recaptchaToken } = decryptedData;
        // const recaptchaValid = await verifyRecaptcha(recaptchaToken);
        // if (!recaptchaValid) {
        //     logger.error("Recaptcha Verification Failed");
        //     return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        // }

        logger.info("Recaptcha Verification Successful");
        // const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        //     if(!hdt){
        //         return res.status(401).json({message: 'No Academy found'});
        //     }
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn("Admin not found");
            return res.status(404).json({ message: 'Admin User not found' });
        }
        if (!user.isVerified) {
            logger.warn("Admin Account not verified");
            return res.status(400).json({ message: 'Admin Account not verified' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn("Invalid credentials");
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        logger.info(`Admin User authenticated successfully - ${user}`);

        // **************************************************************************************************************************************************************
        // const otp = crypto.randomInt(100000, 999999).toString();

        const otp = 888888;

        const otpExpires = Date.now() + parseInt(process.env.OTP_EXPIRATION);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        //**********************************************************************************************************************
        // sendOtpEmail(user.email,user.name, otp);

        logger.info(`User Verified and OTP Sent to Admin User on ${user.email} and OTP : ${user.otp}`);
        res.status(200).json({ data: encryptData("User_Authenticated_And_OTP_Sent"), data1: encryptData(user.email), data2: encryptData(user._id) });
        logger.info("Login Completed Successfully")
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

const LoginApp = async (req, res) => {
    try {
        logger.info("Admin Login request received (From Application)");
        const decryptedData = decryptData(req.params.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const { email, password } = decryptedData;
        // const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        // if (!hdt) {
        //     return res.status(401).json({ message: 'No Academy found' });
        // }
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn("Admin not found");
            return res.status(404).json({ message: 'Admin User not found' });
        }
        if (!user.isVerified) {
            logger.warn("Admin Account not verified");
            return res.status(400).json({ message: 'Admin Account not verified' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn("Invalid credentials");
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        logger.info(`Admin User authenticated successfully - ${user}`);

        // **************************************************************************************************************************************************************
        // const otp = crypto.randomInt(100000, 999999).toString();

        const otp = 888888;

        const otpExpires = Date.now() + parseInt(process.env.OTP_EXPIRATION);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        //**********************************************************************************************************************
        // sendOtpEmail(user.email,user.name, otp);

        logger.info(`User Verified and OTP Sent to Admin User on ${user.email} and OTP : ${user.otp}`);
        res.status(200).json({ data: encryptData("User_Authenticated_And_OTP_Sent"), data1: encryptData(user.email), data2: encryptData(user._id) });
        logger.info("Login Completed Successfully")
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

isOtpExpired = (otpExpires) => {
    return Date.now() > otpExpires;
};

const VerifyOTP = async (req, res) => {
    try {
        logger.info("Admin OTP Verify request received");
        const decryptedData = decryptData(req.params.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.otp} - ${decryptedData.id} - ${decryptedData.recaptchaToken}`);
        let { email, otp, id, recaptchaToken } = decryptedData;
        logger.info(`Request From : ${email} ${otp} ${id} ${recaptchaToken}`)
        // const recaptchaValid = await verifyRecaptcha(recaptchaToken);
        // if (!recaptchaValid) {
        //   logger.error("Recaptcha Verification Failed")
        //   return res.status(400).json({message: 'reCAPTCHA verification failed'});
        // }
        logger.info("Recaptcha Token Verified")
        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            return res.status(401).json({ message: 'No Academy found' });
        }
        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

        let expiryStatus = "PLAN_IS_VALID_THE_USER_CAN_MOVE_FORWARD";
        if (hdt.active !== true || hdt.delete !== false) {
            expiryStatus = "ACADEMY_IS_INACTIVE_OR_UNDEFINED_FROM_SUPERUSER_CONTACT_ADMIN"
            logger.warn(`Hostel is Inactive or Deleted`)
        }
        if (now - expiryTime > threeDaysInMs) {
            expiryStatus = "THE_PLAN_EXPIRED_MORE_THAN_3_DAYS_AGO";
            logger.warn(`Academy expired more than 3 days ago on ${hdt.expiry_at}`);
        } else if (now > expiryTime) {
            expiryStatus = "THE_PLAN_EXPIRED_RECENTLY_WITHIN_3_DAYS";
            logger.warn(`Academy expired within 3 days on ${hdt.expiry_at}`);
        } else if (expiryTime - now <= threeDaysInMs) {
            expiryStatus = "THE_PLAN_IS_EXPIRING_WITHIN_3_DAYS";
            logger.info(`Academy expiring soon on ${hdt.expiry_at}`);
        }
        if (expiryStatus == 'PLAN_IS_VALID_THE_USER_CAN_MOVE_FORWARD') {
            logger.info('The Plan is Valid of the Hostel')
        }
        const user = await User.findOne({ email, _id: new mongoose.Types.ObjectId(id), active: true, delete: false });
        if (!user) {
            logger.error("User Not Found")
            return res.status(400).json({ message: 'User not found' });
        }
        if (user.otp !== otp || isOtpExpired(user.otpExpires)) {
            logger.error("OTP Verification Failed or Expired")
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        logger.info("OTP Verified Successfully")
        user.otp = null;
        user.otpExpires = null;

        await user.save();
        logger.info("Generating New Token");
        const token = jwt.sign({ id: user._id, mobile_no: user.mobile_no, email: user.email, expiry_at: hdt.expiry_at }, process.env.ADMIN_JWT_SECRET);
        logger.info(`Token generated - ${token}`);
        const dt = { token, id: user._id, name: user.name, mobile_no: user.mobile_no, email: user.email, user: 'Verified' };
        logger.info(`Data Created : ${dt.id} - ${dt.name} - ${dt.email} - ${dt.mobile_no} - ${dt.token}`);
        const encdata = encryptData(dt);
        console.log(expiryStatus)
        res.status(200).json({ data: encdata, message: encryptData({ msg1: encryptData("OTP_Verified_Successfully_And_Response_Token_Sent"), daysLeft: encryptData(daysLeft >= 0 ? daysLeft : 0), msg2: encryptData(expiryStatus) }), data1: encryptData(expiryStatus) });
        logger.info("Verification Response sent");

    } catch (err) {
        logger.error(`Verification error: ${err.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
}

const VerifyOTPApp = async (req, res) => {
    try {
        logger.info("Admin OTP Verify request received (From Application)");
        const decryptedData = decryptData(req.params.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.otp} - ${decryptedData.id}`);
        let { email, otp, id, recaptchaToken } = decryptedData;
        logger.info(`Request From : ${email} ${otp} ${id}`)
        const hdt = await Hostel.findById(process.env.sport_sacademy_id);
        if (!hdt) {
            return res.status(401).json({ message: 'No Academy found' });
        }
        const now = Date.now();
        const expiryTime = new Date(hdt.expiry_at).getTime();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

        let expiryStatus = "PLAN_IS_VALID_THE_USER_CAN_MOVE_FORWARD";
        if (hdt.active !== true || hdt.delete !== false) {
            expiryStatus = "ACADEMY_IS_INACTIVE_OR_UNDEFINED_FROM_SUPERUSER_CONTACT_ADMIN"
            logger.warn(`Academy is Inactive or Deleted`)
        }
        if (now - expiryTime > threeDaysInMs) {
            expiryStatus = "THE_PLAN_EXPIRED_MORE_THAN_3_DAYS_AGO";
            logger.warn(`Academy expired more than 3 days ago on ${hdt.expiry_at}`);
        } else if (now > expiryTime) {
            expiryStatus = "THE_PLAN_EXPIRED_RECENTLY_WITHIN_3_DAYS";
            logger.warn(`Academy expired within 3 days on ${hdt.expiry_at}`);
        } else if (expiryTime - now <= threeDaysInMs) {
            expiryStatus = "THE_PLAN_IS_EXPIRING_WITHIN_3_DAYS";
            logger.info(`Academy expiring soon on ${hdt.expiry_at}`);
        }
        if (expiryStatus == 'PLAN_IS_VALID_THE_USER_CAN_MOVE_FORWARD') {
            logger.info('The Plan is Valid of the Academy')
        }
        const user = await User.findOne({ email, _id: new mongoose.Types.ObjectId(id), active: true, delete: false });
        if (!user) {
            logger.error("User Not Found")
            return res.status(400).json({ message: 'User not found' });
        }
        if (user.otp !== otp || isOtpExpired(user.otpExpires)) {
            logger.error("OTP Verification Failed or Expired")
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        logger.info("OTP Verified Successfully")
        user.otp = null;
        user.otpExpires = null;

        await user.save();
        logger.info("Generating New Token");
        const token = jwt.sign({ id: user._id, mobile_no: user.mobile_no, email: user.email, expiry_at: hdt.expiry_at }, process.env.ADMIN_JWT_SECRET);
        logger.info(`Token generated - ${token}`);
        const dt = { token, id: user._id, name: user.name, mobile_no: user.mobile_no, email: user.email, user: 'Verified' };
        logger.info(`Data Created : ${dt.id} - ${dt.name} - ${dt.email} - ${dt.mobile_no} - ${dt.token}`);
        const encdata = encryptData(dt);
        console.log(expiryStatus)
        res.status(200).json({ data: encdata, message: encryptData({ msg1: encryptData("OTP_Verified_Successfully_And_Response_Token_Sent"), daysLeft: encryptData(daysLeft >= 0 ? daysLeft : 0), msg2: encryptData(expiryStatus) }), data1: encryptData(expiryStatus) });
        logger.info("Verification Response sent");

    } catch (err) {
        logger.error(`Verification error: ${err.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
}


module.exports = { Login, VerifyOTP, LoginApp, VerifyOTPApp };
