import { useState } from "react";
import { api } from "./api.js";
import StartScreen from "./components/StartScreen.jsx";
import QuizScreen from "./components/QuizScreen.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";

// View states: "start" -> "quiz" -> "results"
export default function App() {
  const [view, setView] = useState("start");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(null);

  async function handleStart({ topic, numQuestions, difficulty }) {
    setError("");
    setLoading(true);
    try {
      const newQuiz = await api.createQuiz({ topic, numQuestions, difficulty });
      setQuiz(newQuiz);
      setResults(null);
      setView("quiz");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(answers) {
    setError("");
    setLoading(true);
    try {
      const res = await api.submit({ quizId: quiz.quizId, answers });
      setResults(res);
      setView("results");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setQuiz(null);
    setResults(null);
    setError("");
    setView("start");
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          <span className="app__sparkle" aria-hidden>✦</span> AI Quiz
        </h1>
        <p className="app__subtitle">Quiz yourself on anything — questions, hints, and feedback by AI.</p>
      </header>

      <main className="app__main">
        {error && (
          <div role="alert" className="banner banner--error">
            {error}
          </div>
        )}

        {view === "start" && <StartScreen loading={loading} onStart={handleStart} />}
        {view === "quiz" && quiz && (
          <QuizScreen
            quiz={quiz}
            submitting={loading}
            onSubmit={handleSubmit}
            onCancel={handleRestart}
          />
        )}
        {view === "results" && results && (
          <ResultsScreen results={results} onRestart={handleRestart} />
        )}
      </main>

    </div>
  );
}
