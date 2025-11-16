import React from 'react';
import './CourseView.css';
import { coursesData, lessonsData } from '../../data/learningData';

// Ahora recibimos 'completedLessons' (array de IDs) como prop
const CourseView = ({ courseId, completedLessons, onSelectLesson, onBack }) => {
  const course = coursesData.find(c => c.id === courseId);
  // Obtenemos la estructura estática de las lecciones
  const lessons = lessonsData[courseId] || []; 

  // Calculamos el progreso basándonos en el array 'completedLessons' que viene de la BD
  // Verificamos cuántas lecciones de ESTE curso están en la lista de completadas global
  const lessonsDoneCount = lessons.filter(l => completedLessons.includes(l.id)).length;
  const progress = lessons.length > 0 ? (lessonsDoneCount / lessons.length) * 100 : 0;

  if (!course) return <div className="error-bar">Curso no encontrado.</div>;

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
            // Verificamos si ESTA lección específica está completada
            const isCompleted = completedLessons.includes(lesson.id);
            
            // Verificamos si la lección ANTERIOR está completada (o si es la primera)
            const prevLesson = lessons[index - 1];
            const isPrevCompleted = !prevLesson || completedLessons.includes(prevLesson.id);
            
            // Desbloqueada si: Ya la completé O la anterior está completada
            const isUnlocked = isCompleted || isPrevCompleted;

            return (
              <li
                key={lesson.id}
                className={`lesson-item ${isCompleted ? 'completed' : ''} ${!isCompleted && isUnlocked ? 'next-lesson' : ''}`}
                // Solo clickable si está desbloqueada
                onClick={() => isUnlocked ? onSelectLesson(courseId, lesson.id) : null} 
              >
                <span className="lesson-status-icon">
                    {isCompleted ? '✅' : (isUnlocked ? '➡️' : '🔒')}
                </span>
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