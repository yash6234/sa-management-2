const express = require('express');
const router = express.Router();
const {
    AddInventory,
    RemoveInventory,
    EditInventory,
    AllotInventory,
    AddQtyToInventory,
    FetchAllInventory,
    FetchInventory,
    GetInventory,
} =
    require("../managerControllers/harsh/inventoryControllers");

router.get('/add-inventory/:data', AddInventory);

// router.get('/remove-inventory/:data', RemoveInventory);

router.get('/edit-inventory/:data', EditInventory);

router.get('/allot-inventory/:data', AllotInventory); //Left To Do Based on Admission

router.get('/add-qty-to-inventory/:data', AddQtyToInventory);

router.get('/fetch-all-inventory/:data', FetchAllInventory);

router.get('/fetch-inventory/:data', FetchInventory);

router.get('/get-inventory-history/:data', GetInventory);

module.exports = router;
