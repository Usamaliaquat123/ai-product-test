// Quiz domain logic: prompts the model, validates the response shape,
// and exposes three pure-ish functions used by the routes.

import { randomUUID } from "node:crypto";
import { chatCompletion, extractJson } from "./openrouter.js";

const DIFFICULTIES = ["easy", "medium", "hard"];

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeDifficulty(value) {
  if (typeof value !== "string") return "medium";
  const v = value.toLowerCase().trim();
  return DIFFICULTIES.includes(v) ? v : "medium";
}

// -------------------------------------------------------------
// generateQuiz: ask the model for a structured multiple-choice quiz.
// -------------------------------------------------------------
export async function generateQuiz({ topic, numQuestions, difficulty }) {
  const safeTopic = String(topic || "").trim().slice(0, 120);
  if (!safeTopic) {
    const err = new Error("`topic` is required");
    err.status = 400;
    throw err;
  }
  const count = clampInt(numQuestions, 1, 10, 5);
  const level = normalizeDifficulty(difficulty);

  const system = [
    "You are an expert quiz designer.",
    "Generate factually accurate, unambiguous multiple-choice questions.",
    "Each question must have exactly 4 options with exactly one correct answer.",
    "Avoid trick wording. Keep options similar in length and style.",
    "Respond with valid JSON only. No prose, no markdown fences.",
  ].join(" ");

  const user = `Create a ${level} quiz with ${count} multiple-choice questions about: "${safeTopic}".

Return JSON with this exact shape:
{
  "topic": "${safeTopic}",
  "difficulty": "${level}",
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "1-2 sentence explanation of why the correct answer is right"
    }
  ]
}

Rules:
- "correctIndex" is the 0-based index of the correct option.
- Exactly 4 options per question.
- Do NOT reveal the answer inside the question text.
- Make distractors plausible but clearly wrong on reflection.`;

  const { content } = await chatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    responseFormat: { type: "json_object" },
  });

  const parsed = extractJson(content);
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

  // Validate & sanitize. We strip correctIndex/explanation before sending to
  // the client so a curious user can't peek at the answers in DevTools.
  const validated = [];
  for (const q of questions) {
    if (!q || typeof q.question !== "string") continue;
    if (!Array.isArray(q.options) || q.options.length !== 4) continue;
    const correctIndex = Number.parseInt(q.correctIndex, 10);
    if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) continue;
    validated.push({
      id: randomUUID(),
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctIndex,
      explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
    });
  }

  if (validated.length === 0) {
    const err = new Error("AI returned no usable questions. Try again.");
    err.status = 502;
    throw err;
  }

  return {
    quizId: randomUUID(),
    topic: safeTopic,
    difficulty: level,
    questions: validated,
  };
}

// Client-safe view: strips the answer key.
export function publicQuiz(quiz) {
  return {
    quizId: quiz.quizId,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
  };
}

// -------------------------------------------------------------
// generateHint: a nudge, not the answer.
// -------------------------------------------------------------
export async function generateHint({ question, options }) {
  if (!question || !Array.isArray(options) || options.length === 0) {
    const err = new Error("`question` and `options` are required");
    err.status = 400;
    throw err;
  }

  const system =
    "You are a Socratic tutor. Give a short, helpful hint that nudges the learner " +
    "toward the right answer without revealing it. 1-2 sentences max. " +
    "Do NOT mention which option is correct or quote any option verbatim.";

  const user = `Question: ${question}
Options:
${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}

Give a single hint.`;

  const { content } = await chatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
    maxTokens: 200,
  });

  return { hint: content.trim() };
}

// -------------------------------------------------------------
// generateFeedback: friendly per-answer feedback after the user submits.
// -------------------------------------------------------------
export async function generateFeedback({ question, userAnswer, correctAnswer, isCorrect }) {
  const system =
    "You are an encouraging tutor. In 1-3 sentences, explain why the answer is " +
    "correct or incorrect. Be warm but accurate. Never be condescending.";

  const user = `Question: ${question}
User's answer: ${userAnswer}
Correct answer: ${correctAnswer}
Was the user correct? ${isCorrect ? "Yes" : "No"}

Write the feedback.`;

  const { content } = await chatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.5,
    maxTokens: 220,
  });

  return { feedback: content.trim() };
}
