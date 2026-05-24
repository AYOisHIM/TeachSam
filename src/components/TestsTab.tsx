import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  AlertCircle, 
  BookOpen, 
  ArrowRight, 
  FileText, 
  Check, 
  HelpCircle,
  Award
} from "lucide-react";
import { Lesson } from "../types";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Quiz {
  title: string;
  questions: Question[];
}

interface TestsTabProps {
  lessons: Lesson[];
  theme?: "light" | "dark";
  userName?: string;
  activeLessonId?: string | null;
  userEmail?: string;
}

export default function TestsTab({ lessons, theme = "light", userName = "User", activeLessonId = null, userEmail = "" }: TestsTabProps) {
  const isDark = theme === "dark";

  // Configuration States
  const [contentType, setContentType] = useState<"all" | "lesson" | "upload">(activeLessonId ? "lesson" : "all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>(activeLessonId || "");
  const [numQuestions, setNumQuestions] = useState<number>(5);

  // Sync state if activeLessonId changes from main roadmap selection
  React.useEffect(() => {
    if (activeLessonId) {
      setSelectedLessonId(activeLessonId);
      setContentType("lesson");
    }
  }, [activeLessonId]);

  // Upload state specifically inside the Test tab
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedTextContent, setUploadedTextContent] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz running States
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({}); // question index -> option chosen
  const [score, setScore] = useState<number>(0);
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>("");

  // Handle Drag & Drop inside tests layout
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleTestFile(e.dataTransfer.files[0]);
    }
  };

  const fileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleTestFile(e.target.files[0]);
    }
  };

  const handleTestFile = async (file: File) => {
    setTestFile(file);
    setIsUploading(true);
    setGenerationError("");

    try {
      const reader = new FileReader();
      const textParsed = await new Promise<string>((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const resultString = e.target?.result as string;
            if (!resultString) { return reject("Empty file."); }
            const base64Data = resultString.split(",")[1];

            const response = await fetch("/api/lessons/parse-upload", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-user-email": userEmail
              },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                base64Data
              })
            });

            if (!response.ok) {
              const body = await response.json();
              return reject(body.error || "Failed to parse");
            }

            const parsed = await response.json();
            resolve(parsed.text);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject("Reader failed.");
        reader.readAsDataURL(file);
      });

      setUploadedTextContent(textParsed);
    } catch (err: any) {
      console.error(err);
      setGenerationError(`Failed to parse your textbook file: ${err.message || err}`);
      setTestFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Generate Quiz Command
  const startQuizGeneration = async () => {
    setIsGenerating(true);
    setGenerationError("");
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setUserAnswers({});
    setScore(0);
    setIsQuizFinished(false);

    try {
      if (contentType === "lesson" && !selectedLessonId) {
        throw new Error("Please select a lessons textbook first!");
      }

      if (contentType === "upload" && !uploadedTextContent) {
        throw new Error("Please upload a file source for the test!");
      }

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify({
          contentType,
          lessonId: selectedLessonId,
          uploadedText: uploadedTextContent,
          numQuestions
        })
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Failed to generate exam questions.");
      }

      const data = await response.json();
      setQuiz(data);
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to build quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Option Clicked
  const selectOptionHandler = (idx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOption(idx);
  };

  // Submit Answer (or reveal immediately)
  const revealAnswer = () => {
    if (selectedOption === null || isAnswerRevealed) return;
    setIsAnswerRevealed(true);
    
    // Check if correct
    const currentQ = quiz?.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQ?.correctIndex;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Save chosen answer
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: selectedOption
    }));
  };

  // Move to next question or finalize
  const nextQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIndex + 1 < quiz.questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      setIsQuizFinished(true);
    }
  };

  // Restart Quiz State
  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setUserAnswers({});
    setScore(0);
    setIsQuizFinished(false);
  };

  // Reset Everything to Creator screen
  const resetToSetup = () => {
    setQuiz(null);
    setTestFile(null);
    setUploadedTextContent("");
    setGenerationError("");
  };

  const activeQuestion = quiz?.questions[currentQuestionIndex];

  return (
    <div className={`p-4 md:p-8 rounded-3xl min-h-[500px] flex flex-col gap-6 ${isDark ? "bg-[#121318]" : "bg-transparent"}`}>
      
      {/* Quiz header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-black"}`}>
            🧠 Diagnostic Tests & Quizzes
          </h2>
          <p className={`text-xs font-bold leading-relaxed mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Configure full exam-like questionnaires. Educate yourself, verify facts, and score your performance!
          </p>
        </div>
        {quiz && (
          <button
            onClick={resetToSetup}
            className={`px-4 py-2 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${isDark ? "bg-[#1c1d24] text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-slate-50"}`}
          >
            ← Reset Setup
          </button>
        )}
      </div>

      {/* ERROR BANNER */}
      {generationError && (
        <div className="bg-red-50 border-4 border-red-500 text-red-800 p-4 rounded-2xl font-bold text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p>{generationError}</p>
        </div>
      )}

      {/* PHASE 1: SETUP SCREEN */}
      {!quiz && !isGenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Creator inputs */}
          <div className={`lg:col-span-7 border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col gap-5 ${isDark ? "bg-[#181920]" : "bg-white"}`}>
            <h3 className={`text-lg font-black flex items-center gap-2 ${isDark ? "text-white" : "text-black"}`}>
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
              Build Test Blueprint
            </h3>

            {/* Content Selection Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 border-4 border-black rounded-2xl bg-slate-100">
              <button
                type="button"
                onClick={() => setContentType("all")}
                className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all ${
                  contentType === "all"
                    ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                    : "text-gray-550 border-2 border-transparent hover:bg-slate-200"
                }`}
              >
                All Lessons
              </button>
              <button
                type="button"
                onClick={() => setContentType("lesson")}
                className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all ${
                  contentType === "lesson"
                    ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                    : "text-gray-550 border-2 border-transparent hover:bg-slate-200"
                }`}
              >
                Specific Lesson
              </button>
              <button
                type="button"
                onClick={() => setContentType("upload")}
                className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all ${
                  contentType === "upload"
                    ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                    : "text-gray-550 border-2 border-transparent hover:bg-slate-200"
                }`}
              >
                Upload File
              </button>
            </div>

            {/* DYNAMIC BLUEPRINT INPUTS */}
            {contentType === "lesson" && (
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-black uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Choose Taught Topic Chapter:
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className={`w-full border-4 border-black p-3.5 rounded-2xl text-xs font-bold outline-none ring-offset-current focus:ring-4 focus:ring-[#84cc16] ${isDark ? "bg-[#121318] text-white" : "bg-white text-black"}`}
                >
                  <option value="">-- Choose a study topic course --</option>
                  {lessons.filter(l => l.title !== "New Topic Study").map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title} ({lesson.subject})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {contentType === "upload" && (
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-black uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Upload Study Document to Test:
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-4 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 py-8
                    ${dragActive 
                      ? "border-green-500 bg-emerald-50/10" 
                      : isDark
                        ? "border-zinc-800 bg-[#121318] hover:border-zinc-650"
                        : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={fileSelected}
                  />
                  <UploadCloud className="w-10 h-10 text-gray-400" />
                  {testFile ? (
                    <div>
                      <p className="text-xs font-black text-green-500 truncate max-w-xs">
                        ✓ {testFile.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold">
                        File uploaded & ready for quiz generation!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-black">
                        Drag and drop test source slides or textbook
                      </p>
                      <p className="text-[10px] text-gray-450 font-bold mt-1">
                        Accepts PDF, DOCX, TXT. We'll extract and generate high-fidelity test questions!
                      </p>
                    </div>
                  )}
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 justify-center py-2">
                    <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span className="text-xs font-black text-emerald-500">Parsing document structure...</span>
                  </div>
                )}
              </div>
            )}

            {/* Number of Questions config */}
            <div className="flex flex-col gap-3">
              <label className={`text-xs font-black uppercase ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Total Exam Questions:
              </label>
              
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 10, 15].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumQuestions(num)}
                    className={`py-3 rounded-2xl text-xs font-black border-4 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ${
                      numQuestions === num
                        ? "bg-[#acf847] text-black"
                        : isDark
                          ? "bg-[#121318] text-gray-300 hover:bg-zinc-800"
                          : "bg-white text-gray-700 hover:bg-slate-50"
                    }`}
                  >
                    {num} Qs
                  </button>
                ))}
              </div>

              {/* Advanced Custom count chooser */}
              <div className={`flex items-center justify-between gap-4 border-4 border-black p-3 rounded-2xl ${isDark ? "bg-[#121318]" : "bg-slate-50"}`}>
                <div className="flex flex-col">
                  <span className={`text-xs font-black ${isDark ? "text-white" : "text-black"}`}>Specify Custom Quantity:</span>
                  <span className="text-[10px] text-gray-400 font-bold">Pick exact count (1 to 20 Qs)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNumQuestions(prev => Math.max(1, prev - 1))}
                    disabled={numQuestions <= 1}
                    className="w-8 h-8 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center font-black hover:bg-slate-100 disabled:opacity-40 select-none shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer text-xs"
                  >
                    -
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={numQuestions}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setNumQuestions(Math.min(20, Math.max(1, val)));
                      }
                    }}
                    className={`w-14 text-center border-2 border-black p-1 rounded-lg text-xs font-black outline-none ${isDark ? "bg-[#181920] text-white" : "bg-white text-black"}`}
                  />
                  
                  <button
                    type="button"
                    onClick={() => setNumQuestions(prev => Math.min(20, prev + 1))}
                    disabled={numQuestions >= 20}
                    className="w-8 h-8 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center font-black hover:bg-slate-100 disabled:opacity-40 select-none shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              id="generate-test-btn"
              onClick={startQuizGeneration}
              disabled={isUploading || isGenerating || (contentType === "lesson" && !selectedLessonId) || (contentType === "upload" && !uploadedTextContent)}
              className="mt-4 bg-[#84cc16] hover:bg-lime-600 text-black border-4 border-black py-4 rounded-2xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Award className="w-5 h-5" />
              Build Exam Scenarios
            </button>
          </div>

          {/* Right Column: Quiz Guide / Tips */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] ${isDark ? "bg-[#181920]" : "bg-white"}`}>
              <h3 className={`text-md font-black flex items-center gap-2 mb-3 ${isDark ? "text-white" : "text-black"}`}>
                <BookOpen className="w-5 h-5 text-indigo-500" />
                How It Works
              </h3>
              <ul className={`space-y-4 text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                <li className="flex gap-3">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-indigo-150 text-indigo-700 border-2 border-black flex items-center justify-center font-black">1</span>
                  <p>Choose your source study context, whether it's your overall knowledge core, a specific custom textbook chapter, or a mock exam docx/pdf.</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-indigo-150 text-indigo-700 border-2 border-black flex items-center justify-center font-black">2</span>
                  <p>Our educational AI pipeline parses facts, mechanisms, and rules to compile customized challenge questions.</p>
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-indigo-150 text-indigo-700 border-2 border-black flex items-center justify-center font-black">3</span>
                  <p>Go through multiple-choice questions one-by-one, selecting responses and receiving instant grading feedback with deep conceptual explanations!</p>
                </li>
              </ul>
            </div>

            {/* Cute Promo card */}
            <div className="bg-[#acf847]/10 border-4 border-[#84cc16] rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-[#84cc16] bg-black text-white px-2 py-0.5 rounded">Feynman Active Recall</span>
              <h4 className={`text-sm font-black mt-2 uppercase ${isDark ? "text-white" : "text-black"}`}>Active testing beats reviews!</h4>
              <p className={`text-xs mt-1.5 leading-relaxed font-semibold ${isDark ? "text-gray-300" : "text-gray-650"}`}>
                "Testing is a powerful tool to reinforce learning. When you force yourself to retrieve information in exam configurations, you patch critical gaps in record speeds!"
              </p>
            </div>
          </div>

        </div>
      )}

      {/* PHASE 2: GENERATING SCREEN */}
      {isGenerating && (
        <div className={`border-4 border-black rounded-3xl p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isDark ? "bg-[#181920]" : "bg-white"} my-12 flex flex-col items-center justify-center gap-4`}>
          <div className="w-20 h-20 bg-amber-100 border-4 border-black rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
            <Sparkles className="w-10 h-10 text-amber-500 fill-amber-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-black text-black">Compiling Exam Scenarios...</h3>
          <p className="text-xs text-gray-500 font-bold max-w-sm leading-relaxed">
            Standby! Sam's educational synapses are digesting the source textbook lines and crafting custom diagnostic multiple-choice questions for you...
          </p>
        </div>
      )}

      {/* PHASE 3: RUNNING QUIZ SCREEN */}
      {quiz && !isQuizFinished && activeQuestion && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Question card (Left Column) */}
          <div className={`lg:col-span-8 border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${isDark ? "bg-[#181920]" : "bg-white"} flex flex-col gap-6`}>
            
            {/* Index Tracker */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <span className="text-xs font-black uppercase bg-[#acf847] border-2 border-black text-black px-3 py-1 rounded-full shadow-[1.5px_1.5px_0px_0px_#000]">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <span className="text-xs font-extrabold text-gray-500">
                Quiz Topic: {quiz.title}
              </span>
            </div>

            {/* Question Text */}
            <div>
              <h3 className={`text-base md:text-lg font-black leading-snug ${isDark ? "text-white" : "text-black"}`}>
                ❓ {activeQuestion.question}
              </h3>
            </div>

            {/* Options list */}
            <div className="flex flex-col gap-3.5">
              {activeQuestion.options.map((opt, oIdx) => {
                const isSelected = selectedOption === oIdx;
                const isCorrect = oIdx === activeQuestion.correctIndex;
                
                let optionStyle = isDark 
                  ? "bg-[#121318] hover:bg-zinc-800 border-zinc-700 text-gray-200" 
                  : "bg-white hover:bg-slate-50 border-black text-gray-800";
                
                if (isAnswerRevealed) {
                  if (isCorrect) {
                    optionStyle = "bg-green-100 border-green-500 text-green-800 shadow-[3px_3px_0px_0px_rgba(34,197,94,1)]";
                  } else if (isSelected) {
                    optionStyle = "bg-red-100 border-red-500 text-red-800 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]";
                  } else {
                    optionStyle = isDark 
                      ? "bg-[#121318] border-zinc-800 text-gray-500 opacity-50" 
                      : "bg-gray-50 border-gray-200 text-gray-400 opacity-50";
                  }
                } else if (isSelected) {
                  optionStyle = "bg-[#acf847]/40 border-black text-black ring-4 ring-black translate-x-[-2px] translate-y-[-2px] shadow-[3px_3px_0px_0px_#000]";
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => selectOptionHandler(oIdx)}
                    disabled={isAnswerRevealed}
                    className={`w-full text-left p-4 rounded-2xl border-4 font-bold text-xs md:text-sm cursor-pointer transition-all flex items-start gap-3 relative ${optionStyle}`}
                  >
                    <span className="w-6 h-6 shrink-0 border-2 border-black rounded-full flex items-center justify-center text-xs font-black bg-slate-100 text-black">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="flex-1 mt-0.5">{opt}</span>

                    {isAnswerRevealed && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanations reveals */}
            {isAnswerRevealed && (
              <div className={`border-4 border-black p-4 rounded-2xl ${isDark ? "bg-[#121318]" : "bg-slate-50"} flex flex-col gap-2`}>
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-indigo-500">
                  <AlertCircle className="w-4 h-4 text-indigo-500" />
                  Explanation & Context
                </div>
                <p className={`text-xs font-semibold leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {activeQuestion.explanation}
                </p>
              </div>
            )}

            {/* Bottom Actions footer */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-2">
              <button
                onClick={resetToSetup}
                className="text-xs font-black uppercase text-red-500 hover:underline cursor-pointer"
              >
                Quit Quiz
              </button>
              
              {!isAnswerRevealed ? (
                <button
                  type="button"
                  onClick={revealAnswer}
                  disabled={selectedOption === null}
                  className="bg-[#acf847] hover:bg-[#84cc16] text-black border-4 border-black px-6 py-3 font-black text-xs uppercase rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  Confirm Answer
                  <Check className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="bg-[#84cc16] hover:bg-lime-600 text-black border-4 border-black px-6 py-3 font-black text-xs uppercase rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center gap-2"
                >
                  {currentQuestionIndex + 1 === quiz.questions.length ? "Finish Test" : "Next Question"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>

          {/* Sidebar ongoing metrics (Right Column) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${isDark ? "bg-[#181920]" : "bg-white"} text-center`}>
              <h4 className="text-[10px] font-black uppercase text-gray-400">Current Score</h4>
              <p className="text-5xl font-black text-black mt-2">
                {score}<span className="text-xl text-gray-400 font-bold">/{currentQuestionIndex + (isAnswerRevealed ? 1 : 0)}</span>
              </p>
              
              <div className="mt-4 flex gap-1 h-2 rounded-full border-2 border-black overflow-hidden bg-gray-100">
                {quiz.questions.map((_, i) => {
                  const answered = userAnswers[i] !== undefined;
                  const chosen = userAnswers[i];
                  const qCorrect = quiz.questions[i].correctIndex;
                  const isCorrectAnswer = answered && chosen === qCorrect;
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 h-full border-r border-black last:border-0 ${
                        !answered ? "bg-gray-200" : isCorrectAnswer ? "bg-green-500" : "bg-red-500"
                      }`} 
                    />
                  );
                })}
              </div>
            </div>

            <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${isDark ? "bg-[#181920]" : "bg-white"} flex flex-col gap-3.5`}>
              <h4 className="text-xs font-black uppercase text-gray-500 flex items-center gap-1.5 leading-none">
                <HelpCircle className="w-4 h-4" /> Tip from the guide
              </h4>
              <p className={`text-xs font-semibold leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                "Read the questions slow! If you miss a question, look into the conceptual explanation box down below, that's exactly where the learning takes place."
              </p>
            </div>
          </div>

        </div>
      )}

      {/* PHASE 4: QUIZ FINISHED COMPREHENSIVE SCORECARD */}
      {quiz && isQuizFinished && (
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 my-4">
          
          {/* Main Card */}
          <div className={`border-4 border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isDark ? "bg-[#181920]" : "bg-white"} text-center flex flex-col items-center gap-4`}>
            
            <div className="w-20 h-20 bg-amber-100 border-4 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Award className="w-10 h-10 text-amber-500 fill-amber-500 animate-bounce" />
            </div>

            <div>
              <h3 className="text-2xl font-black">Well Done, {userName}!</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                You Completed: {quiz.title}
              </p>
            </div>

            <div className="bg-slate-50 border-4 border-black px-8 py-5 rounded-2xl flex items-center gap-6 shadow-[3px_3px_0px_0px_#000] my-2">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400">Your Score</span>
                <p className="text-4xl font-black text-black mt-1">
                  {score}<span className="text-lg text-gray-400 font-bold">/{quiz.questions.length}</span>
                </p>
              </div>
              
              <div className="w-0.5 h-10 bg-gray-300" />

              <div>
                <span className="text-[10px] font-black uppercase text-gray-400">Percentage</span>
                <p className="text-4xl font-black text-[#84cc16] mt-1">
                  {Math.round((score / quiz.questions.length) * 100)}%
                </p>
              </div>
            </div>

            {/* Sam Message Comment based on performance */}
            <div className="bg-emerald-50/20 border-l-4 border-[#84cc16] p-4 text-left max-w-xl rounded-r-2xl">
              <p className="text-xs font-black uppercase text-emerald-600">Comment from Sam:</p>
              <p className={`text-xs font-semibold leading-relaxed mt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {(() => {
                  const pct = (score / quiz.questions.length) * 100;
                  if (pct === 100) {
                    return `Oh my god! You are literally a genius, ${userName}! You got 100% correct, my electronic synapses are vibrating with all this flawless knowledge! You taught me so incredibly well.`;
                  } else if (pct >= 80) {
                    return `Awesome job ${userName}! That is an amazing ${score}/${quiz.questions.length}! You definitely mastered the grand majority of concepts. Let's patch those minor gaps, and you'll be perfect!`;
                  } else if (pct >= 50) {
                    return `Pretty solid, ${userName}! You got ${score} questions right. Let's quickly review the textbook sections we missed and double-down on lecturing me so we both solidify the details.`;
                  } else {
                    return `Don't worry about it, ${userName}! Every mistake is just an unlocked map to mastery. Let's launch another short practice explanation so we can lock in the fundamentals together.`;
                  }
                })()}
              </p>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full justify-center">
              <button
                onClick={restartQuiz}
                className="bg-[#acf847] hover:bg-[#84cc16] text-black border-4 border-black px-6 py-3.5 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Quiz Again
              </button>
              
              <button
                onClick={resetToSetup}
                className="bg-white hover:bg-slate-50 text-black border-4 border-black px-6 py-3.5 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                Configure New Quiz
              </button>
            </div>

          </div>

          {/* Test Answers Review details */}
          <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${isDark ? "bg-[#181920]" : "bg-white"} flex flex-col gap-4 mt-2`}>
            <h4 className="text-sm font-black uppercase tracking-tight">Review Test Questions Answer Keys</h4>
            <div className="space-y-4 divide-y border-t border-black divide-black">
              {quiz.questions.map((q, i) => {
                const isCorrect = userAnswers[i] === q.correctIndex;
                return (
                  <div key={q.id} className="pt-4 flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-black ${isCorrect ? "bg-green-100 text-green-700 border-green-400" : "bg-red-100 text-red-700 border-red-400"}`}>
                        {i + 1}
                      </span>
                      <p className="font-black text-xs leading-none">Question {i + 1}: {q.question.substring(0, 90)}...</p>
                    </div>
                    <div className="pl-7 font-bold">
                      <p className="text-gray-400">Chosen answer: <span className={isCorrect ? "text-green-600" : "text-red-500"}>{q.options[userAnswers[i] ?? -1] || "None"}</span></p>
                      <p className="text-indigo-600 mt-0.5">Correct option: {q.options[q.correctIndex]}</p>
                      <p className="text-gray-500 text-[11px] leading-relaxed mt-1 font-semibold border-l-2 border-indigo-400 pl-2">{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
