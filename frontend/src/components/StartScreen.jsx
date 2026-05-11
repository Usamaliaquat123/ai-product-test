import { useState } from "react";

const SUGGESTIONS = [
  "World capitals",
  "JavaScript fundamentals",
  "Ancient Roman history",
  "Space exploration",
  "Classical music composers",
  "Human anatomy basics",
];

export default function StartScreen({ loading, onStart }) {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");

  function submit(e) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    onStart({ topic: topic.trim(), numQuestions, difficulty });
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Start a new quiz</h2>
      <p className="muted">Pick any topic — the AI will write the questions on the fly.</p>

      <label className="field">
        <span>Topic</span>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. The solar system"
          maxLength={120}
          autoFocus
        />
      </label>

      <div className="suggestions" role="list">
        {SUGGESTIONS.map((s) => (
          <button
            type="button"
            key={s}
            role="listitem"
            className="chip"
            onClick={() => setTopic(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="row">
        <label className="field">
          <span>Questions</span>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading || !topic.trim()}>
        {loading ? "Generating quiz…" : "Generate quiz"}
      </button>
    </form>
  );
}
