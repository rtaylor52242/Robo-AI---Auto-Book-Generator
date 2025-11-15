import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppStep, Chapter, BookHistoryEntry } from './types';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import * as geminiService from './services/geminiService';
import { StorybookViewer } from './components/StorybookViewer';
import { HelpModal } from './components/HelpModal';
import {
  BookOpenIcon, SparklesIcon, WandMagicSparklesIcon, PencilIcon, TrashIcon, DownloadIcon,
  ChevronDownIcon, ChevronUpIcon, MicrophoneIcon, StopCircleIcon, QuestionMarkCircleIcon
} from './components/icons';

const App: React.FC = () => {
  // === State Management ===
  const [appStep, setAppStep] = useState<AppStep>(AppStep.CONFIG);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Science Fiction');
  const [category, setCategory] = useState('Novel');
  const [tone, setTone] = useState('Epic');
  const [numChapters, setNumChapters] = useState(10);
  const [wordsPerChapter, setWordsPerChapter] = useState(500);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  const [frontCoverPrompt, setFrontCoverPrompt] = useState('');
  const [backCoverPrompt, setBackCoverPrompt] = useState('');
  const [frontCoverImage, setFrontCoverImage] = useState('');
  const [backCoverImage, setBackCoverImage] = useState('');


  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [finalBookContent, setFinalBookContent] = useState('');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [bookHistory, setBookHistory] = useState<BookHistoryEntry[]>([]);
  const [viewingHistory, setViewingHistory] = useState<BookHistoryEntry | null>(null);

  // === Persistence (Local Storage) ===
  const saveStateToLocalStorage = useCallback(() => {
    const state = {
      appStep, title, subtitle, author, description, genre, category, tone,
      numChapters, wordsPerChapter, chapters, frontCoverPrompt, backCoverPrompt,
      frontCoverImage, backCoverImage
    };
    localStorage.setItem('roboAiBookGenerator_progress', JSON.stringify(state));
  // FIX: Removed authorNamePlacement from state and dependencies
  }, [appStep, title, subtitle, author, description, genre, category, tone, numChapters, wordsPerChapter, chapters, frontCoverPrompt, backCoverPrompt, frontCoverImage, backCoverImage]);

  useEffect(() => {
    saveStateToLocalStorage();
  }, [saveStateToLocalStorage]);

  useEffect(() => {
    const savedState = localStorage.getItem('roboAiBookGenerator_progress');
    if (savedState) {
      const state = JSON.parse(savedState);
      setAppStep(state.appStep || AppStep.CONFIG);
      setTitle(state.title || '');
      setSubtitle(state.subtitle || '');
      setAuthor(state.author || '');
      setDescription(state.description || '');
      setGenre(state.genre || 'Science Fiction');
      setCategory(state.category || 'Novel');
      setTone(state.tone || 'Epic');
      setNumChapters(state.numChapters || 10);
      setWordsPerChapter(state.wordsPerChapter || 500);
      setChapters(state.chapters || []);
      setFrontCoverPrompt(state.frontCoverPrompt || '');
      setBackCoverPrompt(state.backCoverPrompt || '');
      setFrontCoverImage(state.frontCoverImage || '');
      setBackCoverImage(state.backCoverImage || '');
      // FIX: Removed authorNamePlacement from local storage loading
    }
    
    const savedHistory = localStorage.getItem('roboAiBookGenerator_history');
    if (savedHistory) {
      setBookHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('roboAiBookGenerator_history', JSON.stringify(bookHistory));
  }, [bookHistory]);


  // === Speech Recognition ===
  const onTranscriptChange = useCallback((transcript: string) => {
    setDescription(prev => prev + transcript);
  }, []);
  const { isListening, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition(onTranscriptChange);

  // === API Call Handlers ===
  const handleInspireMe = async () => {
    setIsLoading(true);
    setLoadingMessage('Generating a new book idea...');
    setError(null);
    try {
      const result = await geminiService.generateInspiration(genre, category, tone);
      setTitle(result.title);
      setSubtitle(result.subtitle);
      setDescription(result.description);
    } catch (e: any) {
      setError(`Failed to generate inspiration: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTOC = async () => {
    setIsLoading(true);
    setLoadingMessage('Generating Table of Contents...');
    setError(null);
    try {
      const chapterTitles = await geminiService.generateTableOfContents(description, numChapters);
      setChapters(chapterTitles.map(t => ({ title: t, content: '', status: 'pending' })));
      
      const frontPrompt = await geminiService.generateBookCoverPrompt(title, subtitle, description, author, 'front');
      const backPrompt = await geminiService.generateBookCoverPrompt(title, subtitle, description, author, 'back');
      setFrontCoverPrompt(frontPrompt);
      setBackCoverPrompt(backPrompt);

      setAppStep(AppStep.COVERS);
    } catch (e: any) {
      setError(`Failed to generate Table of Contents: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // FIX: Removed logic to add author's name to image prompt, which is against image generation guidelines.
  const handleGenerateCover = async (type: 'front' | 'back' | 'both') => {
    setIsLoading(true);
    setLoadingMessage(`Generating ${type} cover...`);
    setError(null);

    try {
        if (type === 'front' || type === 'both') {
            const image = await geminiService.generateBookCoverImage(frontCoverPrompt);
            setFrontCoverImage(image);
        }
        if (type === 'back' || type === 'both') {
            const image = await geminiService.generateBookCoverImage(backCoverPrompt);
            setBackCoverImage(image);
        }
    } catch (e: any) {
      setError(`Failed to generate cover: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateChapter = async (index: number, useContinuity: boolean) => {
    const chapterToGenerate = chapters[index];
    if (!chapterToGenerate || chapterToGenerate.status === 'generating') return;

    setChapters(prev => prev.map((c, i) => i === index ? { ...c, status: 'generating' } : c));
    setLoadingMessage(`Generating Chapter ${index + 1}/${chapters.length}...`);
    setIsLoading(true);
    setError(null);
    try {
        const previousChapterContent = useContinuity && index > 0 ? chapters[index-1].content : undefined;
        const content = await geminiService.generateChapterContent(title, description, chapterToGenerate.title, wordsPerChapter, previousChapterContent);
        setChapters(prev => prev.map((c, i) => i === index ? { ...c, content, status: 'done' } : c));
    } catch (e: any) {
        setError(`Failed to generate chapter ${index + 1}: ${e.message}`);
        setChapters(prev => prev.map((c, i) => i === index ? { ...c, status: 'error' } : c));
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateAllChapters = async () => {
    setError(null);
    for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].status !== 'done') {
            await handleGenerateChapter(i, true);
        }
    }
  };
  
  const handleAssembleBook = async () => {
    setIsLoading(true);
    setLoadingMessage('Assembling final manuscript...');
    setError(null);
    try {
        const preface = await geminiService.generatePreface(title, description);
        const tocMarkdown = chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
        
        let fullContent = `# ${title}\n\n## ${subtitle}\n\nBy ${author}\n\n`;
        fullContent += `![Front Cover](data:image/jpeg;base64,${frontCoverImage})\n\n`;
        fullContent += `### Preface\n\n${preface}\n\n`;
        fullContent += `### Table of Contents\n\n${tocMarkdown}\n\n---\n\n`;

        chapters.forEach((c, i) => {
            fullContent += `## Chapter ${i + 1}: ${c.title}\n\n${c.content}\n\n---\n\n`;
        });
        
        setFinalBookContent(fullContent);

        const newHistoryEntry: BookHistoryEntry = {
            id: new Date().toISOString(),
            title,
            subtitle,
            author,
            content: fullContent,
            frontCoverImage,
            timestamp: Date.now()
        };
        setBookHistory(prev => [newHistoryEntry, ...prev]);
        
        setIsViewerOpen(true);

    } catch (e: any) {
        setError(`Failed to assemble book: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // === Derived State & Memos ===
  const isTocReady = useMemo(() => title && description && author, [title, description, author]);
  const isAssemblyReady = useMemo(() => chapters.length > 0 && chapters.every(c => c.status === 'done'), [chapters]);

  // === Render Functions ===
  const renderConfigScreen = () => (
    <>
      <h2 className="text-3xl font-bold text-center text-indigo-300">1. Configure Your Book</h2>
      <p className="text-center text-indigo-100/70 mb-8">Define the core concept of your masterpiece.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
              <label htmlFor="title">Title <span className="text-red-400">*</span></label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
              <label htmlFor="subtitle">Subtitle</label>
              <input type="text" id="subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
          </div>
          <div className="form-group md:col-span-2">
              <label htmlFor="author">Author's Name <span className="text-red-400">*</span></label>
              <input type="text" id="author" value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div className="form-group md:col-span-2">
              <label htmlFor="description" className="flex justify-between items-center">
                  <span>Book Description <span className="text-red-400">*</span></span>
                  {hasRecognitionSupport && (
                      <button onClick={isListening ? stopListening : startListening} className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${isListening ? 'bg-red-500/80 text-white' : 'bg-indigo-500/50 hover:bg-indigo-500/80'}`}>
                          {isListening ? <><StopCircleIcon className="w-4 h-4" /> Stop</> : <><MicrophoneIcon className="w-4 h-4" /> Dictate</>}
                      </button>
                  )}
              </label>
              <textarea id="description" rows={5} value={description} onChange={e => setDescription(e.target.value)}></textarea>
          </div>
          <div className="form-group">
              <label htmlFor="genre">Genre</label>
              <select id="genre" value={genre} onChange={e => setGenre(e.target.value)}>
                  <option>Science Fiction</option>
                  <option>Fantasy</option>
                  <option>Mystery</option>
                  <option>Thriller</option>
                  <option>Romance</option>
                  <option>Horror</option>
                  <option>Literary Fiction</option>
                  <option>True Crime</option>
                  <option>Non-Fiction</option>
                  <option>Self-Help & Personal Development</option>
                  <option>Business & Money</option>
                  <option>Health, Fitness & Dieting</option>
                  <option>Biographies & Memoirs</option>
                  <option>Cookbooks</option>
                  <option>Parenting & Relationships</option>
                  <option>History</option>
                  <option>Religion & Spirituality</option>
                  <option>Education & Test Prep</option>
              </select>
          </div>
           <div className="form-group">
              <label htmlFor="category">Category</label>
              <select id="category" value={category} onChange={e => setCategory(e.target.value)}>
                  <option>Novel</option>
                  <option>Novella</option>
                  <option>Contemporary Romance</option>
                  <option>Historical Romance</option>
                  <option>Romantic Suspense</option>
                  <option>Psychological Thriller</option>
                  <option>Detective Novel</option>
                  <option>Epic Fantasy</option>
                  <option>Dystopian Fiction</option>
                  <option>Space Opera</option>
                  <option>Memoir</option>
                  <option>Guide</option>
                  <option>Cookbook</option>
                  <option>Textbook</option>
                  <option>Technical Manual</option>
              </select>
          </div>
           <div className="form-group">
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={e => setTone(e.target.value)}>
                  <option>Epic</option><option>Humorous</option><option>Serious</option><option>Informative</option><option>Suspenseful</option><option>Whimsical</option>
              </select>
          </div>
          <div className="form-group">
              <label htmlFor="numChapters">Number of Chapters</label>
              <input type="number" id="numChapters" value={numChapters} onChange={e => setNumChapters(parseInt(e.target.value, 10))} min="1" max="50" />
          </div>
          <div className="form-group md:col-span-2">
              <label htmlFor="wordsPerChapter">Approximate Words per Chapter</label>
              <input type="number" id="wordsPerChapter" value={wordsPerChapter} onChange={e => setWordsPerChapter(parseInt(e.target.value, 10))} min="100" max="5000" step="50" />
          </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mt-8">
          <button onClick={handleGenerateTOC} disabled={!isTocReady} className="btn-primary w-full">
              <BookOpenIcon className="w-5 h-5" />
              Generate Table of Contents
          </button>
      </div>
    </>
  );

  const renderCoverScreen = () => (
    <>
      <h2 className="text-3xl font-bold text-center text-indigo-300">2. Design Your Covers</h2>
      <p className="text-center text-indigo-100/70 mb-8">Generate stunning visuals for your front and back covers.</p>
      <div className="flex flex-col sm:flex-row gap-8 justify-center items-start">
          {/* Front Cover */}
          <div className="flex flex-col gap-4 w-full sm:w-1/2 max-w-[250px] mx-auto">
              <h3 className="text-xl font-semibold text-center">Front Cover</h3>
              <div className="aspect-[3/4] bg-black/30 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                  {frontCoverImage ? <img src={`data:image/jpeg;base64,${frontCoverImage}`} alt="Front Cover" className="object-cover w-full h-full rounded-lg" /> : <span className="text-gray-400">Image Preview</span>}
              </div>
              <div className="form-group">
                  <label>AI Image Prompt</label>
                  <textarea rows={4} value={frontCoverPrompt} onChange={e => setFrontCoverPrompt(e.target.value)}></textarea>
              </div>
              <button onClick={() => handleGenerateCover('front')} className="btn-secondary">Generate Front Cover</button>
          </div>
          {/* Back Cover */}
          <div className="flex flex-col gap-4 w-full sm:w-1/2 max-w-[250px] mx-auto">
              <h3 className="text-xl font-semibold text-center">Back Cover</h3>
              <div className="aspect-[3/4] bg-black/30 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                  {backCoverImage ? <img src={`data:image/jpeg;base64,${backCoverImage}`} alt="Back Cover" className="object-cover w-full h-full rounded-lg" /> : <span className="text-gray-400">Image Preview</span>}
              </div>
              <div className="form-group">
                  <label>AI Image Prompt</label>
                  <textarea rows={4} value={backCoverPrompt} onChange={e => setBackCoverPrompt(e.target.value)}></textarea>
              </div>
              <button onClick={() => handleGenerateCover('back')} className="btn-secondary">Generate Back Cover</button>
          </div>
      </div>
      {/* FIX: Removed author name placement UI as it's not supported by the image generation API */}
       <div className="flex flex-col md:flex-row gap-4 mt-8">
          <button onClick={() => setAppStep(AppStep.CONFIG)} className="btn-secondary flex-1">Back to Config</button>
          <button onClick={() => handleGenerateCover('both')} className="btn-secondary flex-1">Generate Both Covers</button>
          <button onClick={() => setAppStep(AppStep.WRITING)} className="btn-primary flex-1">Proceed to Writing</button>
      </div>
    </>
  );

  const renderWritingScreen = () => (
      <>
        <h2 className="text-3xl font-bold text-center text-indigo-300">3. Write Your Book</h2>
        <p className="text-center text-indigo-100/70 mb-8">Generate, edit, and refine each chapter.</p>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <button onClick={handleGenerateAllChapters} className="btn-secondary flex-1">
                <WandMagicSparklesIcon className="w-5 h-5"/> Generate All Chapters
            </button>
            <button onClick={handleAssembleBook} disabled={!isAssemblyReady} className="btn-primary flex-1">
                <DownloadIcon className="w-5 h-5"/> Assemble Final Book
            </button>
        </div>
        <div className="space-y-2">
            {chapters.map((chapter, index) => (
                <div key={index} className="bg-white/5 rounded-lg">
                    <button onClick={() => setExpandedChapter(expandedChapter === index ? null : index)} className="w-full flex justify-between items-center p-4 text-left">
                        <span className="font-semibold">{index + 1}. {chapter.title}</span>
                        <div className="flex items-center gap-4">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                chapter.status === 'done' ? 'bg-green-500/20 text-green-300' :
                                chapter.status === 'generating' ? 'bg-yellow-500/20 text-yellow-300' :
                                chapter.status === 'error' ? 'bg-red-500/20 text-red-300' :
                                'bg-gray-500/20 text-gray-300'
                            }`}>{chapter.status}</span>
                            {expandedChapter === index ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                        </div>
                    </button>
                    {expandedChapter === index && (
                        <div className="p-4 border-t border-white/10">
                            <textarea
                                value={chapter.content}
                                onChange={(e) => {
                                    const newContent = e.target.value;
                                    setChapters(prev => prev.map((c, i) => i === index ? { ...c, content: newContent } : c));
                                }}
                                rows={15}
                                className="w-full bg-black/30 p-2 rounded-md border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Chapter content will appear here..."
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => handleGenerateChapter(index, true)} className="btn-secondary text-sm">Generate w/ Continuity</button>
                                <button onClick={() => handleGenerateChapter(index, false)} className="btn-secondary text-sm">Generate Standalone</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
        <button onClick={() => setAppStep(AppStep.COVERS)} className="btn-secondary mt-8 mx-auto block">Back to Covers</button>
      </>
  );

  const renderHistoryPanel = () => (
    <div className="w-full max-w-sm p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
        <h3 className="font-bold text-lg text-indigo-300 mb-4">Book History</h3>
        {bookHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No completed books yet.</p>
        ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
                {bookHistory.map(book => (
                    <li key={book.id} className="flex justify-between items-center bg-black/20 p-2 rounded">
                        <div>
                            <p className="font-semibold truncate">{book.title}</p>
                            <p className="text-xs text-gray-400">{book.author}</p>
                        </div>
                        <div className='flex gap-1'>
                          <button onClick={() => setViewingHistory(book)} className="p-1 hover:bg-indigo-500/50 rounded"><BookOpenIcon className="w-4 h-4"/></button>
                          <button onClick={() => {
                            if(window.confirm(`Delete "${book.title}" from history?`)) {
                              setBookHistory(prev => prev.filter(b => b.id !== book.id))
                            }
                          }} className="p-1 hover:bg-red-500/50 rounded"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white bg-gradient-to-br from-[#111827] to-[#1e1b4b] p-4 sm:p-8 flex flex-col items-center gap-8">
      <style>{`
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.875rem; color: #d1d5db; }
        .form-group input, .form-group textarea, .form-group select { 
          background-color: rgba(255, 255, 255, 0.05); 
          border: 1px solid rgba(255, 255, 255, 0.2); 
          border-radius: 0.375rem; 
          padding: 0.5rem 0.75rem;
          color: white;
          width: 100%;
        }
        .form-group select option {
          background-color: #111827;
          color: white;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px #4f46e5;
        }
        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          background-color: #4f46e5; color: white; font-weight: 600;
          padding: 0.75rem 1.5rem; border-radius: 0.375rem;
          transition: background-color 0.2s;
        }
        .btn-primary:hover { background-color: #6366f1; }
        .btn-primary:disabled { background-color: #3730a3; color: #a5b4fc; cursor: not-allowed; }
        .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          background-color: rgba(255,255,255,0.1); color: white; font-weight: 500;
          padding: 0.75rem 1.5rem; border-radius: 0.375rem;
          border: 1px solid rgba(255,255,255,0.2);
          transition: background-color 0.2s;
        }
        .btn-secondary:hover { background-color: rgba(255,255,255,0.2); }
        .btn-secondary:disabled { background-color: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); cursor: not-allowed; }
      `}</style>
      <header className="text-center w-full max-w-3xl relative">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-400 to-indigo-300">Robo AI</h1>
        <p className="text-lg text-indigo-200">Auto Book Generator</p>
        <button 
            onClick={() => setIsHelpOpen(true)}
            className="absolute top-0 right-0 p-2 text-indigo-300 hover:text-white transition-colors"
            title="Help"
            aria-label="Open help dialog"
        >
            <QuestionMarkCircleIcon className="w-8 h-8" />
        </button>
      </header>
      
      {appStep === AppStep.CONFIG && (
        <div className="w-full max-w-3xl -mb-2">
            <button onClick={handleInspireMe} className="btn-secondary w-full text-base py-3 shadow-lg hover:shadow-indigo-500/50 transition-shadow">
                <SparklesIcon className="w-6 h-6" />
                Don't have an idea? Let AI Inspire You!
            </button>
        </div>
      )}

      {error && <div className="w-full max-w-3xl bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg text-center">{error}</div>}

      <main className="w-full max-w-3xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-black/30">
        {appStep === AppStep.CONFIG && renderConfigScreen()}
        {appStep === AppStep.COVERS && renderCoverScreen()}
        {appStep === AppStep.WRITING && renderWritingScreen()}
      </main>

      {renderHistoryPanel()}

      {isLoading && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-400"></div>
          <p className="text-indigo-300 text-lg">{loadingMessage}</p>
        </div>
      )}

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

      {(isViewerOpen || viewingHistory) && (
        <StorybookViewer
          bookContent={viewingHistory ? viewingHistory.content : finalBookContent}
          bookTitle={viewingHistory ? viewingHistory.title : title}
          subtitle={viewingHistory ? viewingHistory.subtitle : subtitle}
          author={viewingHistory ? viewingHistory.author : author}
          frontCoverImage={viewingHistory ? viewingHistory.frontCoverImage : frontCoverImage}
          onClose={() => {
            setIsViewerOpen(false);
            setViewingHistory(null);
          }}
        />
      )}
    </div>
  );
};

export default App;