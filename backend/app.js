import express from "express";
import cors from "cors";
import aiRoutes from "./routes/aiRoutes.js";
import connectDB from "./config/db.js";

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/ai", aiRoutes);

export default app;
