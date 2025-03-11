import express from "express";
const router = express.Router();
import {
  verifyToken,
  loginUser,
  registerUser,
  getUserInfo,
} from "../middleware/auth.js";

// routes
router.get("/validate", verifyToken(), (req, res) => {
  res.json({
    valid: true,
  });
});

router.post("/login", loginUser);

router.post("/register", registerUser);

router.get("/user-info", verifyToken(), getUserInfo);

export default router;
