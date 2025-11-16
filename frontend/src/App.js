import React, { useEffect, useState } from 'react';

// Imports de componentes
import AuthPage from './components/Authpage/AuthPage';
import LandingPage from './components/LandingPage/LandingPage';
import HomePage from './components/HomePage/HomePage';
import CategorySelection from './components/Trivia/CategorySelection';
import TriviaGame from './components/Trivia/TriviaGame';
import TriviaResults from './components/Trivia/TriviaResults';
import Leaderboard from './components/Leaderboard/Leaderboard';
import MultiplayerLobby from './components/Multiplayer/MultiplayerLobby';
import LearningDashboard from './components/Learning/LearningDashboard';
import CourseView from './components/Learning/CourseView';
import LessonView from './components/Learning/LessonView';
import ProfilePage from './components/Profile/ProfilePage';
import TournamentGame from './components/Multiplayer/TournamentGame'; 

// Imports de Firebase
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Imports de datos
import { lessonsData } from './data/learningData';

// --- URL DEL BACKEND ---
const BACKEND_URL = 'https://glairy-debroah-downwardly.ngrok-free.dev';

const decodeHTML = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

async function translateTriviaWithMyMemory(questions) {
    // (Tu función de traducción existente)
    const uniqueTexts = new Set();
    questions.forEach(q => {
        uniqueTexts.add(decodeHTML(q.question));
        uniqueTexts.add(decodeHTML(q.correct_answer));
        q.incorrect_answers.forEach(ans => uniqueTexts.add(decodeHTML(ans)));
    });
    const textsToTranslate = Array.from(uniqueTexts);
    const translationPromises = textsToTranslate.map(text => {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
        return fetch(apiUrl).then(res => res.json());
    });
    const responses = await Promise.all(translationPromises);
    const translationMap = new Map();
    responses.forEach((res, index) => {
        if (res.responseData && res.responseData.translatedText) {
            translationMap.set(textsToTranslate[index], res.responseData.translatedText);
        } else {
            translationMap.set(textsToTranslate[index], textsToTranslate[index]);
        }
    });
    const translatedQuestions = questions.map(q => ({
        ...q,
        question: translationMap.get(decodeHTML(q.question)) || decodeHTML(q.question),
        correct_answer: translationMap.get(decodeHTML(q.correct_answer)) || decodeHTML(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(ans => translationMap.get(decodeHTML(ans)) || decodeHTML(ans))
    }));
    return translatedQuestions;
}

function App() {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState('landing');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUserSynced, setIsUserSynced] = useState(false); 
  
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentCategory, setCurrentCategory] = useState({ id: 0, name: '', difficulty: '' });
  const [finalScore, setFinalScore] = useState(0);

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]); 
  const [lessonProgressUpdate, setLessonProgressUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAppState('homepage');
        if (currentUser.isAnonymous) {
            setIsAuthLoading(false);
            return; 
        }
        if (!isUserSynced) {
            currentUser.getIdToken(true).then((idToken) => {
                const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`, 'ngrok-skip-browser-warning': 'true' };
                const syncPromise = fetch(`${BACKEND_URL}/sync-user`, { method: 'POST', headers });
                const progressPromise = fetch(`${BACKEND_URL}/learning/progress`, { method: 'GET', headers });
                return Promise.all([syncPromise, progressPromise]);
            })
            .then(async ([syncRes, progressRes]) => {
                if(progressRes.ok) {
                    const progressData = await progressRes.json();
                    setCompletedLessons(progressData); 
                }
                setIsUserSynced(true); 
            })
            .catch(error => {
                console.error('Error conexión:', error);
                setErrorMessage('Error de conexión con el servidor.');
            });
        }
      } else {
        setAppState('landing');
        setIsUserSynced(false); 
        setCompletedLessons([]); 
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isUserSynced]); 

  const handleLogout = async () => { await signOut(auth); };

  const fetchTrivia = async (categoryId, categoryName, difficulty) => {
    setErrorMessage('');
    setAppState('loading-trivia');
    setCurrentCategory({ id: categoryId, name: categoryName || 'Aleatoria', difficulty: difficulty || 'any' });
    let apiUrl = `https://opentdb.com/api.php?amount=10&type=multiple`;
    if (categoryId) apiUrl += `&category=${categoryId}`;
    if (difficulty && difficulty !== 'any') apiUrl += `&difficulty=${difficulty}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.response_code !== 0) throw new Error('Error API Trivia');
      let questionsToPlay = data.results;
      try {
        questionsToPlay = await translateTriviaWithMyMemory(data.results);
      } catch (e) { console.warn("Error traducción"); }
      setCurrentQuestions(questionsToPlay);
      setAppState('trivia-game');
    } catch (error) {
      setErrorMessage(`Error carga: ${error.message}`);
      setAppState('homepage');
    }
  };

  const handleGameEnd = (score) => {
    setFinalScore(score); 
    setAppState('trivia-results'); 
    if (user && !user.isAnonymous) {
      const correctAnswers = score;
      const incorrectAnswers = currentQuestions.length - correctAnswers;
      user.getIdToken(true).then(idToken => {
          const gameData = {
            score, correctAnswers, incorrectAnswers,
            questionsTotal: currentQuestions.length,
            gameMode: currentCategory.id ? 'classic' : 'random_api',
            categoryName: currentCategory.name,
            difficulty: currentCategory.difficulty
          };
          fetch(`${BACKEND_URL}/save-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`, 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify(gameData)
          });
        }).catch(console.error);
    }
  };

  const handlePlayAgain = () => { setAppState('homepage'); };

  // --- Learning Logic ---
  const handleSelectCourse = (id) => { setSelectedCourseId(id); setAppState('course-view'); };
  const handleSelectLesson = (cId, lId) => { setSelectedCourseId(cId); setSelectedLessonId(lId); setAppState('lesson-view'); };
  
  const handleCompleteLesson = (courseId, lessonId) => {
      setCompletedLessons(prev => [...prev, lessonId]);
      if (user && !user.isAnonymous) {
          user.getIdToken(true).then(token => {
              fetch(`${BACKEND_URL}/learning/complete`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
                  body: JSON.stringify({ lessonId })
              });
          });
      }
      setSelectedLessonId(null);
      setAppState('course-view'); 
  };

  const handleBackToCourseList = () => { setSelectedCourseId(null); setAppState('learning'); };
  const handleBackToLessonList = () => { setSelectedLessonId(null); setAppState('course-view'); };

  const handleNavigation = (path) => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    if (cleanPath === 'trivia-random') fetchTrivia(null, null, 'medium');
    else setAppState(cleanPath); 
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
      case 'landing': return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
      case 'auth': return <AuthPage onBack={() => setAppState('landing')} />;
      case 'category-selection': return <CategorySelection onSelectCategoryAndDifficulty={fetchTrivia} onBack={() => setAppState('homepage')} />;
      case 'loading-trivia': return <div className="loading-screen">Cargando trivia...</div>;
      case 'trivia-game': return <TriviaGame questions={currentQuestions} categoryName={currentCategory.name} onGameEnd={handleGameEnd} />;
      case 'trivia-results': return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      case 'learning': return <LearningDashboard onSelectCourse={handleSelectCourse} onBack={() => setAppState('homepage')} />;
      case 'course-view': return <CourseView key={lessonProgressUpdate} courseId={selectedCourseId} completedLessons={completedLessons} onSelectLesson={handleSelectLesson} onBack={handleBackToCourseList} />;
      case 'lesson-view': return <LessonView courseId={selectedCourseId} lessonId={selectedLessonId} onCompleteLesson={handleCompleteLesson} onBack={handleBackToLessonList} />;
      case 'leaderboard': return <Leaderboard onBack={() => setAppState('homepage')} />;
      
      // --- LOBBY MULTIJUGADOR ---
      case 'tournament-lobby':
      case 'multiplayer-lobby':
         // Se asegura de pasar 'onNavigate' para que no falle al iniciar
        return <MultiplayerLobby user={user} onNavigate={handleNavigation} onBack={() => setAppState('homepage')} />;
      
      // --- PANTALLA DE JUEGO DEL TORNEO ---
      case 'tournament-game':
        return <TournamentGame user={user} onNavigate={handleNavigation} />;

      case 'profile': return <ProfilePage user={user} onBack={() => setAppState('homepage')} />;

      default:
        return <HomePage user={user} handleLogout={handleLogout} onNavigate={handleNavigation} />;
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;