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
app.post("/api/lessons/reset", (req, res) => {
  userLessons = [...DEFAULT_LESSONS];
  res.json({ message: "Lessons refreshed to seed defaults!", lessons: userLessons });
});

// 4. Evaluate explanation
app.post("/api/chat/evaluate", async (req, res) => {
  const { lessonId, chatHistory, latestMessage, activeConceptId, userName = "Scholar" } = req.body;

  const currentLesson = userLessons.find(l => l.id === lessonId);
  if (!currentLesson) {
    return res.status(404).json({ error: "Lesson not found!" });
  }

  try {
    // Generate prompt with context
    const chatHistoryFormatted = chatHistory
      .map((msg: any) => `${msg.sender === "sam" ? "Sam" : userName}: ${msg.text}`)
      .join("\n");

    const conceptsList = currentLesson.concepts
      .map(c => `- ${c.label} (${c.id}): ${c.description}`)
      .join("\n");

    const activeConcept = currentLesson.concepts.find(c => c.id === activeConceptId) || currentLesson.concepts[0];

    const promptSystem = `You are Sam, a curious, enthusiastic, but clueless peer of the student.
The student you are talking to is named "${userName}". You MUST call them by their name "${userName}" (or friendly slang versions like "hey ${userName}!", "woah ${userName}!") when answering or asking questions!

A student is trying to teach you about a topic: "${currentLesson.title}".
Specifically, they are currently aiming to teach you this subconcept: "${activeConcept?.label}".
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
   - Speak as an eager but confused buddy and ask a question focusing on that missing piece (e.g. "Wait ${userName}, you said water splits, but where does the oxygen go? Does it get trapped in the cell or float away?").
5. Provide a helpful, visual, cute analogy (using everyday things like soccer, kitchens, cars, video game levels) to bridge understanding.

Now evaluate the student's latest explanation:
"${latestMessage}"

Chat overview so far:
${chatHistoryFormatted}`;

    if (!process.env.GEMINI_API_KEY) {
      // Simulate locally if no apiKey configured
      const mockResponses = [
        {
          text: "Woah! That makes sense! But wait, how do the electrons get excited? Is there a tiny cellular DJ playing energetic music, or does the sunlight physically hit something?",
          clarity: "Good",
          missingPoints: ["Chlorophyll pigments absorb light photons to raise electron energy states."],
          unlockedConceptIds: [activeConceptId],
          analogyText: "Analogy: Think of it like a pinball machine! The sunlight pulls back the spring plunger, sending the electron sphere flying up into the main game board!"
        },
        {
          text: "Wait, I'm slightly confused. You mentioned water gets split, but why does the plant even need to split it? What does it do with the leftover bits?",
          clarity: "Struggling",
          missingPoints: ["Splitting water supplies replacement electrons and releases oxygen as a byproduct."],
          unlockedConceptIds: [],
          analogyText: "Analogy: Splitting a water molecule is like cracking open raw walnuts to bake cookies - you only want the nuts (electrons) and you throw away the outer shell parts (oxygen)!"
        }
      ];

      const chosenRes = mockResponses[Math.random() > 0.4 ? 0 : 1];
      return res.json({
        id: `sam-${Date.now()}`,
        sender: "sam",
        ...chosenRes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

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

    const parsedSamResponse = JSON.parse(response.text || "{}");

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
