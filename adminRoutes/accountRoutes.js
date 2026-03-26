const express = require('express');
const router = express.Router();
const { AddTransaction, FetchTransaction, SearchTransaction, DeleteTransaction } =
    require("../adminControllers/accountControllers");

router.get('/add-transaction/:data', AddTransaction);

router.get('/fetch-transactions/:data', FetchTransaction);

router.get('/search-transactions/:data', SearchTransaction);

router.get('/delete-transaction/:data', DeleteTransaction);

module.exports = router;
