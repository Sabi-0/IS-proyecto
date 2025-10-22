import React, { useState } from 'react';
import './CategorySelection.css';

const categories = [
  { id: 9, name: 'Conocimiento General' },
  { id: 17, name: 'Ciencia y Naturaleza' },
  { id: 23, name: 'Historia' },
  { id: 21, name: 'Deportes' },
  { id: 11, name: 'Películas' },
  { id: 27, name: 'Animales' },
];

const difficulties = [
    { value: 'easy', name: 'Fácil' },
    { value: 'medium', name: 'Medio' },
    { value: 'hard', name: 'Difícil' },
];

// --- VERIFICACIÓN CLAVE ---
// El componente DEBE recibir 'onSelectCategoryAndDifficulty' en sus props.
const CategorySelection = ({ onSelectCategoryAndDifficulty, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleDifficultyClick = (difficultyValue) => {
    if (selectedCategory) {
      // --- VERIFICACIÓN CLAVE ---
      // Aquí se llama a la función recibida por props.
      onSelectCategoryAndDifficulty(selectedCategory.id, selectedCategory.name, difficultyValue);
    } else {
        console.error("Error: Se intentó seleccionar dificultad sin categoría previa.");
    }
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="category-selection-container">
      <div className="category-selection-box">
        <button onClick={handleBack} className="back-button">
          {selectedCategory ? '← Elegir otra Categoría' : '← Volver al Inicio'}
        </button>

        {!selectedCategory && (
          <>
            <h2>Elige una Categoría</h2>
            <div className="category-grid">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="category-button"
                  onClick={() => handleCategoryClick(category)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedCategory && (
          <>
            <h2>Elige la Dificultad para "{selectedCategory.name}"</h2>
            <div className="difficulty-grid">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty.value}
                  className={`difficulty-button difficulty-${difficulty.value}`}
                  onClick={() => handleDifficultyClick(difficulty.value)}
                >
                  {difficulty.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CategorySelection;