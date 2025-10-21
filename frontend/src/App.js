import React, { useEffect, useState } from 'react';

// Imports de componentes
import AuthPage from './components/AuthPage/AuthPage';
import LandingPage from './components/LandingPage/LandingPage';
import HomePage from './components/HomePage/HomePage';
import CategorySelection from './components/Trivia/CategorySelection';
import TriviaGame from './components/Trivia/TriviaGame';
import TriviaResults from './components/Trivia/TriviaResults';
import Leaderboard from './components/Leaderboard/Leaderboard';
import TournamentLobby from './components/Tournament/TournamentLobby';

// Imports de Firebase
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- FUNCIÓN UTILITARIA ---
const decodeHTML = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// --- NUEVA FUNCIÓN DE TRADUCCIÓN CON MYMEMORY API ---
async function translateTriviaWithMyMemory(questions) {
  console.log("--- Translation Step 1: Preparing texts for MyMemory API ---");
  
  const uniqueTexts = new Set();
  questions.forEach(q => {
    uniqueTexts.add(decodeHTML(q.question));
    uniqueTexts.add(decodeHTML(q.correct_answer));
    q.incorrect_answers.forEach(ans => uniqueTexts.add(decodeHTML(ans)));
  });

  const textsToTranslate = Array.from(uniqueTexts);
  console.log(`Found ${textsToTranslate.length} unique texts to translate.`);

  // Creamos una promesa de fetch para cada texto
  const translationPromises = textsToTranslate.map(text => {
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
    return fetch(apiUrl).then(res => res.json());
  });

  console.log("--- Translation Step 2: Calling MyMemory API concurrently ---");
  // Ejecutamos todas las promesas en paralelo para mayor eficiencia
  const responses = await Promise.all(translationPromises);

  // Creamos el mapa de traducciones
  const translationMap = new Map();
  responses.forEach((res, index) => {
    if (res.responseData && res.responseData.translatedText) {
      const originalText = textsToTranslate[index];
      const translatedText = res.responseData.translatedText;
      translationMap.set(originalText, translatedText);
    }
  });
  
  console.log("--- Translation Step 3: Built the translation map ---");

  // Reconstruimos el array de preguntas con las traducciones
  const translatedQuestions = questions.map(q => ({
    ...q,
    question: translationMap.get(decodeHTML(q.question)) || q.question,
    correct_answer: translationMap.get(decodeHTML(q.correct_answer)) || q.correct_answer,
    incorrect_answers: q.incorrect_answers.map(ans => translationMap.get(decodeHTML(ans)) || ans)
  }));

  console.log("--- Translation Step 4: Translation complete! ---");
  return translatedQuestions;
}


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
    
    const apiUrl = categoryId 
      ? `https://opentdb.com/api.php?amount=10&category=${categoryId}&type=multiple`
      : `https://opentdb.com/api.php?amount=10&type=multiple`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`OpenTDB API Error: ${response.status}`);
      const data = await response.json();
      if (data.response_code !== 0) throw new Error('OpenTDB could not fetch questions.');
      
      let questionsToPlay = data.results;

      try {
        // Usamos la nueva función de traducción
        const translatedQuestions = await translateTriviaWithMyMemory(data.results);
        questionsToPlay = translatedQuestions;
      } catch (translationError) {
        console.warn("Translation failed, proceeding with English questions.", translationError);
      }

      setCurrentQuestions(questionsToPlay);
      setAppState('trivia-game');
    } catch (error) {
      console.error("Failed to fetch trivia:", error);
      setErrorMessage(`Error al cargar la trivia. Por favor, inténtalo de nuevo. (${error.message})`);
      setAppState('homepage');
    }
  };

  const handleGameEnd = (score) => {
    setFinalScore(score);
    setAppState('trivia-results');
  };
  
  const handlePlayAgain = () => setAppState('homepage');
  
  const handleNavigation = (path) => {
    if (path === 'trivia-random') {
      fetchTrivia(null);
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
        return <div className="loading-screen">Cargando y traduciendo trivia de {currentCategory.name}...</div>;
      case 'trivia-game':
        return <TriviaGame questions={currentQuestions} categoryName={currentCategory.name} onGameEnd={handleGameEnd} />;
      case 'trivia-results':
        return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      case 'leaderboard':
        return <Leaderboard onBack={() => setAppState('homepage')} />;
      case 'tournament-lobby':
        return <TournamentLobby onBack={() => setAppState('homepage')} />;
      default:
        console.warn(`Navegación a '${appState}' no implementada, volviendo a inicio.`);
        return <HomePage user={user} handleLogout={handleLogout} onNavigate={handleNavigation} />;
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;