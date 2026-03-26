// const axios = require("axios");
// const moment = require("moment");

// const Staff = require("../../../models/harsh/Staff");
// const Coach = require("../../../models/harsh/Coach");
// const Attendance = require("../../../models/harsh/Attendance");

// const GSA_URL = process.env.GSA_URL;
// const API_KEY = process.env.TIMEWATCH_API_KEY;

// const DEVICE_ID = "TW1KDW0002250036";

// const HEADERS = {
//   "X-Api-Key": API_KEY,
//   "Content-Type": "application/json"
// };

// let lastPunchSync = null;
// let lastUserSync = null;

// class AttendanceSync {

//   // --------------------------------
//   // GET ALL USERS FROM DATABASE
//   // --------------------------------
//   static async getAllUsers() {

//     const staff = await Staff.find({ active: true }).select("uuid roll_no");
//     const coach = await Coach.find({ active: true }).select("uuid roll_no");

//     const users = [
//       ...staff.map(u => ({
//         uuid: u.uuid,
//         roll_no: u.roll_no,
//         type: "staff"
//       })),
//       ...coach.map(u => ({
//         uuid: u.uuid,
//         roll_no: u.roll_no,
//         type: "coach"
//       }))
//     ];

//     return users;
//   }


//   // --------------------------------
//   // FETCH USER IMAGE
//   // --------------------------------
//   static async fetchUserImage(userId) {

//     try {

//       const response = await axios.get(
//         `${GSA_URL}/TimeWatchAPI/GetUserImage?DeviceID=${DEVICE_ID}&UserID=${userId}`,
//         {
//           headers: HEADERS,
//           responseType: "arraybuffer"
//         }
//       );

//       return `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;

//     } catch (error) {

//       console.log("Image fetch failed:", userId);
//       return "";

//     }
//   }


//   // --------------------------------
//   // SYNC USERS
//   // --------------------------------
//   static async syncUsers() {

//     const now = new Date();

//     if (lastUserSync && moment(now).diff(lastUserSync, "minutes") < 10) {
//       console.log("User sync skipped");
//       return;
//     }

//     console.log("Starting user sync...");

//     const users = await this.getAllUsers();

//     let synced = 0;

//     for (const user of users) {

//       try {

//         const response = await axios.post(
//           `${GSA_URL}/TimeWatchAPI/GetUserDetails`,
//           {
//             DeviceID: DEVICE_ID,
//             UserID: user.uuid
//           },
//           { headers: HEADERS }
//         );

//         if (!response.data.Success) continue;

//         const deviceUser = response.data.Data?.[0];
//         if (!deviceUser) continue;

//         const image = await this.fetchUserImage(user.uuid);

//         const updateData = {
//           fullName: deviceUser.Name,
//           photo: image,
//           active: true
//         };

//         if (user.type === "coach") {

//           await Coach.updateOne(
//             { uuid: user.uuid },
//             { $set: updateData }
//           );

//         } else {

//           await Staff.updateOne(
//             { uuid: user.uuid },
//             { $set: updateData }
//           );

//         }

//         synced++;

//       } catch (error) {

//         console.log("User sync error:", user.uuid);

//       }

//     }

//     lastUserSync = now;

//     console.log(`User sync completed (${synced})`);

//   }


//   // --------------------------------
//   // SYNC PUNCHES
//   // --------------------------------
//   static async syncPunches() {

//     const now = new Date();

//     if (lastPunchSync && moment(now).diff(lastPunchSync, "seconds") < 50) {
//       console.log("Punch sync skipped");
//       return;
//     }

//     console.log("Fetching punches...");

//     const fromDate = moment().subtract(2, "minutes").format("YYYY-MM-DDTHH:mm:ss");
//     const toDate = moment().format("YYYY-MM-DDTHH:mm:ss");

//     try {

//       const response = await axios.post(
//         `${GSA_URL}/TimeWatchAPI/GetPunchData`,
//         {
//           DeviceID: DEVICE_ID,
//           FromDate: fromDate,
//           ToDate: toDate,
//           UserID: ""
//         },
//         { headers: HEADERS }
//       );

//       if (!response.data.Success) {

//         console.log("Punch fetch failed");
//         return;

//       }

//       const punches = response.data.Data || [];

//       console.log("Punch count:", punches.length);

//       let synced = 0;

//       for (const punch of punches) {

//         if (!punch.UserID || !punch.PunchTime) continue;

//         const punchTime = new Date(punch.PunchTime);
//         let dt;
//         dt = await Staff.findOne({uuid:punch.UserID});
//         if(!dt){
//           dt = await Coach.findOne({uuid:punch.UserID});
//           if(!dt){
//             console.log("User not found:", punch.UserID);
//             continue;
//           }
//         };

//         const exists = await Attendance.findOne({
//           rollno: dt.roll_no||punch.UserID,
//           date: punchTime
//         });

//         if (exists) continue;

//         await Attendance.create({
//           rollno:  dt.roll_no||punch.UserID,
//           date: punchTime,
//           user_type: dt.roll_no[0] === "S" ? "Staff" : "Coach",
//           tap: punch.InOutMode === "1" ? "OUT" : "IN",
//           attendance_status: "present",
//           source: "DEVICE",
//           active: true,
//           delete: false
//         });

//         synced++;

//       }

//       console.log("Punch synced:", synced);

//       lastPunchSync = now;

//     } catch (error) {

//       console.log("Punch sync error:", error.message);

//     }

//   }


//   // --------------------------------
//   // DEVICE TIME SYNC
//   // --------------------------------
//   static async syncDeviceTime() {

//     try {

//       await axios.post(
//         `${GSA_URL}/TimeWatchAPI/SyncTime`,
//         {
//           DeviceList: [DEVICE_ID]
//         },
//         { headers: HEADERS }
//       );

//       console.log("Device time synced");

//     } catch (error) {

//       console.log("Time sync failed");

//     }

//   }


//   // --------------------------------
//   // FULL SYNC
//   // --------------------------------
//   static async runFullSync() {

//     await this.syncUsers();
//     await this.syncPunches();

//   }

// }

// module.exports = AttendanceSync;

const axios = require("axios");
const moment = require("moment");

const Staff = require("../../../models/harsh/Staff");
const Coach = require("../../../models/harsh/Coach");
const Attendance = require("../../../models/harsh/Attendance");

const GSA_URL = process.env.GSA_URL;
const API_KEY = process.env.TIMEWATCH_API_KEY;

const DEVICE_ID = "TW1KDW0002250036";

const HEADERS = {
  "X-Api-Key": API_KEY,
  "Content-Type": "application/json"
};

let lastPunchSync = null;
let lastUserSync = null;

class AttendanceSync {

  // --------------------------------
  // GET ALL USERS FROM DATABASE
  // --------------------------------
  static async getAllUsers() {

    const staff = await Staff.find({ active: true }).select("uuid roll_no");
    const coach = await Coach.find({ active: true }).select("uuid roll_no");

    const users = [
      ...staff.map(u => ({
        uuid: u.uuid,
        roll_no: u.roll_no,
        type: "staff"
      })),
      ...coach.map(u => ({
        uuid: u.uuid,
        roll_no: u.roll_no,
        type: "coach"
      }))
    ];

    return users;
  }

  // --------------------------------
  // FETCH USER IMAGE
  // --------------------------------
  static async fetchUserImage(userId) {

    try {

      const response = await axios.get(
        `${GSA_URL}/TimeWatchAPI/GetUserImage?DeviceID=${DEVICE_ID}&UserID=${userId}`,
        {
          headers: HEADERS,
          responseType: "arraybuffer"
        }
      );

      return `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;

    } catch (error) {

      console.log("Image fetch failed:", userId);
      return "";

    }

  }

  // --------------------------------
  // SYNC USERS
  // --------------------------------
  static async syncUsers() {

    const now = new Date();

    if (lastUserSync && moment(now).diff(lastUserSync, "minutes") < 10) {
      console.log("User sync skipped");
      return;
    }

    console.log("Starting user sync...");

    const users = await this.getAllUsers();
    let synced = 0;

    for (const user of users) {

      try {

        const response = await axios.post(
          `${GSA_URL}/TimeWatchAPI/GetUserDetails`,
          {
            DeviceID: DEVICE_ID,
            UserID: user.uuid
          },
          { headers: HEADERS }
        );

        if (!response.data.Success) continue;

        const deviceUser = response.data.Data?.[0];
        if (!deviceUser) continue;

        const image = await this.fetchUserImage(user.uuid);

        const updateData = {
          fullName: deviceUser.Name,
          photo: image,
          active: true
        };

        if (user.type === "coach") {

          await Coach.updateOne(
            { uuid: user.uuid },
            { $set: updateData }
          );

        } else {

          await Staff.updateOne(
            { uuid: user.uuid },
            { $set: updateData }
          );

        }

        synced++;

      } catch (error) {

        console.log("User sync error:", user.uuid);

      }

    }

    lastUserSync = now;
    console.log(`User sync completed (${synced})`);

  }

  // --------------------------------
  // SYNC PUNCHES
  // --------------------------------
  static async syncPunches() {

    const now = new Date();

    if (lastPunchSync && moment(now).diff(lastPunchSync, "seconds") < 50) {
      console.log("Punch sync skipped");
      return;
    }

    console.log("Fetching punches...");

    const fromDate = moment().subtract(2, "minutes").format("YYYY-MM-DDTHH:mm:ss");
    const toDate = moment().format("YYYY-MM-DDTHH:mm:ss");

    try {

      const response = await axios.post(
        `${GSA_URL}/TimeWatchAPI/GetPunchData`,
        {
          DeviceID: DEVICE_ID,
          FromDate: fromDate,
          ToDate: toDate,
          UserID: ""
        },
        { headers: HEADERS }
      );

      if (!response.data.Success) {

        console.log("Punch fetch failed");
        return;

      }

      const punches = response.data.Data || [];
      console.log("Punch count:", punches.length);

      let synced = 0;

      const users = await this.getAllUsers();

      const userMap = new Map();
      users.forEach(u => userMap.set(u.uuid, u));

      for (const punch of punches) {

        if (!punch.UserID || !punch.PunchTime) continue;

        const user = userMap.get(punch.UserID);

        if (!user) {
          console.log("User not found:", punch.UserID);
          continue;
        }

        const punchTime = new Date(punch.PunchTime);

        const rollno = user.roll_no || punch.UserID;

        const newData = {
          rollno: rollno,
          date: punchTime,
          user_type: user.type === "staff" ? "Staff" : "Coach",
          tap: punch.InOutMode === "1" ? "OUT" : "IN",
          attendance_status: "present",
          source: "DEVICE",
          active: true,
          delete: false
        };

        const existing = await Attendance.findOne({
          rollno: rollno,
          date: punchTime
        });

        if (!existing) {

          await Attendance.create(newData);
          synced++;

        } else {

          const changed =
            existing.tap !== newData.tap ||
            existing.user_type !== newData.user_type;

          if (changed) {

            await Attendance.updateOne(
              { _id: existing._id },
              { $set: newData }
            );

            synced++;

          }

        }

      }

      console.log("Punch synced:", synced);

      lastPunchSync = now;

    } catch (error) {

      console.log("Punch sync error:", error.message);

    }

  }

  // --------------------------------
  // DEVICE TIME SYNC
  // --------------------------------
  static async syncDeviceTime() {

    try {

      await axios.post(
        `${GSA_URL}/TimeWatchAPI/SyncTime`,
        {
          DeviceList: [DEVICE_ID]
        },
        { headers: HEADERS }
      )

      console.log("Device time synced");

    } catch (error) {

      console.log("Time sync failed");

    }

  }

  // --------------------------------
  // FULL SYNC
  // --------------------------------
  static async runFullSync() {

    await this.syncUsers();
    await this.syncPunches();

  }

}

module.exports = AttendanceSync;