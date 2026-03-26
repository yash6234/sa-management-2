// const { ObjectId } = require("mongodb");
// const skipReasons = {};
// function logSkip(reason, name,roll_no) {
//   skipReasons[reason] = (skipReasons[reason] || 0) + 1;
//   console.log(`❌ SKIP [${reason}] → ${name} ${roll_no}`);
// }
//
// async function migrateAdmissions(oldConn, newConn, masters) {
//   const oldAdmissions = await oldConn.db
//     .collection("academies")
//     .find()
//     .toArray();
//
//   const oldPlansCol = oldConn.db.collection("detailsacademies");
//   const newPlansCol = newConn.db.collection("academyplans");
//   const newAdmissionsCol = newConn.db.collection("academyadmissions");
//   const fallbackResult = await newPlansCol.findOneAndUpdate(
//   {
//     name: "SPECIAL / LEGACY PLAN",
//     academy: masters.academy._id,
//   },
//   {
//     $setOnInsert: {
//       name: "SPECIAL / LEGACY PLAN",
//       amount: 0,
//       days: 0,
//       registration_fee: 0,
//       active: true,
//       delete: false,
//     },
//   },
//   { upsert: true, returnDocument: "after" }
// );
//
// const fallbackPlan = fallbackResult.value; // ✅ THIS IS THE DOCUMENT
// if (!fallbackPlan || !fallbackPlan._id) {
//   throw new Error("Fallback plan creation failed");
// }
//
//
//   let skipped = 0;
//   let inserted = 0;
//
//   for (const doc of oldAdmissions) {
//     // ❌ no plan_id → skip
//     if (!doc.plan_id) {
//       logSkip("NO_PLAN_ID", doc.name,doc.roll_no);
//       skipped++;
//       continue;
//     }
//
//
//     // ✅ NORMALIZE plan_id (THIS FIXES EVERYTHING)
//     let planId;
//     try {
//       planId =
//         typeof doc.plan_id === "string"
//           ? new ObjectId(doc.plan_id)
//           : doc.plan_id;
//     } catch {
//       logSkip("INVALID_PLAN_ID", doc.name,doc.roll_no);
//       skipped++;
//       continue;
//     }
//
//
//     // ✅ FIND OLD PLAN BY _id
//     const oldPlan = await oldPlansCol.findOne({ _id: planId });
//
//     if (!oldPlan) {
//       logSkip("OLD_PLAN_NOT_FOUND", doc.name,doc.roll_no);
//       skipped++;
//       continue;
//     }
//
//
//     // ✅ FIND NEW PLAN BY NAME (case-insensitive)
//     function normalizePlanName(name) {
//       return name
//         .toLowerCase()
//         .replace(/\+.*$/, "")     // remove "+ REGISTRATION"
//         .replace(/\(.*?\)/g, "") // remove "( ZERO PLAN )"
//         .replace(/\s+/g, " ")
//         .trim();
//     }
//
//     const normalized = normalizePlanName(oldPlan.name);
//
//     let newPlan = await newPlansCol.findOne({
//       name: { $regex: normalized, $options: "i" },
//       academy: masters.academy._id,
//       delete: false,
//     });
//
//
//     if (!newPlan) {
//   // Legacy special cases
//     if (
//       /complimentary|zero|percent|girls|quarterly/i.test(oldPlan.name)
//     ) {
//       newPlan = fallbackPlan;
//     } else {
//       logSkip("NEW_PLAN_NOT_FOUND", `${doc.name} → ${oldPlan.name}`);
//       skipped++;
//       continue;
//     }
//   }
//
//
//
//
//     const amount = Number(doc.amount) || 0;
//     const now = new Date();
//     const timeLeft = doc.to - now;
//     const isExpired = timeLeft <= 0;
//     // ✅ INSERT
//     await newAdmissionsCol.insertOne({
//       name: doc.name,
//       roll_no: doc.roll_no,
//
//       father_name: doc.father,
//       father_occupation: doc.occupation,
//
//       phone: doc.phone,
//       date_of_birth: doc.dob,
//
//       address: doc.address,
//       school_name: doc.name_of_school,
//       current_class: doc.current_class,
//
//       trainee_photo: doc.photo,
//       trainee_signature: doc.signature,
//       father_signature: doc.father_signature,
//
//       start_date: doc.from || doc.createdOn,
//       expiry_date: doc.to,
//
//       plan_id: newPlan._id,
//       plan_name:newPlan.name,
//
//       plan_amount: amount,
//       paid: amount,
//       leftover: 0,
//       payment_type: "Paid",
//       plan_validity:newPlan.days,
//       session_id:newPlan.session_id,
//       session_from: newPlan.session_time_from, // "HH:mm"
//       session_to: newPlan.session_time_to,
//       academy_id: masters.academy._id,
//       academy_name: masters.academy.name,
//
//       sports_id: masters.sport._id,
//       sports_name: masters.sport.name,
//
//       past_details: [{
//         legacy_plan_name: oldPlan.name,
//         legacy_amount: doc.amount,
//         note: "Mapped to SPECIAL / LEGACY PLAN during migration",
//         migrated_at: new Date(),
//       }],
//       time_left: isExpired ? 0 : timeLeft,
//       active: doc.active !== false,
//       delete: doc.delete === true,
//
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     });
//
//     inserted++;
//   }
//
//   console.log(`✅ Admissions inserted: ${inserted}`);
//   console.log(`⚠️ Admissions skipped: ${skipped}`);
//   console.log("📊 SKIP SUMMARY");
// console.table(skipReasons);
//
// }
//
// module.exports = { migrateAdmissions };

const { ObjectId } = require("mongodb");

/* ============================
   SKIP LOGGER
============================ */
const skipReasons = {};
function logSkip(reason, name, roll_no = "") {
  skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  console.log(`❌ SKIP [${reason}] → ${name} ${roll_no}`);
}

/* ============================
   PLAN NAME NORMALIZER
============================ */
function normalizePlanName(name = "") {
  return name
    .toLowerCase()
    .replace(/\+.*$/, "")          // remove "+ REGISTRATION"
    .replace(/\(.*?\)/g, "")      // remove "( ZERO PLAN )"
    .replace(/[^a-z\s]/g, " ")    // remove symbols
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================
   MAIN MIGRATION
============================ */
async function migrateAdmissions(oldConn, newConn, masters) {

  const oldAdmissions = await oldConn.db
    .collection("academies")
    .find()
    .toArray();

  const oldPlansCol = oldConn.db.collection("detailsacademies");
  const newPlansCol = newConn.db.collection("academyplans");
  const newAdmissionsCol = newConn.db.collection("academyadmissions");

  /* ============================
     ENSURE FALLBACK PLAN
  ============================ */
  let fallbackPlan = await newPlansCol.findOne({
    name: "SPECIAL / LEGACY PLAN",
    delete: false,
  });

  if (!fallbackPlan) {
    const insertResult = await newPlansCol.insertOne({
      name: "SPECIAL / LEGACY PLAN",
      amount: 0,
      days: 0,
      registration_fee: 0,
      academy: masters.academy._id,
      academy_name: masters.academy.name,
      active: true,
      delete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    fallbackPlan = await newPlansCol.findOne({
      _id: insertResult.insertedId,
    });
  }

  if (!fallbackPlan || !fallbackPlan._id) {
    throw new Error("Fallback plan creation failed");
  }

  console.log("✅ Fallback plan ready:", fallbackPlan._id.toString());

  /* ============================
     MIGRATION LOOP
  ============================ */
  let skipped = 0;
  let inserted = 0;

  for (const doc of oldAdmissions) {

    // ❌ Missing plan_id
    if (!doc.plan_id) {
      logSkip("NO_PLAN_ID", doc.name, doc.roll_no);
      skipped++;
      continue;
    }

    // ❌ Invalid ObjectId
    let planId;
    try {
      planId =
        typeof doc.plan_id === "string"
          ? new ObjectId(doc.plan_id)
          : doc.plan_id;
    } catch {
      logSkip("INVALID_PLAN_ID", doc.name, doc.roll_no);
      skipped++;
      continue;
    }

    // ❌ Old plan not found
    const oldPlan = await oldPlansCol.findOne({ _id: planId });
    if (!oldPlan) {
      logSkip("OLD_PLAN_NOT_FOUND", doc.name, doc.roll_no);
      skipped++;
      continue;
    }

    // ✅ Normalize old plan name
    const normalized = normalizePlanName(oldPlan.name);

    // ✅ Find new plan
    let newPlan = await newPlansCol.findOne({
      academy: masters.academy._id,
      delete: false,
      $expr: {
        $regexMatch: {
          input: { $toLower: "$name" },
          regex: normalized,
        },
      },
    });

    // ✅ Fallback for legacy plans
    if (!newPlan) {
      if (/complimentary|zero|percent|girls|quarterly/i.test(oldPlan.name)) {
        newPlan = fallbackPlan;
      } else {
        logSkip("NEW_PLAN_NOT_FOUND", doc.name, doc.roll_no);
        skipped++;
        continue;
      }
    }

    // ✅ Safe time_left calculation
    const now = new Date();
    let timeLeft = 0;
    let isExpired = true;

    if (doc.to instanceof Date) {
      timeLeft = doc.to - now;
      isExpired = timeLeft <= 0;
    }

    const amount = Number(doc.amount) || 0;

    /* ============================
       INSERT ADMISSION
    ============================ */
    await newAdmissionsCol.insertOne({
      name: doc.name,
      roll_no: doc.roll_no,

      father_name: doc.father,
      father_occupation: doc.occupation,

      phone: doc.phone,
      date_of_birth: doc.dob,

      address: doc.address,
      school_name: doc.name_of_school,
      current_class: doc.current_class,

      trainee_photo: doc.photo,
      trainee_signature: doc.signature,
      father_signature: doc.father_signature,

      start_date: doc.from || doc.createdOn,
      expiry_date: doc.to || null,

      plan_id: newPlan._id,
      plan_name: newPlan.name,

      plan_amount: amount,
      paid: amount,
      leftover: 0,
      payment_type: "Paid",

      plan_validity: newPlan.days,
      session_id: newPlan.session_id,
      session_from: newPlan.session_time_from,
      session_to: newPlan.session_time_to,

      academy_id: masters.academy._id,
      academy_name: masters.academy.name,

      sports_id: masters.sport._id,
      sports_name: masters.sport.name,

      past_details: [
        {
          legacy_plan_name: oldPlan.name,
          legacy_amount: doc.amount,
          note: "Mapped during legacy migration",
          migrated_at: new Date(),
        },
      ],

      time_left: isExpired ? 0 : timeLeft,
      active: doc.active !== false,
      delete: doc.delete === true,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inserted++;
  }

  /* ============================
     FINAL REPORT
  ============================ */
  console.log(`✅ Admissions inserted: ${inserted}`);
  console.log(`⚠️ Admissions skipped: ${skipped}`);
  console.log("📊 SKIP SUMMARY");
  console.table(skipReasons);
}

module.exports = { migrateAdmissions };
