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
import MultiplayerLobby from './components/Multiplayer/MultiplayerLobby';
import LearningDashboard from './components/Learning/LearningDashboard';
import CourseView from './components/Learning/CourseView';
import LessonView from './components/Learning/LessonView';

// Imports de Firebase
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- IMPORTANTE: Importamos lessonsData como 'let' para poder modificarlo ---
// Nota: Esta modificación es solo en memoria para el prototipo.
// En una app real, esto se haría en el backend/base de datos.
import { lessonsData } from './data/learningData';


// --- Funciones de utilidad y traducción ---
const decodeHTML = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

async function translateTriviaWithMyMemory(questions) {
    // ... (función de traducción sin cambios)
    console.log("--- Translation Step 1: Preparing texts for MyMemory API ---");
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
    console.log("--- Translation Step 2: Calling MyMemory API concurrently ---");
    const responses = await Promise.all(translationPromises);
    const translationMap = new Map();
    responses.forEach((res, index) => {
        if (res.responseData && res.responseData.translatedText) {
        const originalText = textsToTranslate[index];
        const translatedText = res.responseData.translatedText;
        translationMap.set(originalText, translatedText);
        } else {
            translationMap.set(textsToTranslate[index], textsToTranslate[index]);
            console.warn(`Failed to translate text: ${textsToTranslate[index]}`);
        }
    });
    console.log("--- Translation Step 3: Built the translation map ---");
    const translatedQuestions = questions.map(q => ({
        ...q,
        question: translationMap.get(decodeHTML(q.question)) || decodeHTML(q.question),
        correct_answer: translationMap.get(decodeHTML(q.correct_answer)) || decodeHTML(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(ans => translationMap.get(decodeHTML(ans)) || decodeHTML(ans))
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
  const [currentCategory, setCurrentCategory] = useState({ id: 0, name: '', difficulty: '' });
  const [finalScore, setFinalScore] = useState(0);

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  
  // --- NUEVO ESTADO PARA FORZAR RE-RENDER ---
  // Necesitamos una forma de decirle a React que los datos de 'lessonsData' cambiaron.
  const [lessonProgressUpdate, setLessonProgressUpdate] = useState(0); 

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

  const fetchTrivia = async (categoryId, categoryName, difficulty) => {
    // ... (sin cambios)
    setErrorMessage('');
    setAppState('loading-trivia');
    setCurrentCategory({ id: categoryId, name: categoryName || 'Aleatoria', difficulty: difficulty || 'any' });
    let apiUrl = `https://opentdb.com/api.php?amount=10&type=multiple`;
    if (categoryId) apiUrl += `&category=${categoryId}`;
    if (difficulty && difficulty !== 'any') apiUrl += `&difficulty=${difficulty}`;
    console.log("Fetching trivia from:", apiUrl);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`OpenTDB API Error: ${response.status}`);
      const data = await response.json();
      if (data.response_code === 1) throw new Error('No hay suficientes preguntas para esta combinación.');
      if (data.response_code !== 0) throw new Error('OpenTDB could not fetch questions.');
      let questionsToPlay = data.results;
      try {
        const translatedQuestions = await translateTriviaWithMyMemory(data.results);
        questionsToPlay = translatedQuestions;
      } catch (translationError) {
        console.warn("Translation failed, proceeding with original (decoded) questions.", translationError);
         questionsToPlay = data.results.map(q => ({
             ...q,
             question: decodeHTML(q.question),
             correct_answer: decodeHTML(q.correct_answer),
             incorrect_answers: q.incorrect_answers.map(decodeHTML)
         }));
      }
      setCurrentQuestions(questionsToPlay);
      setAppState('trivia-game');
    } catch (error) {
      console.error("Failed to fetch trivia:", error);
      setErrorMessage(`Error al cargar la trivia: ${error.message}`);
      setAppState('homepage');
    }
  };

  const handleGameEnd = (score) => {
    setFinalScore(score);
    setAppState('trivia-results');
  };

  const handlePlayAgain = () => setAppState('homepage');

  // --- LÓGICA DE PROGRESO DE APRENDIZAJE ---
  const handleSelectCourse = (courseId) => {
      setSelectedCourseId(courseId);
      setAppState('course-view');
  };

  const handleSelectLesson = (courseId, lessonId) => {
      setSelectedCourseId(courseId);
      setSelectedLessonId(lessonId);
      setAppState('lesson-view');
  };
  
  const handleCompleteLesson = (courseId, lessonId) => {
      console.log(`Intentando completar lección ${lessonId} del curso ${courseId}`);
      // Buscamos la lección en nuestra data (que ahora es 'let')
      const courseLessons = lessonsData[courseId];
      if (courseLessons) {
          const lessonIndex = courseLessons.findIndex(l => l.id === lessonId);
          if (lessonIndex !== -1) {
              // Modificamos el estado directamente (solo para prototipo)
              lessonsData[courseId][lessonIndex].completed = true;
              console.log(`Lección ${lessonId} marcada como completada.`);
              // Forzamos un re-render actualizando el estado 'lessonProgressUpdate'
              setLessonProgressUpdate(prev => prev + 1); 
          }
      }
      setSelectedLessonId(null);
      setAppState('course-view'); // Volvemos a la vista del curso
  };

  const handleBackToCourseList = () => {
      setSelectedCourseId(null);
      setAppState('learning');
  };
  
  const handleBackToLessonList = () => {
      setSelectedLessonId(null);
      setAppState('course-view');
  };

  const handleNavigation = (path) => {
    if (path === 'trivia-random') fetchTrivia(null, null, 'medium');
    else setAppState(path);
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
        return <CategorySelection onSelectCategoryAndDifficulty={fetchTrivia} onBack={() => setAppState('homepage')} />;
      case 'loading-trivia':
        return <div className="loading-screen">Cargando trivia de {currentCategory.name} ({currentCategory.difficulty || 'Mixta'})...</div>;
      case 'trivia-game':
        return <TriviaGame questions={currentQuestions} categoryName={`${currentCategory.name} (${currentCategory.difficulty || 'Mixta'})`} onGameEnd={handleGameEnd} />;
      case 'trivia-results':
        return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      
      case 'learning':
        return <LearningDashboard onSelectCourse={handleSelectCourse} onBack={() => setAppState('homepage')} />;
      case 'course-view':
        // Pasamos el estado 'lessonProgressUpdate' como key para forzar re-render cuando cambie
        return <CourseView key={lessonProgressUpdate} courseId={selectedCourseId} onSelectLesson={handleSelectLesson} onBack={handleBackToCourseList} />;
       case 'lesson-view':
        return <LessonView courseId={selectedCourseId} lessonId={selectedLessonId} onCompleteLesson={handleCompleteLesson} onBack={handleBackToLessonList} />;

      case 'leaderboard':
        return <Leaderboard onBack={() => setAppState('homepage')} />;
      case 'tournament-lobby':
        return <TournamentLobby onBack={() => setAppState('homepage')} />;
      case 'multiplayer-lobby':
        return <MultiplayerLobby user={user} onBack={() => setAppState('homepage')} />;
      
      default:
        console.warn(`Navegación a '${appState}' no implementada, volviendo a inicio.`);
        return <HomePage user={user} handleLogout={handleLogout} onNavigate={handleNavigation} />;
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;
