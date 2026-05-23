import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

const pdf = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = 3000;

// Set limits to buffer large documents
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Seed some initial memory-based lessons (users can append more)
import { DEFAULT_LESSONS } from "./src/defaultLessons";
let userLessons = [...DEFAULT_LESSONS];

// Helper to make sure GEMINI_API_KEY is defined
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not configured in environment variables.");
  }
  next();
};

app.use(checkApiKey);

// 1. Get current lessons
app.get("/api/lessons", (req, res) => {
  res.json(userLessons);
});

// 1.5 Parse uploaded files (PDF, DOCX, TXT) to text
app.post("/api/lessons/parse-upload", async (req: express.Request, res: express.Response): Promise<any> => {
  const { fileName, fileType, base64Data } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: "Missing file base64 content!" });
  }

  try {
    const fileBuffer = Buffer.from(base64Data, "base64");
    let extractedText = "";

    const lowerName = fileName.toLowerCase();

    if (fileType?.includes("pdf") || lowerName.endsWith(".pdf")) {
      const parsedPDF = await pdf(fileBuffer);
      extractedText = parsedPDF.text || "";
    } else if (
      fileType?.includes("word") || 
      fileType?.includes("officedocument") || 
      lowerName.endsWith(".docx") || 
      lowerName.endsWith(".doc")
    ) {
      const parsedDoc = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = parsedDoc.value || "";
    } else {
      // Treat as UTF-8 text file (TXT, MD, etc.)
      extractedText = fileBuffer.toString("utf-8");
    }

    // Clean double space lines
    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    if (!extractedText) {
      return res.status(400).json({ error: "The document structure was parsed, but no readable text could be extracted." });
    }

    res.json({
      text: extractedText,
      fileName,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length
    });
  } catch (err: any) {
    console.error("Error parsing document on server:", err);
    res.status(500).json({ error: `Could not parse document. Error: ${err.message || err}` });
  }
});

// 2. Generate concept nodes for custom transcripts / uploads
app.post("/api/lessons/generate", async (req, res) => {
  const { title, subject, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and textbook content are required!" });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no API key is provided
      const mockConcepts = [
        {
          id: "intro",
          label: `Introduction to ${title}`,
          description: "Understanding the foundational vocabulary and background.",
          status: "active" as const,
          connections: ["core-principle"]
        },
        {
          id: "core-principle",
          label: "Core Mechanisms",
          description: "How the parts interact to drive the primary process.",
          status: "locked" as const,
          connections: ["conclusion"]
        },
        {
          id: "conclusion",
          label: "Synthesis & Impact",
          description: "Evaluating the broader context and master applications.",
          status: "locked" as const,
          connections: []
        }
      ];
      const newLesson = {
        id: `custom-${Date.now()}`,
        title,
        subject: subject || "General",
        content,
        status: "New" as const,
        progress: 0,
        dateAdded: "Just now",
        numPages: Math.ceil(content.length / 800),
        concepts: mockConcepts
      };
      userLessons.unshift(newLesson);
      return res.json(newLesson);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a learning expert assisting the TeachSam platform.
Analyze the following textbook content/lecture notes on "${title}" in the subject area "${subject}".
Identify 3 to 5 core sequential learning concepts that a student needs to explain to a classmate to prove they master the topic.
Organize these concepts linearly as a flow path with dependencies.
Textbook content:
${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of 3 to 5 core concept nodes",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A simple URL-safe slug e.g. first-step, second-step, no spaces" },
              label: { type: Type.STRING, description: "Short title (2-3 words, e.g. 'Electron Cascade')" },
              description: { type: Type.STRING, description: "Brief summary of what this concept is about" },
              connections: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "The id(s) of the directly subsequent concept model that follows this one"
              }
            },
            required: ["id", "label", "description", "connections"]
          }
        }
      }
    });

    const parsedConcepts = JSON.parse(response.text || "[]");
    
    // Map with initial status states
    const concepts = parsedConcepts.map((c: any, index: number) => ({
      ...c,
      status: index === 0 ? "active" : "locked",
    }));

    const newLesson = {
      id: `custom-${Date.now()}`,
      title,
      subject: subject || "General Study",
      content,
      status: "New" as const,
      progress: 0,
      dateAdded: "Just now",
      numPages: Math.ceil(content.length / 750),
      concepts
    };

    userLessons.unshift(newLesson);
    res.json(newLesson);

  } catch (error: any) {
    console.error("Error generating concepts via Gemini:", error);
    res.status(500).json({ error: error.message || "Failed to generate study roadmap." });
  }
});

// 3. Reset/Reset default lessons to initial state
app.post("/api/lessons/new-blank", (req, res) => {
  const newBlankLesson = {
    id: `blank-${Date.now()}`,
    title: "New Topic Study",
    subject: "Awaiting Input",
    content: "Please tell Sam what topic you want to study in the chat input or upload your files! Once you tell Sam what to study, he will automatically build an interactive learning roadmap.",
    status: "New" as const,
    progress: 0,
    dateAdded: "Just now",
    numPages: 1,
    concepts: [
      {
        id: "awaiting-user-input",
        label: "Provide a Topic",
        description: "Waiting for you to specify a topic in the chat below!",
        status: "active" as const,
        connections: []
      }
    ]
  };
  userLessons.unshift(newBlankLesson);
  res.json(newBlankLesson);
});

app.post("/api/lessons/reset", (req, res) => {
  userLessons = [...DEFAULT_LESSONS];
  res.json({ message: "Lessons refreshed to seed defaults!", lessons: userLessons });
});

// 4. Evaluate explanation
app.post("/api/chat/evaluate", async (req, res) => {
  const { lessonId, chatHistory, latestMessage, activeConceptId, userName = "User" } = req.body;

  let currentLesson = userLessons.find(l => l.id === lessonId);
  if (!currentLesson) {
    currentLesson = userLessons[0];
  }

  try {
    const activeConcept = currentLesson?.concepts.find(c => c.id === activeConceptId) || currentLesson?.concepts[0];

    // --- Dynamic Topic Intent Detection & On-The-Fly Roadmap Generation ---
    let isNewTopicRequest = false;
    let isChitChatRequest = false;
    let newTopicTitle = "";
    let newTopicSubject = "";
    let chitChatResponse = "";

    const isBlankLesson = currentLesson?.id.startsWith("blank-") || currentLesson?.title === "New Topic Study";

    if (isBlankLesson) {
      const inputLower = latestMessage.toLowerCase().trim();
      const isIntroWord = inputLower.length < 3 || inputLower === "hi" || inputLower === "hello" || inputLower === "hey";
      if (!isIntroWord) {
        isNewTopicRequest = true;
        let rawTitle = latestMessage.replace(/^(let's study|i want to teach you about|let's learn|how about|we are doing)\s+/gi, "").replace(/[?.!]/g, "").trim();
        newTopicTitle = rawTitle.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        
        const titleLower = newTopicTitle.toLowerCase();
        if (titleLower.includes("programming") || titleLower.includes("code") || titleLower.includes("python") || titleLower.includes("computer") || titleLower.includes("software") || titleLower.includes("oop")) {
          newTopicSubject = "Computer Science";
        } else if (titleLower.includes("physics") || titleLower.includes("quantum") || titleLower.includes("gravity") || titleLower.includes("energy") || titleLower.includes("mechanics")) {
          newTopicSubject = "Physics";
        } else if (titleLower.includes("history") || titleLower.includes("war")) {
          newTopicSubject = "History";
        } else if (titleLower.includes("econ") || titleLower.includes("finance") || titleLower.includes("market") || titleLower.includes("supply")) {
          newTopicSubject = "Economics";
        } else {
          newTopicSubject = "General Study";
        }
      }
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const classificationResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `The student user named "${userName}" is studying in a collaborative learning session with Sam (an enthusiastic, friendly, but slightly clueless classmate peer).
Current lesson topic: "${currentLesson?.title || 'Unknown'}" (Subject: "${currentLesson?.subject || 'Unknown'}")
Current specific Concept they are currently aiming to explain/teach: "${activeConcept?.label || 'Unknown'}".

The user's latest typed/spoken message is: "${latestMessage}"

Analyze the user's message and classify their core intent:
1. "newTopic" - User is explicitly introducing, requesting, or asking to switch to learning/teaching a brand new study topic or subject area (e.g. "let's study python", "let's learn photosynthesis", "I want to teach you gravity", "let's switch to biology"). Only return this if they specify a clear topic/theme they want to learn.
2. "chitchat" - User's message is a greeting (e.g., "Hello Sam", "hi buddy", "hey!"), a general personal inquiry (e.g., "What is your name?", "who are you?", "how are you?", "can you hear me?"), or simple banter that is NOT an attempt to explain the course topic "${activeConcept?.label}".
3. "teaching" - User is actively trying to teach, define, explain, or check their understanding of the active concept "${activeConcept?.label}".

Respond strictly with a JSON object.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: {
                  type: Type.STRING,
                  description: "Must be 'newTopic', 'chitchat', or 'teaching'"
                },
                topicTitle: {
                  type: Type.STRING,
                  description: "For 'newTopic' only: the title of the new topic (e.g., 'Object-Oriented Programming')"
                },
                subject: {
                  type: Type.STRING,
                  description: "For 'newTopic' only: Subject area (e.g., 'Computer Science', 'Physics', 'History', 'Biology')"
                },
                replyText: {
                  type: Type.STRING,
                  description: "For 'chitchat' only: A casual, friendly reply from Sam in his enthusiastic, informal classmate student persona. He answers persona questions (e.g. name is Sam, he is the user's peer classmate, clueless but eager to learn!). Direct them nicely back to teaching him the active concept: '${activeConcept?.label}'."
                }
              },
              required: ["intent"]
            }
          }
        });

        const parsedClass = JSON.parse(classificationResponse.text || "{}");
        if (parsedClass.intent === "newTopic" && parsedClass.topicTitle) {
          isNewTopicRequest = true;
          newTopicTitle = parsedClass.topicTitle;
          newTopicSubject = parsedClass.subject || "General Study";
        } else if (parsedClass.intent === "chitchat") {
          isChitChatRequest = true;
          chitChatResponse = parsedClass.replyText || `Hey ${userName}! Yo, I'm Sam, your study buddy! 😄 How are you doing? Whenever you are ready, could you teach me more about **${activeConcept?.label || 'the concept'}**? My classmate notes are still empty!`;
        }
      } catch (err) {
        console.error("Error during dynamic intent check:", err);
      }
    }

    // Fallback classification if Gemini classification was not completed or key absent
    if (!isNewTopicRequest && !isChitChatRequest) {
      const inputLower = latestMessage.toLowerCase().trim();
      const chitchatPhrases = [
        "hello", "hi", "hey", "how are you", "your name", "who are you", "what is your name", 
        "whats your name", "nice to meet", "can you hear me", "good morning", "good afternoon", 
        "good evening", "howdy", "sup", "what's up", "whats up", "yo sam"
      ];
      const isGreetingOrChitchat = inputLower.length < 4 || chitchatPhrases.some(p => inputLower.includes(p)) || inputLower === "yes" || inputLower === "no";
      
      if (isGreetingOrChitchat) {
        isChitChatRequest = true;
        if (inputLower.includes("name") || inputLower.includes("who are you")) {
          chitChatResponse = `Hey! I'm **Sam**, your classmates buddy! 🎓 My job is to take notes and learn from you. Whenever you are ready, teach me about **${activeConcept?.label || 'this concept'}**!`;
        } else if (inputLower.includes("how are you")) {
          chitChatResponse = `I'm doing awesome, ${userName}! Eager and ready to learn. 😄 Are you ready to teach me about **${activeConcept?.label || 'the concept'}**?`;
        } else {
          chitChatResponse = `Hey ${userName}! Glad to see you! 👋 My classmate ears are wide open. How would you explain **${activeConcept?.label || 'this concept'}** to me in simple terms?`;
        }
      } else if (inputLower.length > 3 && inputLower.length < 60) {
        // Fallback newTopic check
        const coding = ["programming", "code", "python", "javascript", "react", "c++", "java", "oop", "computer"];
        const physics = ["quantum", "physics", "gravity", "force", "molecule", "einstein", "atom"];
        const lit = ["gatsby", "book", "noble", "novel", "literature", "shakespeare"];
        const econ = ["supply", "demand", "microeconomics", "macroeconomics", "inflation", "market"];

        let matchedType = "";
        let matchedSubject = "";

        if (coding.some(w => inputLower.includes(w))) {
          matchedType = "Object-Oriented Programming";
          matchedSubject = "Computer Science";
        } else if (physics.some(w => inputLower.includes(w))) {
          matchedType = "The Quantum Enigma";
          matchedSubject = "Physics";
        } else if (lit.some(w => inputLower.includes(w))) {
          matchedType = "The Great Gatsby Summary";
          matchedSubject = "Literature";
        } else if (econ.some(w => inputLower.includes(w))) {
          matchedType = "Microeconomics 101";
          matchedSubject = "Economics";
        } else {
          const words = latestMessage.split(" ").filter(w => w.length > 0);
          if (words.length >= 1 && words.length <= 4) {
            matchedType = latestMessage.replace(/[?.]/g, "").trim();
            matchedSubject = "General Study";
          }
        }

        if (matchedType && matchedType.toLowerCase() !== currentLesson?.title.toLowerCase()) {
          isNewTopicRequest = true;
          newTopicTitle = matchedType;
          newTopicSubject = matchedSubject;
        }
      }
    }

    // Handle topic switching or dynamic on-the-fly lesson synthesis
    if (isNewTopicRequest && newTopicTitle) {
      // 1. Check if we already have this lesson
      const existingLesson = userLessons.find(l => 
        l.title.toLowerCase().includes(newTopicTitle.toLowerCase()) || 
        newTopicTitle.toLowerCase().includes(l.title.toLowerCase())
      );

      if (existingLesson) {
        const activeNode = existingLesson.concepts.find(c => c.status === "active") || existingLesson.concepts[0];
        const greetingText = `Oh, awesome! You want to study **${existingLesson.title}**? Let's switch right over! I'm ready. We are currently trying to make sense of **${activeNode?.label}**. Tell me in simple terms, how does it work?`;
        
        return res.json({
          id: `sam-${Date.now()}`,
          sender: "sam",
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          switchLessonId: existingLesson.id,
          newLesson: existingLesson,
          evaluation: {
            clarity: "Good",
            missingPoints: [],
            feedback: "Switched to existing lesson",
            unlockedConceptIds: []
          }
        });
      }

      // 2. Synthesize a brand new concept lesson on-the-fly using Gemini (or clean local mock)!
      let newContent = "";
      let newConcepts = [];

      if (process.env.GEMINI_API_KEY) {
        try {
          const genResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `You are an educational assistant. Construct a comprehensive study lesson for the topic: "${newTopicTitle}" under the subject matter "${newTopicSubject}".
Write a detailed learning textbook study passage (around 150-250 words) establishing the key physical, theoretical, or logical mechanics of "${newTopicTitle}".
Break down this summary into exactly 3 to 4 sequential concept path nodes for a linear learning progress map. Output JSON.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  textbookContent: { type: Type.STRING, description: "Concise yet detailed educational pass of 150-250 words" },
                  concepts: {
                    type: Type.ARRAY,
                    description: "Exactly 3 to 4 sequential subconcepts structured linearly",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "A simple, URL-safe slug e.g. class-blue, inherit-green" },
                        label: { type: Type.STRING, description: "Short title (2-3 words)" },
                        description: { type: Type.STRING, description: "Brief overview of what the concept details" },
                        connections: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "The id of the subsequent concept node that follows this one"
                        }
                      },
                      required: ["id", "label", "description", "connections"]
                    }
                  }
                },
                required: ["textbookContent", "concepts"]
              }
            }
          });

          const parsedGen = JSON.parse(genResponse.text || "{}");
          newContent = parsedGen.textbookContent || `Introduction and main ideas governing ${newTopicTitle}.`;
          newConcepts = parsedGen.concepts || [];
        } catch (genErr) {
          console.error("Gemini on-the-fly lesson generator failed:", genErr);
        }
      }

      // Fallback local template if Gemini failed or is missing
      if (!newContent || newConcepts.length === 0) {
        if (newTopicTitle.toLowerCase().includes("programming") || newTopicTitle.toLowerCase().includes("oop") || newTopicTitle.toLowerCase().includes("code") || newTopicSubject.toLowerCase().includes("computer")) {
          newContent = `Object-oriented programming (OOP) is a programming paradigm based on the concept of "objects", which contain data and instructions. OOP relies on Class blueprints to define attributes, Inheritance to reuse existing logic across structures, and Polymorphism to enable dynamic method overrides.`;
          newConcepts = [
            { id: "oop-classes", label: "Classes & Blueprints", description: "Learn how classes encapsulate attributes and model physical objects.", connections: ["oop-inheritance"] },
            { id: "oop-inheritance", label: "Inheritance", description: "Extending child structures automatically from parent templates.", connections: ["oop-polymorphism"] },
            { id: "oop-polymorphism", label: "Polymorphism Overrides", description: "How objects adapt parental actions to their custom forms.", connections: [] }
          ];
        } else {
          newContent = `This is an interactive study landscape for "${newTopicTitle}". It summarizes the essential terminology, theoretical foundations, and logic governing ${newTopicTitle} within the discipline of ${newTopicSubject}.`;
          newConcepts = [
            { id: "concept-intro", label: `Intro to ${newTopicTitle}`, description: "Understanding basic properties and definitions.", connections: ["concept-core"] },
            { id: "concept-core", label: "Core Mechanics", description: "Deep dive into structural mechanisms and rules.", connections: ["concept-synthesis"] },
            { id: "concept-synthesis", label: "Synthesis", description: "Holistic master review and test calculations.", connections: [] }
          ];
        }
      }

      const concepts = newConcepts.map((c: any, index: number) => ({
        ...c,
        status: index === 0 ? "active" : "locked"
      }));

      const newLesson = {
        id: `dynamic-${Date.now()}`,
        title: newTopicTitle,
        subject: newTopicSubject,
        content: newContent,
        status: "New" as const,
        progress: 0,
        dateAdded: "Just now",
        numPages: Math.ceil(newContent.length / 750),
        concepts
      };

      // Clear out any blank placeholder templates
      userLessons = userLessons.filter(l => !l.id.startsWith("blank-") && l.title !== "New Topic Study");
      userLessons.unshift(newLesson);

      const responseMessage = `Wooah, **${newTopicTitle}** under **${newTopicSubject}**? That sounds like a cool topic! My electronic synapses are totally empty on this subject right now. I've automatically assembled an educational progress roadmap for us! Let's start with our first concept: **${concepts[0]?.label}**. How would you explain that simply?`;

      return res.json({
        id: `sam-${Date.now()}`,
        sender: "sam",
        text: responseMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        switchLessonId: newLesson.id,
        newLesson,
        evaluation: {
          clarity: "Good",
          missingPoints: [],
          feedback: `Set up learning roadmap for ${newTopicTitle}!`,
          unlockedConceptIds: []
        }
      });
    }

    // Handle conversational greetings and casual chitchat
    if (isChitChatRequest && chitChatResponse) {
      return res.json({
        id: `sam-${Date.now()}`,
        sender: "sam",
        text: chitChatResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evaluation: {
          clarity: "Direct Answer",
          missingPoints: [],
          feedback: "Casual greeting / conversation",
          unlockedConceptIds: []
        }
      });
    }

    // --- Standard Active Concept Explanation Evaluation ---
    // Generate prompt with context
    const chatHistoryFormatted = chatHistory
      .map((msg: any) => `${msg.sender === "sam" ? "Sam" : userName}: ${msg.text}`)
      .join("\n");

    const conceptsList = currentLesson.concepts
      .map(c => `- ${c.label} (${c.id}): ${c.description}`)
      .join("\n");

    const activeConceptLabel = activeConcept?.label || "the active concept";

    const promptSystem = `You are Sam, a curious, enthusiastic, but clueless peer of the student.
The student you are talking to is named "${userName}". You MUST call them by their name "${userName}" (or friendly slang versions like "hey ${userName}!", "woah ${userName}!") when answering or asking questions!

A student is trying to teach you about a topic: "${currentLesson.title}".
Specifically, they are currently aiming to teach you this subconcept: "${activeConceptLabel}".
The underlying study material for this concept says:
***
${currentLesson.content}
***

The active concepts map includes:
${conceptsList}

YOUR BEHAVIOR AS SAM:
1. Speak informally and casual, like a curious student partner. (e.g., Use student slang, "Ooh!", "Woah", "Wait, I'm confused!", "Let me check if I got this").
2. ACT CONFUSED about technical details, and probe them to explain the "why" and "how".
3. Check their response against the reference textbook material. If their explanation is accurate:
   - Praise them and feel enlightened! Refer to them by name: "${userName}"!
   - Mark the current concept id "${activeConceptId}" as unlocked.
4. If they missed core facts, mechanisms, or got them wrong:
   - Do NOT just tell them the answer or the missing elements directly.
   - Speak as an eager but confused buddy and ask a question focusing on that missing piece (e.g. "Wait ${userName}, you said water splits, but where does the oxygen go?").
5. Provide a helpful, visual, cute analogy (using everyday things like soccer, kitchens, cars, video game levels) to bridge understanding.

Now evaluate the student's latest explanation:
"${latestMessage}"

Chat overview so far:
${chatHistoryFormatted}`;

    let parsedSamResponse: any = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptSystem,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: {
                  type: Type.STRING,
                  description: "Sam's casual, enthusiastic student-styled comment or confused follow-up question. Make it highly engaging, empathetic, and full of character."
                },
                clarity: {
                  type: Type.STRING,
                  description: "Must be: 'Excellent' (no gaps), 'Good' (mostly accurate but minor missed items), 'Struggling' (significant misunderstandings or massive omissions) or 'Direct Answer' (student isn't teaching, they are asking you to tell them the definition)."
                },
                missingPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of actual scientific facts from the text that the student left out in their explanation."
                },
                unlockedConceptIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "A list of IDs from the lesson concepts list that the student successfully taught. Usually, it should be the activeConceptId if they did fine!"
                },
                analogyText: {
                  type: Type.STRING,
                  description: "A friendly verbal explanation of a simple concrete analogy (e.g. using kitchenware, sports, or games) to map the difficult concept."
                }
              },
              required: ["text", "clarity", "missingPoints", "unlockedConceptIds", "analogyText"]
            }
          }
        });

        parsedSamResponse = JSON.parse(response.text || "{}");
      } catch (err) {
        console.error("Gemini model execution failed, falling back to local simulation:", err);
      }
    }

    if (!parsedSamResponse) {
      // Simulate locally if no apiKey configured or if Gemini API call failed - Dynamically adapt to the actual active concept/subject!
      let mockRes = {
        text: `Hey ${userName}! That explanation of "${activeConcept?.label || 'this concept'}" is super interesting! But wait, how does this actually work under the hood? I want to make sure I really get it!`,
        clarity: "Good",
        missingPoints: [`Further practical application steps of ${activeConcept?.label || 'the concept'}.`],
        unlockedConceptIds: [activeConceptId],
        analogyText: `Analogy: Think of ${activeConcept?.label || 'this concept'} like puzzle pieces! When they lock together, the whole picture becomes crystal clear!`
      };

      if (currentLesson.id === "photosynthesis-basics") {
        if (activeConceptId === "chlorophyll-capture") {
          mockRes = {
            text: `Woah, ${userName}! That makes sense! Chlorophyll is like a solar panel. But wait, how do the electrons get excited? Is there a tiny cellular DJ playing energetic music, or does the sunlight physically hit something?`,
            clarity: "Good",
            missingPoints: ["Chlorophyll pigments absorb light photons to raise electron energy states."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: Think of it like a pinball machine! The sunlight pulls back the spring plunger, sending the electron sphere flying up into the main game board!"
          };
        } else if (activeConceptId === "water-splitting") {
          mockRes = {
            text: `Wait, ${userName}, I'm slightly confused. You mentioned water gets split, but why does the plant even need to split it? What does it do with the leftover bits?`,
            clarity: "Good",
            missingPoints: ["Splitting water supplies replacement electrons and releases oxygen as a byproduct."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: Splitting a water molecule is like cracking open raw walnuts to bake cookies - you only want the nuts (electrons) and you throw away the outer shell parts (oxygen)!"
          };
        } else {
          mockRes = {
            text: `Hold on, ${userName}, so for "${activeConcept?.label}", how does the energy from the light stage get packaged into these carriers? Is it like filling up rechargeable batteries?`,
            clarity: "Good",
            missingPoints: ["Energy carriers like ATP and NADPH store and transport high-energy electrons."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: ATP and NADPH act like cellular food trucks, driving high-energy lunches directly into the dark reaction stroma!"
          };
        }
      } else if (currentLesson.id === "quantum-physics-duality") {
        if (activeConceptId === "wave-vs-particle") {
          mockRes = {
            text: `Woah, ${userName}! So light behaves both like a wavy ocean and a stream of solid bullet particles? How can it be both at the same time? Does it shapeshift when we're not looking?`,
            clarity: "Good",
            missingPoints: ["Light acts as continuous waves when propagating, but interacts as discrete packets (photons) of energy."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: It's like a cylinder shape! Under a spotlight from the top it looks like a circle, but from the side it's a rectangle. It is both, depending on how you look at it!"
          };
        } else if (activeConceptId === "double-slit") {
          mockRes = {
            text: `Wait! If we put sensors at the slits, the wavy pattern vanishes and they act like simple balls? Are the electrons camera-shy, or does checking on them change the output?`,
            clarity: "Good",
            missingPoints: ["The act of quantum measurement interacts with and disturbs the wave packet superposition."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: It's like checking to see if a spinning coin is heads or tails. The act of touching it to measure forces it to collapse into a single stationary state!"
          };
        } else {
          mockRes = {
            text: `Oh, ${userName}, so what does it mean for the wave function to 'collapse'? Does it physically shrink, or is it just the mathematics resolving?`,
            clarity: "Good",
            missingPoints: ["Wave function collapse happens when an observation resolves multiple superpositions into a single reality."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: It's like opening a mystery box containing a random cat toy. Once opened, the superposition of potential item options collapses to the single one you find!"
          };
        }
      } else if (currentLesson.id === "market-supply-demand") {
        if (activeConceptId === "law-of-demand") {
          mockRes = {
            text: `Ah, ${userName}, so as prices go up, people buy less. That seems logical, but what are the exact forces driving that? Do they look for alternatives or just run out of cash?`,
            clarity: "Good",
            missingPoints: ["The Income effect and Substitution effect mathematically explain the downward sloping demand curve."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: Think of buying burger plates! If burgers jump to $15, you eat hotdogs instead (Substitution Effect) and also feel like your $20 bill has less buying power (Income Effect)!"
          };
        } else if (activeConceptId === "law-of-supply") {
          mockRes = {
            text: `Woah! And sellers do the exact opposite? They want to make absolute mountains of stuff when the tag is high! But how do they respond so quickly? Do they hire more workers?`,
            clarity: "Good",
            missingPoints: ["Producers allocate extra resources, overtime, or new capital to capture higher profit thresholds."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: Imagine running a lemonade stand! If readers suddenly offer you $50 a cup, you'll immediately stay up till midnight squeeze-harvesting every lemon in the village!"
          };
        } else {
          mockRes = {
            text: `Wait! So what happens if the price gets stuck too high or too low? How does the market clear out the extra clutter, or fill up empty shelves?`,
            clarity: "Good",
            missingPoints: ["Market equilibrium clears surpluses and shortages dynamically through price adjustments."],
            unlockedConceptIds: [activeConceptId],
            analogyText: "Analogy: It is like water levels in two connected tanks! High levels will naturally spill over and flow down until both tanks find the exact same height equilibrium."
          };
        }
      } else if (currentLesson.id === "cs-oop-basics" || currentLesson.id.includes("comp") || currentLesson.id.includes("dynamic") || currentLesson.title.toLowerCase().includes("class") || currentLesson.title.toLowerCase().includes("programming") || currentLesson.title.toLowerCase().includes("oop") || currentLesson.title.toLowerCase().includes("computer science")) {
        // Fallback for computer science / oop / classes and objects
        if (activeConceptId === "classes-objects" || activeConceptId === "classes" || activeConceptId.includes("class") || activeConceptId.includes("object")) {
          mockRes = {
            text: `Aha, ${userName}! So a class is the parent encasing (the blueprint) that has code, and objects are the instances created from it! But wait, does the class itself hold the actual live values, or does it just template them of what they should hold?`,
            clarity: "Excellent",
            missingPoints: [],
            unlockedConceptIds: [activeConceptId],
            analogyText: `Analogy: Think of a class like a cookie cutter, and objects as the actual individual cookies baked with it! The cutter defines the shape, but each cookie can have different toppings!`
          };
        } else if (activeConceptId === "data-hiding" || activeConceptId.includes("hiding") || activeConceptId.includes("encaps")) {
          mockRes = {
            text: `Oh! So data hiding or encapsulation puts locks on variables so they aren't directly messed with? How do other parts of code get or set values then? Do they need getter and setter keys?`,
            clarity: "Good",
            missingPoints: ["Data hiding restricts direct variable access and exposes values through controlled helper methods."],
            unlockedConceptIds: [activeConceptId],
            analogyText: `Analogy: It is like an ATM machine! You cannot reach into the safe to grab bills directly; instead, you must use a secure public interface (withdraw method) to access your cash safely.`
          };
        } else {
          mockRes = {
            text: `Wait, so adaptation/inheritance is how child classes extend parent blueprints? What happens if a child wants to do a parent action in its own unique way?`,
            clarity: "Good",
            missingPoints: ["Inheritance permits code reuse, while polymorphism lets children override parent methods with custom behavior."],
            unlockedConceptIds: [activeConceptId],
            analogyText: `Analogy: Think of a phone blueprint! A smartphone inherits dialing keys and speakers from a landline, but adds visual screen touch apps of its own!`
          };
        }
      } else {
        // Fallback for custom uploads (so Sam speaks exactly about their topic)
        mockRes = {
          text: `Woah, ${userName}! That explanation of "**${activeConcept?.label || 'this step'}**" sounds super cool! But wait, how does this actually apply to the core mechanism of "${currentLesson.title}"? Could you explain how this concept fits in?`,
          clarity: "Good",
          missingPoints: [`Explaining the core physical mechanisms outlined under the ${activeConcept?.label || 'concept'} content block.`],
          unlockedConceptIds: [activeConceptId],
          analogyText: `Analogy: Think of "**${activeConcept?.label || 'this concept'}**" like learning to drive a car. You cannot just look at the dashboard; you have to step on the gas pedal to active the gears and drive forward!`
        };
      }

      parsedSamResponse = {
        text: mockRes.text,
        clarity: mockRes.clarity,
        missingPoints: mockRes.missingPoints,
        unlockedConceptIds: mockRes.unlockedConceptIds,
        analogyText: mockRes.analogyText
      };
    }

    // Dynamically update the lesson state in our simple state memory store!
    if (parsedSamResponse.unlockedConceptIds && parsedSamResponse.unlockedConceptIds.length > 0) {
      const lessonIndex = userLessons.findIndex(l => l.id === lessonId);
      if (lessonIndex > -1) {
        const updatedConcepts = userLessons[lessonIndex].concepts.map(c => {
          let updatedStatus = c.status;
          if (parsedSamResponse.unlockedConceptIds.includes(c.id)) {
            updatedStatus = "unlocked" as const;
          }
          return { ...c, status: updatedStatus };
        });

        // Set next Concept after unlocked as "active" if it is currently locked
        let unlockedCount = 0;
        updatedConcepts.forEach((c, idx) => {
          if (c.status === "unlocked") {
            unlockedCount++;
            // Check next
            if (idx + 1 < updatedConcepts.length && updatedConcepts[idx + 1].status === "locked") {
              updatedConcepts[idx + 1].status = "active";
            }
          }
        });

        const newProgress = Math.round((unlockedCount / updatedConcepts.length) * 100);
        userLessons[lessonIndex].concepts = updatedConcepts;
        userLessons[lessonIndex].progress = newProgress;
        userLessons[lessonIndex].status = newProgress === 100 ? "Mastered" : "In Progress";
      }
    }

    res.json({
      id: `sam-${Date.now()}`,
      sender: "sam",
      text: parsedSamResponse.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      evaluation: {
        clarity: parsedSamResponse.clarity,
        missingPoints: parsedSamResponse.missingPoints,
        feedback: parsedSamResponse.clarity === "Excellent" ? "Fantastic teaching! You master this area!" : "Let's review the analogy below to secure the link.",
        unlockedConceptIds: parsedSamResponse.unlockedConceptIds,
        analogyText: parsedSamResponse.analogyText
      }
    });

  } catch (error: any) {
    console.error("Error evaluating explanation via Gemini:", error);
    res.status(500).json({ error: error.message || "Sam got confused in his brain circuitry." });
  }
});

// ——— ENHANCED: Explanation generation endpoint ———
app.post("/api/chat/explain", async (req, res) => {
  const { lessonId, activeConceptId } = req.body;
  
  let currentLesson = userLessons.find(l => l.id === lessonId);
  if (!currentLesson) {
    currentLesson = userLessons[0];
  }
  
  const activeConcept = currentLesson?.concepts.find(c => c.id === activeConceptId) || currentLesson?.concepts[0];
  const activeConceptLabel = activeConcept?.label || "the concept";
  const activeConceptDesc = activeConcept?.description || "";
  
  try {
    let explanationText = "";
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are Sam, a friendly, enthusiastic peer studying together with the student.
The student is struggling to explain the concept "${activeConceptLabel}" (specifically: "${activeConceptDesc}") in the lesson "${currentLesson?.title || 'this topic'}".
Explain this concept to them in a friendly, encouraging, and highly intuitive way. 
Start by saying something like: "Oh, no worries at all! Let me break ${activeConceptLabel} down for us..." 
Always include a clear, everyday, beautiful analogy (like kitchens, soccer, video games, plumbing, etc.) to make it immediately click. 
Keep your response warm, casual, and around 100-150 words.`,
      });
      explanationText = response.text || "";
    } else {
      explanationText = `Sure thing! Let me help you break down **${activeConceptLabel}**! 
Basically, think of it this way: ${activeConceptDesc}
It is like order lines at a fast-food counter - you line up, they serve you, and you get exactly what you need. Don't worry, you are doing great! Let me know if you want to try explaining this core mechanism back to me now!`;
    }
    
    res.json({
      id: `sam-explain-${Date.now()}`,
      sender: "sam",
      text: explanationText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (error: any) {
    console.error("Error generating explanation:", error);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

// ——— ENHANCED: Interactive Test Quiz Generator ———
app.post("/api/quiz/generate", async (req, res) => {
  const { contentType, lessonId, uploadedText, numQuestions = 5 } = req.body;
  
  let sourceText = "";
  let sourceTitle = "General Knowledge";
  
  if (contentType === "lesson") {
    let lesson = null;
    if (lessonId) {
      lesson = userLessons.find(l => l.id === lessonId);
      if (!lesson) {
        lesson = userLessons.find(l => l.title.toLowerCase().includes(lessonId.toLowerCase()) || l.id.toLowerCase().includes(lessonId.toLowerCase()));
      }
    }
    if (!lesson && userLessons.length > 0) {
      lesson = userLessons[0];
    }
    if (lesson) {
      sourceText = lesson.content;
      sourceTitle = lesson.title;
    }
  } else if (contentType === "upload" && uploadedText) {
    sourceText = uploadedText;
    sourceTitle = "Your Uploaded Document";
  } else {
    sourceText = userLessons.map(l => `[Lesson: ${l.title} in Subject ${l.subject}]\nReference Material:\n${l.content}`).join("\n\n");
    sourceTitle = "Aggregate Study Material";
  }
  
  if (!sourceText.trim()) {
    if (userLessons.length > 0) {
      sourceText = userLessons[0].content;
      sourceTitle = userLessons[0].title;
    } else {
      sourceText = "Photosynthesis basics, light-dependent reactions water splitting, ATP synthesis, Calvin cycle carbon fixation.";
    }
  }
  
  try {
    let questions = [];
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an academic test designer. Build a high-fidelity diagnostic quiz with exactly ${numQuestions} multiple-choice questions based ONLY on the study resource text below.
Resource Title: "${sourceTitle}"
Resource Content:
${sourceText}

Ensure questions cover actual mechanical details, vocabulary, or theoretical logic outlined in the content. Respond strictly in JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Dynamic title of the quiz" },
              questions: {
                type: Type.ARRAY,
                description: "List of multiple choice questions",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Simple unique uuid or id (e.g. q1, q2)" },
                    question: { type: Type.STRING, description: "Clear, challenging multiple-choice question text." },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exactly 4 unique logical option answers."
                    },
                    correctIndex: { type: Type.INTEGER, description: "0-based index of the correct option choice in the options array." },
                    explanation: { type: Type.STRING, description: "Detailed scientific/logical explanation of why this specific response is correct." }
                  },
                  required: ["id", "question", "options", "correctIndex", "explanation"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });
      
      const parsedQuiz = JSON.parse(response.text || "{}");
      questions = parsedQuiz.questions || [];
      sourceTitle = parsedQuiz.title || sourceTitle;
    } else {
      questions = [
        {
          id: "q-1",
          question: `What represents the primary conceptual core of ${sourceTitle}?`,
          options: [
            "Continuous linear steady-state transfer without cyclic feedback",
            "The specific relationship, mechanisms, and rules detailed in the textbook chapters",
            "External secondary factors bypassing the structural constraints completely",
            "Basic superficial naming conventions only"
          ],
          correctIndex: 1,
          explanation: `The handbook details specific foundational mechanics to construct dynamic mental representations of topics.`
        },
        {
          id: "q-2",
          question: `To verify that a student truly understands a lesson, what paradigm is advocated on TeachSam?`,
          options: [
            "Answering 100 simple flashcards passively in sequence",
            "Reciting vocabulary terms matching exact textbook passages on index cards",
            "The Feynman Technique: explaining the concept to a confused peer companion (Sam) until they understand it",
            "Bypassing the peer explanations using summary sheets"
          ],
          correctIndex: 2,
          explanation: `TeachSam utilizes the Feynman technique: explaining complex subjects in simple terms to solidifying memory.`
        },
        {
          id: "q-3",
          question: `What occurs when an observation is introduced in a superposition state?`,
          options: [
            "It triggers immediate wave function collapse to a single measurement outcome",
            "The wave splits into multiple secondary loops indefinitely",
            "It has zero mathematical relevance to the system",
            "It turns the particle into clean kinetic water streams"
          ],
          correctIndex: 0,
          explanation: `According to quantum mechanics, the act of observation or measurement collapses the quantum wave function into a discrete state.`
        }
      ];
    }
    
    res.json({
      title: sourceTitle,
      questions
    });
    
  } catch (error: any) {
    console.error("Error generating quiz via Gemini:", error);
    res.status(500).json({ error: error.message || "Could not generate tests scenarios." });
  }
});

// Serve Vite frontend
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TeachSam backend is running on http://localhost:${PORT}`);
  });
}

startServer();
