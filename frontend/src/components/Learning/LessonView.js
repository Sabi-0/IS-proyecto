import React, { useState, useEffect } from 'react';
import './LessonView.css';
import TriviaGame from '../Trivia/TriviaGame'; 
import { lessonContentData } from '../../data/learningData';

// ... (fetchLessonContent se mantiene igual) ...
const fetchLessonContent = async (courseId, lessonId) => {
  await new Promise(resolve => setTimeout(resolve, 300)); 
  const content = lessonContentData[lessonId]; 
  if (!content) throw new Error(`Contenido no encontrado para ${lessonId}`);
  return {
    title: content.title || "Título no encontrado",
    explanation: content.explanation || "Explicación no disponible.",
    quizQuestions: content.quizQuestions || [] 
  };
};

const LessonView = ({ courseId, lessonId, onCompleteLesson, onBack }) => {
  const [lessonContent, setLessonContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setShowQuiz(false);
    fetchLessonContent(courseId, lessonId)
      .then(content => {
        setLessonContent(content);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error:", error);
        setIsLoading(false);
      });
  }, [courseId, lessonId]);

  const handleQuizSubmit = (score) => {
      // Calculamos el puntaje necesario (60%)
      const totalQuestions = lessonContent.quizQuestions.length;
      const passingScore = Math.ceil(totalQuestions * 0.6);
      
      console.log(`Quiz: ${score}/${totalQuestions} (Necesario: ${passingScore})`);

      if (score >= passingScore) {
        alert("¡Felicidades! Has aprobado la lección.");
        // SOLO AQUÍ llamamos a onCompleteLesson
        onCompleteLesson(courseId, lessonId); 
      } else {
          // AQUÍ NO llamamos a onComplete, solo mostramos alerta y reiniciamos
          alert(`No has superado el quiz. Tuviste ${score} aciertos, necesitas ${passingScore}. ¡Inténtalo de nuevo!`);
          setShowQuiz(false); // Regresa a la explicación para leer de nuevo
      }
  };

  if (isLoading) return <div className="loading-screen">Cargando lección...</div>;
  if (!lessonContent) return <div className="error-bar">Error al cargar contenido.</div>;

  if (showQuiz) {
      const quizQuestionsFormatted = lessonContent.quizQuestions.map(q => ({
          question: q.question, 
          correct_answer: q.answer, 
          incorrect_answers: q.options.filter(opt => opt !== q.answer) 
      }));

      return (
          <div className="lesson-view-container quiz-mode">
              <TriviaGame
                  questions={quizQuestionsFormatted}
                  categoryName={`Quiz: ${lessonContent.title}`} 
                  onGameEnd={handleQuizSubmit} 
              />
          </div>
      );
  }

  return (
    <div className="lesson-view-container">
      <div className="lesson-view-box">
        <button onClick={onBack} className="back-button-lesson">← Volver al Curso</button>
        <h2>{lessonContent.title}</h2>
        <div className="lesson-content">
          <p>{lessonContent.explanation}</p>
        </div>
        
        {/* Botón para iniciar el quiz */}
        <button onClick={() => setShowQuiz(true)} className="start-quiz-button">
            {lessonContent.quizQuestions && lessonContent.quizQuestions.length > 0 
                ? "Hacer Quiz para Completar" 
                : "Completar Lección (Sin Quiz)"}
        </button>
      </div>
    </div>
  );
};

export default LessonView;