const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const VALID_CAMERA_TYPES = new Set([
  "PTZ Camera",
  "Bullet Camera",
  "UHD Camera",
  "Dome Camera",
]);

// Lightweight projection — exclude heavy fields from list queries
const LIST_PROJECTION = {
  photos: 0,
};

router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const { sort = "desc", page = 1, limit = 50, cameraType } = req.query;
    const sortOrder = sort === "asc" ? 1 : -1;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(2000, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (cameraType) {
      // Validate against known enum to prevent injection
      if (!VALID_CAMERA_TYPES.has(cameraType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid cameraType. Must be one of: ${[...VALID_CAMERA_TYPES].join(", ")}`,
        });
      }
      query.cameraType = cameraType;
    }

    const collection = db.collection("reports");

    const [reports, totalCount] = await Promise.all([
      collection
        .find(query, { projection: LIST_PROJECTION })
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(query),
    ]);

    res.json({
      data: reports,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error("GET /api/reports error:", error.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;