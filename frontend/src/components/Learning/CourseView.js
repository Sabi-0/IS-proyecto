import React from 'react';
import './CourseView.css';
// Importamos los datos necesarios
import { coursesData, lessonsData } from '../../data/learningData';

const CourseView = ({ courseId, onSelectLesson, onBack }) => {
  // Buscamos el curso y sus lecciones usando el courseId
  const course = coursesData.find(c => c.id === courseId);
  // Usamos el estado global (importado) de lessonsData
  const lessons = lessonsData[courseId] || []; 

  // Simulamos progreso (en el futuro vendría del backend)
  const completedLessonsCount = lessons.filter(l => l.completed).length;
  const progress = lessons.length > 0 ? (completedLessonsCount / lessons.length) * 100 : 0;

  if (!course) {
      return <div className="error-bar">Curso no encontrado. Vuelve a intentarlo.</div>;
  }

  return (
    <div className="course-view-container">
      <div className="course-view-box">
        <button onClick={onBack} className="back-button-course">← Volver a Cursos</button>
        
        <div className="course-header">
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="progress-text">{Math.round(progress)}% completado</span>
        </div>

        <h3>Lecciones</h3>
        <ul className="lesson-list">
          {lessons.map((lesson, index) => {
            // Determinamos si la lección es la siguiente disponible
            const isNextLesson = !lesson.completed && (index === 0 || (lessons[index-1] && lessons[index-1].completed));
            return (
              <li
                key={lesson.id}
                className={`lesson-item ${lesson.completed ? 'completed' : ''} ${isNextLesson ? 'next-lesson' : ''}`}
                // Hacemos clickable solo si es la siguiente lección
                onClick={() => isNextLesson ? onSelectLesson(courseId, lesson.id) : null} 
              >
                <span className="lesson-status-icon">{lesson.completed ? '✅' : (isNextLesson ? '➡️' : '🔒')}</span>
                <span className="lesson-title">{lesson.title}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default CourseView;