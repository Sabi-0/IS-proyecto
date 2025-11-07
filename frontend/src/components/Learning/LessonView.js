import React, { useState, useEffect } from 'react';
import './LessonView.css';
// --- CORRECCIÓN CLAVE: IMPORTAR TRIVIAGAME ---
import TriviaGame from '../Trivia/TriviaGame'; 
// Importamos los datos de contenido de lecciones
import { lessonContentData } from '../../data/learningData';

// Simulación de llamada a API (Gemini) - Ahora usa los datos importados
const fetchLessonContent = async (courseId, lessonId) => {
  console.log(`Simulando fetch para curso ${courseId}, lección ${lessonId}`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular espera

  const content = lessonContentData[lessonId]; // Buscamos el contenido por ID de lección
  
  if (!content) {
      console.error(`Contenido no encontrado para la lección ${lessonId}`);
      throw new Error(`Contenido no encontrado para la lección ${lessonId}`);
  }

  // Simulamos la generación de contenido si no existe en los datos
  return {
    title: content.title || "Título no encontrado",
    explanation: content.explanation || "Explicación no disponible.",
    quizQuestions: content.quizQuestions || [] // Devolver array vacío si no hay quiz
  };
};


const LessonView = ({ courseId, lessonId, onCompleteLesson, onBack }) => {
  const [lessonContent, setLessonContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setShowQuiz(false); // Asegurarse de no mostrar el quiz al cargar nueva lección
    fetchLessonContent(courseId, lessonId)
      .then(content => {
        setLessonContent(content);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching lesson content:", error);
        setIsLoading(false);
      });
  }, [courseId, lessonId]); // Recargar si cambia la lección

  const handleQuizSubmit = (score) => {
      console.log(`Quiz completado con ${score} aciertos de ${lessonContent.quizQuestions.length}.`);
      // Pasar si acierta al menos el 60%
      const passingScore = Math.floor(lessonContent.quizQuestions.length * 0.6);
      if (score >= passingScore) {
        console.log("¡Lección aprobada!");
        onCompleteLesson(courseId, lessonId); 
      } else {
          alert(`Puntuación insuficiente. Necesitas al menos ${passingScore} aciertos. ¡Repasa la lección e inténtalo de nuevo!`);
          setShowQuiz(false); // Volver a la lección
      }
  };

  if (isLoading) return <div className="loading-screen">Cargando lección...</div>;
  if (!lessonContent) return <div className="error-bar">Error al cargar el contenido de esta lección.</div>;

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
                  categoryName={`Mini-Quiz: ${lessonContent.title}`} 
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
        {/* Mostramos el botón solo si hay preguntas definidas */}
        {lessonContent.quizQuestions && lessonContent.quizQuestions.length > 0 ? (
            <button onClick={() => setShowQuiz(true)} className="start-quiz-button">
            Iniciar Mini-Quiz
            </button>
        ) : (
            <button onClick={() => onCompleteLesson(courseId, lessonId)} className="start-quiz-button">
            Marcar como completada
            </button>
        )}
      </div>
    </div>
  );
};

export default LessonView;