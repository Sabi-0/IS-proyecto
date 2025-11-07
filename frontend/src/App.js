import React, { useEffect, useState } from 'react';

// Imports de componentes
// ... (todos tus imports de componentes se mantienen igual)
import AuthPage from './components/AuthPage/AuthPage.js';
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

// Imports de datos
import { lessonsData } from './data/learningData';


// --- Funciones de utilidad y traducción ---
const decodeHTML = (html) => {
// ... (código existente sin cambios)
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

async function translateTriviaWithMyMemory(questions) {
// ... (código de traducción existente sin cambios)
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
  const [isUserSynced, setIsUserSynced] = useState(false); // Estado para evitar syncs repetidos
  
// ... (otros estados existentes sin cambios)
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentCategory, setCurrentCategory] = useState({ id: 0, name: '', difficulty: '' });
  const [finalScore, setFinalScore] = useState(0);

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [lessonProgressUpdate, setLessonProgressUpdate] = useState(0); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
// ... (código existente de onAuthStateChanged, incluyendo /sync-user)
      setUser(currentUser);
      if (currentUser) {
        setAppState('homepage');
        if (currentUser.isAnonymous) {
            console.log('Usuario invitado detectado. No se requiere sincronización con el backend.');
            setIsAuthLoading(false);
            return; 
        }
        if (isUserSynced) {
            setIsAuthLoading(false);
            return; 
        }
        console.log('Usuario registrado autenticado, sincronizando con el backend...');
        currentUser.getIdToken(true) 
            .then((idToken) => {
                return fetch('http://localhost:4000/sync-user', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}` 
                    }
                });
            })
            .then(response => {
                if (!response.ok) { 
                    throw new Error(`El backend respondió con estado: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Respuesta de sincronización del backend:', data.message);
                setIsUserSynced(true); 
            })
            .catch(error => {
                console.error('Error al sincronizar usuario con el backend:', error);
                setErrorMessage('Error al conectar con el servidor.');
            });
      } else {
        setAppState('landing');
        setIsUserSynced(false); 
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isUserSynced]); 

  const handleLogout = async () => {
// ... (código existente sin cambios)
    await signOut(auth);
  };

  const fetchTrivia = async (categoryId, categoryName, difficulty) => {
// ... (código existente sin cambios)
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

  // --- MODIFICACIÓN: Guardar Puntuación ---
  const handleGameEnd = (score) => {
    setFinalScore(score); // Guardamos el puntaje para la pantalla de resultados
    setAppState('trivia-results'); // Mostramos la pantalla de resultados inmediatamente

    // Después de mostrar los resultados, intentamos guardar en segundo plano
    if (user && !user.isAnonymous) {
      console.log('Juego terminado, guardando puntuación en el backend...');
      user.getIdToken(true)
        .then(idToken => {
          const gameData = {
            score: score,
            questionsTotal: currentQuestions.length,
            gameMode: currentCategory.id ? 'classic' : 'random_api',
            categoryName: currentCategory.name,
            difficulty: currentCategory.difficulty
          };

          return fetch('http://localhost:4000/save-score', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(gameData)
          });
        })
        .then(response => response.json())
        .then(data => {
          console.log('Respuesta de /save-score:', data.message);
        })
        .catch(error => {
          console.error('Error al guardar la puntuación:', error);
          // No mostramos un error al usuario aquí, ya que el juego ya terminó.
          // Solo lo registramos en la consola.
        });
    }
  };
  // --- FIN DE LA MODIFICACIÓN ---

  const handlePlayAgain = () => {
// ... (código existente sin cambios)
    setAppState('homepage');
  };

  // --- LÓGICA DE PROGRESO DE APRENDIZAJE ---
  const handleSelectCourse = (courseId) => {
// ... (código existente sin cambios)
      setSelectedCourseId(courseId);
      setAppState('course-view');
  };

  const handleSelectLesson = (courseId, lessonId) => {
// ... (código existente sin cambios)
      setSelectedCourseId(courseId);
      setSelectedLessonId(lessonId);
      setAppState('lesson-view');
  };
  
  const handleCompleteLesson = (courseId, lessonId) => {
// ... (código existente sin cambios)
      console.log(`Intentando completar lección ${lessonId} del curso ${courseId}`);
      const courseLessons = lessonsData[courseId];
      if (courseLessons) {
          const lessonIndex = courseLessons.findIndex(l => l.id === lessonId);
          if (lessonIndex !== -1) {
              lessonsData[courseId][lessonIndex].completed = true;
              console.log(`Lección ${lessonId} marcada como completada.`);
              setLessonProgressUpdate(prev => prev + 1); 
          }
      }
      setSelectedLessonId(null);
      setAppState('course-view');
  };

  const handleBackToCourseList = () => {
// ... (código existente sin cambios)
      setSelectedCourseId(null);
      setAppState('learning');
  };
  
  const handleBackToLessonList = () => {
// ... (código existente sin cambios)
      setSelectedLessonId(null);
      setAppState('course-view');
  };

  const handleNavigation = (path) => {
// ... (código existente sin cambios)
    if (path === 'trivia-random') fetchTrivia(null, null, 'medium');
    else setAppState(path);
    setErrorMessage('');
  };

  const renderContent = () => {
// ... (código existente sin cambios)
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