require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const reportsRoutes = require("./routes/reports");

const app = express();

const PORT = process.env.PORT || 5000;

// CORS — restrict to known origins in production
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://back-rail.vercel.app",
  "https://back-rail.netlify.app",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(null, true); // Fallback: allow all for now; tighten later
    },
  })
);

app.use(express.json({ limit: "1mb" }));

// Health check — useful for uptime monitors
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/reports", reportsRoutes);

// ── Connect to MongoDB, then start listening ───────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    // Idempotent — ensures the compound index exists for filtered + sorted queries
    try {
      await mongoose.connection.db
        .collection("reports")
        .createIndex({ cameraType: 1, createdAt: -1 });
      console.log("Database index verified.");
    } catch (err) {
      console.error("Could not create index:", err.message);
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });