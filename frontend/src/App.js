import React, { useEffect, useState } from 'react';

// Imports de componentes
import AuthPage from './components/Authpage/AuthPage';
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
import ProfilePage from './components/Profile/ProfilePage'; 

// Imports de Firebase
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Imports de datos (Solo para estructura de cursos, no para estado)
import { lessonsData } from './data/learningData';

// --- ¡URL DEL BACKEND (NGROK)! ---
const BACKEND_URL = 'https://glairy-debroah-downwardly.ngrok-free.dev';
// ---

// --- Funciones de utilidad y traducción ---
const decodeHTML = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

async function translateTriviaWithMyMemory(questions) {
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
  const [isUserSynced, setIsUserSynced] = useState(false); 
  
  // Estados de Juego
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentCategory, setCurrentCategory] = useState({ id: 0, name: '', difficulty: '' });
  const [finalScore, setFinalScore] = useState(0);

  // Estados de Aprendizaje
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  // NUEVO: Array que guarda los IDs de lecciones completadas (desde la BD)
  const [completedLessons, setCompletedLessons] = useState([]); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAppState('homepage');
        
        if (currentUser.isAnonymous) {
            console.log('Usuario invitado. Funciones de guardado deshabilitadas.');
            setIsAuthLoading(false);
            return; 
        }
        
        if (!isUserSynced) {
            console.log('Usuario autenticado. Sincronizando usuario y cargando progreso...');
            currentUser.getIdToken(true) 
            .then((idToken) => {
                // Hacemos dos peticiones en paralelo: Sincronizar usuario y Cargar progreso
                const syncPromise = fetch(`${BACKEND_URL}/sync-user`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`, 'ngrok-skip-browser-warning': 'true' }
                });

                const progressPromise = fetch(`${BACKEND_URL}/learning/progress`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${idToken}`, 'ngrok-skip-browser-warning': 'true' }
                });

                return Promise.all([syncPromise, progressPromise]);
            })
            .then(async ([syncRes, progressRes]) => {
                if(syncRes.ok) console.log("Usuario sincronizado con éxito.");
                
                if(progressRes.ok) {
                    const progressData = await progressRes.json();
                    // Actualizamos el estado con las lecciones que vienen de la BD
                    setCompletedLessons(progressData); 
                    console.log("Progreso cargado desde BD:", progressData);
                } else {
                    console.warn("No se pudo cargar el progreso.");
                }
                setIsUserSynced(true); 
            })
            .catch(error => {
                console.error('Error en inicialización:', error);
                setErrorMessage('Error de conexión con el servidor.');
            });
        }
      } else {
        setAppState('landing');
        setIsUserSynced(false); 
        setCompletedLessons([]); // Limpiamos al salir
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isUserSynced]); 

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchTrivia = async (categoryId, categoryName, difficulty) => {
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

    if (user && !user.isAnonymous) {
      console.log('Juego terminado, guardando puntuación en el backend...');
      const correctAnswers = score;
      const incorrectAnswers = currentQuestions.length - correctAnswers;
      
      user.getIdToken(true)
        .then(idToken => {
          const gameData = {
            score: score,
            correctAnswers: correctAnswers,
            incorrectAnswers: incorrectAnswers,
            questionsTotal: currentQuestions.length,
            gameMode: currentCategory.id ? 'classic' : 'random_api',
            categoryName: currentCategory.name,
            difficulty: currentCategory.difficulty
          };

          return fetch(`${BACKEND_URL}/save-score`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
              'ngrok-skip-browser-warning': 'true'
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
        });
    }
  };

  const handlePlayAgain = () => {
    setAppState('homepage');
  };

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
      console.log(`Lección ${lessonId} aprobada!`);
      
      // 1. Actualización optimista (para que la interfaz responda rápido)
      setCompletedLessons(prev => [...prev, lessonId]);
      
      // 2. Guardar en la base de datos
      if (user && !user.isAnonymous) {
          user.getIdToken(true).then(token => {
              fetch(`${BACKEND_URL}/learning/complete`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'ngrok-skip-browser-warning': 'true'
                  },
                  body: JSON.stringify({ lessonId })
              })
              .then(res => {
                  if(res.ok) console.log("Progreso guardado en BD.");
                  else console.error("Error al guardar en BD.");
              })
              .catch(err => console.error("Error de conexión al guardar progreso:", err));
          });
      }

      setSelectedLessonId(null);
      setAppState('course-view'); 
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
    console.log(`[DEBUG App.js] handleNavigation fue llamado con: '${path}'`);
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
      case 'landing':
        return <LandingPage onNavigateToAuth={() => setAppState('auth')} />;
      case 'auth':
        return <AuthPage onBack={() => setAppState('landing')} />;
      
      case 'category-selection':
        return <CategorySelection onSelectCategoryAndDifficulty={fetchTrivia} onBack={() => setAppState('homepage')} />;
      case 'loading-trivia':
        return <div className="loading-screen">Cargando trivia...</div>;
      case 'trivia-game':
        return <TriviaGame questions={currentQuestions} categoryName={currentCategory.name} onGameEnd={handleGameEnd} />;
      case 'trivia-results':
        return <TriviaResults score={finalScore} totalQuestions={currentQuestions.length} onPlayAgain={handlePlayAgain} />;
      
      // --- SECCIÓN DE APRENDIZAJE ---
      case 'learning':
        return <LearningDashboard onSelectCourse={handleSelectCourse} onBack={() => setAppState('homepage')} />;
      case 'course-view':
        // Pasamos 'completedLessons' (array de IDs) al componente para que pinte los candados
        return (
            <CourseView 
                courseId={selectedCourseId} 
                completedLessons={completedLessons} 
                onSelectLesson={handleSelectLesson} 
                onBack={handleBackToCourseList} 
            />
        );
       case 'lesson-view':
        return (
            <LessonView 
                courseId={selectedCourseId} 
                lessonId={selectedLessonId} 
                onCompleteLesson={handleCompleteLesson} 
                onBack={handleBackToLessonList} 
            />
        );

      case 'leaderboard':
        return <Leaderboard onBack={() => setAppState('homepage')} />;
        
      case 'tournament-lobby':
        return <MultiplayerLobby user={user} onBack={() => setAppState('homepage')} />;
      case 'multiplayer-lobby':
        return <MultiplayerLobby user={user} onBack={() => setAppState('homepage')} />;
      
      case 'profile':
        return <ProfilePage user={user} onBack={() => setAppState('homepage')} />;

      default:
        console.warn(`[DEBUG App.js] ADVERTENCIA: appState '${appState}' no encontrado.`);
        return (
            <div style={{ padding: '20px', color: 'red', backgroundColor: 'black', height: '100vh', fontFamily: 'monospace' }}>
                <h1>Error de Navegación</h1>
                <p>Se intentó navegar a: <strong>'{appState}'</strong></p>
                <button onClick={() => setAppState('homepage')} style={{padding: '10px'}}>Volver a Inicio</button>
            </div>
        );
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;