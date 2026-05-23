import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, 
  Library, 
  User, 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  UploadCloud, 
  Volume2, 
  Plus, 
  FileText, 
  CheckCircle2, 
  ClipboardCheck,
  BookOpen, 
  TrendingUp, 
  BrainCircuit, 
  Award, 
  CornerDownRight, 
  RefreshCw, 
  X,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkle,
  Sun,
  Moon
} from "lucide-react";
import SideMenu from "./components/SideMenu";
import AvatarMascot from "./components/AvatarMascot";
import TestsTab from "./components/TestsTab";
import { Lesson, ConceptNode, Message, DailyGoal, BrainStats } from "./types";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"practice" | "vault" | "tests" | "profile">("practice");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>("");
  const [activeConceptId, setActiveConceptId] = useState<string>("");
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teachsam-chathistories");
      try {
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  const [userInput, setUserInput] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // User Customizable Name requested
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teachsam-username");
      return saved ? saved : "User"; // Default name user requested
    }
    return "User";
  });

  useEffect(() => {
    localStorage.setItem("teachsam-chathistories", JSON.stringify(chatHistories));
  }, [chatHistories]);

  // Snapchat-like Streak requested (Starts at 1, resets if inactive for 48h, increments if consecutive after 24h)
  const [streakCount, setStreakCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedCount = localStorage.getItem("teachsam-streak-count");
      const lastAct = localStorage.getItem("teachsam-streak-last-activity");
      
      if (savedCount && lastAct) {
        const lastActTime = parseInt(lastAct, 10);
        const hoursPassed = (Date.now() - lastActTime) / (1000 * 60 * 60);
        
        if (hoursPassed > 48) {
          // Exceeded Snapchat-like active period! Reset streak to 1
          localStorage.setItem("teachsam-streak-count", "1");
          return 1;
        }
        return parseInt(savedCount, 10);
      }
      return 1; // Default starting count is 1 as requested
    }
    return 1;
  });

  const triggerStreakIncrement = () => {
    const now = Date.now();
    const lastAct = localStorage.getItem("teachsam-streak-last-activity");
    const savedCount = localStorage.getItem("teachsam-streak-count");
    
    let curCount = savedCount ? parseInt(savedCount, 10) : 1;
    
    if (lastAct) {
      const lastActTime = parseInt(lastAct, 10);
      const hoursPassed = (now - lastActTime) / (1000 * 60 * 60);
      
      if (hoursPassed > 48) {
        // Snapchat rule: expired after 48h since last study check. Start over at 1
        curCount = 1;
      } else if (hoursPassed >= 24) {
        // Consecutive daily lesson check done after 24h! Increment streak
        curCount += 1;
      }
      // Else: less than 24 hours, count stays the same to maintain the active snapshot
    } else {
      // First activity milestone
      curCount = 1;
    }
    
    localStorage.setItem("teachsam-streak-count", curCount.toString());
    localStorage.setItem("teachsam-streak-last-activity", now.toString());
    setStreakCount(curCount);
  };

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teachsam-theme");
      return (saved === "dark" || saved === "light") ? saved : "light";
    }
    return "light";
  });

  useEffect(() => {
    localStorage.setItem("teachsam-theme", theme);
  }, [theme]);
  
  // Real Doc Upload & Voice recording References
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [mobilePracticeView, setMobilePracticeView] = useState<"chat" | "map">("chat");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Modal States
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [proSlideIndex, setProSlideIndex] = useState<number>(0);
  const [isNewLessonModalOpen, setIsNewLessonModalOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [expandedAnalogies, setExpandedAnalogies] = useState<Record<string, boolean>>({});

  // New Lesson form state
  const [newTitle, setNewTitle] = useState<string>("");
  const [newSubject, setNewSubject] = useState<string>("");
  const [newContent, setNewContent] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  // Daily Goals state
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([
    { id: "upload-1", text: "Upload 1 Textbook Chapter", completed: false },
    { id: "quiz-1", text: "Complete 1 Teaching Quiz", completed: true },
    { id: "mistakes", text: "Clear active concept blockers", completed: false }
  ]);

  // Mascot dynamic facial expressions: "neutral", "confused", "amazed", "thinking", "happy"
  const [mascotExpression, setMascotExpression] = useState<"neutral" | "confused" | "amazed" | "thinking" | "happy">("happy");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // Fetch lessons from DB on load
  const loadLessons = async (preserveStates = true) => {
    try {
      const resp = await fetch("/api/lessons");
      const data = await resp.json();
      setLessons(data);
      if (data.length > 0) {
        // Retrieve and validate active lesson ID
        const savedActiveId = localStorage.getItem("teachsam-active-lesson-id");
        const activeId = (preserveStates && savedActiveId && data.some((l: any) => l.id === savedActiveId))
          ? savedActiveId
          : data[0].id;

        setActiveLessonId(activeId);
        localStorage.setItem("teachsam-active-lesson-id", activeId);

        const targetLesson = data.find((l: any) => l.id === activeId);
        if (targetLesson) {
          const savedConceptId = localStorage.getItem("teachsam-active-concept-id");
          const activeNode = targetLesson.concepts.find((c: ConceptNode) => c.status === "active") || targetLesson.concepts[0];
          const conceptId = (preserveStates && savedConceptId && targetLesson.concepts.some((c: any) => c.id === savedConceptId))
            ? savedConceptId
            : (activeNode ? activeNode.id : "");

          setActiveConceptId(conceptId);
          if (conceptId) {
            localStorage.setItem("teachsam-active-concept-id", conceptId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load lessons:", err);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  const activeLesson = lessons.find(l => l.id === activeLessonId);

  // Determine active concept node safely
  useEffect(() => {
    if (activeLesson) {
      const activeNode = activeLesson.concepts.find(c => c.status === "active");
      if (activeNode && activeConceptId !== activeNode.id) {
        setActiveConceptId(activeNode.id);
      } else if (!activeConceptId && activeLesson.concepts.length > 0) {
        setActiveConceptId(activeLesson.concepts[0].id);
      }
    }
  }, [activeLessonId, lessons]);

  // Set initial greeting from Sam when Lesson changes or on start
  useEffect(() => {
    if (!activeLessonId) return;

    setChatHistories(prev => {
      if (prev[activeLessonId]) return prev; // Do nothing if already exists

      const initialGreeting: Message = {
        id: `greeting-${Date.now()}`,
        sender: "sam",
        text: `Hello ${userName}, what topic would you like to teach me today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      return {
        ...prev,
        [activeLessonId]: [initialGreeting]
      };
    });
  }, [activeLessonId, userName]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistories, activeLessonId, isEvaluating]);

  // Handlers
  const handleExplainConcept = async () => {
    if (!activeLessonId || !activeConceptId) {
      alert("Please select a concept on the roadmap first!");
      return;
    }

    const currentLesson = lessons.find(l => l.id === activeLessonId);
    if (!currentLesson) return;

    const targetNode = currentLesson.concepts.find(c => c.id === activeConceptId);
    const conceptLabel = targetNode?.label || "this concept";

    // Add user message asking for help
    const userMsg: Message = {
      id: `user-help-${Date.now()}`,
      sender: "user",
      text: `Hey Sam, I'm finding it a bit hard to explain "${conceptLabel}". Can you explain it to me with a nice analogy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentHistory = chatHistories[activeLessonId] || [];
    const updatedHistory = [...currentHistory, userMsg];

    setChatHistories(prev => ({
      ...prev,
      [activeLessonId]: updatedHistory
    }));

    setIsEvaluating(true);
    setMascotExpression("thinking");

    try {
      const response = await fetch("/api/chat/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: activeLessonId,
          activeConceptId: activeConceptId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to load explanation.");
      }

      const samMsg: Message = await response.json();

      setChatHistories(prev => ({
        ...prev,
        [activeLessonId]: [...updatedHistory, samMsg]
      }));

      setMascotExpression("amazed");
    } catch (err) {
      console.error(err);
      const errMsg: Message = {
         id: `sam-err-${Date.now()}`,
         sender: "sam",
         text: "Ah, my circuits are lagging slightly! Try asking me again, or teach me a different concept!",
         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistories(prev => ({
        ...prev,
        [activeLessonId]: [...updatedHistory, errMsg]
      }));
      setMascotExpression("confused");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || userInput;
    if (!textToSend.trim() || !activeLessonId) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentHistory = chatHistories[activeLessonId] || [];
    const updatedHistory = [...currentHistory, userMsg];

    setChatHistories(prev => ({
      ...prev,
      [activeLessonId]: updatedHistory
    }));
    setUserInput("");
    setIsEvaluating(true);
    setMascotExpression("thinking");

    try {
      const response = await fetch("/api/chat/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: activeLessonId,
          chatHistory: updatedHistory,
          latestMessage: textToSend,
          activeConceptId: activeConceptId,
          userName // Pass custom username
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const evaluatedSamMsg: any = await response.json();
      
      if (evaluatedSamMsg.switchLessonId && evaluatedSamMsg.newLesson) {
        setLessons(prev => {
          if (!prev.some(l => l.id === evaluatedSamMsg.switchLessonId)) {
            return [evaluatedSamMsg.newLesson, ...prev];
          }
          return prev;
        });
        setActiveLessonId(evaluatedSamMsg.switchLessonId);
        const nextConceptId = evaluatedSamMsg.newLesson.concepts.find((c: any) => c.status === "active")?.id || evaluatedSamMsg.newLesson.concepts[0]?.id || "";
        setActiveConceptId(nextConceptId);
        setChatHistories(prev => ({
          ...prev,
          [evaluatedSamMsg.switchLessonId]: [
            {
              id: `user-topic-${Date.now()}`,
              sender: "user",
              text: textToSend,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            {
              id: evaluatedSamMsg.id,
              sender: evaluatedSamMsg.sender,
              text: evaluatedSamMsg.text,
              timestamp: evaluatedSamMsg.timestamp,
              evaluation: evaluatedSamMsg.evaluation
            }
          ]
        }));
        setMascotExpression("amazed");
      } else {
        setChatHistories(prev => ({
          ...prev,
          [activeLessonId]: [...updatedHistory, evaluatedSamMsg]
        }));
      }

      // Adjust expression based on quality
      if (evaluatedSamMsg.evaluation) {
        const rating = evaluatedSamMsg.evaluation.clarity;
        if (rating === "Excellent") {
          setMascotExpression("amazed");
          // Increment teaching daily goal
          setDailyGoals(prev => prev.map(g => g.id === "quiz-1" ? { ...g, completed: true } : g));
          triggerStreakIncrement(); // Daily streak update triggered on accurate lesson progression
        } else if (rating === "Good") {
          setMascotExpression("happy");
          triggerStreakIncrement(); // Daily streak update triggered on accurate lesson progression
        } else if (rating === "Struggling") {
          setMascotExpression("confused");
        } else {
          setMascotExpression("neutral");
        }
      }

      // Reload lessons to sync back state (active node & progress increments!)
      await loadLessons();

    } catch (err) {
      console.error("Evaluation failure:", err);
      // Fallback
      setChatHistories(prev => ({
        ...prev,
        [activeLessonId]: [
          ...updatedHistory,
          {
            id: `sam-error-${Date.now()}`,
            sender: "sam",
            text: "Ooh... my cellular receiver is buzzing static! Could you repeat that explanation? (Check your internet or Gemini API KEY Setup in the Secrets tab!)",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      }));
      setMascotExpression("confused");
    } finally {
      setIsEvaluating(false);
    }
  };

  // REAL Voice Speech Recording using browser Web Speech API
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Microphone speech recognition is not supported in this browser. Please use Chrome, Safari or Edge for full active vocal feature compatibility!");
      return;
    }

    setUserInput(""); // Start fresh
    setIsRecording(true);
    setRecordingSeconds(0);
    setMascotExpression("thinking");
    setRecordingWaveform(Array.from({ length: 15 }, () => Math.floor(Math.random() * 30) + 15));

    const isRecordingSelf = { current: true };

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        // Voice stream started
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText.trim()) {
          setUserInput(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition framework error:", event.error);
        if (event.error === "not-allowed") {
          alert("Microphone permission was denied. Please make sure microphone settings are allowed inside Google AI Studio preview frame!");
        }
      };

      recognition.onend = () => {
        // If the browser closed it due to quiet silence or standard timeout,
        // and we are still internally in recording state under 10s, auto-restart!
        if (isRecordingSelf.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Speech recognition restart skipped:", e);
          }
        }
      };

      recognitionRef.current = {
        stop: () => {
          isRecordingSelf.current = false;
          try {
            recognition.stop();
          } catch (e) {}
        },
        abort: () => {
          isRecordingSelf.current = false;
          try {
            recognition.abort();
          } catch (e) {}
        }
      };

      recognition.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        setRecordingWaveform(Array.from({ length: 15 }, () => Math.floor(Math.random() * 50) + 10));
      }, 1000);

    } catch (err) {
      console.error("Failed to boot speech parser:", err);
      setIsRecording(false);
    }
  };

  const stopRecordingAndSend = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    
    // Send whatever was recorded in userInput
    setTimeout(() => {
      if (userInput.trim()) {
        handleSendMessage(userInput);
      } else {
        alert("We didn't catch any text. Please try speaking slowly near your microphone and click Done!");
      }
    }, 500);
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    setUserInput("");
  };

  const handleNewTopicDiscussion = async () => {
    try {
      const resp = await fetch("/api/lessons/new-blank", {
        method: "POST"
      });
      const newBlankLesson = await resp.json();
      
      setLessons(prev => {
        if (!prev.some(l => l.id === newBlankLesson.id)) {
          return [newBlankLesson, ...prev];
        }
        return prev;
      });
      
      setActiveLessonId(newBlankLesson.id);
      localStorage.setItem("teachsam-active-lesson-id", newBlankLesson.id);
      
      const firstNode = newBlankLesson.concepts[0]?.id || "";
      setActiveConceptId(firstNode);
      if (firstNode) {
        localStorage.setItem("teachsam-active-concept-id", firstNode);
      }
      
      const initialGreeting: Message = {
        id: `greeting-${Date.now()}`,
        sender: "sam",
        text: `Hello ${userName}! What subject or topic would you like to teach me today? Just name the topic (e.g., 'object-oriented programming', 'quantum gravity', 'mitosis', or drag 'n drop slides/textbooks here), and I'll adapt my brain completely to focus on your inputs!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatHistories(prev => ({
        ...prev,
        [newBlankLesson.id]: [initialGreeting]
      }));
      setMascotExpression("happy");
      
    } catch (err) {
      console.error("Failed to set up brand new study topic:", err);
    }
  };

  // Process selected study file and feed to chat dynamically
  const processSelectedFile = async (file: File) => {
    setIsParsingFile(true);
    setMascotExpression("thinking");

    try {
      const reader = new FileReader();
      
      const fileParsedPromise = new Promise<{ text: string }>((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const resultString = e.target?.result as string;
            if (!resultString) {
              reject(new Error("Empty file data received."));
              return;
            }
            const base64Data = resultString.split(",")[1];

            const response = await fetch("/api/lessons/parse-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                base64Data
              })
            });

            if (!response.ok) {
              const errBody = await response.json().catch(() => ({}));
              reject(new Error(errBody.error || "Server could not parse file"));
              return;
            }

            const parsedResult = await response.json();
            resolve({ text: parsedResult.text });
          } catch (innerErr) {
            reject(innerErr);
          }
        };
        reader.onerror = () => reject(new Error("File reader encountered an error."));
        reader.readAsDataURL(file);
      });

      const parsedResult = await fileParsedPromise;
      if (!parsedResult.text) {
        throw new Error("No readable text could be extracted from your file.");
      }

      const parsedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

      // Call AI to auto-generate sequential study concept nodes
      const genResp = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsedTitle.substring(0, 50),
          subject: "Uploaded Study",
          content: parsedResult.text
        })
      });

      if (!genResp.ok) {
        const errBody = await genResp.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to generate dynamic concept path nodes.");
      }

      const createdLesson = await genResp.json();
      await loadLessons();

      // Configure newly created lesson states instantly
      setActiveLessonId(createdLesson.id);
      localStorage.setItem("teachsam-active-lesson-id", createdLesson.id);

      const firstNodeId = createdLesson.concepts[0]?.id || "";
      setActiveConceptId(firstNodeId);
      localStorage.setItem("teachsam-active-concept-id", firstNodeId);

      // Transition smoothly to active tutor chatbot
      setCurrentTab("practice");

      const customGreetingMessage: Message = {
        id: `sam-uploaded-${Date.now()}`,
        sender: "sam",
        text: `Woah! You uploaded "${file.name}"! I've loaded those notes and mapped out some core concepts in the mindmap on the right.

Let's do this! What can you tell me about the first concept: **"${createdLesson.concepts[0]?.label || "Introduction"}"**? I'm ready to learn!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistories(prev => ({
        ...prev,
        [createdLesson.id]: [customGreetingMessage]
      }));

      // Set daily goals and high energy expression
      setDailyGoals(prev => prev.map(g => g.id === "upload-1" ? { ...g, completed: true } : g));
      setMascotExpression("happy");

    } catch (err: any) {
      console.error("Ingestion workflow exceptional event:", err);
      alert(`Could not extract or ingest document: ${err.message || err}.`);
      setMascotExpression("confused");
    } finally {
      setIsParsingFile(false);
    }
  };

  // Real client-side file upload buffer pipeline
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  // Reset entire database back to default seed lessons
  const handleResetData = async () => {
    if (confirm("Reset current progress and study roadmaps to original seeds?")) {
      try {
        await fetch("/api/lessons/reset", { method: "POST" });
        await loadLessons();
        setChatHistories({});
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Create new lesson via Gemini concept path generator
  const handleCreateNewLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      setFormError("Must specify a Lesson Title and paste some reference materials!");
      return;
    }
    setFormError("");
    setIsGenerating(true);

    try {
      const resp = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          subject: newSubject || "General study",
          content: newContent
        })
      });

      if (!resp.ok) throw new Error("Server error generation");

      const createdLesson = await resp.json();
      
      // Update local set & set active
      await loadLessons();
      setActiveLessonId(createdLesson.id);
      setActiveConceptId(createdLesson.concepts[0]?.id || "");
      
      // Clean Form
      setNewTitle("");
      setNewSubject("");
      setNewContent("");
      setIsNewLessonModalOpen(false);

      // Complete Daily goal
      setDailyGoals(prev => prev.map(g => g.id === "upload-1" ? { ...g, completed: true } : g));
      setMascotExpression("amazed");

    } catch (err) {
      console.error("Failed to generate content landscape:", err);
      setFormError("Failed to parse document. Check your Gemini API Key in the Secrets tab!");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mock click handle to populate textbook files directly
  const loadPredefinedMaterials = (topic: string) => {
    if (topic === "Gatsby") {
      setNewTitle("The Great Gatsby Summary");
      setNewSubject("Literature");
      setNewContent("The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald. Set in the Jazz Age on Long Island, near New York City, the novel depicts first-person narrator Nick Carraway's interactions with mysterious millionaire Jay Gatsby and Gatsby's obsession to reunite with his former lover, Daisy Buchanan. Character and symbolism elements: The green light at the end of Daisy's dock represents Gatsby's hopes and dreams for the future, standing for the unattainable American Dream.");
    } else if (topic === "Mitosis") {
      setNewTitle("Mitosis Phase Sequence");
      setNewSubject("Biology");
      setNewContent("Mitosis is a part of the cell cycle in which replicated chromosomes are separated into two new nuclei. This division gives rise to genetically identical cells in which the total number of chromosomes is maintained. Stages: Prophase (chromatin condenses into chromosomes), Metase (chromosomes line up along the cell equator), Anaphase (sister chromatids are pulled apart by spindle fibers), and Telophase (nuclear membranes reform around each cluster of chromosomes).");
    }
  };

  return (
    <div className={`flex min-h-screen font-sans overflow-x-hidden ${theme === "dark" ? "bg-[#0e0f12] text-slate-100" : "bg-[#f9f9fa] text-black"}`}>
      
      {/* Neo-brutalist custom Sidebar Menu component */}
      <SideMenu 
        currentTab={currentTab} 
        onTabChange={(tab) => setCurrentTab(tab)} 
        expression={mascotExpression}
        onTriggerPro={() => setIsProModalOpen(true)}
        theme={theme}
      />

      {/* Main Study Desk Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        {/* Global Action Header with search (Desktop only) */}
        <header className={`hidden lg:flex px-8 py-4 border-b-4 border-black items-center justify-between sticky top-0 z-10 shadow-[0_2px_0px_0px_#000] ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
          <div className={`flex items-center gap-4 border-4 border-black px-4 py-2 rounded-full w-96 shadow-[2px_2px_0px_0px_#000] ${theme === "dark" ? "bg-[#121318]" : "bg-slate-100"}`}>
            <input 
              type="text" 
              placeholder="Search current lessons to teach..." 
              className={`bg-transparent border-none text-xs font-black w-full outline-none ${theme === "dark" ? "text-white placeholder-gray-400" : "text-black placeholder-gray-500"}`} 
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Day/Night Theme Toggler represented by Moon/Sun */}
            <button
              id="theme-toggler-btn"
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              title="Toggle Day/Night mode"
              className={`p-2 rounded-full border-2 border-black font-bold transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none cursor-pointer flex items-center justify-center
                ${theme === "dark" ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#1e1f24] text-amber-300 hover:bg-zinc-805"}`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick stats indicators */}
            <div className={`flex gap-2 text-xs font-black ${theme === "dark" ? "text-white" : "text-black"}`}>
              <span className={`px-3 py-1.5 rounded-full border-2 border-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] ${theme === "dark" ? "bg-[#252836]" : "bg-[#84cc16]/20"}`}>
                🔥 {streakCount} DAY STREAK
              </span>
            </div>

            {/* Quick Reset Settings DB Option */}
            <button
              id="reset-state-btn"
              onClick={handleResetData}
              title="Reset state data"
              className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 hover:border-red-600 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Data
            </button>
          </div>
        </header>

        {/* Mobile/Tablet Action Header */}
        <header className={`lg:hidden px-4 md:px-8 py-3.5 border-b-4 border-black flex items-center justify-between sticky top-0 z-20 shadow-[0_2px_0px_0px_#000] ${theme === "dark" ? "bg-[#121318]" : "bg-white"}`}>
          <div className="flex items-center gap-2">
            <AvatarMascot expression={mascotExpression} size="sm" />
            <span className={`text-sm md:text-base font-black tracking-tight uppercase ${theme === "dark" ? "text-white" : "text-black"}`}>
              Teach Sam
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-[10px] font-black border-2 border-black rounded-full shadow-[1.5px_1.5px_0px_0px_#000] ${theme === "dark" ? "bg-[#252836] text-white" : "bg-[#84cc16]/20 text-black"}`}>
              🔥 {streakCount}d
            </span>
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className={`p-1.5 rounded-full border-2 border-black font-bold transition-all shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer flex items-center justify-center
                ${theme === "dark" ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#1e1f24] text-amber-300 hover:bg-[#1f212c]"}`}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsProModalOpen(true)}
              className="bg-[#acf847] hover:bg-lime-500 text-black border-2 border-black px-2.5 py-1 rounded-xl font-black text-[10px] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-emerald-800 fill-emerald-800 animate-pulse" />
              PRO
            </button>
          </div>
        </header>

        {/* View Routing depending on Tab */}
        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          
          {/* TAB 1: PRACTICE VIEW (Chat & Interactive Graph Map) */}
          {currentTab === "practice" && (
            <div className="space-y-6">
              {/* Segmented control for mobile/tablet to switch between Chat and Map */}
              <div className="xl:hidden flex gap-2 border-4 border-black p-1.5 rounded-2xl bg-black/5 shadow-[2px_2px_0px_0px_#000] sticky top-[60px] z-20 backdrop-blur-md">
                <button
                  onClick={() => setMobilePracticeView("chat")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase text-center rounded-xl transition-all cursor-pointer ${mobilePracticeView === "chat" ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]" : "text-gray-400 font-bold hover:text-black"}`}
                >
                  💬 Chat explaining Sam
                </button>
                <button
                  onClick={() => setMobilePracticeView("map")}
                  className={`flex-1 py-2.5 text-xs font-black uppercase text-center rounded-xl transition-all cursor-pointer ${mobilePracticeView === "map" ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]" : "text-gray-400 font-bold hover:text-black"}`}
                >
                  🗺️ Progress Map
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Hello Welcome Banner + Concept Chat Desk (8 cols) */}
                <div className={`xl:col-span-7 flex flex-col gap-6 ${mobilePracticeView === "chat" ? "flex" : "hidden xl:flex"}`}>
                
                {/* Visual Mascot Intro banner */}
                <div className="bg-[#a2e635] text-black border-4 border-black rounded-3xl p-6 relative overflow-hidden flex items-center gap-6 shadow-[5px_5px_0px_0px_#000]">
                  <div className="absolute right-0 bottom-[-15px] opacity-10">
                    <BookOpen className="w-48 h-48 rotate-12" />
                  </div>
                  
                  <AvatarMascot expression={mascotExpression} size="md" />

                  <div className="flex-1 relative z-10">
                    <span className="bg-black text-white px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full tracking-wider">
                      Feynman Teaching Mode
                    </span>
                    <h2 className="text-2xl font-black mt-2">
                      {activeLesson ? `Teaching: ${activeLesson.title}` : "Select a topic in the Vault!"}
                    </h2>
                    <p className="text-xs font-semibold text-black/80 mt-1">
                      Sam is clueless. Break down the highlighted concept below in plain-English analogy to enlighten him!
                    </p>
                  </div>
                </div>

                {/* Main Interactive Chat Panel */}
                <div id="chat-workspace-card" className={`border-4 border-black rounded-3xl shadow-[5px_5px_0px_0px_#000] flex flex-col h-[520px] overflow-hidden ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  
                  {/* Chat Header showing Active lesson & Badge details */}
                  <div className={`px-4 md:px-6 py-3.5 md:py-4 border-b-4 border-black flex items-center justify-between ${theme === "dark" ? "bg-[#0e0f12]" : "bg-slate-50"}`}>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                      <span className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Active Feed
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2">
                      <button
                        onClick={() => setIsNewLessonModalOpen(true)}
                        title="Create and ingest a brand new custom study lesson!"
                        className="text-[9px] md:text-[10px] font-black uppercase px-2 md:px-2.5 py-1.5 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-850 shrink-0" />
                        <span className="hidden sm:inline">New Lesson</span>
                      </button>

                      <button
                        onClick={handleNewTopicDiscussion}
                        title="Start a fresh chat discussion on this topic with Sam!"
                        className={`text-[9px] md:text-[10px] font-black uppercase px-2 md:px-2.5 py-1.5 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer
                          ${theme === "dark" ? "bg-[#acf847] text-black hover:bg-lime-500" : "bg-white text-black hover:bg-slate-50"}`}
                      >
                        <Sparkle className="w-3.5 h-3.5 text-black animate-pulse shrink-0" />
                        <span className="hidden sm:inline">New Topic</span>
                      </button>

                      <span className="bg-[#84cc16]/10 text-[#598c0d] font-black text-[9px] md:text-xs px-2 md:px-2.5 py-1 rounded-full border border-[#84cc16] max-w-[80px] md:max-w-none truncate shrink-0">
                        {activeLesson?.subject || "No Subject"}
                      </span>
                    </div>
                  </div>

                  {/* Message History Scrolling Container */}
                  <div 
                    ref={chatContainerRef}
                    className={`flex-1 p-6 overflow-y-auto space-y-4 ${theme === "dark" ? "bg-[#101115]" : "bg-[#fbfbfb]"}`}
                  >
                    {activeLessonId && chatHistories[activeLessonId] ? (
                      chatHistories[activeLessonId].map((msg) => {
                        const isSam = msg.sender === "sam";
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex gap-3 items-start ${isSam ? "justify-start" : "justify-end"}`}
                          >
                            {isSam && (
                              <div className="mt-1">
                                <AvatarMascot expression={mascotExpression} size="sm" />
                              </div>
                            )}

                            <div className="max-w-[85%] flex flex-col gap-1">
                              <div className={`px-4 py-3 rounded-2xl border-2 border-black font-semibold text-sm shadow-[2px_2px_0px_0px_#000] leading-relaxed
                                ${isSam 
                                  ? (theme === "dark" ? "bg-[#1f212c] text-slate-100 rounded-tl-none" : "bg-white text-black rounded-tl-none") 
                                  : "bg-[#acf847] text-black rounded-tr-none"
                                }`}
                              >
                                <p className="whitespace-pre-line">{msg.text}</p>
                                
                                {/* If message has evaluated rating and analogies, show it only when toggled! */}
                                {msg.evaluation && (msg.evaluation.analogyText || (msg.evaluation.missingPoints && msg.evaluation.missingPoints.length > 0)) && (
                                  <div className="mt-2 text-left">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedAnalogies(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black font-black text-[9px] uppercase shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none
                                        ${expandedAnalogies[msg.id]
                                          ? "bg-slate-200 text-black border-black" 
                                          : theme === "dark" ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-amber-100 text-amber-950 hover:bg-amber-200 border-black"
                                        }`}
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300 animate-pulse shrink-0" />
                                      {expandedAnalogies[msg.id] ? "Hide Sam's Analogy" : "💡 Need an Analogy?"}
                                    </button>

                                    {expandedAnalogies[msg.id] && (
                                      <div className={`mt-3 pt-3 border-t-2 p-2 flex flex-col gap-2 rounded-lg ${theme === "dark" ? "border-white/10 bg-[#2d2f3d]/50" : "border-black/15 bg-[#fefefe]/40"}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-black text-white">
                                            Analogy Box
                                          </span>
                                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border border-black
                                            ${msg.evaluation.clarity === "Excellent" ? "bg-emerald-300 text-black" : "bg-amber-300 text-black"}`}
                                          >
                                            Clarity: {msg.evaluation.clarity}
                                          </span>
                                        </div>
                                        
                                        {msg.evaluation.analogyText && (
                                          <p className={`text-xs italic font-medium leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                                            "{msg.evaluation.analogyText}"
                                          </p>
                                        )}

                                        {msg.evaluation.missingPoints && msg.evaluation.missingPoints.length > 0 && (
                                          <div className="mt-1.5">
                                            <p className="text-[10px] font-black uppercase text-red-500 flex items-center gap-1">
                                              <AlertCircle className="w-3.5 h-3.5" /> Missing Bits in explanation:
                                            </p>
                                            <ul className={`list-disc pl-4 mt-1 text-[11px] font-bold space-y-0.5 ${theme === "dark" ? "text-gray-300" : "text-gray-650"}`}>
                                              {msg.evaluation.missingPoints.map((pt, i) => (
                                                <li key={i}>{pt}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold px-1 uppercase tracking-tight">
                                {isSam ? "Sam" : "You"} • {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={`h-full flex flex-col items-center justify-center p-8 text-center border-4 border-dashed rounded-2xl ${theme === "dark" ? "bg-[#101115] border-zinc-800 text-gray-400" : "bg-slate-50 border-gray-200 text-gray-550"}`}>
                        <BookOpen className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="font-extrabold">No Lesson active right now.</p>
                        <p className="text-xs font-bold mt-1">Visit the Vault tab with textbook chapters to initialize a Feynman quiz!</p>
                      </div>
                    )}

                    {isEvaluating && (
                      <div className="flex gap-3 items-start justify-start">
                        <AvatarMascot expression="thinking" size="sm" />
                        <div className={`px-4 py-3 rounded-2xl rounded-tl-none border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 ${theme === "dark" ? "bg-[#1c1d24]" : "bg-slate-100"}`}>
                          <span className="w-2.5 h-2.5 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2.5 h-2.5 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2.5 h-2.5 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-xs text-gray-500 font-black uppercase ml-1">Sam is Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input Box with audio recorders */}
                  <div className={`p-4 border-t-4 border-black flex items-center gap-3 ${theme === "dark" ? "bg-[#1c1d24]" : "bg-white"}`}>
                    <button
                      id="mic-btn"
                      onClick={startRecording}
                      disabled={isEvaluating}
                      title="Explain via voice simulation"
                      className="bg-[#acf847] hover:bg-[#84cc16] text-black border-4 border-black p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Mic className="w-5 h-5 shrink-0" />
                    </button>

                    {/* Chat Input File Upload trigger */}
                    <input
                      type="file"
                      id="chat-concept-file-input"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.txt,.md"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processSelectedFile(file);
                        }
                      }}
                    />
                    <button
                      id="chat-upload-btn"
                      onClick={() => document.getElementById("chat-concept-file-input")?.click()}
                      disabled={isParsingFile || isEvaluating}
                      title="Upload custom topic syllabus or PDF to educate Sam"
                      className="bg-[#38bdf8] hover:bg-[#0284c7] text-black border-4 border-black p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isParsingFile ? (
                        <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />
                      ) : (
                        <UploadCloud className="w-5 h-5 shrink-0" />
                      )}
                    </button>

                    <div className="flex-1 relative flex items-center">
                      <input 
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage();
                        }}
                        disabled={isEvaluating || !activeLessonId}
                        placeholder={activeLesson ? `Explain: ${activeLesson.concepts.find(c => c.id === activeConceptId)?.label || "the concept"} here...` : "Select a topic first!"}
                        className={`w-full border-4 border-black font-bold text-xs p-4 rounded-2xl outline-none placeholder-gray-400 focus:shadow-[0_0_0_3px_#84cc16] ${theme === "dark" ? "bg-[#121318] text-white" : "bg-white text-black"}`}
                      />
                    </div>

                    <button
                      id="send-msg-btn"
                      onClick={() => handleSendMessage()}
                      disabled={!userInput.trim() || isEvaluating || !activeLessonId}
                      className="bg-[#84cc16] hover:bg-lime-600 text-black border-4 border-black p-3.5 rounded-2xl font-bold shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 text-xs"
                    >
                      <span className="hidden sm:inline font-black uppercase text-xs">Send</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Lecture Progress Map Visual roadmap (5 cols) */}
              <div className={`xl:col-span-5 flex flex-col gap-6 ${mobilePracticeView === "map" ? "flex" : "hidden xl:flex"}`}>
                    {/* Visual Roadmap Card representing Mermaid concept layout */}
                <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  <h3 className={`text-lg font-black tracking-tight flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-black"}`}>
                    <BrainCircuit className="w-5 h-5 text-[#84cc16]" />
                    Lecture Progress Map
                  </h3>
                  <p className={`text-xs font-bold mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Click concept milestones to preview references. Green nodes are unlocked!
                  </p>

                  {/* Flow Map Visual Container */}
                  <div className={`mt-6 border-4 border-dashed rounded-2xl p-6 flex flex-col gap-4 relative min-h-[360px] justify-center ${theme === "dark" ? "border-zinc-800 bg-[#121318]" : "border-slate-200 bg-slate-50/50"}`}>
                    
                    {activeLesson ? (
                      (() => {
                        const activeHistory = chatHistories[activeLessonId] || [];
                        const userHasStartedLecturing = activeHistory.some(m => m.sender === "user");

                        if (!userHasStartedLecturing) {
                          return (
                            <div className="text-center p-6 flex flex-col items-center justify-center gap-4 py-12">
                              <div className="w-16 h-16 bg-amber-100 hover:bg-amber-200 border-4 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_#000] animate-bounce">
                                <BrainCircuit className="w-8 h-8 text-amber-800" />
                              </div>
                              <h4 className={`text-sm font-black uppercase tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                Map Pending Lecture
                              </h4>
                              <p className={`text-xs font-semibold max-w-xs leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                Start explaining this topic in the chat feed to assemble Sam's live progress map! The nodes will unlock and branch dynamically based on your spoken and written explanations.
                              </p>
                            </div>
                          );
                        }

                        // Display dynamic map based on the conversation
                        return activeLesson.concepts.map((node, index) => {
                          const isUnlocked = node.status === "unlocked";
                          const isActive = node.status === "active";
                          const isSelected = activeConceptId === node.id;

                          // Extract the exact analogy Sam gave in response to unlocking or explaining this concept
                          const relevantSamMsg = activeHistory.find(
                            m => m.sender === "sam" && m.evaluation && (m.evaluation.unlockedConceptIds?.includes(node.id) || activeConceptId === node.id)
                          );
                          const conceptAnalogy = relevantSamMsg?.evaluation?.analogyText;

                          return (
                            <div key={node.id} className="flex flex-col items-center w-full">
                              {/* Connection Arrow */}
                              {index > 0 && (
                                <div className={`h-6 w-1 my-1 ${theme === "dark" ? "bg-white/40" : "bg-black"}`} />
                              )}
                              
                              {/* Concept Node */}
                              <button
                                id={`concept-node-${node.id}`}
                                onClick={() => {
                                  setActiveConceptId(node.id);
                                  localStorage.setItem("teachsam-active-concept-id", node.id);
                                }}
                                className={`w-full max-w-sm px-4 py-3 rounded-2xl border-4 text-left transition-all relative flex flex-col gap-1.5 cursor-pointer select-none
                                  ${isUnlocked 
                                    ? "bg-[#acf847]/20 border-green-500 shadow-[3px_3px_0px_0px_rgba(34,197,94,1)] text-[#84cc16]" 
                                    : isActive
                                      ? theme === "dark"
                                        ? "bg-[#1f212c] border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ring-4 ring-[#84cc16]"
                                        : "bg-white border-black shadow-[4px_4px_0px_0px_#000] ring-4 ring-[#84cc16]"
                                      : theme === "dark"
                                        ? "bg-[#14151a] border-zinc-800 text-zinc-650 opacity-60"
                                        : "bg-gray-100 border-gray-300 text-gray-400 opacity-60"
                                  }
                                  ${isSelected ? "scale-[1.03]" : ""}
                                `}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2.5">
                                    {/* Badge state index */}
                                    <span className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs font-black
                                      ${isUnlocked 
                                        ? "bg-green-500 text-black" 
                                        : isActive
                                          ? "bg-[#84cc16] text-black"
                                          : "bg-gray-200 text-gray-400 border-gray-300"
                                      }`}
                                    >
                                      {index + 1}
                                    </span>

                                    <div>
                                      <h4 className={`text-xs font-black uppercase ${theme === "dark" && !isUnlocked ? "text-gray-200" : "text-black"}`}>
                                        {node.label}
                                      </h4>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {isUnlocked ? (
                                      <span className="bg-green-500 text-black px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border border-black shadow-[1px_1px_0px_0px_#000]">
                                        Mastered
                                      </span>
                                    ) : isActive ? (
                                      <span className="bg-[#84cc16] text-black px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase animate-pulse border border-black shadow-[1px_1px_0px_0px_#000]">
                                        Teaching
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight border border-gray-200 px-1 py-0.5 rounded">
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Dynamic content based of the conversation */}
                                {isUnlocked && conceptAnalogy ? (
                                  <div className="text-[10px] p-2 rounded-xl bg-green-500/10 border border-green-500 border-dashed text-green-700 dark:text-green-300 mt-1">
                                    <p className="font-extrabold uppercase text-[9px] mb-0.5">💡 Chat-Formed Analogy:</p>
                                    <p className="italic">"{conceptAnalogy}"</p>
                                  </div>
                                ) : (
                                  <p className={`text-[10px] font-bold mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"} truncate max-w-[280px]`}>
                                    {node.description}
                                  </p>
                                )}
                              </button>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-center font-bold text-gray-400 text-xs">
                        No conceptual roadmap parsed. Setup a study file!
                      </div>
                    )}
                  </div>

                  {/* Active Concept Card Details in footer */}
                  {activeConceptId && activeLesson && (
                    <div className="mt-6 border-4 border-black rounded-2xl p-4 bg-slate-50 relative">
                      <span className="absolute top-2 right-2 bg-black text-white px-2 py-0.5 text-[9px] font-black rounded uppercase">
                        Reference File Text
                      </span>
                      {(() => {
                        const targetNode = activeLesson.concepts.find(c => c.id === activeConceptId);
                        return (
                          <>
                            <h4 className="text-xs font-black uppercase text-gray-800 flex items-center gap-1 mt-1">
                              📖 {targetNode?.label || "Active Concept Guide"}
                            </h4>
                            <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-2 border-l-2 border-[#84cc16] pl-3 mb-3">
                              {targetNode?.description || "Select a concept milestone node in the graph above to highlight specific key mechanisms!"}
                            </p>
                            <button
                              id="explain-concept-btn"
                              onClick={handleExplainConcept}
                              disabled={isEvaluating}
                              title="Struggling to figure it out? Ask Sam to explain this concept details!"
                              className="bg-amber-100 hover:bg-amber-200 disabled:opacity-40 text-amber-850 font-black text-[11px] p-2.5 px-3 uppercase border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
                              Struggling? Explain Concept To Me
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Progress completion stats mimicking screen 2 */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 border-4 border-black p-4 rounded-2xl shadow-[2px_2px_0px_0px_#000]">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Lesson Mastery</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-black">{activeLesson?.progress || 0}%</span>
                        <div className="flex-1 bg-gray-200 h-3 rounded-full border-2 border-black overflow-hidden">
                          <div 
                            className="bg-[#84cc16] h-full" 
                            style={{ width: `${activeLesson?.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border-4 border-black p-4 rounded-2xl shadow-[2px_2px_0px_0px_#000]">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Target Audience</span>
                      <p className="text-xs font-black text-emerald-600 mt-1 uppercase flex items-center gap-1">
                        🎓 Confused peer (Sam)
                      </p>
                    </div>
                  </div>

                </div>

                {/* Daily Goals Panel matching screen 1 Mockup */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black tracking-tight text-black flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Daily Goals
                    </h3>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 border-2 border-black px-2 py-0.5 rounded-full">
                      {dailyGoals.filter(g => g.completed).length}/{dailyGoals.length} completed
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dailyGoals.map((goal) => (
                      <div 
                        key={goal.id} 
                        className="flex items-center gap-3 p-3 rounded-xl border-2 border-black bg-slate-50 shadow-[1px_1px_0px_0px_#000]"
                      >
                        <button
                          id={`goal-checkbox-${goal.id}`}
                          onClick={() => {
                            setDailyGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g));
                          }}
                          className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs transition-all cursor-pointer
                            ${goal.completed ? "bg-[#84cc16] text-black" : "bg-white"}`}
                        >
                          {goal.completed && "✓"}
                        </button>
                        <span className={`text-xs font-bold ${goal.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                          {goal.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
          )}

          {/* TAB 2: VAULT VIEW (Lesson database grid & textbook inputs) */}
          {currentTab === "vault" && (
            <div className="space-y-8">
              
              {/* Top Banner and upload prompt */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                
                {/* Master Your Exam card from layout screenshots */}
                <div className={`border-4 border-black rounded-3xl p-8 shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  <div className="space-y-4">
                    <div className="bg-amber-100 text-amber-800 inline-block px-3 py-1 text-xs font-black uppercase rounded-full border-2 border-black">
                      Supercharge Feynman
                    </div>
                    <h2 className={`text-3xl font-black leading-none ${theme === "dark" ? "text-white" : "text-black"}`}>
                      Master Your Exams
                    </h2>
                    <p className={`text-xs font-bold leading-relaxed max-w-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      Copy textbook chapters or paste notes below. Sam will ingest it, generate concept roadmaps, and quiz you step-by-step!
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      id="import-gatsby-btn"
                      onClick={() => {
                        setIsNewLessonModalOpen(true);
                        loadPredefinedMaterials("Gatsby");
                      }}
                      className="bg-[#84cc16]/10 text-[#598c0d] font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      🧪 Use Gatsby Sample Note
                    </button>
                    <button
                      id="import-mitosis-btn"
                      onClick={() => {
                        setIsNewLessonModalOpen(true);
                        loadPredefinedMaterials("Mitosis");
                      }}
                      className="bg-amber-100 text-amber-800 font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      🧬 Use Cell Mitosis Note
                    </button>
                  </div>
                </div>

                {/* Upload Action Drag and Drop Simulation card mimicking screenshot */}
                <div 
                  id="upload-lecture-card"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => {
                    setIsDragging(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      await processSelectedFile(file);
                    }
                  }}
                  className={`border-4 border-black rounded-3xl p-8 shadow-[5px_5px_0px_0px_#000] transition-all flex flex-col items-center justify-center text-center cursor-pointer relative group border-dashed 
                    ${isDragging 
                      ? "bg-[#acf847]/10 border-[#84cc16] scale-[1.02]" 
                      : theme === "dark" 
                        ? "bg-[#181920] hover:bg-[#232530]" 
                        : "bg-white hover:bg-slate-50"
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.txt,.md"
                    className="hidden"
                  />

                  {isParsingFile ? (
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-12 h-12 text-[#84cc16] animate-spin mb-3" />
                      <h3 className="text-lg font-black">Analyzing Textbook...</h3>
                      <p className="text-xs text-gray-400 font-semibold mt-1">
                        Extracting pages from document stream using backend indexers
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-[#acf847] border-4 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_#000] group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8 text-black" />
                      </div>
                      <h3 className={`text-lg font-black mt-4 ${theme === "dark" ? "text-white" : "text-black"}`}>Upload Study File</h3>
                      <p className="text-xs text-gray-400 font-semibold mt-1">
                        PDFs, Word .docx, or Text files are supported!
                      </p>
                      <button className="bg-emerald-50 text-[#84cc16] text-xs font-black uppercase px-4 py-2.5 rounded-full border-2 border-[#84cc16] mt-4 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#84cc16]">
                        <Plus className="w-3.5 h-3.5" />
                        Choose raw file
                      </button>
                    </>
                  )}
                </div>

              </div>

              {/* Study library section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-black"}`}>Study Materials</h3>
                    <p className={`text-xs font-semibold mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Your personal library of learning milestones, summaries, and lecture slides.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black uppercase ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Filter: All
                    </span>
                  </div>
                </div>

                {/* Card grids of lessons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lessons.map((lesson) => {
                    const isCompleted = lesson.progress === 100;
                    return (
                      <div 
                        key={lesson.id}
                        className={`border-4 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_#000] flex flex-col justify-between hover:-translate-y-1 transition-all relative ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border-2 border-black ${theme === "dark" ? "bg-[#252836] text-white" : "bg-slate-100 text-slate-800"}`}>
                              {lesson.subject}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-black
                              ${isCompleted ? "bg-[#acf847] text-black" : "bg-amber-100 text-amber-800"}`}
                            >
                              {lesson.status}
                            </span>
                          </div>

                          <div>
                            <h4 className={`font-black text-base leading-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                              {lesson.title}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                              ⏰ Added {lesson.dateAdded} • {lesson.concepts.length} concepts
                            </p>
                          </div>

                          <div className="space-y-1 pt-2">
                            <div className="flex items-center justify-between text-[11px] font-black">
                              <span>Mastery progress</span>
                              <span>{lesson.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full border-2 border-black overflow-hidden">
                              <div 
                                className="bg-[#84cc16] h-full" 
                                style={{ width: `${lesson.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#84cc16] flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> Textbook Ingested
                          </span>
                          
                           <button
                             id={`open-lesson-btn-${lesson.id}`}
                             onClick={() => {
                               setActiveLessonId(lesson.id);
                               localStorage.setItem("teachsam-active-lesson-id", lesson.id);
                               const targetNote = lesson.concepts.find(c => c.status === "active") || lesson.concepts[0];
                               if (targetNote) {
                                 setActiveConceptId(targetNote.id);
                                 localStorage.setItem("teachsam-active-concept-id", targetNote.id);
                               }
                               setCurrentTab("practice");
                             }}
                             className="bg-[#84cc16] hover:bg-lime-600 text-black border-2 border-black px-3.5 py-1.5 rounded-xl font-black text-[11px] shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                           >
                            Teach Sam →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2.5: TESTS VIEW (Diagnostic interactive exam and self quizzes matching NotebookLM) */}
          {currentTab === "tests" && (
            <TestsTab 
              lessons={lessons} 
              theme={theme} 
              userName={userName} 
              activeLessonId={activeLessonId}
            />
          )}

          {/* TAB 3: USER PROFILE VIEW (Trained brain stats, achievements) */}
          {currentTab === "profile" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Left Column (8 cols): Mastery radial charts, Badges drawer */}
              <div className="xl:col-span-8 space-y-8">
                
                {/* User Info card matching mockup */}
                <div className={`border-4 border-black rounded-3xl p-8 shadow-[5px_5px_0px_0px_#000] flex flex-col md:flex-row items-center gap-6 ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-[#a2e635]/20 flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
                    <span className="text-4xl text-black">🎓</span>
                  </div>

                  <div className="flex-1 space-y-2 text-center md:text-left">
                    <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
                      <span className="bg-[#84cc16] text-black text-xs font-black uppercase px-2.5 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                        Master Teacher
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-xs font-black uppercase px-2.5 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                        Science Wiz
                      </span>
                    </div>

                    <h2 className={`text-3xl font-black ${theme === "dark" ? "text-white" : "text-black"}`}>Hey there, {userName}!</h2>
                    <p className={`text-xs font-bold leading-relaxed ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Your brain is looking extra beefy today. Ready to teach Sam some new tricks?
                    </p>
                  </div>
                </div>
                
                {/* Profile Identity Customization card requested */}
                <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] space-y-4 ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${theme === "dark" ? "text-white" : "text-black"}`}>
                      Personalize Your Identity
                    </h3>
                    <p className={`text-xs font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      What should Sam call you when you are explaining material or reviewing grades?
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className={`flex items-center gap-2 border-4 border-black px-4 py-2.5 rounded-xl flex-1 shadow-[2px_2px_0px_0px_#000] ${theme === "dark" ? "bg-[#121318]" : "bg-slate-50"}`}>
                      <span className="text-sm font-bold">👤</span>
                      <input 
                        type="text"
                        value={userName}
                        maxLength={25}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserName(val);
                          localStorage.setItem("teachsam-username", val);
                        }}
                        onBlur={() => {
                          if (!userName.trim()) {
                            setUserName("User");
                            localStorage.setItem("teachsam-username", "User");
                          }
                        }}
                        className={`bg-transparent border-none text-xs font-black w-full outline-none ${theme === "dark" ? "text-white" : "text-black"}`}
                        placeholder="Type your nickname..."
                      />
                    </div>
                  </div>
                </div>

                {/* Subject Mastery Panel screen 3 */}
                <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  <h3 className={`text-lg font-black tracking-tight mb-4 ${theme === "dark" ? "text-white" : "text-black"}`}>
                    Subject Mastery
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(() => {
                      // Group lessons by subject dynamically!
                      const subjectGroups: Record<string, { total: number; unlocked: number }> = {};
                      lessons.forEach(l => {
                        const subj = l.subject || "General";
                        if (!subjectGroups[subj]) {
                          subjectGroups[subj] = { total: 0, unlocked: 0 };
                        }
                        subjectGroups[subj].total += l.concepts.length;
                        subjectGroups[subj].unlocked += l.concepts.filter(c => c.status === "unlocked").length;
                      });

                      const subjectKeys = Object.keys(subjectGroups);
                      if (subjectKeys.length === 0) {
                        return <p className="text-xs text-gray-400 font-semibold col-span-3 text-center">No subjects active yet.</p>;
                      }

                      const colors = [
                        { bg: "bg-[#acf847]/40", valCol: "text-[#598c0d]" },
                        { bg: "bg-blue-100", valCol: "text-blue-700" },
                        { bg: "bg-amber-100", valCol: "text-amber-700" },
                        { bg: "bg-purple-100", valCol: "text-purple-700" },
                        { bg: "bg-emerald-100", valCol: "text-emerald-700" },
                      ];

                      return subjectKeys.map((subj, index) => {
                        const info = subjectGroups[subj];
                        const pct = info.total > 0 ? Math.round((info.unlocked / info.total) * 100) : 0;
                        const col = colors[index % colors.length];
                        return (
                          <div key={subj} className={`border-4 border-black p-4 rounded-2xl relative flex items-center gap-4 shadow-[3px_3px_0px_0px_#000] ${theme === "dark" ? "bg-[#121318]" : "bg-slate-50"}`}>
                            <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs shrink-0 ${col.bg} ${theme === "dark" ? "text-black" : col.valCol}`}>
                              {pct}%
                            </div>
                            <div className="min-w-0">
                              <h4 className={`text-xs font-black uppercase truncate ${theme === "dark" ? "text-white" : "text-black"}`}>{subj}</h4>
                              <p className={`text-[10px] font-bold mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                {info.unlocked > 0 ? `${info.unlocked} concept${info.unlocked > 1 ? 's' : ''} mastered` : "Needs explanations"}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Badges Drawer in layout mockup */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000]">
                  <h3 className="text-lg font-black">Recent Badges</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-[#acf847]/10 border-4 border-[#84cc16] p-4 rounded-2xl text-center shadow-[3px_3px_0px_0px_#84cc16]">
                      <span className="text-2xl block mb-2">💡</span>
                      <h4 className="text-xs font-black uppercase">Analogy Master</h4>
                      <p className="text-[9.5px] font-bold text-gray-500 mt-0.5">Unlocked 5 analogies</p>
                    </div>

                    <div className="bg-amber-50 border-4 border-amber-400 p-4 rounded-2xl text-center shadow-[3px_3px_0px_0px_#fbbf24]">
                      <span className="text-2xl block mb-2">🔥</span>
                      <h4 className="text-xs font-black uppercase">5 Day Explainer</h4>
                      <p className="text-[9.5px] font-bold text-gray-500 mt-0.5">Continuous daily active teaching</p>
                    </div>

                    <div className="bg-purple-100/30 border-4 border-purple-400 p-4 rounded-2xl text-center shadow-[3px_3px_0px_0px_#c084fc]">
                      <span className="text-2xl block mb-2">🧠</span>
                      <h4 className="text-xs font-black uppercase">Pure Sync</h4>
                      <p className="text-[9.5px] font-bold text-gray-500 mt-0.5">High logical clarity index</p>
                    </div>

                    <div className="bg-slate-100 border-4 border-dashed border-gray-350 p-4 rounded-2xl text-center opacity-60">
                      <span className="text-2xl block mb-2">🔒</span>
                      <h4 className="text-xs font-black uppercase text-gray-400">Perfect 100</h4>
                      <p className="text-[9.5px] font-bold text-gray-400 mt-0.5">Finish biology sequence</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (4 cols): Brain power stats matching layout */}
              <div className="xl:col-span-4 space-y-6">
                
                {/* Brain Power Stats */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000]">
                  <h3 className="text-sm font-black tracking-tight text-gray-500 uppercase flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Brain Power Stats
                  </h3>

                  <div className="space-y-4 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-xs font-black mb-1">
                        <span>Creative Flow</span>
                        <span>85/100</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full border-2 border-black overflow-hidden">
                        <div className="bg-[#84cc16] h-full" style={{ width: '85%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-black mb-1">
                        <span>Logical Reach</span>
                        <span>72/100</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full border-2 border-black overflow-hidden">
                        <div className="bg-[#84cc16] h-full" style={{ width: '72%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-black mb-1">
                        <span>Memory Retention</span>
                        <span>95/100</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full border-2 border-black overflow-hidden">
                        <div className="bg-slate-400 h-full" style={{ width: '95%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Companion Avatars Boutique (Other Avatars - Coming Soon Showcases) */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black tracking-tight text-gray-500 uppercase flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-300 animate-pulse" />
                      Companion Buddies
                    </h3>
                    <span className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase px-2 py-0.5 rounded border-2 border-black">
                      Expansion pack
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-gray-500 leading-relaxed -mt-1">
                    Expand your classrooms! Meet Sam's peers currently finishing training. You'll be able to lecture and examine them simultaneously soon:
                  </p>

                  <div className="space-y-3">
                    {/* Character 1: Samantha */}
                    <div className="border-4 border-black p-3.5 rounded-2xl bg-indigo-50/30 flex items-center gap-3.5 relative overflow-hidden group">
                      <div className="absolute top-1.5 right-1.5 bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded truncate">
                        Coming Soon
                      </div>
                      <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-2xl">👩‍🔬</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black uppercase text-black">Samantha</h4>
                        <p className="text-[10px] font-black text-[#84cc16] mt-0.5 uppercase">Science Literature Major</p>
                        <p className="text-[9.5px] text-gray-450 font-semibold truncate">Specializes in Biology and Quantum Physics</p>
                      </div>
                    </div>

                    {/* Character 2: Sonni */}
                    <div className="border-4 border-black p-3.5 rounded-2xl bg-amber-50/30 flex items-center gap-3.5 relative overflow-hidden">
                      <div className="absolute top-1.5 right-1.5 bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded truncate">
                        Coming Soon
                      </div>
                      <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-amber-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-2xl">🎨</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black uppercase text-black">Sonni</h4>
                        <p className="text-[10px] font-black text-[#598c0d] mt-0.5 uppercase">High-Spirited Art Guide</p>
                        <p className="text-[9.5px] text-gray-450 font-semibold truncate">Specializes in Economics and Visual History</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feynman Technique instruction reminder */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-5">
                    <Clock className="w-32 h-32" />
                  </div>
                  <h4 className="font-black text-xs uppercase text-[#84cc16] mb-1">The Golden Rule</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                    The Feynman Technique asks you to locate areas where your analogies falter. If Sam is looking confused on the graph, it highlights exactly where you need to check standard files & textbook items. Re-read the textbooks and teach again.
                  </p>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Global branding footer */}
        <footer className="mt-auto px-8 py-6 bg-slate-100 border-t-4 border-black flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-gray-500">
          <div>
            <span>TeachSam Study App</span>
            <span className="mx-2">•</span>
            <span>© 2026 TeachSam Team</span>
          </div>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <a href="#" className="hover:text-black">Privacy</a>
            <a href="#" className="hover:text-black">Terms</a>
            <a href="#" className="hover:text-black">Support</a>
          </div>
        </footer>

      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <div className={`lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[95%] max-w-sm h-14 rounded-2xl border-4 border-black flex items-center justify-around z-30 shadow-[4px_4px_0px_0px_#000] select-none ${theme === "dark" ? "bg-[#121318]" : "bg-white"}`}>
        <button
          onClick={() => setCurrentTab("practice")}
          className={`flex flex-col items-center justify-center w-20 h-10 rounded-xl transition-all cursor-pointer ${currentTab === "practice" ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] font-extrabold text-[8px]" : "text-gray-400 font-bold text-[8px]"}`}
        >
          <GraduationCap className="w-4 h-4" />
          <span className="text-[7.5px] uppercase tracking-wider mt-0.5">Practice</span>
        </button>

        <button
          onClick={() => setCurrentTab("vault")}
          className={`flex flex-col items-center justify-center w-20 h-10 rounded-xl transition-all cursor-pointer ${currentTab === "vault" ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] font-extrabold text-[8px]" : "text-gray-400 font-bold text-[8px]"}`}
        >
          <Library className="w-4 h-4" />
          <span className="text-[7.5px] uppercase tracking-wider mt-0.5">Vault</span>
        </button>

        <button
          onClick={() => setCurrentTab("tests")}
          className={`flex flex-col items-center justify-center w-20 h-10 rounded-xl transition-all cursor-pointer ${currentTab === "tests" ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] font-extrabold text-[8px]" : "text-gray-400 font-bold text-[8px]"}`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span className="text-[7.5px] uppercase tracking-wider mt-0.5">Tests</span>
        </button>

        <button
          onClick={() => setCurrentTab("profile")}
          className={`flex flex-col items-center justify-center w-20 h-10 rounded-xl transition-all cursor-pointer ${currentTab === "profile" ? "bg-[#84cc16] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] font-extrabold text-[8px]" : "text-gray-400 font-bold text-[8px]"}`}
        >
          <User className="w-4 h-4" />
          <span className="text-[7.5px] uppercase tracking-wider mt-0.5">Profile</span>
        </button>
      </div>

      {/* New Study Material Form Modal */}
      <AnimatePresence>
        {isNewLessonModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black rounded-3xl p-8 max-w-xl w-full shadow-[6px_6px_0px_0px_#000] relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsNewLessonModalOpen(false)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-black border-2 border-black p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-black mb-2 uppercase tracking-tight">
                Add Study Materials to Sam
              </h3>
              <p className="text-xs text-gray-500 font-bold mb-6">
                Paste textbook content or copy reference materials. Sam's brain will evaluate and break down key nodes immediately!
              </p>

              <form onSubmit={handleCreateNewLesson} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-black uppercase mb-1">
                    Lesson/Chapter Title
                  </label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Photosynthesis Phase Stage 2, Cell Division Basics"
                    className="w-full bg-white border-4 border-black p-3 rounded-xl outline-none font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">
                    Subject Segment
                  </label>
                  <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g., Biology, Physics, Microeconomics"
                    className="w-full bg-white border-4 border-black p-3 rounded-xl outline-none font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">
                    Textbook/Lecture Transcript Contents
                  </label>
                  <textarea 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Paste reference materials or copy notes slides here..."
                    className="w-full bg-white border-4 border-black p-3 rounded-xl outline-none font-bold text-xs h-36 resize-none"
                    required
                  />
                </div>

                {formError && (
                  <div className="bg-red-50 text-red-600 text-[11px] font-bold p-3 rounded-xl border-2 border-red-200">
                    ⚠️ {formError}
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewLessonModalOpen(false)}
                    className="bg-slate-50 border-4 border-black py-2.5 px-5 rounded-xl font-bold text-xs uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="bg-[#84cc16] hover:bg-lime-600 text-black border-4 border-black py-2.5 px-6 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating roadmap...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
                        Generate Study Roadmap!
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Transcript Simulation Overlay */}
      <AnimatePresence>
        {isRecording && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white border-4 border-black rounded-3xl p-8 max-w-sm w-full shadow-[6px_6px_0px_0px_#000] text-center"
            >
              <h3 className="text-lg font-black uppercase mb-1 flex items-center justify-center gap-2">
                <Mic className="w-5 h-5 text-red-500 animate-pulse" />
                Listening Sim active
              </h3>
              <p className="text-xs text-gray-500 font-bold mb-6">
                Sam is listening to your explanation! Play explaining with voice details.
              </p>

              {/* Animated Bouncing Waveforms */}
              <div className="h-16 flex items-center justify-center gap-1 mb-6 bg-slate-50 border-4 border-black rounded-2xl p-4">
                {recordingWaveform.map((height, i) => (
                  <motion.div 
                    key={i}
                    className="w-1.5 bg-[#84cc16] border border-black rounded-full"
                    animate={{ height: [`${height}%`, `${height * 0.4}%`, `${height}%`] }}
                    transition={{ repeat: Infinity, duration: 0.6 + (i * 0.05) }}
                  />
                ))}
              </div>

              <p className="text-xl font-black">
                {Math.floor(recordingSeconds / 60) < 10 ? '0' + Math.floor(recordingSeconds / 60) : Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? '0' + (recordingSeconds % 60) : recordingSeconds % 60}
              </p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={cancelRecording}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 hover:border-red-600 py-2 px-4 rounded-xl font-bold text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={stopRecordingAndSend}
                  className="bg-[#84cc16] text-black border-4 border-black py-2.5 px-6 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] cursor-pointer"
                >
                  Done, Send Voice →
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Get Pro Subscription Pricing Promo Modal */}
      <AnimatePresence>
        {isProModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[6px_6px_0px_0px_#000] relative text-center"
            >
              <button 
                onClick={() => {
                  setIsProModalOpen(false);
                  setProSlideIndex(0);
                }}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-black border-2 border-black p-1.5 rounded-full transition-all cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Pro Slideshow Carousel rendering */}
              <div className="min-h-[340px] flex flex-col justify-center">
                {proSlideIndex === 0 && (
                  <div>
                    <div className="w-20 h-20 bg-amber-100 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_0px_#000]">
                      <Sparkles className="w-10 h-10 text-amber-500 fill-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>

                    <h3 className="text-2.5xl font-black tracking-tight text-black mb-1">
                      Unbox TEACH SAM Pro!
                    </h3>
                    <p className="text-xs font-bold text-gray-500 leading-relaxed mb-6">
                      Master classrooms, unlock unlimited Gemini study notes generation, and customize Sam's avatar personality layers.
                    </p>

                    <div className="bg-slate-50 border-4 border-black p-6 rounded-2xl mb-2 relative">
                      <span className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-[#84cc16] border-2 border-black text-white px-3 py-0.5 text-[9px] font-black uppercase rounded-full">
                        Lifetime Value
                      </span>
                      <p className="text-xs font-bold text-gray-400 uppercase mt-1">Supercharged Tutor pricing</p>
                      <p className="text-4xl font-black text-black mt-2">
                        $4.99<span className="text-xs text-gray-400 font-bold">/month</span>
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 mt-2">
                        Cancel anytime. Friendly refund policy.
                      </p>
                    </div>
                  </div>
                )}

                {proSlideIndex === 1 && (
                  <div className="flex flex-col items-center">
                    <div className="w-full bg-slate-50 border-4 border-black rounded-2xl overflow-hidden mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <img 
                        src="/src/assets/images/slide_new_characters_1779438373993.png" 
                        alt="Join Samantha and Sonni" 
                        className="w-full h-44 object-cover border-b-2 border-black"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-black mb-1">
                      Meet Samantha & Sonni
                    </h3>
                    <p className="text-[10px] font-black text-[#598c0d] uppercase tracking-widest mb-2">Expansion Pack Sneaked Preview</p>
                    <p className="text-[11px] font-semibold text-gray-650 leading-relaxed px-2 mb-2">
                      Expanding your buddies! Meet Samantha, representing core scientific literature majors, and Sonni, our high-spirited art guide! Teach multiples companion modules at once.
                    </p>
                  </div>
                )}

                {proSlideIndex === 2 && (
                  <div className="flex flex-col items-center">
                    <div className="w-full bg-slate-50 border-4 border-black rounded-2xl overflow-hidden mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <img 
                        src="/src/assets/images/slide_voice_call_1779438392304.png" 
                        alt="Audio verbal phone call mockup" 
                        className="w-full h-44 object-cover border-b-2 border-black"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-black mb-1">
                      Real-Time Voice Calls
                    </h3>
                    <p className="text-[10px] font-black text-[#598c0d] uppercase tracking-widest mb-2">Hands-Free Classroom Upgrade</p>
                    <p className="text-[11px] font-semibold text-gray-650 leading-relaxed px-2 mb-2">
                      Connect via simultaneous speech audio streams! Practice explaining your course concepts out loud, while Sam listens and queries you live.
                    </p>
                  </div>
                )}
              </div>

              {/* Slides Navigation Indicators */}
              <div className="flex items-center justify-between gap-4 mt-4 mb-6">
                <button 
                  type="button"
                  onClick={() => setProSlideIndex(prev => (prev === 0 ? 2 : prev - 1))}
                  className="bg-white hover:bg-slate-50 text-black border-4 border-black px-4 py-1.5 rounded-xl transition-all shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-black text-[11px] h-8 flex items-center justify-center cursor-pointer select-none"
                >
                  ← BACK
                </button>

                <div className="flex gap-2">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProSlideIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full border-2 border-black transition-all cursor-pointer ${proSlideIndex === idx ? "bg-[#84cc16]" : "bg-slate-100"}`}
                      title={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button 
                  type="button"
                  onClick={() => setProSlideIndex(prev => (prev === 2 ? 0 : prev + 1))}
                  className="bg-white hover:bg-slate-50 text-black border-4 border-black px-4 py-1.5 rounded-xl transition-all shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-black text-[11px] h-8 flex items-center justify-center cursor-pointer select-none"
                >
                  NEXT →
                </button>
              </div>

              <button
                onClick={() => {
                  alert("Thank you! Pro subscription active for testing.");
                  setIsProModalOpen(false);
                  setProSlideIndex(0);
                }}
                className="w-full bg-[#84cc16] hover:bg-lime-600 text-black font-black text-xs uppercase py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Become a Master Teacher
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
