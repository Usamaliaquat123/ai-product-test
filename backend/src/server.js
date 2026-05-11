import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  generateQuiz,
  publicQuiz,
  generateHint,
  generateFeedback,
} from "./quiz.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

// In-memory quiz store. Fine for a demo; swap for Redis/DB for multi-instance.
// Each entry: { quiz, createdAt }
const quizzes = new Map();
const QUIZ_TTL_MS = 60 * 60 * 1000; // 1 hour

function pruneOldQuizzes() {
  const now = Date.now();
  for (const [id, entry] of quizzes) {
    if (now - entry.createdAt > QUIZ_TTL_MS) quizzes.delete(id);
  }
}
setInterval(pruneOldQuizzes, 10 * 60 * 1000).unref();

// Wraps async route handlers so thrown errors hit the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini" });
});

// POST /api/quiz  -> generate a new quiz
app.post(
  "/api/quiz",
  wrap(async (req, res) => {
    const { topic, numQuestions, difficulty } = req.body || {};
    const quiz = await generateQuiz({ topic, numQuestions, difficulty });
    quizzes.set(quiz.quizId, { quiz, createdAt: Date.now() });
    res.json(publicQuiz(quiz));
  })
);

// POST /api/quiz/:quizId/hint  -> AI hint for a specific question
app.post(
  "/api/quiz/:quizId/hint",
  wrap(async (req, res) => {
    const { quizId } = req.params;
    const { questionId } = req.body || {};
    const entry = quizzes.get(quizId);
    if (!entry) return res.status(404).json({ error: "Quiz not found or expired" });
    const q = entry.quiz.questions.find((x) => x.id === questionId);
    if (!q) return res.status(404).json({ error: "Question not found" });

    const { hint } = await generateHint({ question: q.question, options: q.options });
    res.json({ hint });
  })
);

// POST /api/quiz/:quizId/submit  -> grade answers and return AI feedback
app.post(
  "/api/quiz/:quizId/submit",
  wrap(async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body || {};
    const entry = quizzes.get(quizId);
    if (!entry) return res.status(404).json({ error: "Quiz not found or expired" });
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "`answers` object is required" });
    }

    const quiz = entry.quiz;

    // Grade synchronously, then ask the AI for per-question feedback in parallel.
    const graded = quiz.questions.map((q) => {
      const selectedIndex = Number.parseInt(answers[q.id], 10);
      const hasAnswer = !Number.isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < 4;
      const isCorrect = hasAnswer && selectedIndex === q.correctIndex;
      return {
        id: q.id,
        question: q.question,
        options: q.options,
        selectedIndex: hasAnswer ? selectedIndex : null,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    // Fire AI feedback calls concurrently. If any fail individually, fall
    // back to the deterministic explanation so the user always sees something.
    const feedbackResults = await Promise.all(
      graded.map(async (g) => {
        try {
          const { feedback } = await generateFeedback({
            question: g.question,
            userAnswer: g.selectedIndex == null ? "(no answer)" : g.options[g.selectedIndex],
            correctAnswer: g.options[g.correctIndex],
            isCorrect: g.isCorrect,
          });
          return feedback;
        } catch {
          return g.explanation || (g.isCorrect ? "Correct!" : "That's not right.");
        }
      })
    );

    const score = graded.filter((g) => g.isCorrect).length;

    res.json({
      quizId,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      score,
      total: graded.length,
      results: graded.map((g, i) => ({ ...g, feedback: feedbackResults[i] })),
    });
  })
);

// Error handler. Hides stack traces from clients but keeps useful status codes.
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Something went wrong on the server." : err.message,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI Quiz backend listening on http://localhost:${PORT}`);
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set. AI calls will fail.");
  }
});
