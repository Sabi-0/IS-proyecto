import React, { useEffect, useState } from 'react';

// --- SECCIÓN DE IMPORTS CORREGIDA ---
// El error está aquí. La regla es:
// - Si el archivo exporta con "export default", se importa SIN llaves {}. (La mayoría de tus componentes)
// - Si el archivo exporta con "export const", se importa CON llaves {}. (Tus datos y algunas funciones de Firebase)

// Componentes (export default, SIN llaves)
import AuthPage from './components/Authpage/AuthPage';
import LandingPage from './components/LandingPage/LandingPage';
import HomePage from './components/HomePage/HomePage';
import CategorySelection from './components/Trivia/CategorySelection';
import TriviaGame from './components/Trivia/TriviaGame';
import TriviaResults from './components/Trivia/TriviaResults';

// Funciones y objetos (export const, CON llaves)
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { triviaData } from './data/triviaQuestions'; // Este es un export nombrado, por eso necesita llaves

// --- FIN DE LA SECCIÓN DE IMPORTS ---


function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('landing');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAppState('homepage');
      } else {
        setAppState('landing');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSelectCategory = (category) => {
    setCurrentQuestions(triviaData[category]);
    setAppState('trivia-game');
    setErrorMessage('');
  };
  
  const fetchRandomTrivia = async () => {
    setErrorMessage('');
    setAppState('loading-trivia'); 
    try {
      const response = await fetch('https://the-trivia-api.com/v2/questions?limit=10&type=multiple');
      if (!response.ok) {
        throw new Error(`API response was not ok: ${response.status}`);
      }
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('API returned no questions.');
      }

      const formattedQuestions = data.map(q => {
        const options = [...q.incorrectAnswers, q.correctAnswer];
        options.sort(() => Math.random() - 0.5);
        return {
          question: q.question.text,
          options: options,
          answer: q.correctAnswer
        }
      });
      
      setCurrentQuestions(formattedQuestions);
      setAppState('trivia-game');

    } catch (error) {
      console.error("Failed to fetch trivia questions:", error);
      setErrorMessage(`Error al cargar la trivia. Por favor, inténtalo de nuevo. (${error.message})`);
      setAppState('homepage');
    }
  };

  const handleGameEnd = (score) => {
    setFinalScore(score);
    setAppState('trivia-results');
  };
  
  const handlePlayAgain = () => {
    setCurrentQuestions([]);
    setFinalScore(0);
    setAppState('homepage');
  };
  
  const handleNavigation = (path) => {
      if (path === 'trivia-random') {
        fetchRandomTrivia();
      } else {
        setAppState(path);
      }
  }

  const renderContent = () => {
    if (isAuthLoading) {
      return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando...</div>;
    }
    
    if (appState === 'homepage') {
        return (
            <div>
                {errorMessage && (
                    <div style={{ color: 'white', padding: '12px', textAlign: 'center', backgroundColor: '#E53935' }}>
                        {errorMessage}
                    </div>
                )}
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
        return <CategorySelection categories={Object.keys(triviaData)} onSelectCategory={handleSelectCategory} onBack={() => setAppState('homepage')} />;
      case 'loading-trivia':
        return <div style={{textAlign: 'center', marginTop: '50px'}}>Cargando trivia...</div>;
      case 'trivia-game':
        return <TriviaGame questions={currentQuestions} onGameEnd={handleGameEnd} />;
      case 'trivia-results':
        return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      default:
        return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
    }
  };

  return (
    <div className="App">
      {renderContent()}
    </div>
  );
}

export default App;