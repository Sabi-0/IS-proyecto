import React, { useState, useEffect } from 'react';
import './TriviaGame.css';

const TriviaGame = ({ questions, categoryName, onGameEnd }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  }, [currentQuestionIndex]);

  const decodeHTML = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const handleAnswerClick = (option) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    if (option === currentQuestion.correct_answer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    const nextQuestionIndex = currentQuestionIndex + 1;
    if (nextQuestionIndex < questions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
    } else {
      onGameEnd(score);
    }
  };

  if (!currentQuestion) return <div>Cargando pregunta...</div>;

  const allOptions = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
  const shuffledOptions = React.useMemo(() => allOptions.sort(() => Math.random() - 0.5), [currentQuestion]);

  return (
    <div className="trivia-game-container">
      <div className="trivia-game-box">
        <div className="trivia-header">
          <h2>{decodeHTML(categoryName)}</h2>
          <div className="trivia-score">Puntuación: {score}</div>
        </div>
        <p className="question-counter">Pregunta {currentQuestionIndex + 1} / {questions.length}</p>
        <div className="question-text">{decodeHTML(currentQuestion.question)}</div>
        <div className="options-grid">
          {shuffledOptions.map((option, index) => {
            let buttonClass = 'option-button';
            if (isAnswered) {
              if (option === currentQuestion.correct_answer) {
                buttonClass += ' correct';
              } else if (option === selectedAnswer) {
                buttonClass += ' incorrect';
              }
            }
            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => handleAnswerClick(option)}
                disabled={isAnswered}
              >
                {decodeHTML(option)}
              </button>
            );
          })}
        </div>
        {isAnswered && (
          <button onClick={handleNextQuestion} className="next-question-button">
            {currentQuestionIndex < questions.length - 1 ? 'Siguiente' : 'Resultados'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TriviaGame;