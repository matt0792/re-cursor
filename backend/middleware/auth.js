import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const getUserInfo = (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ valid: false, message: "Invalid authorization format" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Return the user info from the payload
    res.json(decoded.user);
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
};

// registerUser function
export const registerUser = async (req, res) => {
  try {
    const { email, password, name, role = "normal" } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Email, password, and name are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      role,
    });

    // Save user (password will be hashed by pre-save hook)
    await newUser.save();

    // Create JWT payload
    const payload = {
      user: {
        id: newUser._id,
        role: newUser.role,
        name: newUser.name,
      },
    };

    // Generate token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({ token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Updated loginUser function
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
      },
    };

    // Generate token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
    console.log(`User ${email} logged in`);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyToken = () => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Invalid authorization format" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user in MongoDB
      const user = await User.findById(decoded.user.id);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Session expired"
          : "Invalid authentication";

      res.status(401).json({
        valid: false,
        message,
        error: err.name,
      });
    }
  };
};
