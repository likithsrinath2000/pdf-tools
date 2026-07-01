import { Router } from "express";
import { storage } from "../storage";

const router = Router();

/**
 * @route POST /api/feedback
 * @description Submit user feedback and store it in the database
 * @body {string} feedback - The feedback message
 * @body {string} email - Optional email address
 * @returns {Object} Confirmation of feedback submission
 */
router.post("/", async (req, res) => {
  try {
    const { feedback, email } = req.body;

    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      return res.status(400).json({ error: "Feedback is required" });
    }

    const MAX_FEEDBACK_CHARS = 5000;
    const MAX_EMAIL_CHARS = 254;
    if (feedback.length > MAX_FEEDBACK_CHARS) {
      return res.status(400).json({ error: `Feedback must be ${MAX_FEEDBACK_CHARS} characters or fewer.` });
    }
    if (email && (typeof email !== "string" || email.length > MAX_EMAIL_CHARS)) {
      return res.status(400).json({ error: `Email must be ${MAX_EMAIL_CHARS} characters or fewer.` });
    }

    const savedFeedback = await storage.createFeedback({
      feedback: feedback.trim(),
      email: email?.trim() || null,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || req.socket.remoteAddress || null
    });

    res.json({
      success: true,
      message: "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
      id: savedFeedback.id
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({ error: "Failed to save feedback. Please try again." });
  }
});

/**
 * @route GET /api/feedback
 * @description Get all feedback entries (for admin purposes)
 * @returns {Array} List of all feedback entries
 */
router.get("/", async (req, res) => {
  try {
    const allFeedback = await storage.getAllFeedback();
    res.json({ feedbacks: allFeedback, count: allFeedback.length });
  } catch (error) {
    console.error("Error reading feedback:", error);
    res.status(500).json({ error: "Failed to read feedback" });
  }
});

export default router;
