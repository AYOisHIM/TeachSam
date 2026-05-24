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
  Moon,
  Mail,
  Trash2,
  Search,
  ChevronDown
} from "lucide-react";
import SideMenu from "./components/SideMenu";
import AvatarMascot from "./components/AvatarMascot";
import TestsTab from "./components/TestsTab";
import { Lesson, ConceptNode, Message, DailyGoal, BrainStats } from "./types";
import { 
  initGmailAuth, 
  loginWithGmail, 
  logoutGmail, 
  fetchLatestEmails, 
  sendGmailMessage, 
  GmailMessage 
} from "./gmailService";
import { User as FirebaseUser } from "firebase/auth";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"practice" | "vault" | "tests" | "profile">("practice");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>("");
  const [activeConceptId, setActiveConceptId] = useState<string>("");
  const [conceptSearchQuery, setConceptSearchQuery] = useState<string>("");
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

  // --- REGISTRATION & LOGIN SYSTEM STATES ---
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email: string; createdAt: string } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teachsam-user-session");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // --- TECHNICAL SUPPORT STATES ---
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [supportFeedback, setSupportFeedback] = useState<string>("");
  const [supportEmail, setSupportEmail] = useState<string>("");
  const [supportSubmitting, setSupportSubmitting] = useState<boolean>(false);
  const [supportSuccess, setSupportSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.email) {
      setSupportEmail(currentUser.email);
    } else {
      setSupportEmail("");
    }
  }, [currentUser]);

  // Auth Form Fields
  const [authUsername, setAuthUsername] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");

  // --- GMAIL COMPANION INTEGRATION STATES ---
  const [gmailUser, setGmailUser] = useState<FirebaseUser | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [emailsList, setEmailsList] = useState<GmailMessage[]>([]);
  const [gmailSearchQuery, setGmailSearchQuery] = useState<string>("");
  const [isGmailLoading, setIsGmailLoading] = useState<boolean>(false);
  const [gmailStatusMsg, setGmailStatusMsg] = useState<string>("");
  const [gmailAuthError, setGmailAuthError] = useState<string | null>(null);

  // Send Notes over Gmail fields
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // --- PROTECTED ADMIN CONSOLE STATES ---
  const [adminKeyInput, setAdminKeyInput] = useState<string>("");
  const [adminUsersReport, setAdminUsersReport] = useState<{ username: string; email: string; createdAt: string }[]>([]);
  const [adminError, setAdminError] = useState<string>("");
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  // User Customizable Name requested
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teachsam-username");
      if (saved) return saved;
      
      const savedUser = localStorage.getItem("teachsam-user-session");
      if (savedUser) {
        try {
          return JSON.parse(savedUser).username;
        } catch {
          return "User";
        }
      }
      return "User"; // Default name user requested
    }
    return "User";
  });

  useEffect(() => {
    localStorage.setItem("teachsam-chathistories", JSON.stringify(chatHistories));
  }, [chatHistories]);

  // Auth synchronization listener for Google Gmail
  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (user, token) => {
        setGmailUser(user);
        setGmailToken(token);
        // Pre-fetch student inbox emails
        loadGmailInbox(token);
      },
      () => {
        setGmailUser(null);
        setGmailToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadGmailInbox = async (token: string, searchPhrase?: string) => {
    setIsGmailLoading(true);
    try {
      const items = await fetchLatestEmails(token, searchPhrase);
      setEmailsList(items);
    } catch (err) {
      console.error("Gmail loader failed:", err);
    } finally {
      setIsGmailLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (!authUsername || !authEmail || !authPassword) {
      setAuthError("Please fill out all fields.");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername,
          email: authEmail,
          password: authPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not register account.");
      }

      localStorage.setItem("teachsam-user-session", JSON.stringify(data));
      setUserName(data.username);
      localStorage.setItem("teachsam-username", data.username);
      setCurrentUser(data);

      // Instantly refresh lessons to fetch the empty vault for the new account!
      await loadLessons(true, data.email);

      setShowAuthModal(false);
      clearAuthForm();
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required.");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      localStorage.setItem("teachsam-user-session", JSON.stringify(data));
      setUserName(data.username);
      localStorage.setItem("teachsam-username", data.username);
      setCurrentUser(data);

      // Reload lessons spec for logged in account
      await loadLessons(true, data.email);

      // Restore last active lesson and concept bookmarks specifically
      if (data.activeLessonId) {
        setActiveLessonId(data.activeLessonId);
        localStorage.setItem("teachsam-active-lesson-id", data.activeLessonId);
      }
      if (data.activeConceptId) {
        setActiveConceptId(data.activeConceptId);
        localStorage.setItem("teachsam-active-concept-id", data.activeConceptId);
      }

      setShowAuthModal(false);
      clearAuthForm();
    } catch (err: any) {
      setAuthError(err.message || "Invalid credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("teachsam-user-session");
    setUserName("User");
    localStorage.setItem("teachsam-username", "User");
    setCurrentUser(null);
    loadLessons(true, ""); // Reset to generic guest list of lessons
  };

  const clearAuthForm = () => {
    setAuthUsername("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportFeedback.trim()) {
      alert("Please write your message or complaint first.");
      return;
    }
    setSupportSubmitting(true);
    setSupportSuccess(false);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: supportFeedback,
          email: supportEmail || currentUser?.email || "anonymous@learner.com"
        })
      });
      if (res.ok) {
        setSupportSuccess(true);
        setSupportFeedback("");
        setTimeout(() => {
          setShowSupportModal(false);
          setSupportSuccess(false);
        }, 3000);
      } else {
        alert("Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to the server.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  const triggerGmailSearch = () => {
    if (gmailToken) {
      loadGmailInbox(gmailToken, gmailSearchQuery);
    }
  };

  // Compose Notes HTML and deliver notes immediately through Gmail Send
  const handleComposeAndSendNotes = async (recipient: string, selectedLesson: Lesson) => {
    if (!gmailToken) {
      alert("Please connect Google Gmail on your profile first!");
      return;
    }
    if (!recipient.trim()) {
      alert("Please specify a valid recipient email.");
      return;
    }

    setIsSendingEmail(true);
    setGmailStatusMsg("");

    const rfcHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 4px solid #000; border-radius: 12px; background-color: #fcfcfc; box-shadow: 4px 4px 0px 0px #000;">
        <h2 style="color: #1e1f24; font-size: 24px; font-weight: 800; text-transform: uppercase;">TeachSam Study Companion</h2>
        <p style="color: #666; font-size: 14px;">Mastery notes compiled by <strong>${userName}</strong></p>
        <hr style="border: 2px solid #000; margin: 15px 0;" />
        <h3 style="font-size: 18px; font-weight: 800; color: #000;">Course Topic: ${selectedLesson.title}</h3>
        <p style="font-size: 13px; color: #555;">Subject Area: ${selectedLesson.subject}</p>
        <div style="font-size: 13px; color: #444; font-style: italic; background: #f4f4f5; padding: 12px; border-radius: 8px; border: 2px solid #e4e4e7;">
          "${selectedLesson.content.slice(0, 400)}..."
        </div>
        
        <h4 style="font-size: 15px; font-weight: 800; text-transform: uppercase; margin-top: 25px;">Explanations & Study Concept Road Map:</h4>
        ${selectedLesson.concepts.map(c => `
          <div style="border: 2px solid #000; padding: 12px; margin-bottom: 12px; border-radius: 8px; background: #fff;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #000;">
              [${c.status}] ${c.label}
            </div>
            <p style="font-size: 12px; color: #555; margin: 4px 0;">${c.description}</p>
            ${c.analogy ? `
              <div style="font-size: 12px; border-left: 4px solid #84cc16; padding-left: 10px; margin-top: 8px; font-style: italic; color: #1f2937;">
                <strong>Sam's Analogy:</strong> ${c.analogy}
              </div>
            ` : ""}
          </div>
        `).join("")}
        
        <p style="font-size: 11px; text-align: center; color: #999; margin-top: 30px;">Proudly delivered with TeachSam Feynman Tutor. Learn concepts by explaining them to a confused peer.</p>
      </div>
    `;

    try {
      const success = await sendGmailMessage(
        gmailToken,
        recipient.trim(),
        `Feynman Concept Roadmap: ${selectedLesson.title}`,
        rfcHtml
      );
      if (success) {
        setGmailStatusMsg("Study notes successfully mailed to your classmate!");
        setTimeout(() => setShowEmailModal(false), 2500);
      }
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Import Gmail text and populate as active Feynman lesson
  const handleImportGmailAsLesson = (msg: GmailMessage) => {
    if (!msg.bodyText && !msg.snippet) {
      alert("Constructing failed: selected message has no usable textual body.");
      return;
    }

    const confirmed = window.confirm(`Import study email snippet "${msg.subject}" as a new Feynman Study Lesson?`);
    if (!confirmed) return;

    // Fill the add lesson state and trigger modal insertion automatically!
    setNewTitle(msg.subject);
    setNewSubject(msg.sender.split("<")[0].trim() || "Gmail Intake");
    setNewContent(msg.bodyText || msg.snippet);
    setIsNewLessonModalOpen(true);
    
    // Smooth transition
    setCurrentTab("practice");
  };

  // Secure admin fetches
  const handleFetchAdminUsersList = async () => {
    setAdminError("");
    setAdminLoading(true);
    setAdminUsersReport([]);

    try {
      const secret = adminKeyInput.trim() || "supersecure-admin-token";
      const qMail = currentUser?.email || "";
      const res = await fetch(`/api/admin/users?adminSecret=${encodeURIComponent(secret)}&userEmail=${encodeURIComponent(qMail)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Administrative validation error.");
      }

      setAdminUsersReport(data.users || []);
    } catch (err: any) {
      setAdminError(err.message || "Failed to retrieve registered users.");
    } finally {
      setAdminLoading(false);
    }
  };

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

  // Active character state
  const [activeCharacterId, setActiveCharacterId] = useState<"sam" | "samantha" | "samson" | "sonny">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teachsam-selected-character");
      if (saved === "sam" || saved === "samantha" || saved === "samson" || saved === "sonny") {
        return saved;
      }
    }
    return "sam";
  });

  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

  const availableCharacters = [
    { id: "sam", name: "Sam", role: "Original", flow: "Patient & encouraging", color: "#84cc16", border: "#acf847", emoji: "🟢" },
    { id: "samantha", name: "Samantha", role: "The Empath", flow: "Nurturing & Socratic", color: "#ec4899", border: "#fbcfe8", emoji: "💜" },
    { id: "samson", name: "Samson", role: "Challenger", flow: "Tough-love STEM", color: "#f97316", border: "#fdba74", emoji: "🟠" },
    { id: "sonny", name: "Sonny", role: "Cool Peer", flow: "Casual & relatable", color: "#3b82f6", border: "#93c5fd", emoji: "🔵" },
  ] as const;

  const activeChar = availableCharacters.find(c => c.id === activeCharacterId) || availableCharacters[0];

  const availableThemeConfigs = {
    sam: {
      color: "#84cc16",
      colorLight: "#acf847",
      colorHover: "hover:bg-lime-600",
      textClass: "text-[#4d7c0f] dark:text-[#a3e635]",
      borderClass: "border-[#84cc16]",
      bgTheme: "bg-[#84cc16]",
      bgThemeHover: "hover:bg-lime-500",
      bgTheme10: "bg-[#84cc16]/10",
      bgTheme20: "bg-[#84cc16]/20",
      borderTheme20: "border-[#84cc16]/20",
      borderTheme30: "border-[#84cc16]/30",
      ringTheme20: "focus:ring-[#84cc16]/20",
      ringFocusWithin30: "focus-within:ring-[#84cc16]/30",
      borderFocusWithin40: "focus-within:border-[#84cc16]/40",
      borderFocusWithin50: "focus-within:border-[#84cc16]/50",
      focusBorder50: "focus:border-[#84cc16]/50",
      focusBorder: "focus:border-[#84cc16]",
      bgLightChip: "bg-lime-50 border-lime-200 text-[#4d7c0f] dark:bg-lime-950/25 dark:border-lime-900/45 dark:text-[#a3e635]",
      bgGradientR: "from-lime-500/10 via-emerald-500/5 to-transparent border-[#84cc16]/20",
      bgGradientRDark: "from-lime-500/10 via-emerald-555/5 to-transparent border-zinc-800",
      accentBgActive: "bg-[#acf847]/10 border-[#84cc16]"
    },
    samantha: {
      color: "#ec4899",
      colorLight: "#fbcfe8",
      colorHover: "hover:bg-pink-600",
      textClass: "text-[#be185d] dark:text-[#f472b6]",
      borderClass: "border-[#ec4899]",
      bgTheme: "bg-[#ec4899]",
      bgThemeHover: "hover:bg-pink-550",
      bgTheme10: "bg-[#ec4899]/10",
      bgTheme20: "bg-[#ec4899]/20",
      borderTheme20: "border-[#ec4899]/20",
      borderTheme30: "border-[#ec4899]/30",
      ringTheme20: "focus:ring-[#ec4899]/20",
      ringFocusWithin30: "focus-within:ring-[#ec4899]/30",
      borderFocusWithin40: "focus-within:border-[#ec4899]/40",
      borderFocusWithin50: "focus-within:border-[#ec4899]/50",
      focusBorder50: "focus:border-[#ec4899]/50",
      focusBorder: "focus:border-[#ec4899]",
      bgLightChip: "bg-pink-50 border-pink-205 text-[#be185d] dark:bg-pink-950/25 dark:border-pink-900/45 dark:text-[#f472b6]",
      bgGradientR: "from-pink-500/10 via-rose-500/5 to-transparent border-[#ec4899]/20",
      bgGradientRDark: "from-pink-500/10 via-rose-555/5 to-transparent border-zinc-800",
      accentBgActive: "bg-[#fbcfe8]/10 border-[#ec4899]"
    },
    samson: {
      color: "#f97316",
      colorLight: "#fdba74",
      colorHover: "hover:bg-orange-600",
      textClass: "text-[#c2410c] dark:text-[#fb923c]",
      borderClass: "border-[#f97316]",
      bgTheme: "bg-[#f97316]",
      bgThemeHover: "hover:bg-orange-550",
      bgTheme10: "bg-[#f97316]/10",
      bgTheme20: "bg-[#f97316]/20",
      borderTheme20: "border-[#f97316]/20",
      borderTheme30: "border-[#f97316]/30",
      ringTheme20: "focus:ring-[#f97316]/20",
      ringFocusWithin30: "focus-within:ring-[#f97316]/30",
      borderFocusWithin40: "focus-within:border-[#f97316]/40",
      borderFocusWithin50: "focus-within:border-[#f97316]/50",
      focusBorder50: "focus:border-[#f97316]/50",
      focusBorder: "focus:border-[#f97316]",
      bgLightChip: "bg-orange-50 border-orange-205 text-[#c2410c] dark:bg-orange-950/25 dark:border-orange-900/45 dark:text-[#fb923c]",
      bgGradientR: "from-orange-500/10 via-amber-500/5 to-transparent border-[#f97316]/20",
      bgGradientRDark: "from-orange-500/10 via-amber-555/5 to-transparent border-zinc-800",
      accentBgActive: "bg-[#fdba74]/10 border-[#f97316]"
    },
    sonny: {
      color: "#3b82f6",
      colorLight: "#93c5fd",
      colorHover: "hover:bg-blue-600",
      textClass: "text-[#1d4ed8] dark:text-[#60a5fa]",
      borderClass: "border-[#3b82f6]",
      bgTheme: "bg-[#3b82f6]",
      bgThemeHover: "hover:bg-blue-550",
      bgTheme10: "bg-[#3b82f6]/10",
      bgTheme20: "bg-[#3b82f6]/20",
      borderTheme20: "border-[#3b82f6]/20",
      borderTheme30: "border-[#3b82f6]/30",
      ringTheme20: "focus:ring-[#3b82f6]/20",
      ringFocusWithin30: "focus-within:ring-[#3b82f6]/30",
      borderFocusWithin40: "focus-within:border-[#3b82f6]/40",
      borderFocusWithin50: "focus-within:border-[#3b82f6]/50",
      focusBorder50: "focus:border-[#3b82f6]/50",
      focusBorder: "focus:border-[#3b82f6]",
      bgLightChip: "bg-blue-50 border-blue-205 text-[#1d4ed8] dark:bg-blue-950/25 dark:border-blue-900/45 dark:text-[#60a5fa]",
      bgGradientR: "from-blue-500/10 via-indigo-500/5 to-transparent border-[#3b82f6]/20",
      bgGradientRDark: "from-blue-500/10 via-indigo-555/5 to-transparent border-zinc-800",
      accentBgActive: "bg-[#93c5fd]/10 border-[#3b82f6]"
    }
  };

  const activeTheme = availableThemeConfigs[activeCharacterId] || availableThemeConfigs.sam;

  const handleCharacterChange = (char: "sam" | "samantha" | "samson" | "sonny") => {
    setActiveCharacterId(char);
    localStorage.setItem("teachsam-selected-character", char);
  };

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
  const loadLessons = async (preserveStates = true, userEmailHeader?: string) => {
    try {
      const emailToUse = userEmailHeader !== undefined ? userEmailHeader : (currentUser?.email || "");
      const resp = await fetch("/api/lessons", {
        headers: {
          "x-user-email": emailToUse
        }
      });
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

  const matchingConcepts = activeLesson
    ? activeLesson.concepts.filter(c => 
        c.label.toLowerCase().includes(conceptSearchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(conceptSearchQuery.toLowerCase()))
      )
    : [];

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
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
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
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
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
        let completeTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          completeTranscript += transcript;
        }

        if (completeTranscript.trim()) {
          setUserInput(completeTranscript);
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
        method: "POST",
        headers: {
          "x-user-email": currentUser?.email || ""
        }
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
              headers: { 
                "Content-Type": "application/json",
                "x-user-email": currentUser?.email || ""
              },
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
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
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
        await fetch("/api/lessons/reset", { 
          method: "POST",
          headers: {
            "x-user-email": currentUser?.email || ""
          }
        });
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
        theme={theme}
        onOpenSupport={() => setShowSupportModal(true)}
        activeCharacterId={activeCharacterId}
        onChangeCharacter={handleCharacterChange}
      />

      {/* Main Study Desk Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        {/* Global Action Header with search (Desktop only) */}
        <header className={`hidden lg:flex px-8 py-3.5 border-b items-center justify-between sticky top-0 z-10 shadow-sm ${theme === "dark" ? "bg-[#181920]/95 border-zinc-800 backdrop-blur" : "bg-white/95 border-zinc-200 backdrop-blur"}`}>
          <div className={`flex items-center gap-3 border px-4 py-2 rounded-full w-80 transition-all focus-within:ring-2 ${activeTheme.ringFocusWithin30} ${theme === "dark" ? `bg-[#121318] border-zinc-800 ${activeTheme.borderFocusWithin50}` : `bg-zinc-50 border-zinc-200 ${activeTheme.borderFocusWithin40}`}`}>
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search lessons to teach..." 
              className={`bg-transparent border-none text-xs font-semibold w-full outline-none ${theme === "dark" ? "text-white placeholder-zinc-500" : "text-black placeholder-zinc-400"}`} 
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Day/Night Theme Toggler represented by Moon/Sun */}
            <button
              id="theme-toggler-btn"
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              title="Toggle Day/Night mode"
              className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 duration-150
                ${theme === "dark" ? "bg-amber-400 hover:bg-amber-300 border-amber-500 text-black" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"}`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick stats indicators */}
            <div className="flex gap-2">
              <span className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 shadow-sm ${theme === "dark" ? "bg-orange-500/10 border-orange-550/30 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
                🔥 {streakCount} DAY STREAK
              </span>
            </div>

            {/* Account widget */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className={`px-3.5 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold shadow-sm ${theme === "dark" ? "bg-[#84cc16]/10 border-[#84cc16]/20 text-[#a3e635]" : "bg-lime-50 border-lime-200 text-[#4d7c0f]"}`}>
                  🎓 {currentUser.username}
                </span>
                <button
                  onClick={handleSignOut}
                  className={`border px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer hover:scale-101 active:scale-99
                    ${theme === "dark" ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-white" : "bg-white border-zinc-255 hover:bg-zinc-50 text-zinc-700"}`}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode("register");
                    clearAuthForm();
                    setShowAuthModal(true);
                  }}
                  className="bg-[#84cc16] hover:bg-lime-500 text-black border border-lime-600 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-101 active:scale-99"
                >
                  Register
                </button>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    clearAuthForm();
                    setShowAuthModal(true);
                  }}
                  className={`border px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-101 active:scale-99 ${theme === "dark" ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-750" : "bg-white border-zinc-250 text-black hover:bg-zinc-50"}`}
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Quick Reset Settings DB Option */}
            <button
              id="reset-state-btn"
              onClick={handleResetData}
              title="Reset state data"
              className={`border px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 hover:scale-101 active:scale-99
                ${theme === "dark" ? "bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/40" : "bg-red-50/50 border-red-150 text-red-650 hover:bg-red-50 hover:text-red-700"}`}
            >
              <RefreshCw className="w-3 h-3 animate-duration-1000" />
              Reset Data
            </button>
          </div>
        </header>

        {/* Mobile/Tablet Action Header */}
        <header className={`lg:hidden px-4 md:px-8 py-3.5 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm ${theme === "dark" ? "bg-[#121318]/95 border-zinc-800 backdrop-blur" : "bg-white/95 border-zinc-200 backdrop-blur"}`}>
          <div className="flex items-center gap-2 relative">
            <button 
              id="character-toggle-mobile"
              onClick={() => setMobileDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 focus:outline-none p-1 rounded-xl transition-all hover:bg-zinc-100/30 dark:hover:bg-zinc-805/30 cursor-pointer"
            >
              <AvatarMascot expression={mascotExpression} size="sm" character={activeCharacterId} />
              <span className={`text-sm font-black tracking-tight uppercase flex items-center gap-1 ${theme === "dark" ? "text-white" : "text-black"}`}>
                Teach {activeChar.name} <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* Mobile Switch Dropdown */}
            {mobileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileDropdownOpen(false)} />
                <div className={`absolute top-[110%] left-0 z-50 border-4 border-black rounded-xl p-2 w-56 shadow-[4px_4px_0px_0px_#000] text-left select-none text-black ${theme === "dark" ? "bg-[#181922] text-white" : "bg-white text-black"}`}>
                  <p className={`text-[9px] font-black uppercase tracking-wider px-2 pb-1.5 border-b mb-1 ${theme === "dark" ? "text-zinc-400 border-zinc-820" : "text-zinc-500 border-zinc-200"}`}>
                    Switch Study Buddy
                  </p>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {availableCharacters.map((char) => {
                      const isCur = char.id === activeCharacterId;
                      return (
                        <button
                          key={char.id}
                          onClick={() => {
                            handleCharacterChange(char.id);
                            setMobileDropdownOpen(false);
                          }}
                          className={`w-full text-left p-1.5 rounded-lg transition-all cursor-pointer border border-transparent flex items-center gap-2
                            ${isCur 
                              ? theme === "dark" 
                                ? "bg-zinc-800 border-zinc-705 text-white" 
                                : "bg-zinc-100 border-zinc-200 text-black font-black"
                              : theme === "dark"
                                ? "hover:bg-zinc-805 text-zinc-300"
                                : "hover:bg-zinc-50 text-zinc-700"
                            }`}
                        >
                          <div 
                            className="w-6 h-6 rounded-full border border-black flex items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: char.color }}
                          >
                            <span className="text-[10px]">{char.emoji}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black">{char.name}</p>
                            <p className={`text-[8px] truncate ${theme === "dark" ? "text-zinc-450" : "text-zinc-450"}`}>{char.flow}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-[10px] font-bold border rounded-full shadow-sm ${theme === "dark" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
              🔥 {streakCount}d
            </span>
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className={`p-1.5 rounded-full border transition-all cursor-pointer flex items-center justify-center hover:scale-105
                ${theme === "dark" ? "bg-amber-400 border-amber-500 text-black" : "bg-zinc-100 border-zinc-200 text-zinc-700"}`}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* View Routing depending on Tab */}
        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
            {/* TAB 1: PRACTICE VIEW (Chat & Interactive Graph Map) */}
          {currentTab === "practice" && (
            <div className="space-y-6">
              {/* Segmented control for mobile/tablet to switch between Chat and Map */}
              <div className={`xl:hidden flex gap-1.5 p-1 border rounded-xl sticky top-14 z-20 backdrop-blur-md ${theme === "dark" ? "bg-[#121318]/90 border-zinc-800" : "bg-zinc-100/90 border-zinc-200"}`}>
                <button
                  onClick={() => setMobilePracticeView("chat")}
                  className={`flex-1 py-2 text-xs font-bold uppercase text-center rounded-lg transition-all cursor-pointer ${mobilePracticeView === "chat" ? "bg-[#84cc16]/20 text-[#4d7c0f] border border-[#84cc16]/30 shadow-sm" : theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
                >
                  💬 Chat explaining Sam
                </button>
                <button
                  onClick={() => setMobilePracticeView("map")}
                  className={`flex-1 py-2 text-xs font-bold uppercase text-center rounded-lg transition-all cursor-pointer ${mobilePracticeView === "map" ? "bg-[#84cc16]/20 text-[#4d7c0f] border border-[#84cc16]/30 shadow-sm" : theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}
                >
                  🗺️ Progress Map
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Hello Welcome Banner + Concept Chat Desk (8 cols) */}
                <div className={`xl:col-span-7 flex flex-col gap-6 ${mobilePracticeView === "chat" ? "flex" : "hidden xl:flex"}`}>
                
                {/* Visual Mascot Intro banner */}
                <div className={`border rounded-3xl p-6 relative overflow-hidden flex items-center gap-6 shadow-sm transition-all hover:shadow-md ${theme === "dark" ? "bg-gradient-to-r from-lime-500/10 via-emerald-555/5 to-transparent border-zinc-800" : "bg-gradient-to-r from-lime-500/10 via-emerald-500/5 to-transparent border-[#84cc16]/20"}`}>
                  <div className="absolute right-0 bottom-[-15px] opacity-10">
                    <BookOpen className="w-48 h-48 rotate-12 text-lime-600" />
                  </div>
                  
                  <AvatarMascot expression={mascotExpression} size="md" character={activeCharacterId} />

                  <div className="flex-1 relative z-10">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider border
                      ${theme === "dark" ? "bg-zinc-900 border-zinc-800 text-[#a3e635]" : "bg-lime-50 border-lime-200 text-lime-700"}`}>
                      Feynman Teaching Mode
                    </span>
                    <h2 className={`text-xl font-extrabold tracking-tight mt-2 ${theme === "dark" ? "text-white" : "text-black"}`}>
                      {activeLesson ? `Teaching: ${activeLesson.title}` : "Select a topic in the Vault!"}
                    </h2>
                    <p className={`text-xs mt-1 leading-relaxed font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-605"}`}>
                      {activeChar.name} is ready. Break down the highlighted concept below in plain-English analogy to enlighten {activeCharacterId === "samantha" ? "her" : "him"}!
                    </p>
                  </div>
                </div>

                {/* Main Interactive Chat Panel */}
                <div id="chat-workspace-card" className={`border rounded-3xl shadow-md hover:shadow-lg transition-shadow flex flex-col h-[520px] overflow-hidden ${theme === "dark" ? "bg-[#181920] border-zinc-800" : "bg-white border-zinc-200"}`}>
                  
                  {/* Chat Header showing Active lesson & Badge details */}
                  <div className={`px-4 md:px-6 py-3 border-b flex items-center justify-between ${theme === "dark" ? "bg-[#0e0f12]/80 border-zinc-805" : "bg-slate-50/80 border-slate-100"}`}>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                      <span className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>
                        Active Feed
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsNewLessonModalOpen(true)}
                        title="Create and ingest a brand new custom study lesson!"
                        className={`text-[9.5px] font-bold uppercase px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95
                          ${theme === "dark" ? "bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"}`}
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">New Lesson</span>
                      </button>

                      <button
                        onClick={handleNewTopicDiscussion}
                        title="Start a fresh chat discussion on this topic with Sam!"
                        className={`text-[9.5px] font-bold uppercase px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95
                          ${theme === "dark" ? "bg-[#84cc16]/10 hover:bg-[#84cc16]/20 border-[#84cc16]/30 text-[#a3e635]" : "bg-white text-black border-zinc-200 hover:bg-slate-50"}`}
                      >
                        <Sparkle className="w-3.5 h-3.5 animate-pulse shrink-0 text-[#84cc16]" />
                        <span className="hidden sm:inline">New Topic</span>
                      </button>

                      {activeLesson && (
                        <button
                          onClick={() => {
                            if (!gmailToken) {
                              alert("Please connect Google Gmail on your Profile tab first!");
                              return;
                            }
                            setRecipientEmail("");
                            setGmailStatusMsg("");
                            setShowEmailModal(true);
                          }}
                          title={gmailToken ? "Mail these lesson nodes and analogies to a classmate over Gmail!" : "Connect Gmail on your Profile tab to mail study notes."}
                          className={`text-[9.5px] font-bold uppercase px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95
                            ${gmailToken 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" 
                              : "bg-zinc-100 border-zinc-200 text-gray-400 opacity-60 pointer-events-none"}`}
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Mail Notes</span>
                        </button>
                      )}

                      <span className={`font-bold text-[10px] px-2.5 py-1 rounded-full border truncate shrink-0 max-w-[80px] md:max-w-none text-center
                        ${theme === "dark" ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-650"}`}>
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
                                <AvatarMascot expression={mascotExpression} size="sm" character={activeCharacterId} />
                              </div>
                            )}

                            <div className="max-w-[85%] flex flex-col gap-1">
                              <div className={`px-4 py-3 rounded-2xl border font-semibold text-xs leading-relaxed transition-all shadow-sm
                                ${isSam 
                                  ? (theme === "dark" ? "bg-[#181920] border-zinc-800 text-zinc-200 rounded-tl-none" : "bg-white border-zinc-200 text-zinc-800 rounded-tl-none") 
                                  : `${activeTheme.bgTheme10} ${activeTheme.borderTheme30} rounded-tr-none ${activeTheme.textClass}`
                                }`}
                              >
                                <p className="whitespace-pre-line text-xs font-semibold">{msg.text}</p>
                                
                                {/* If message has evaluated rating and analogies, show it only when toggled! */}
                                {msg.evaluation && (msg.evaluation.analogyText || (msg.evaluation.missingPoints && msg.evaluation.missingPoints.length > 0)) && (
                                  <div className="mt-3.5 text-left">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedAnalogies(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9.5px] uppercase tracking-wide font-extrabold transition-all cursor-pointer select-none active:scale-95 shadow-sm
                                        ${expandedAnalogies[msg.id]
                                          ? "bg-zinc-205 text-zinc-805 border-zinc-300" 
                                          : theme === "dark" ? "bg-amber-400 text-black hover:bg-amber-305 border-amber-500" : "bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200"
                                        }`}
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300 shrink-0" />
                                      {expandedAnalogies[msg.id] ? "Hide Sam's Analogy" : "💡 Need an Analogy?"}
                                    </button>

                                    {expandedAnalogies[msg.id] && (
                                      <div className={`mt-3 pt-3 border-t p-2.5 flex flex-col gap-2 rounded-xl border-dashed
                                        ${theme === "dark" ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-zinc-100/30"}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border
                                            ${theme === "dark" ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700"}`}>
                                            Analogy Box
                                          </span>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border
                                            ${msg.evaluation.clarity === "Excellent" ? "bg-emerald-500/10 text-emerald-805 border-emerald-500/20" : "bg-amber-500/10 text-amber-805 border-amber-500/20"}`}
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
                                            <p className="text-[10px] font-bold uppercase text-red-500 flex items-center gap-1">
                                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Missing Bits in explanation:
                                            </p>
                                            <ul className={`list-disc pl-4 mt-1 text-[11px] font-bold space-y-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
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
                      <div className={`h-full flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-3xl ${theme === "dark" ? "bg-[#101115] border-zinc-800 text-gray-400" : "bg-slate-50 border-gray-200 text-zinc-500"}`}>
                        <BookOpen className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="font-extrabold text-sm">No Lesson active right now.</p>
                        <p className="text-xs font-bold text-gray-450 mt-1">Visit the Vault tab with textbook chapters to initialize a Feynman quiz!</p>
                      </div>
                    )}

                    {isEvaluating && (
                      <div className="flex gap-3 items-start justify-start">
                        <AvatarMascot expression="thinking" size="sm" character={activeCharacterId} />
                        <div className={`px-4 py-3 rounded-2xl rounded-tl-none border shadow-sm flex items-center gap-2 ${theme === "dark" ? "bg-[#1c1d24] border-zinc-800" : "bg-slate-100 border-zinc-200"}`}>
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: activeTheme.color }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '150ms', backgroundColor: activeTheme.color }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '300ms', backgroundColor: activeTheme.color }} />
                          <span className="text-[10px] text-zinc-500 font-bold uppercase ml-1">{activeChar.name} is Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input Box with audio recorders */}
                  <div className={`p-4 border-t flex items-center gap-3 ${theme === "dark" ? "bg-[#1c1d24] border-zinc-805" : "bg-zinc-50/50 border-zinc-200"}`}>
                    <button
                      id="mic-btn"
                      onClick={startRecording}
                      disabled={isEvaluating}
                      title="Explain via voice simulation"
                      className={`p-3 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-95
                        ${theme === "dark" 
                          ? `bg-zinc-800 hover:bg-zinc-750 border-zinc-700 ${activeTheme.textClass}` 
                          : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-750"}`}
                    >
                      <Mic className="w-4 h-4 shrink-0" />
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
                      className={`p-3 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-95
                        ${theme === "dark" 
                          ? "bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-[#38bdf8]" 
                          : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-750"}`}
                    >
                      {isParsingFile ? (
                        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4 shrink-0" />
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
                        className={`w-full border font-semibold text-xs py-3 px-4 rounded-xl outline-none transition-all placeholder-zinc-400 focus:ring-2 ${activeTheme.ringTheme20} ${theme === "dark" ? `bg-[#121318] border-zinc-800 text-white ${activeTheme.borderFocusWithin50}` : `bg-white border-zinc-200 text-black ${activeTheme.focusBorder}`}`}
                      />
                    </div>

                    <button
                      id="send-msg-btn"
                      onClick={() => handleSendMessage()}
                      disabled={!userInput.trim() || isEvaluating || !activeLessonId}
                      className={`text-black px-4.5 py-3 rounded-xl font-bold border shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 text-xs ${activeTheme.bgTheme} ${activeTheme.bgThemeHover} border-black/40`}
                    >
                      <span className="hidden sm:inline font-bold uppercase text-[10px] tracking-wide">Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Lecture Progress Map Visual roadmap (5 cols) */}
              <div className={`xl:col-span-5 flex flex-col gap-6 ${mobilePracticeView === "map" ? "flex" : "hidden xl:flex"}`}>
                    {/* Visual Roadmap Card representing Mermaid concept layout */}
                <div className={`border rounded-3xl p-6 shadow-md transition-shadow ${theme === "dark" ? "bg-[#181920] border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-zinc-850"}`}>
                    <BrainCircuit className="w-4 h-4 text-[#84cc16]" />
                    Lecture Progress Map
                  </h3>
                  <p className={`text-xs font-semibold mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Click concept milestones to preview references. Green nodes are mastered!
                  </p>

                  {/* Search Bar to quickly jump/locate any concept node */}
                  {activeLesson && activeLesson.concepts.length > 0 && (
                    <div className="mt-4 relative">
                      <div className={`flex items-center gap-2.5 border px-3.5 py-2 rounded-xl transition-all ${theme === "dark" ? "bg-[#121318] border-zinc-800 focus-within:border-zinc-700" : "bg-zinc-50 border-zinc-200 focus-within:border-zinc-350"}`}>
                        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          value={conceptSearchQuery}
                          onChange={(e) => setConceptSearchQuery(e.target.value)}
                          placeholder="Search and jump to any concept..."
                          className={`bg-transparent border-none text-xs font-semibold w-full outline-none ${theme === "dark" ? "text-white placeholder-zinc-500" : "text-zinc-750 placeholder-zinc-400"}`}
                        />
                        {conceptSearchQuery && (
                          <button
                            onClick={() => setConceptSearchQuery("")}
                            className={`p-1 rounded-full cursor-pointer hover:bg-zinc-200 ${theme === "dark" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-650"}`}
                            title="Clear search"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Auto-Suggest Panel */}
                      {conceptSearchQuery.trim().length > 0 && (
                        <div className={`absolute left-0 right-0 mt-2 border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto ${theme === "dark" ? "bg-[#181920] border-zinc-850" : "bg-white border-zinc-200"}`}>
                          {matchingConcepts.length > 0 ? (
                            <div className="p-1 space-y-0.5">
                              {matchingConcepts.map((node) => {
                                const isSelected = activeConceptId === node.id;
                                return (
                                  <button
                                    key={node.id}
                                    onClick={() => {
                                      setActiveConceptId(node.id);
                                      localStorage.setItem("teachsam-active-concept-id", node.id);
                                      setConceptSearchQuery("");
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between hover:bg-[#84cc16]/10 cursor-pointer border border-transparent
                                      ${isSelected 
                                        ? "bg-[#84cc16]/10 border-[#84cc16]/20" 
                                        : ""
                                      } ${theme === "dark" ? "text-zinc-300" : "text-zinc-700"}`}
                                  >
                                    <div className="flex flex-col gap-0.5 text-left">
                                      <span className="font-bold text-[11px] uppercase tracking-wide">{node.label}</span>
                                      {node.description && (
                                        <span className={`text-[10px] font-medium truncate max-w-[200px] ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}>
                                          {node.description}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-full border
                                      ${node.status === "unlocked" ? "bg-green-500/10 border-green-500/20 text-green-600" : node.status === "active" ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-zinc-100 border-zinc-150 text-zinc-400"}`}>
                                      {node.status}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-xs font-bold text-zinc-400 italic">
                              No matching concepts found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flow Map Visual Container */}
                  <div className={`mt-6 border border-dashed rounded-2xl p-6 flex flex-col gap-4 relative min-h-[360px] justify-center ${theme === "dark" ? "border-zinc-800 bg-[#121318]/50" : "border-zinc-200 bg-zinc-50/20"}`}>
                    
                    {activeLesson ? (
                      (() => {
                        const activeHistory = chatHistories[activeLessonId] || [];
                        const userHasStartedLecturing = activeHistory.some(m => m.sender === "user");

                        if (!userHasStartedLecturing) {
                          return (
                            <div className="text-center p-6 flex flex-col items-center justify-center gap-3 py-10">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm animate-pulse border
                                ${theme === "dark" ? "bg-amber-950/20 border-amber-900/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                                <BrainCircuit className="w-5 h-5" />
                              </div>
                              <h4 className={`text-xs font-extrabold uppercase tracking-wider ${theme === "dark" ? "text-white" : "text-zinc-800"}`}>
                                Map Pending Lecture
                              </h4>
                              <p className={`text-xs font-semibold max-w-xs leading-relaxed ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
                                Start explaining this topic in the chat feed to assemble Sam's live progress map! The nodes will unlock dynamically based on your instructions.
                              </p>
                            </div>
                          );
                        }

                        // Display dynamic map based on the conversation
                        return activeLesson.concepts.map((node, index) => {
                          const isUnlocked = node.status === "unlocked";
                          const isActive = node.status === "active";
                          const isSelected = activeConceptId === node.id;
                          const isSearched = conceptSearchQuery.trim().length > 0 && (
                            node.label.toLowerCase().includes(conceptSearchQuery.toLowerCase()) ||
                            (node.description && node.description.toLowerCase().includes(conceptSearchQuery.toLowerCase()))
                          );

                          // Extract the exact analogy Sam gave in response to unlocking or explaining this concept
                          const relevantSamMsg = activeHistory.find(
                            m => m.sender === "sam" && m.evaluation && (m.evaluation.unlockedConceptIds?.includes(node.id) || activeConceptId === node.id)
                          );
                          const conceptAnalogy = relevantSamMsg?.evaluation?.analogyText;

                          return (
                            <div key={node.id} className="flex flex-col items-center w-full">
                              {/* Connection Arrow */}
                              {index > 0 && (
                                <div className={`h-5 w-[2px] my-0.5 border-l border-dashed ${theme === "dark" ? "border-zinc-800" : "border-zinc-300"}`} />
                              )}
                              
                              {/* Concept Node */}
                              <button
                                id={`concept-node-${node.id}`}
                                onClick={() => {
                                  setActiveConceptId(node.id);
                                  localStorage.setItem("teachsam-active-concept-id", node.id);
                                }}
                                className={`w-full max-w-sm px-4.5 py-3 rounded-xl border text-left transition-all relative flex flex-col gap-1.5 cursor-pointer select-none
                                  ${isUnlocked 
                                    ? "bg-green-500/5 hover:bg-green-500/10 border-green-200 text-green-700" 
                                    : isActive
                                      ? theme === "dark"
                                        ? "bg-zinc-850 hover:bg-zinc-800 border-zinc-650 text-white ring-2 ring-lime-505"
                                        : "bg-white hover:bg-zinc-50 border-zinc-350 text-black ring-2 ring-[#84cc16]/50 shadow-sm"
                                      : theme === "dark"
                                        ? "bg-[#14151a]/60 border-zinc-900 text-zinc-600 opacity-50"
                                        : "bg-zinc-100/60 border-zinc-150 text-zinc-400 opacity-60"
                                  }
                                  ${isSelected ? "scale-[1.01] border-[#84cc16]/60 shadow-md" : ""}
                                  ${isSearched ? "ring-2 ring-amber-405 border-amber-500 !opacity-100 animate-pulse" : ""}
                                `}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2.5">
                                    {/* Badge state index */}
                                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold
                                      ${isUnlocked 
                                        ? "bg-green-100 border-green-300 text-green-700" 
                                        : isActive
                                          ? "bg-lime-105 border-lime-300 text-lime-800 font-extrabold bg-lime-100"
                                          : "bg-zinc-100 border-zinc-200 text-zinc-400"
                                      }`}
                                    >
                                      {index + 1}
                                    </span>

                                    <div>
                                      <h4 className={`text-xs font-bold uppercase ${theme === "dark" && !isUnlocked ? "text-zinc-300" : "text-zinc-850"}`}>
                                        {node.label}
                                      </h4>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {isUnlocked ? (
                                      <span className="bg-green-500/10 border border-green-500/20 text-green-650 px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase">
                                        Mastered
                                      </span>
                                    ) : isActive ? (
                                      <span className="bg-lime-500/10 border border-lime-500/20 text-[#4d7c0f] px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase animate-pulse">
                                        Teaching
                                      </span>
                                    ) : (
                                      <span className="text-[8.5px] font-semibold text-zinc-400 uppercase tracking-tight border border-zinc-200 px-1.5 py-0.5 rounded">
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Dynamic content based of the conversation */}
                                {isUnlocked && conceptAnalogy ? (
                                  <div className="text-[10px] p-2.5 rounded-lg bg-green-500/5 border border-green-200 border-dashed text-green-700 dark:text-green-300 mt-1">
                                    <p className="font-extrabold uppercase text-[9px] mb-0.5 text-green-650">💡 Chat-Formed Analogy:</p>
                                    <p className="italic">"{conceptAnalogy}"</p>
                                  </div>
                                ) : (
                                  <p className={`text-[10px] font-semibold mt-1 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"} truncate max-w-[280px]`}>
                                    {node.description}
                                  </p>
                                )}
                              </button>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-center font-semibold text-zinc-400 text-xs py-8">
                        No conceptual roadmap parsed. Setup a study file!
                      </div>
                    )}
                  </div>

                  {/* Active Concept Card Details in footer */}
                  {activeConceptId && activeLesson && (
                    <div className={`mt-6 border rounded-2xl p-4 relative shadow-sm ${theme === "dark" ? "bg-zinc-950/20 border-zinc-800" : "bg-amber-50/25 border-amber-100"}`}>
                      <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-[8.5px] font-bold rounded border uppercase
                        ${theme === "dark" ? "bg-zinc-800 border-zinc-700 text-zinc-350" : "bg-white border-amber-200/50 text-amber-800"}`}>
                        Reference Guide
                      </span>
                      {(() => {
                        const targetNode = activeLesson.concepts.find(c => c.id === activeConceptId);
                        return (
                          <>
                            <h4 className="text-xs font-extrabold uppercase text-amber-900 flex items-center gap-1 mt-1">
                              📖 {targetNode?.label || "Active Concept Guide"}
                            </h4>
                            <p className={`text-xs leading-relaxed font-semibold mt-2.5 border-l-2 pl-3 mb-3.5
                              ${theme === "dark" ? "border-[#84cc16] text-zinc-350" : "border-[#84cc16] text-slate-650"}`}>
                              {targetNode?.description || "Select a concept milestone node in the graph above to highlight specific key mechanisms!"}
                            </p>
                            <button
                              id="explain-concept-btn"
                              onClick={handleExplainConcept}
                              disabled={isEvaluating}
                              title="Struggling to figure it out? Ask Sam to explain this concept details!"
                              className={`w-full font-bold text-[10.5px] py-2 px-3.5 uppercase border rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95
                                ${theme === "dark"
                                  ? "bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-750"
                                  : "bg-amber-100/55 hover:bg-amber-100 text-amber-900 border-amber-200"}`}
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
                    <div className={`border p-4 rounded-2xl shadow-sm ${theme === "dark" ? "bg-[#121318]/50 border-zinc-800" : "bg-zinc-50/50 border-zinc-100"}`}>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Lesson Mastery</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-lg font-black">{activeLesson?.progress || 0}%</span>
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"}`}>
                          <div 
                            className="bg-[#84cc16] h-full rounded-full" 
                            style={{ width: `${activeLesson?.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`border p-4 rounded-2xl shadow-sm ${theme === "dark" ? "bg-[#121318]/50 border-zinc-800" : "bg-zinc-50/50 border-zinc-100"}`}>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Target Audience</span>
                      <p className="text-xs font-bold text-lime-600 mt-1 uppercase flex items-center gap-1">
                        🎓 Confused Buddy (Sam)
                      </p>
                    </div>
                  </div>

                </div>

                {/* Daily Goals Panel matching screen 1 Mockup */}
                <div className={`border rounded-3xl p-6 shadow-md ${theme === "dark" ? "bg-[#181920]/40 border-zinc-800" : "bg-white border-zinc-200"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-zinc-800"}`}>
                      <Award className="w-4 h-4 text-amber-500" />
                      Daily Goals
                    </h3>
                    <span className={`text-[10px] font-bold border px-3 py-0.5 rounded-full ${theme === "dark" ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-600"}`}>
                      {dailyGoals.filter(g => g.completed).length}/{dailyGoals.length} completed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dailyGoals.map((goal) => (
                      <div 
                        key={goal.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${theme === "dark" ? "bg-[#121318]/40 border-zinc-800" : "bg-zinc-50/50 border-zinc-100"}`}
                      >
                        <button
                          id={`goal-checkbox-${goal.id}`}
                          onClick={() => {
                            setDailyGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g));
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-extrabold transition-all cursor-pointer active:scale-90
                            ${goal.completed 
                              ? "bg-[#84cc16] border-[#84cc16] text-black" 
                              : theme === "dark" ? "bg-zinc-955 border-zinc-800" : "bg-white border-zinc-250"}`}
                        >
                          {goal.completed && "✓"}
                        </button>
                        <span className={`text-xs font-semibold ${goal.completed ? "line-through text-zinc-400" : theme === "dark" ? "text-zinc-300" : "text-zinc-700"}`}>
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
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-black
                                ${isCompleted ? "bg-[#acf847] text-black" : "bg-amber-100 text-amber-800"}`}
                              >
                                {lesson.status}
                              </span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${lesson.title}" study roadmap?`)) {
                                    try {
                                      const resp = await fetch(`/api/lessons/${lesson.id}`, {
                                        method: "DELETE",
                                        headers: {
                                          "x-user-email": currentUser?.email || ""
                                        }
                                      });
                                      if (resp.ok) {
                                        const result = await resp.json();
                                        setLessons(result.lessons);
                                        // If deleted the active lesson, reset select
                                        if (activeLessonId === lesson.id && result.lessons.length > 0) {
                                          setActiveLessonId(result.lessons[0].id);
                                        } else if (result.lessons.length === 0) {
                                          setActiveLessonId(null);
                                        }
                                      } else {
                                        alert("Failed to delete study material.");
                                      }
                                    } catch (err) {
                                      console.error("Error deleting:", err);
                                    }
                                  }
                                }}
                                title="Delete study material"
                                className="p-1 rounded-md border-2 border-black bg-rose-500 hover:bg-rose-400 text-white shadow-[1px_1px_0px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all cursor-pointer flex items-center justify-center"
                              >
                                <Trash2 className="w-3 px-0 h-3 text-white" />
                              </button>
                            </div>
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
              userEmail={currentUser?.email || ""}
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

                    {currentUser ? (
                      <div className="pt-2 text-[11.5px] font-extrabold text-emerald-600 flex items-center gap-1.5 justify-center md:justify-start">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-emerald-700" />
                        <span>Cloud Sync Active: <strong className="font-black underline">{currentUser.email}</strong></span>
                      </div>
                    ) : (
                      <div className="pt-2 text-[11px] font-bold text-amber-600 flex items-center gap-1.5 justify-center md:justify-start leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span>Unregistered session. <button onClick={() => { setAuthMode("register"); clearAuthForm(); setShowAuthModal(true); }} className="text-blue-600 hover:text-blue-800 hover:underline font-black outline-none cursor-pointer">Register Profile</button> to preserve study achievements.</span>
                      </div>
                    )}
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

                {/* Gmail Integration Panel */}
                <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] space-y-5 ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className={`text-lg font-black tracking-tight ${theme === "dark" ? "text-white" : "text-black"}`}>
                        Google Gmail Connection
                      </h3>
                      <p className={`text-xs font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Extract source transcripts from emails or dispatch Feynman summaries.
                      </p>
                    </div>

                    {gmailUser ? (
                      <button
                        onClick={async () => {
                          await logoutGmail();
                          setGmailUser(null);
                          setGmailToken(null);
                          setEmailsList([]);
                          setGmailAuthError(null);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-650 border-2 border-red-200 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                      >
                        Disconnect Gmail
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setGmailAuthError(null);
                          try {
                            const res = await loginWithGmail();
                            if (res) {
                              setGmailUser(res.user);
                              setGmailToken(res.accessToken);
                              loadGmailInbox(res.accessToken);
                            }
                          } catch (err: any) {
                            console.error("Popup Error detail:", err);
                            setGmailAuthError(err.message || String(err));
                          }
                        }}
                        className="bg-white hover:bg-zinc-50 text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.96 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Connect Google Account
                      </button>
                    )}
                  </div>

                  {gmailAuthError && (
                    <div className="border-4 border-amber-500 bg-amber-50/90 text-amber-950 p-5 rounded-2xl shadow-[3px_3px_0px_0px_#f59e0b] space-y-3.5 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl">⚠️</span>
                        <div>
                          <h4 className="font-extrabold text-[13px] tracking-tight text-amber-900">
                            Browser Sandbox Security Limit Intercepted
                          </h4>
                          <p className="mt-1 font-medium leading-relaxed text-[11px] text-amber-900/90">
                            Because you are testing the app embedded inside the AI Studio review frame (iframe), 
                            your browser blocks standard cross-origin popup operations and third-party security cookies.
                          </p>
                        </div>
                      </div>

                      <div className="bg-amber-100/80 border border-amber-300 p-3 rounded-xl space-y-1.5 text-[10.5px] font-bold text-amber-900">
                        <p className="underline uppercase tracking-wide text-[9px] font-black text-amber-850">To connect your Gmail account successfully:</p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                          <li>Click <strong className="font-black">Open App in New Tab ↗</strong> below.</li>
                          <li>In the new standalone window, navigate to the <strong className="font-semibold">Profile</strong> tab.</li>
                          <li>Click <strong className="font-semibold">Connect Google Account</strong> to grant read-only syllabus transcripts and study note access flawlessly!</li>
                        </ol>
                      </div>

                      <div className="flex items-center gap-2 pt-1 font-black">
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all inline-flex items-center gap-1.5 cursor-pointer hover:no-underline"
                        >
                          <span>Open App in New Tab ↗</span>
                        </a>
                        <button
                          onClick={() => setGmailAuthError(null)}
                          className="bg-white hover:bg-amber-100 text-black px-3.5 py-2 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                        >
                          Dismiss Notice
                        </button>
                      </div>
                    </div>
                  )}

                  {gmailUser ? (
                    <div className="space-y-4">
                      {/* Connection status tag */}
                      <div className="bg-indigo-50 border-2 border-indigo-200 p-3 rounded-xl text-xs font-semibold text-indigo-850 flex items-center justify-between">
                        <span>Authorized user: <strong className="font-mono">{gmailUser.email}</strong></span>
                        <span className="bg-[#84cc16] text-black text-[9px] font-black px-2 py-0.5 rounded border border-black">ACTIVE</span>
                      </div>

                      {/* Search messages bar */}
                      <div className="flex gap-2.5">
                        <div className={`flex items-center gap-2 border-4 border-black px-4 py-2 rounded-xl flex-1 shadow-[2px_2px_0px_0px_#000] ${theme === "dark" ? "bg-[#121318]" : "bg-slate-50"}`}>
                          <input
                            type="text"
                            value={gmailSearchQuery}
                            onChange={(e) => setGmailSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && triggerGmailSearch()}
                            placeholder="Search inbox by sender, subject expression, label..."
                            className={`bg-transparent border-none text-xs font-black w-full outline-none ${theme === "dark" ? "text-white" : "text-black"}`}
                          />
                        </div>
                        <button
                          onClick={triggerGmailSearch}
                          className="bg-[#84cc16] hover:bg-lime-500 text-black font-black text-xs px-5 py-2 rounded-xl border-4 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer shrink-0"
                        >
                          Find Emails
                        </button>
                      </div>

                      {/* Emails list */}
                      <div className="space-y-3">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${theme === "dark" ? "text-gray-300" : "text-gray-550"}`}>
                          Latest Inbox Study Material Candidates
                        </h4>

                        {isGmailLoading ? (
                          <div className="p-12 border-4 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-center">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                            <p className="text-xs font-bold text-gray-400">Loading your Google Workspace emails safely...</p>
                          </div>
                        ) : emailsList.length === 0 ? (
                          <p className="text-xs font-bold text-gray-400 text-center py-6 border-4 border-dashed border-zinc-200 rounded-2xl">
                            No matching emails located. Try keyword searches like "learning", "exam", "assignment", "mitosis", "class notes".
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {emailsList.map((msg) => (
                              <div
                                key={msg.id}
                                className={`border-2 border-black p-3.5 rounded-xl flex items-start justify-between gap-4 transition-all hover:scale-[1.005] ${theme === "dark" ? "bg-[#121318] hover:bg-[#1a1c24]" : "bg-slate-50 hover:bg-[#f3f4f6]"}`}
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase bg-[#84cc16]/20 text-[#598c0d] px-1.5 py-0.5 rounded truncate">
                                      From: {msg.sender.split("<")[0].trim() || msg.sender}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400">
                                      {msg.date.split(" ").slice(0, 4).join(" ")}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-black truncate text-black">{msg.subject || "(No Subject)"}</h5>
                                  <p className="text-[10px] text-gray-500 font-semibold line-clamp-2">{msg.snippet}</p>
                                </div>

                                <button
                                  onClick={() => handleImportGmailAsLesson(msg)}
                                  className="bg-white hover:bg-lime-100 text-[#598c0d] text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] shrink-0 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                                >
                                  📥 Import
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-4 border-dashed border-zinc-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">📧</span>
                      <p className="text-xs font-bold text-zinc-500">Google Workspace Integrator Mode is Idle.</p>
                      <p className="text-[10px] font-medium text-zinc-400 max-w-xs leading-relaxed">
                        Connect your Gmail safely via OAuth to analyze complex notes, slides, or syllabus directly in your workspace browser.
                      </p>
                    </div>
                  )}
                </div>

                {/* Administrative Controller Database Console */}
                {currentUser?.email === "oluwasanmidavid53@gmail.com" && (
                  <div className={`border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] space-y-5 ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                    <div>
                      <h3 className={`text-lg font-black tracking-tight ${theme === "dark" ? "text-white" : "text-black"}`}>
                        🛡️ Protected Admin Utilities Console <span className="text-xs bg-[#acf847] text-black ml-2 px-2.5 py-1 rounded-xl border-2 border-black font-extrabold select-none">ADMIN ACTIVE</span>
                      </h3>
                      <p className={`text-xs font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Retrieve list of all registered students and hashed security records safely.
                      </p>
                    </div>

                    {adminError && (
                      <div className="bg-amber-50 border-2 border-amber-500 text-amber-700 text-xs font-bold p-3 rounded-xl">
                        ⚠️ {adminError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className={`flex items-center gap-2 border-4 border-black px-4 py-2.5 rounded-xl flex-1 shadow-[2px_2px_0px_0px_#000] ${theme === "dark" ? "bg-[#121318]" : "bg-slate-50"}`}>
                        <span className="text-xs font-extrabold text-gray-400 uppercase select-none shrink-0 border-r border-gray-300 pr-2">ADMIN SECRET</span>
                        <input
                          type="password"
                          value={adminKeyInput}
                          onChange={(e) => setAdminKeyInput(e.target.value)}
                          placeholder="••••••••••••••••"
                          className={`bg-transparent border-none text-xs font-bold w-full outline-none ${theme === "dark" ? "text-white" : "text-black"}`}
                        />
                      </div>
                      
                      <button
                        onClick={handleFetchAdminUsersList}
                        disabled={adminLoading}
                        className="bg-indigo-605 hover:bg-indigo-600 bg-indigo-500 text-white font-black text-xs px-6 py-3.5 rounded-xl border-4 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none"
                      >
                        {adminLoading ? "Searching records..." : "Retrieve Student Emails"}
                      </button>
                    </div>

                    {adminUsersReport.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-indigo-600">Secure Database Directory Result:</span>
                          <span className="text-[9.5px] font-bold text-gray-400">{adminUsersReport.length} registered students</span>
                        </div>

                        <div className="border-4 border-black rounded-2xl overflow-hidden shadow-[2px_2px_0px_0px_#000] text-xs font-semibold">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className={`border-b-2 border-black uppercase text-[9px] font-black ${theme === "dark" ? "bg-[#121318] text-gray-300" : "bg-slate-100 text-gray-500"}`}>
                                <th className="p-3">Username</th>
                                <th className="p-3">Email Address</th>
                                <th className="p-3">Registered on</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminUsersReport.map((student, i) => (
                                <tr key={i} className={`border-b border-black last:border-none ${theme === "dark" ? "bg-[#181920]" : "bg-white"}`}>
                                  <td className="p-3 text-black font-bold font-mono text-[11px]">{student.username}</td>
                                  <td className="p-3 font-mono text-indigo-750 text-[11px]">{student.email}</td>
                                  <td className="p-3 text-gray-500 text-[11px]">{student.createdAt ? new Date(student.createdAt).toLocaleString().split(",")[0] : "2026-05-23"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
            <button
              onClick={() => setShowSupportModal(true)}
              className="hover:text-black cursor-pointer font-bold outline-none border-none bg-transparent p-0"
            >
              Support
            </button>
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

      {/* Technical Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in text-black">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black rounded-3xl p-8 max-w-md w-full shadow-[6px_6px_0px_0px_#000] relative text-black"
            >
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-black border-2 border-black p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="bg-amber-100 p-1.5 border-2 border-black rounded-lg text-amber-805">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  Support Desk
                </h3>
              </div>
              
              <h4 className="text-sm font-black text-[#598c0d] mb-4">
                Need help or got a complaint? Tell Ayo!
              </h4>

              {supportSuccess ? (
                <div className="bg-emerald-50 border-4 border-black text-[#598c0d] p-6 rounded-2xl text-center space-y-2 shadow-[2px_2px_0px_0px_#000]">
                  <CheckCircle2 className="w-10 h-10 text-[#84cc16] mx-auto animate-bounce" />
                  <p className="font-black text-sm uppercase">Message sent directly!</p>
                  <p className="text-xs text-slate-600 font-semibold">
                    Thank you! Your complaint/feedback has been sent to Ayo's official address:
                  </p>
                  <p className="text-xs font-black text-black select-all">oluwasanmidavid53@gmail.com</p>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1 text-slate-500">
                      Your Email Address (For follow ups)
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="e.g., you@example.com"
                      className="w-full bg-slate-50 border-4 border-black p-3 rounded-xl outline-none font-bold text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1 text-slate-500">
                      Describe your problem or complaint
                    </label>
                    <textarea
                      rows={4}
                      value={supportFeedback}
                      onChange={(e) => setSupportFeedback(e.target.value)}
                      placeholder="I noticed a bug with..."
                      className="w-full bg-slate-50 border-4 border-black p-3 rounded-xl outline-none font-bold text-xs resize-none"
                      required
                    />
                  </div>

                  <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                    By submitting, Ayo will review your ticket and investigate the issue immediately.
                  </p>

                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="w-full bg-[#84cc16] hover:bg-lime-600 disabled:opacity-50 text-black border-4 border-black py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    {supportSubmitting ? "Sending to Ayo..." : "Submit to Ayo"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration & Login Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black rounded-3xl p-8 max-w-sm w-full shadow-[6px_6px_0px_0px_#000] relative text-black"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-black border-2 border-black p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-black uppercase mb-1 tracking-tight">
                {authMode === "register" ? "Create Account" : "Access Account"}
              </h3>
              <p className="text-xs text-gray-500 font-semibold mb-6 leading-relaxed">
                {authMode === "register" 
                  ? "Register user credentials to customize and preserve study courses." 
                  : "Sign in with your registered email and secure password."}
              </p>

              {authError && (
                <div className="bg-red-50 border-2 border-red-500 text-red-700 text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={authMode === "register" ? handleRegisterSubmit : handleLoginSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 pl-1">Username</label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="e.g. JohnDee"
                      className="border-4 border-black px-4 py-2 text-xs font-black rounded-xl w-full focus:bg-lime-50/20 focus:border-[#84cc16] outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 pl-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="e.g. user@domain.com"
                    className="border-4 border-black px-4 py-2 text-xs font-black rounded-xl w-full focus:bg-lime-50/20 focus:border-[#84cc16] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 pl-1">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-4 border-black px-4 py-2 text-xs font-black rounded-xl w-full focus:bg-[#84cc16] focus:border-[#84cc16] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#84cc16] hover:bg-lime-500 text-black font-black text-xs uppercase py-3 border-4 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {authLoading ? "Synchronizing..." : authMode === "register" ? "Sign Up" : "Log In"}
                </button>
              </form>

              <hr className="border-2 border-black my-6" />

              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500">
                  {authMode === "register" ? "Already have an account?" : "Need a new account?"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "register" ? "login" : "register");
                    setAuthError("");
                  }}
                  className="text-xs font-black uppercase text-blue-600 hover:underline mt-1 cursor-pointer"
                >
                  {authMode === "register" ? "Log In Instead" : "Register Instead"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Notes Composer Modal */}
      <AnimatePresence>
        {showEmailModal && activeLesson && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black rounded-3xl p-8 max-w-sm w-full shadow-[6px_6px_0px_0px_#000] relative text-black"
            >
              <button
                onClick={() => setShowEmailModal(false)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-black border-2 border-black p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-black uppercase mb-1 tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-lime-600" /> Mail Notes
              </h3>
              <p className="text-xs text-gray-505 font-semibold mb-6">
                Deliver the current study roadmap nodes and Sam's analogies directly to a classmate or yourself over Gmail!
              </p>

              {gmailStatusMsg ? (
                <div className="bg-emerald-50 border-2 border-emerald-505 text-emerald-700 text-xs font-bold p-3 rounded-xl mb-4 text-center">
                  🎉 {gmailStatusMsg}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Selected Lesson</span>
                    <div className="border-2 border-black font-black text-xs px-3 py-1.5 rounded-lg bg-zinc-50 truncate border-solid">
                      {activeLesson.title}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-450 pl-1">Recipient Classmate Email</label>
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="classmate@school.edu"
                      className="border-4 border-black px-4 py-2.5 text-xs font-black rounded-xl w-full focus:bg-lime-50/20 focus:border-[#84cc16] outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleComposeAndSendNotes(recipientEmail, activeLesson)}
                    disabled={isSendingEmail}
                    className="w-full bg-[#84cc16] hover:bg-lime-500 text-black font-black text-xs uppercase py-3 border-4 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSendingEmail ? "Delivering Mail..." : "Send Notes over Gmail"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
