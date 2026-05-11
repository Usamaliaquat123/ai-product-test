export default function ResultsScreen({ results, onRestart }) {
  const { score, total, results: items, topic, difficulty } = results;
  const pct = Math.round((score / total) * 100);

  let verdict = "Keep practicing!";
  if (pct === 100) verdict = "Flawless. ";
  else if (pct >= 80) verdict = "Great work!";
  else if (pct >= 60) verdict = "Solid effort.";
  else if (pct >= 40) verdict = "Not bad — room to grow.";

  return (
    <section className="card">
      <div className="results__header">
        <span className="badge">{difficulty}</span>
        <h2>{topic}</h2>
        <p className="muted">{verdict}</p>
        <div className="score" aria-label={`Score ${score} out of ${total}`}>
          <span className="score__big">{score}</span>
          <span className="score__sep">/</span>
          <span className="score__total">{total}</span>
          <span className="score__pct">({pct}%)</span>
        </div>
      </div>

      <ol className="results__list">
        {items.map((r, i) => (
          <li
            key={r.id}
            className={`result ${r.isCorrect ? "result--correct" : "result--wrong"}`}
          >
            <div className="result__head">
              <span className="result__num">Q{i + 1}</span>
              <span className={`result__tag ${r.isCorrect ? "tag--good" : "tag--bad"}`}>
                {r.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>
            <p className="result__question">{r.question}</p>
            <ul className="result__options">
              {r.options.map((opt, idx) => {
                const isCorrect = idx === r.correctIndex;
                const isUser = idx === r.selectedIndex;
                let cls = "result__option";
                if (isCorrect) cls += " result__option--correct";
                if (isUser && !isCorrect) cls += " result__option--user-wrong";
                return (
                  <li key={idx} className={cls}>
                    <span className="option__letter">{String.fromCharCode(65 + idx)}</span>
                    <span>{opt}</span>
                    {isCorrect && <span className="result__mark">correct</span>}
                    {isUser && !isCorrect && <span className="result__mark">your answer</span>}
                  </li>
                );
              })}
            </ul>
            {r.feedback && (
              <p className="result__feedback">
                <strong>Feedback:</strong> {r.feedback}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="results__actions">
        <button type="button" className="btn btn--primary" onClick={onRestart}>
          Try another quiz
        </button>
      </div>
    </section>
  );
}
