require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const reportsRoutes = require("./routes/reports");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");
    try {
      await mongoose.connection.db.collection('reports').createIndex({ cameraType: 1, createdAt: -1 });
      console.log("Database index verified and ready.");
    } catch (err) {
      console.error("Could not create index:", err);
    }
  })
  .catch((err) => console.log(err));

app.use("/api/reports", reportsRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});