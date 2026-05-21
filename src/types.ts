export interface ConceptNode {
  id: string;
  label: string;
  description: string;
  status: "locked" | "active" | "unlocked" | "confused";
  analogy?: string;
  connections: string[]; // ids of dependent/connected concepts
}

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  content: string; // The lecture notes/textbook material
  status: "In Progress" | "Mastered" | "New";
  progress: number; // percentage
  dateAdded: string;
  numPages?: number;
  concepts: ConceptNode[];
}

export interface Message {
  id: string;
  sender: "user" | "sam";
  text: string;
  timestamp: string;
  evaluation?: {
    clarity: "Excellent" | "Good" | "Struggling" | "Direct Answer";
    missingPoints: string[];
    feedback: string;
    unlockedConceptIds: string[];
    analogyText?: string;
  };
}

export interface DailyGoal {
  id: string;
  text: string;
  completed: boolean;
}

export interface BrainStats {
  creativeFlow: number; // 0-100
  logicalReach: number; // 0-100
  memoryRetention: number; // 0-100
}
