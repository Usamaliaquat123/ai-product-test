import { useMemo, useState } from "react";
import { api } from "../api.js";

export default function QuizScreen({ quiz, submitting, onSubmit, onCancel }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: optionIndex }
  const [hints, setHints] = useState({}); // { [questionId]: string }
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState("");

  const question = quiz.questions[index];
  const total = quiz.questions.length;
  const isLast = index === total - 1;
  const allAnswered = useMemo(
    () => quiz.questions.every((q) => answers[q.id] !== undefined),
    [quiz.questions, answers]
  );

  function selectOption(optionIndex) {
    setAnswers((a) => ({ ...a, [question.id]: optionIndex }));
  }

  async function getHint() {
    if (hints[question.id] || hintLoading) return;
    setHintError("");
    setHintLoading(true);
    try {
      const { hint } = await api.getHint({ quizId: quiz.quizId, questionId: question.id });
      setHints((h) => ({ ...h, [question.id]: hint }));
    } catch (err) {
      setHintError(err.message);
    } finally {
      setHintLoading(false);
    }
  }

  function next() {
    if (!isLast) setIndex((i) => i + 1);
  }
  function prev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  return (
    <section className="card">
      <div className="quiz__top">
        <div>
          <span className="badge">{quiz.difficulty}</span>
          <h2 className="quiz__topic">{quiz.topic}</h2>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label={`Question ${index + 1} of ${total}`}
      >
        <div className="progress__bar" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <p className="muted progress__label">
        Question {index + 1} of {total}
      </p>

      <h3 className="question">{question.question}</h3>

      <ul className="options" role="radiogroup" aria-label="Answer choices">
        {question.options.map((opt, i) => {
          const selected = answers[question.id] === i;
          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                className={`option ${selected ? "option--selected" : ""}`}
                onClick={() => selectOption(i)}
              >
                <span className="option__letter">{String.fromCharCode(65 + i)}</span>
                <span className="option__text">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="hint">
        {hints[question.id] ? (
          <div className="hint__box" role="status">
            <strong>Hint:</strong> {hints[question.id]}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={getHint}
            disabled={hintLoading}
          >
            {hintLoading ? "Thinking…" : "Get an AI hint"}
          </button>
        )}
        {hintError && <p className="error-text">{hintError}</p>}
      </div>

      <div className="quiz__nav">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={prev}
          disabled={index === 0}
        >
          Previous
        </button>

        {isLast ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSubmit(answers)}
            disabled={!allAnswered || submitting}
            title={!allAnswered ? "Answer every question first" : undefined}
          >
            {submitting ? "Grading…" : "Submit quiz"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={next}
            disabled={answers[question.id] === undefined}
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
}
