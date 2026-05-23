const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    const { sort = 'desc', page = 1, limit = 1000, cameraType } = req.query;
    const sortOrder = sort === 'asc' ? 1 : -1;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(2000, Math.max(1, parseInt(limit) || 1000));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (cameraType) {
      query.cameraType = cameraType;
    }

    const [reports, totalCount] = await Promise.all([
      db.collection("reports")
        .find(query)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection("reports").countDocuments(query)
    ]);

    res.json({
      data: reports,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;