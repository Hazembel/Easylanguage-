import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Define interfaces for our data structure for type safety
interface VocabularyItem {
  german: string;
  english: string;
}

interface PhraseItem {
  german: string;
  english: string;
}

interface SingleBlankExercise {
  type: 'single-blank';
  sentence: string;
  englishSentence: string;
  hint: string;
  options: string[];
  correctAnswer: string;
}

interface DoubleBlankExercise {
  type: 'double-blank';
  sentence: string;
  englishSentence: string;
  hint: string;
  options1: string[];
  correctAnswer1: string;
  options2: string[];
  correctAnswer2: string;
}

interface TripleBlankExercise {
  type: 'triple-blank';
  sentence: string;
  englishSentence: string;
  hint: string;
  options1: string[];
  correctAnswer1: string;
  options2: string[];
  correctAnswer2: string;
  options3: string[];
  correctAnswer3: string;
}

interface SentenceScrambleExercise {
  type: 'sentence-scramble';
  englishSentence: string;
  correctSentence: string;
  scrambledWords: string[];
}

interface DialogueTurn {
    speaker: 'agent' | 'user';
    line?: string; // For agent
    prompt?: string; // For user
    options?: string[]; // For user
    correctAnswer?: string; // For user
}

interface DialogueSimulationExercise {
    type: 'dialogue-simulation';
    scenario: string;
    englishSentence: string; // Used for translation toggle
    dialogue: DialogueTurn[];
}

interface ImageAssociationExercise {
  type: 'image-association';
  imageUrl: string;
  englishSentence: string;
  options: string[];
  correctAnswer: string;
}


type Exercise = SingleBlankExercise | DoubleBlankExercise | TripleBlankExercise | SentenceScrambleExercise | DialogueSimulationExercise | ImageAssociationExercise;

interface ExerciseBlock {
  title: string;
  exercises: (SingleBlankExercise | DoubleBlankExercise | TripleBlankExercise)[];
}

interface Lesson {
  id: string;
  name: string;
  description: string;
  icon: string;
  file?: string;
  content?: {
    summary: {
      vocabulary: VocabularyItem[];
      phrases: PhraseItem[];
      grammarTip: string;
    };
    exerciseBlocks: ExerciseBlock[];
    exercises2?: SentenceScrambleExercise[];
    exercises3?: DialogueSimulationExercise[];
    exercises4?: ImageAssociationExercise[];
  };
}

interface Level {
  id: string;
  name: string;
  description: string;
  icon: string;
  lessons: Lesson[];
}

interface AppData {
  levels: Level[];
}

type LessonView = 
    | { type: 'selection' }
    | { type: 'practice0' }
    | { type: 'practice1', blockIndex: number }
    | { type: 'practice2' }
    | { type: 'practice3' }
    | { type: 'practice4' };


const App = () => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loadedLessons, setLoadedLessons] = useState<{ [key: string]: Lesson }>({});

  const [view, setView] = useState('levels'); // 'levels', 'lessons', 'lesson'
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonView, setLessonView] = useState<LessonView>({ type: 'selection' });
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'
  
  type Answer = string | (string | null)[] | null;
  const [userAnswers, setUserAnswers] = useState<Answer[]>([]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);

  const [visibleTranslations, setVisibleTranslations] = useState<{ [key: number]: boolean }>({});
  const [visibleHints, setVisibleHints] = useState<{ [key: number]: boolean }>({});
  
  // Fetch data on component mount
  useEffect(() => {
    fetch('./data/index.json')
      .then(res => res.json())
      .then(data => {
        setAppData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to load app data:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };
  
  const selectedLevel = appData?.levels.find(l => l.id === selectedLevelId);
  const selectedLesson = selectedLessonId ? loadedLessons[selectedLessonId] : null;
  
  const getCurrentExercises = (): Exercise[] => {
    if (!selectedLesson || !selectedLesson.content) return [];
    switch (lessonView.type) {
      case 'practice1':
        return selectedLesson.content.exerciseBlocks[lessonView.blockIndex]?.exercises || [];
      case 'practice2':
        return selectedLesson.content.exercises2 || [];
      case 'practice3':
        return selectedLesson.content.exercises3 || [];
      case 'practice4':
        return selectedLesson.content.exercises4 || [];
      default:
        return [];
    }
  };
  const currentExercises = getCurrentExercises();

  const initializeAnswers = (exercises: Exercise[]): Answer[] => {
      return exercises.map(ex => {
        if (ex.type === 'double-blank') return [null, null];
        if (ex.type === 'triple-blank') return [null, null, null];
        if (ex.type === 'sentence-scramble') return [];
        if (ex.type === 'dialogue-simulation') {
            const userTurns = ex.dialogue.filter(turn => turn.speaker === 'user').length;
            return Array(userTurns).fill(null);
        }
        return null;
      });
  }

  const handleAnswerSelect = (exerciseIndex: number, selectedOption: string, blankIndex?: 0 | 1 | 2) => {
    if (checked) return;
    const newAnswers = [...userAnswers];
    const exercise = currentExercises[exerciseIndex];
    
    if ((exercise.type === 'double-blank' || exercise.type === 'triple-blank') && typeof blankIndex !== 'undefined') {
        const defaultTuple = exercise.type === 'double-blank' ? [null, null] : [null, null, null];
        const currentTuple = (newAnswers[exerciseIndex] as (string | null)[]) || defaultTuple;
        const newTuple: (string | null)[] = [...currentTuple];
        newTuple[blankIndex] = selectedOption;
        newAnswers[exerciseIndex] = newTuple;
    } else {
        newAnswers[exerciseIndex] = selectedOption;
    }
    setUserAnswers(newAnswers);
  };
  
  const handleWordMove = (exerciseIndex: number, word: string, source: 'bank' | 'sentence', wordIndexInSentence?: number) => {
    if (checked) return;
    const newAnswers = [...userAnswers];
    let currentSentence = [...((newAnswers[exerciseIndex] as string[]) || [])];
    
    if (source === 'bank') {
        currentSentence.push(word);
    } else if (source === 'sentence' && typeof wordIndexInSentence !== 'undefined') {
        currentSentence.splice(wordIndexInSentence, 1);
    }

    newAnswers[exerciseIndex] = currentSentence;
    setUserAnswers(newAnswers);
  };

  const handleDialogueAnswer = (exerciseIndex: number, userTurnIndex: number, choice: string) => {
    if (checked) return;
    const newAnswers = [...userAnswers];
    const currentDialogueAnswers = [...(newAnswers[exerciseIndex] as (string | null)[])];
    currentDialogueAnswers[userTurnIndex] = choice;
    newAnswers[exerciseIndex] = currentDialogueAnswers;
    setUserAnswers(newAnswers);
  };


  const checkAnswers = () => {
    let currentScore = 0;
    userAnswers.forEach((answer, index) => {
      const exercise = currentExercises[index];
      if (exercise.type === 'single-blank' || exercise.type === 'image-association') {
          if (answer === exercise.correctAnswer) {
            currentScore++;
          }
      } else if (exercise.type === 'double-blank') {
          if (Array.isArray(answer) && answer[0] === exercise.correctAnswer1 && answer[1] === exercise.correctAnswer2) {
            currentScore++;
          }
      } else if (exercise.type === 'triple-blank') {
          if (Array.isArray(answer) && answer[0] === exercise.correctAnswer1 && answer[1] === exercise.correctAnswer2 && answer[2] === exercise.correctAnswer3) {
            currentScore++;
          }
      } else if (exercise.type === 'sentence-scramble') {
          if (Array.isArray(answer) && answer.join(' ') === exercise.correctSentence) {
            currentScore++;
          }
      } else if (exercise.type === 'dialogue-simulation') {
          const userTurns = exercise.dialogue.filter(turn => turn.speaker === 'user');
          const correct = userTurns.every((turn, turnIndex) => 
            Array.isArray(answer) && answer[turnIndex] === turn.correctAnswer
          );
          if (correct) {
              currentScore++;
          }
      }
    });
    setScore(currentScore);
    setChecked(true);
  };

  const resetQuiz = (exercisesToReset?: Exercise[]) => {
    const exercises = exercisesToReset || currentExercises;
    setUserAnswers(initializeAnswers(exercises));
    setChecked(false);
    setScore(0);
    setVisibleTranslations({});
    setVisibleHints({});
  };
  
  const handleSelectLevel = (levelId: string) => {
    setSelectedLevelId(levelId);
    setView('lessons');
  }
  
  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setChecked(false);
    setScore(0);
    setLessonView({ type: 'selection' });
    setVisibleTranslations({});
    setVisibleHints({});
    setView('lesson');

    if (!loadedLessons[lessonId]) {
      const level = appData?.levels.find(l => l.lessons.some(les => les.id === lessonId));
      const lessonInfo = level?.lessons.find(l => l.id === lessonId);
      
      if (lessonInfo && lessonInfo.file) {
        setLoadingLesson(true);
        fetch(lessonInfo.file)
          .then(res => res.json())
          .then((lessonData: Lesson) => {
            setLoadedLessons(prev => ({ ...prev, [lessonId]: lessonData }));
          })
          .catch(error => console.error("Failed to load lesson content:", error))
          .finally(() => setLoadingLesson(false));
      }
    }
  }
  
  const handleGoToLevels = () => {
    setSelectedLevelId(null);
    setSelectedLessonId(null);
    setView('levels');
  };
  
  const handleGoToLessons = () => {
    setSelectedLessonId(null);
    setView('lessons');
  }

  const getOptionClassName = (option: string, exerciseIndex: number, blankIndex?: 0 | 1 | 2) => {
    if (!checked) {
        const answer = userAnswers[exerciseIndex];
        if (typeof blankIndex !== 'undefined' && Array.isArray(answer)) {
            return answer[blankIndex] === option ? 'selected' : '';
        }
        return answer === option ? 'selected' : '';
    }

    const exercise = currentExercises[exerciseIndex];
    if (exercise.type === 'single-blank' || exercise.type === 'image-association') {
        if (option === exercise.correctAnswer) return 'correct';
        if (userAnswers[exerciseIndex] === option) return 'incorrect';
    } else if ((exercise.type === 'double-blank' || exercise.type === 'triple-blank') && typeof blankIndex !== 'undefined') {
        let correctAnswer;
        if (exercise.type === 'double-blank') {
            correctAnswer = blankIndex === 0 ? exercise.correctAnswer1 : exercise.correctAnswer2;
        } else {
            if (blankIndex === 0) correctAnswer = exercise.correctAnswer1;
            else if (blankIndex === 1) correctAnswer = exercise.correctAnswer2;
            else correctAnswer = exercise.correctAnswer3;
        }
        if (option === correctAnswer) return 'correct';
        const userAnswer = userAnswers[exerciseIndex];
        if(Array.isArray(userAnswer) && userAnswer[blankIndex] === option) return 'incorrect';
    }
    return '';
  };

    const getDialogueOptionClassName = (option: string, exerciseIndex: number, userTurnIndex: number) => {
        const exercise = currentExercises[exerciseIndex] as DialogueSimulationExercise;
        const userAnswer = (userAnswers[exerciseIndex] as (string | null)[])[userTurnIndex];
        
        if (!checked) {
            return userAnswer === option ? 'selected' : '';
        }

        const userTurn = exercise.dialogue.filter(t => t.speaker === 'user')[userTurnIndex];
        if (option === userTurn.correctAnswer) return 'correct';
        if (userAnswer === option) return 'incorrect';
        
        return '';
    };
  
  const getScrambleClassName = (exerciseIndex: number) => {
    if (!checked) return '';
    const exercise = currentExercises[exerciseIndex] as SentenceScrambleExercise;
    const userAnswer = (userAnswers[exerciseIndex] as string[]).join(' ');
    return userAnswer === exercise.correctSentence ? 'correct' : 'incorrect';
  }

  const isCheckButtonDisabled = () => {
    if (!currentExercises || currentExercises.length === 0) return true;
    
    return userAnswers.some((answer, index) => {
        const exercise = currentExercises[index];
        if (!exercise) return true;

        if (exercise.type === 'double-blank' || exercise.type === 'triple-blank') {
            return !Array.isArray(answer) || answer.includes(null);
        }
        if (exercise.type === 'sentence-scramble') {
            const userAnswer = answer as string[];
            return userAnswer.length !== exercise.scrambledWords.length;
        }
        if (exercise.type === 'dialogue-simulation') {
            return !Array.isArray(answer) || answer.includes(null);
        }
        return answer === null;
    });
  };

  const speakSentence = (sentence: string) => {
    if ('speechSynthesis' in window) {
      const cleanSentence = sentence.replace(/___\(\d\)___/g, '').replace('___', '').replace(/<\/?u>/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanSentence);
      utterance.lang = 'de-DE';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser doesn't support text-to-speech.");
    }
  };

  const toggleTranslation = (index: number) => {
    setVisibleTranslations(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleHint = (index: number) => {
    setVisibleHints(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const renderHeader = () => {
      return 'Deutsch Lernen';
  }

  const renderSentence = (exercise: Exercise) => {
    if (exercise.type === 'single-blank') {
      const parts = exercise.sentence.split('___');
      return (
        <>
          <span dangerouslySetInnerHTML={{ __html: parts[0] }} />
          <span className="blank-marker">(1)</span>
          <span dangerouslySetInnerHTML={{ __html: parts[1] }} />
        </>
      );
    }
    
    if(exercise.type === 'double-blank') {
        const parts = exercise.sentence.split(/(___\(1\)___|___\(2\)___)/);
        return parts.map((part, index) => {
          if (part === '___(1)___') {
            return <span key={index} className="blank-marker">(1)</span>;
          }
          if (part === '___(2)___') {
            return <span key={index} className="blank-marker">(2)</span>;
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        });
    }

    if(exercise.type === 'triple-blank') {
        const parts = exercise.sentence.split(/(___\(1\)___|___\(2\)___|___\(3\)___)/);
        return parts.map((part, index) => {
          if (part === '___(1)___') return <span key={index} className="blank-marker">(1)</span>;
          if (part === '___(2)___') return <span key={index} className="blank-marker">(2)</span>;
          if (part === '___(3)___') return <span key={index} className="blank-marker">(3)</span>;
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        });
    }

    return null;
  };

  const renderExerciseImage = (url: string) => {
    if (!url) {
        return <div className="image-placeholder">?</div>;
    }
    return <img src={url} alt="Exercise visual hint" className="exercise-image" />;
  };

  const renderBreadcrumbs = () => {
    if (view === 'levels') return null;
    const lessonMetaData = selectedLevel?.lessons.find(l => l.id === selectedLessonId);

    let practiceName = '';
    if (lessonView.type === 'practice0') practiceName = 'Summary';
    if (lessonView.type === 'practice1' && selectedLesson?.content) practiceName = selectedLesson.content.exerciseBlocks[lessonView.blockIndex]?.title || 'Fill in the Blanks';
    if (lessonView.type === 'practice2') practiceName = 'Build Sentences';
    if (lessonView.type === 'practice3') practiceName = 'Dialogue Simulation';
    if (lessonView.type === 'practice4') practiceName = 'Picture Puzzle';

    return (
        <nav aria-label="breadcrumb" className="breadcrumbs">
            <button onClick={handleGoToLevels} className="breadcrumb-link">Levels</button>
            
            {selectedLevel && (
                <>
                    <span className="breadcrumb-separator">&rsaquo;</span>
                    <button onClick={handleGoToLessons} disabled={view === 'lessons'} className="breadcrumb-link">{selectedLevel.name}</button>
                </>
            )}

            {lessonMetaData && view === 'lesson' && (
                 <>
                    <span className="breadcrumb-separator">&rsaquo;</span>
                    <button onClick={() => setLessonView({ type: 'selection' })} disabled={lessonView.type === 'selection'} className="breadcrumb-link">{lessonMetaData.name}</button>
                </>
            )}
            
            {lessonMetaData && lessonView.type !== 'selection' && (
                 <>
                    <span className="breadcrumb-separator">&rsaquo;</span>
                    <span className="breadcrumb-current">{practiceName}</span>
                 </>
            )}
        </nav>
    );
}

  const renderView = () => {
    if (loading) {
      return <div className="loading-text">Loading...</div>;
    }
    if (!appData) {
        return <div className="loading-text">Error: Could not load data.</div>;
    }
    
    switch (view) {
      case 'levels':
        return (
          <div className="selection-page">
            <h2>Wähle dein Niveau (Choose your level)</h2>
            <div className="selection-grid">
              {appData.levels.map(level => (
                <div key={level.id} className="choice-card" onClick={() => handleSelectLevel(level.id)}>
                  <span className="icon" role="img" aria-label="graduation cap">{level.icon}</span>
                  <h3>{level.name}</h3>
                  <p>{level.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'lessons':
        return (
          <div className="selection-page">
            <h2>{selectedLevel?.name} Lektionen ({selectedLevel?.name} Lessons)</h2>
            <div className="selection-grid">
                {selectedLevel?.lessons.map(lesson => (
                  <div key={lesson.id} className="choice-card" onClick={() => handleSelectLesson(lesson.id)}>
                      <span className="icon" role="img" aria-label="train">{lesson.icon}</span>
                      <h3>{lesson.name}</h3>
                      <p>{lesson.description}</p>
                  </div>
                ))}
            </div>
          </div>
        );
      case 'lesson':
        if (loadingLesson) {
          return <div className="loading-text">Loading lesson...</div>;
        }
        if (!selectedLesson || !selectedLesson.content) return null;
        return (
            <>
              {lessonView.type === 'selection' && (
                <div className="selection-page lesson-selection">
                    <h2>Wähle eine Übung</h2>
                     <div className="selection-grid">
                        <div className="choice-card" onClick={() => setLessonView({ type: 'practice0' })}>
                            <span className="icon" role="img" aria-label="book open">📖</span>
                            <h3>Übung 0</h3>
                            <p>Zusammenfassung</p>
                        </div>
                        {selectedLesson.content.exerciseBlocks.map((block, index) => (
                           <div key={index} className="choice-card" onClick={() => { 
                                setLessonView({ type: 'practice1', blockIndex: index }); 
                                resetQuiz(block.exercises);
                            }}>
                                <span className="icon" role="img" aria-label="pencil writing">✍️</span>
                                <h3>{block.title}</h3>
                                <p>Lücken füllen</p>
                            </div>
                        ))}

                        {selectedLesson.content.exercises2 && (
                        <div className="choice-card" onClick={() => { setLessonView({ type: 'practice2' }); resetQuiz(selectedLesson.content.exercises2); }}>
                            <span className="icon" role="img" aria-label="puzzle piece">🧩</span>
                            <h3>Übung 2</h3>
                            <p>Sätze bilden</p>
                        </div>
                        )}
                        {selectedLesson.content.exercises3 && (
                        <div className="choice-card" onClick={() => { setLessonView({ type: 'practice3' }); resetQuiz(selectedLesson.content.exercises3); }}>
                            <span className="icon" role="img" aria-label="speech bubble">💬</span>
                            <h3>Übung 3</h3>
                            <p>Dialog-Simulation</p>
                        </div>
                        )}
                         {selectedLesson.content.exercises4 && (
                        <div className="choice-card" onClick={() => { setLessonView({ type: 'practice4' }); resetQuiz(selectedLesson.content.exercises4); }}>
                            <span className="icon" role="img" aria-label="picture frame">🖼️</span>
                            <h3>Übung 4</h3>
                            <p>Bilderrätsel</p>
                        </div>
                        )}
                    </div>
                </div>
              )}

              {lessonView.type === 'practice0' && (
                <section className="card">
                  <h2>Übung 0: Zusammenfassung (Practice 0: Summary)</h2>
                  <div className="summary-content">
                    <div>
                      <h3>Wortschatz (Vocabulary)</h3>
                      <table className="vocabulary-table">
                        <thead>
                          <tr>
                            <th>Deutsch</th>
                            <th>English</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLesson.content.summary.vocabulary.map((item, index) => (
                            <tr key={index}>
                              <td>{item.german}</td>
                              <td>{item.english}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h3>Wichtige Sätze (Key Phrases)</h3>
                      <ul className="phrases-list">
                        {selectedLesson.content.summary.phrases.map((phrase, index) => (
                          <li key={index}>
                            <strong>{phrase.german}</strong>
                            <br />
                            <em>{phrase.english}</em>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="grammar-tip-section">
                      <h3>Grammatik-Tipp (Grammar Tip)</h3>
                      <div dangerouslySetInnerHTML={{ __html: selectedLesson.content.summary.grammarTip }}></div>
                  </div>
                </section>
              )}

              {lessonView.type === 'practice1' && (
                <section className="card">
                    <h2>{selectedLesson.content.exerciseBlocks[lessonView.blockIndex].title}</h2>
                    <div className="exercises">
                        {currentExercises.map((exercise, index) => (
                        <div key={index} className="exercise-item">
                            <div className="exercise-header">
                                <p className="sentence-number">{index + 1}</p>
                                <div className="action-icons">
                                    <button onClick={() => { if ('sentence' in exercise) speakSentence(exercise.sentence); }} className="action-btn" title="Speak">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                    </button>
                                    <button onClick={() => toggleTranslation(index)} className="action-btn" title="Translate">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                                    </button>
                                    <button onClick={() => toggleHint(index)} className="action-btn" title="Hint">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    </button>
                                </div>
                            </div>
                            {visibleTranslations[index] && (<div className="translation-box"><p><em>{exercise.englishSentence}</em></p></div>)}
                            {visibleHints[index] && 'hint' in exercise && (<div className="hint-box"><p><strong>Hint:</strong> {exercise.hint}</p></div>)}
                            
                            <p className="sentence">
                               {renderSentence(exercise)}
                            </p>
                            
                            {exercise.type === 'single-blank' && (
                                 <div className="options">
                                    {exercise.options.map((option, optionIndex) => (
                                        <button key={optionIndex} onClick={() => handleAnswerSelect(index, option)} className={`option-btn ${getOptionClassName(option, index)}`} disabled={checked} aria-pressed={userAnswers[index] === option}>
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {exercise.type === 'double-blank' && (
                                <div className="double-options-container">
                                    <div className="options-group">
                                        <p className="options-group-title">Lücke (1)</p>
                                        <div className="options">
                                            {exercise.options1.map((option, optionIndex) => (
                                                <button key={optionIndex} onClick={() => handleAnswerSelect(index, option, 0)} className={`option-btn ${getOptionClassName(option, index, 0)}`} disabled={checked} aria-pressed={Array.isArray(userAnswers[index]) && userAnswers[index][0] === option}>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="options-group">
                                        <p className="options-group-title">Lücke (2)</p>
                                        <div className="options">
                                            {exercise.options2.map((option, optionIndex) => (
                                                <button key={optionIndex} onClick={() => handleAnswerSelect(index, option, 1)} className={`option-btn ${getOptionClassName(option, index, 1)}`} disabled={checked} aria-pressed={Array.isArray(userAnswers[index]) && userAnswers[index][1] === option}>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                             {exercise.type === 'triple-blank' && (
                                <div className="triple-options-container">
                                    <div className="options-group">
                                        <p className="options-group-title">Lücke (1)</p>
                                        <div className="options">
                                            {exercise.options1.map((option, optionIndex) => (
                                                <button key={optionIndex} onClick={() => handleAnswerSelect(index, option, 0)} className={`option-btn ${getOptionClassName(option, index, 0)}`} disabled={checked} aria-pressed={Array.isArray(userAnswers[index]) && userAnswers[index][0] === option}>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="options-group">
                                        <p className="options-group-title">Lücke (2)</p>
                                        <div className="options">
                                            {exercise.options2.map((option, optionIndex) => (
                                                <button key={optionIndex} onClick={() => handleAnswerSelect(index, option, 1)} className={`option-btn ${getOptionClassName(option, index, 1)}`} disabled={checked} aria-pressed={Array.isArray(userAnswers[index]) && userAnswers[index][1] === option}>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                     <div className="options-group">
                                        <p className="options-group-title">Lücke (3)</p>
                                        <div className="options">
                                            {exercise.options3.map((option, optionIndex) => (
                                                <button key={optionIndex} onClick={() => handleAnswerSelect(index, option, 2)} className={`option-btn ${getOptionClassName(option, index, 2)}`} disabled={checked} aria-pressed={Array.isArray(userAnswers[index]) && userAnswers[index][2] === option}>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        ))}
                    </div>
                    <div className="quiz-controls">
                        {!checked ? (
                        <button onClick={checkAnswers} className="control-btn check-btn" disabled={isCheckButtonDisabled()}>Check Answers</button>
                        ) : (
                        <div className="score-container">
                            <p>Your Score: {score} / {currentExercises.length}</p>
                            <button onClick={() => resetQuiz()} className="control-btn reset-btn">Try Again</button>
                        </div>
                        )}
                    </div>
                </section>
              )}

              {lessonView.type === 'practice2' && (
                <section className="card">
                    <h2>Übung 2: Sätze bilden (Practice 2: Build Sentences)</h2>
                    <div className="exercises">
                        {currentExercises.map((exercise, index) => {
                            if (exercise.type !== 'sentence-scramble') return null;
                            const builtSentence = (userAnswers[index] as string[]) || [];
                            const bankWords = (() => {
                                const available = [...exercise.scrambledWords];
                                builtSentence.forEach(wordInSentence => {
                                    const i = available.indexOf(wordInSentence);
                                    if (i > -1) available.splice(i, 1);
                                });
                                return available;
                            })();

                            return (
                                <div key={index} className="exercise-item">
                                    <p className="sentence-number">{index + 1}.</p>
                                    <p className="translation-prompt"><em>{exercise.englishSentence}</em></p>
                                    <div className={`sentence-build-area ${getScrambleClassName(index)}`}>
                                        {builtSentence.length === 0 && !checked && <span className="placeholder-text">Build your sentence here...</span>}
                                        {builtSentence.map((word, wordIndex) => (
                                            <button key={`${word}-${wordIndex}`} className="word-tile" onClick={() => handleWordMove(index, word, 'sentence', wordIndex)} disabled={checked}>
                                                {word}
                                            </button>
                                        ))}
                                        {checked && getScrambleClassName(index) === 'incorrect' && <div className="correct-sentence-display"><strong>Correct:</strong> {exercise.correctSentence}</div>}
                                    </div>
                                    <div className="word-bank">
                                        {bankWords.map((word, wordIndex) => (
                                            <button key={`${word}-${wordIndex}`} className="word-tile" onClick={() => handleWordMove(index, word, 'bank')} disabled={checked}>
                                                {word}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="quiz-controls">
                        {!checked ? (
                        <button onClick={checkAnswers} className="control-btn check-btn" disabled={isCheckButtonDisabled()}>Check Answers</button>
                        ) : (
                        <div className="score-container">
                            <p>Your Score: {score} / {currentExercises.length}</p>
                            <button onClick={() => resetQuiz()} className="control-btn reset-btn">Try Again</button>
                        </div>
                        )}
                    </div>
                </section>
              )}

              {lessonView.type === 'practice3' && (
                <section className="card">
                    <h2>Übung 3: Dialog-Simulation (Practice 3: Dialogue Simulation)</h2>
                    <div className="exercises">
                        {currentExercises.map((exercise, index) => {
                            if (exercise.type !== 'dialogue-simulation') return null;
                            let userTurnCounter = -1;

                            return (
                                <div key={index} className="exercise-item">
                                    <p className="sentence-number">{index + 1}.</p>
                                    <p className="translation-prompt"><strong>Scenario:</strong> <em>{exercise.scenario}</em></p>
                                    <div className="dialogue-container">
                                        {exercise.dialogue.map((turn, turnIndex) => {
                                            if (turn.speaker === 'agent') {
                                                return (
                                                    <div key={turnIndex} className="chat-bubble agent">
                                                        <p>{turn.line}</p>
                                                    </div>
                                                );
                                            } else { // speaker === 'user'
                                                userTurnCounter++;
                                                const currentTurnIndex = userTurnCounter;
                                                return (
                                                    <div key={turnIndex} className="user-turn">
                                                        <div className="chat-bubble user-prompt">
                                                            <p><strong>You:</strong> <em>{turn.prompt}</em></p>
                                                        </div>
                                                        <div className="dialogue-options">
                                                            {turn.options?.map((option, optionIndex) => (
                                                                <button 
                                                                    key={optionIndex}
                                                                    className={`option-btn dialogue-option-btn ${getDialogueOptionClassName(option, index, currentTurnIndex)}`}
                                                                    onClick={() => handleDialogueAnswer(index, currentTurnIndex, option)}
                                                                    disabled={checked}
                                                                    aria-pressed={(userAnswers[index] as (string|null)[])?.[currentTurnIndex] === option}
                                                                >
                                                                    {option}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                     <div className="quiz-controls">
                        {!checked ? (
                        <button onClick={checkAnswers} className="control-btn check-btn" disabled={isCheckButtonDisabled()}>Check Answers</button>
                        ) : (
                        <div className="score-container">
                            <p>Your Score: {score} / {currentExercises.length}</p>
                            <button onClick={() => resetQuiz()} className="control-btn reset-btn">Try Again</button>
                        </div>
                        )}
                    </div>
                </section>
              )}

                {lessonView.type === 'practice4' && (
                <section className="card">
                    <h2>Übung 4: Bilderrätsel (Practice 4: Picture Puzzle)</h2>
                    <div className="exercises">
                        {currentExercises.map((exercise, index) => {
                            if (exercise.type !== 'image-association') return null;
                            return (
                                <div key={index} className="exercise-item">
                                    <p className="sentence-number">{index + 1}.</p>
                                    <p className="translation-prompt"><em>{exercise.englishSentence}</em></p>
                                    <div className="exercise-image-container">
                                       {renderExerciseImage(exercise.imageUrl)}
                                    </div>
                                    <div className="image-options-grid">
                                        {exercise.options.map((option, optionIndex) => (
                                            <button key={optionIndex} onClick={() => handleAnswerSelect(index, option)} className={`option-btn ${getOptionClassName(option, index)}`} disabled={checked} aria-pressed={userAnswers[index] === option}>
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                     <div className="quiz-controls">
                        {!checked ? (
                        <button onClick={checkAnswers} className="control-btn check-btn" disabled={isCheckButtonDisabled()}>Check Answers</button>
                        ) : (
                        <div className="score-container">
                            <p>Your Score: {score} / {currentExercises.length}</p>
                            <button onClick={() => resetQuiz()} className="control-btn reset-btn">Try Again</button>
                        </div>
                        )}
                    </div>
                </section>
              )}

          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <header>
        <h1>{renderHeader()}</h1>
        <button 
            onClick={toggleTheme} 
            className="theme-toggle" 
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          )}
        </button>
      </header>
      
      <main>
        {renderBreadcrumbs()}
        {renderView()}
      </main>

      <footer>
        <p>Viel Erfolg beim Lernen! (Good luck with your learning!)</p>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);