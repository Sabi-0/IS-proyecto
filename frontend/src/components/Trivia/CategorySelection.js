import React from 'react';
import './CategorySelection.css';

const categories = [
  { id: 9, name: 'Conocimiento General' },
  { id: 17, name: 'Ciencia y Naturaleza' },
  { id: 23, name: 'Historia' },
  { id: 21, name: 'Deportes' },
  { id: 11, name: 'Películas' },
  { id: 27, name: 'Animales' },
];

const CategorySelection = ({ onSelectCategory, onBack }) => {
  return (
    <div className="category-selection-container">
      <div className="category-selection-box">
        <button onClick={onBack} className="back-button">← Volver al Inicio</button>
        <h2>Elige una Categoría</h2>
        <div className="category-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              className="category-button"
              onClick={() => onSelectCategory(category.id, category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategorySelection;
