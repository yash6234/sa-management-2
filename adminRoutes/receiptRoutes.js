const express = require('express');
const router = express.Router();
const { AddNewReceipt, FetchReceipts, DeleteReceipt, SearchReceipt } =
    require("../adminControllers/receiptControllers");

router.get('/add-new-receipt/:data', AddNewReceipt);

router.get('/fetch-receipts/:data', FetchReceipts);

router.get('/delete-receipt/:data', DeleteReceipt);

router.get('/search-receipt/:data', SearchReceipt);

module.exports = router;
