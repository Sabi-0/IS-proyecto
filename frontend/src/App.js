import React, { useEffect, useState } from 'react';

import AuthPage from './components/AuthPage/AuthPage';
import LandingPage from './components/LandingPage/LandingPage';
import HomePage from './components/HomePage/HomePage';
import CategorySelection from './components/Trivia/CategorySelection';
import TriviaGame from './components/Trivia/TriviaGame';
import TriviaResults from './components/Trivia/TriviaResults';
import Leaderboard from './components/Leaderboard/Leaderboard'; 
import TournamentLobby from './components/Tournament/TournamentLobby'; 

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

  const fetchTrivia = async (categoryId, categoryName) => {
    setErrorMessage('');
    setAppState('loading-trivia');
    setCurrentCategory({ id: categoryId, name: categoryName || 'Aleatoria' });
    
    // Construir la URL de la API. 
    const apiUrl = categoryId 
      ? `https://opentdb.com/api.php?amount=10&category=${categoryId}&type=multiple`
      : `https://opentdb.com/api.php?amount=10&type=multiple`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      if (data.response_code !== 0) throw new Error('API could not fetch questions.');
      
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
  
  const handleNavigation = (path) => { //el jugar ahora no servia xd, lo manejamos sin id por el momento
    if (path === 'trivia-random') {
      fetchTrivia(null); // Llamar a fetchTrivia sin ID de categoría
    } else {
      setAppState(path);
    }
    setErrorMessage('');
  };

  const renderContent = () => {
    if (isAuthLoading) return <div className="loading-screen">Cargando...</div>;
    
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
        return <CategorySelection onSelectCategory={fetchTrivia} onBack={() => setAppState('homepage')} />;
      case 'loading-trivia':
        return <div className="loading-screen">Cargando trivia de {currentCategory.name}...</div>;
      case 'trivia-game':
        return <TriviaGame questions={currentQuestions} categoryName={currentCategory.name} onGameEnd={handleGameEnd} />;
      case 'trivia-results':
        return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      case 'leaderboard': 
        return <Leaderboard onBack={() => setAppState('homepage')} />;
      case 'tournament-lobby':
        return <TournamentLobby onBack={() => setAppState('homepage')} />;
      default:
        // Por ahora, las otras navegaciones solo nos llevan de vuelta al home
        // (profile, notifications, settings, learning)
        console.warn(`Navegación a '${appState}' no implementada, volviendo a inicio.`);
        setAppState('homepage');
        return <HomePage user={user} handleLogout={handleLogout} onNavigate={handleNavigation} />;
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;