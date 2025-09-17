import React, { useEffect, useState } from 'react';

import AuthPage from './components/AuthPage/AuthPage';
import LandingPage from './components/LandingPage/LandingPage';
import HomePage from './components/HomePage/HomePage';
import CategorySelection from './components/Trivia/CategorySelection';
import TriviaGame from './components/Trivia/TriviaGame';
import TriviaResults from './components/Trivia/TriviaResults';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('landing');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentCategory, setCurrentCategory] = useState({ id: 0, name: '' });
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setAppState('homepage');
      else setAppState('landing');
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => await signOut(auth);

  const fetchTriviaForCategory = async (categoryId, categoryName) => {
    setErrorMessage('');
    setAppState('loading-trivia');
    setCurrentCategory({ id: categoryId, name: categoryName });
    try {
      const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${categoryId}&type=multiple`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      if (data.response_code !== 0) throw new Error('API could not fetch questions for this category.');
      
      setCurrentQuestions(data.results);
      setAppState('trivia-game');
    } catch (error) {
      console.error("Failed to fetch trivia:", error);
      setErrorMessage(`Error al cargar la trivia. Por favor, inténtalo de nuevo.`);
      setAppState('homepage');
    }
  };

  const handleGameEnd = (score) => {
    setFinalScore(score);
    setAppState('trivia-results');
  };
  
  const handlePlayAgain = () => setAppState('homepage');
  
  const handleNavigation = (path) => setAppState(path);

  const renderContent = () => {
    if (isAuthLoading) return <div className="loading-screen">Cargando...</div>;
    
    // Mostramos el error sobre el HomePage si existe
    if (appState === 'homepage') {
        return (
            <div>
                {errorMessage && <div className="error-bar">{errorMessage}</div>}
                <HomePage user={user} handleLogout={handleLogout} onNavigate={handleNavigation} />
            </div>
        );
    }

    switch (appState) {
      case 'landing':
        return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
      case 'auth':
        return <AuthPage onBack={() => setAppState('landing')} />;
      case 'category-selection':
        return <CategorySelection onSelectCategory={fetchTriviaForCategory} onBack={() => setAppState('homepage')} />;
      case 'loading-trivia':
        return <div className="loading-screen">Cargando trivia de {currentCategory.name}...</div>;
      case 'trivia-game':
        return <TriviaGame questions={currentQuestions} categoryName={currentCategory.name} onGameEnd={handleGameEnd} />;
      case 'trivia-results':
        return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      default:
        return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;
