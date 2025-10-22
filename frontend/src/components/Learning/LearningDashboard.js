import React from 'react';
import './LearningDashboard.css';
// Importamos los datos de cursos
import { coursesData } from '../../data/learningData';

const LearningDashboard = ({ onSelectCourse, onBack }) => {
  return (
    <div className="learning-dashboard-container">
      <div className="learning-dashboard-box">
        <button onClick={onBack} className="back-button-learning">← Volver al Inicio</button>
        <h1>Módulo de Aprendizaje</h1>
        <p>Selecciona un curso para empezar a aprender.</p>

        <div className="course-grid">
          {/* Usamos coursesData importado */}
          {coursesData.map((course) => (
            <div key={course.id} className="course-card" onClick={() => onSelectCourse(course.id)}>
              <div className={`level-badge level-${course.level.toLowerCase()}`}>{course.level}</div>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningDashboard;
