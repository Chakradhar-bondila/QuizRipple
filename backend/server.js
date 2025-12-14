const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

/* =========================
   CORS CONFIGURATION
========================= */

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,        // Vercel prod URL
  "http://localhost:3000",
  "http://localhost:3001"
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server / curl
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

/* =========================
   BODY PARSERS
========================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   REQUEST LOGGING
========================= */

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl} - ${req.headers.origin || "no-origin"}`
  );
  next();
});

/* =========================
   STATIC FILES
========================= */

app.use(
  "/data",
  express.static(path.join(__dirname, "data"), {
    setHeaders: (res) => {
      res.set("Access-Control-Allow-Origin", "*");
    }
  })
);

/* =========================
   MONGODB CONNECTION
========================= */

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected:", conn.connection.host);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

connectDB();

/* =========================
   ROUTES
========================= */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/profile"));
app.use("/api/quiz-results", require("./routes/quizResults"));
app.use("/api/collections", require("./routes/collectionRoutes"));

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    environment: process.env.NODE_ENV || "development"
  });
});

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "QuizRipple API running",
    version: "1.0.0"
  });
});

/* =========================
   ERROR HANDLING
========================= */

app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS error",
      origin: req.headers.origin
    });
  }

  console.error("❌ Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Allowed origins: ${allowedOrigins.join(", ")}`);
});
