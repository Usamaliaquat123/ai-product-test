// Tiny fetch wrapper. All requests go through Vite's /api proxy in dev.

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  createQuiz: ({ topic, numQuestions, difficulty }) =>
    request("/api/quiz", { method: "POST", body: { topic, numQuestions, difficulty } }),

  getHint: ({ quizId, questionId }) =>
    request(`/api/quiz/${quizId}/hint`, { method: "POST", body: { questionId } }),

  submit: ({ quizId, answers }) =>
    request(`/api/quiz/${quizId}/submit`, { method: "POST", body: { answers } }),
};
