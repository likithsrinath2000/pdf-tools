import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";

const router = Router();

const FEEDBACK_DIR = path.join(process.cwd(), "feedback");

/**
 * Ensures the feedback directory exists
 */
async function ensureFeedbackDir() {
  try {
    await fs.mkdir(FEEDBACK_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

/**
 * @route POST /api/feedback
 * @description Submit user feedback and store it locally
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

    await ensureFeedbackDir();

    const timestamp = new Date().toISOString();
    const feedbackEntry = {
      id: `feedback_${Date.now()}`,
      feedback: feedback.trim(),
      email: email?.trim() || null,
      timestamp,
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.socket.remoteAddress || "unknown"
    };

    // Create filename with timestamp for easy sorting
    const filename = `feedback_${Date.now()}.json`;
    const filepath = path.join(FEEDBACK_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(feedbackEntry, null, 2), "utf-8");

    res.json({
      success: true,
      message: "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
      id: feedbackEntry.id
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
    await ensureFeedbackDir();
    
    const files = await fs.readdir(FEEDBACK_DIR);
    const feedbackFiles = files.filter(f => f.endsWith(".json"));
    
    const feedbacks = await Promise.all(
      feedbackFiles.map(async (file) => {
        const content = await fs.readFile(path.join(FEEDBACK_DIR, file), "utf-8");
        return JSON.parse(content);
      })
    );

    // Sort by timestamp, newest first
    feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ feedbacks, count: feedbacks.length });
  } catch (error) {
    console.error("Error reading feedback:", error);
    res.status(500).json({ error: "Failed to read feedback" });
  }
});

export default router;
