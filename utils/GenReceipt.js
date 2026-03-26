// 1. Your Original GSA Receipt
const {generateDynamicReceipt} = require("../middlewares/receiptGenerator");

// 2. Completely Different Business!
 generateDynamicReceipt({
  receivedFrom: "Priya Sharma",
  amount: "45000",
  transactions : [
      { method: "Cash", amount: 10000 },
      { method: "Online", amount: 15000 },
      { method: "Cheque", amount: 10000 },
      { method: "Credit Card", amount: 5000 },
      { method: "Debit Card", amount: 2500 },
      { method: "Demand Draft", amount: 2500 }

    ],
  academyName: "F T SPORTS ACADEMY",
  // tagline: "Where Rhythm Meets Passion",
  address: "2nd Floor, Sigma Mall, C.G. Road, Ahmedabad",
  phone: "+91 98765 43210",
  email: "elite@dance.in",
  website: "www.elitedancestudio.in",
  // logo: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAA...",
  // primaryColor: [128, 0, 128], // Purple
  // accentColor: [255, 105, 180],
  // titleBadge: "INVOICE CUM RECEIPT",
  remarks: "Sports Academy New Admission 3 Months!"
});