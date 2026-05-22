const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
  try {

    const db = mongoose.connection.db;

    const reports = await db
      .collection("reports")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();

    res.json(reports);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;