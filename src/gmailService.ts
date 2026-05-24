import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App for Authenticated workspace actions
const app = initializeApp(firebaseConfig);
export const googleAuth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Gmail Scopes
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.send");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Google Gmail Auth state listener
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(googleAuth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google to request Gmail Permissions
export const loginWithGmail = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(googleAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve access token from Google identity provider");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Gmail Sign In error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGmail = async () => {
  await googleAuth.signOut();
  cachedAccessToken = null;
};

// --- GMAIL API REST HELPERS ---

export interface GmailMessage {
  id: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
}

// Helper to decode Base64Url
export function decodeBase64Url(str: string): string {
  // Replace characters to make it compatible with standard Base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Pad the string with '=' if needed
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    // Decode base64
    const decoded = atob(base64);
    // Convert to UTF-8
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch (e) {
    console.error("Base64Url decoding error:", e);
    // Fallback simple atob
    try {
      return atob(base64);
    } catch {
      return "Hex/Unsupported Binary Encoding";
    }
  }
}

// Extract sender details, subject, and date from message headers
function parseHeaders(headers: any[]) {
  let sender = "Unknown Sender";
  let subject = "No Subject";
  let date = "";

  if (!headers) return { sender, subject, date };

  for (const header of headers) {
    const name = header.name?.toLowerCase();
    if (name === "from") {
      sender = header.value || sender;
    } else if (name === "subject") {
      subject = header.value || subject;
    } else if (name === "date") {
      date = header.value || date;
    }
  }
  return { sender, subject, date };
}

// Recursively traverse payload parts to extract body contents
function extractBody(payload: any): string {
  if (!payload) return "";

  // 1. Check direct body data if no parts
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  // 2. Iterate through parts
  if (payload.parts) {
    let textBody = "";
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        textBody += decodeBase64Url(part.body.data) + "\n";
      } else if (part.mimeType === "text/html" && part.body && part.body.data && !textBody) {
        // Fallback to HTML if plain text isn't available
        const html = decodeBase64Url(part.body.data);
        // Stripping basic tags for readable plaintext
        textBody += html.replace(/<[^>]*>/g, " ") + "\n";
      } else if (part.parts) {
        textBody += extractBody(part) + "\n";
      }
    }
    if (textBody.trim()) return textBody;
  }

  return "";
}

// List Gmail threads / messages
export const fetchLatestEmails = async (token: string, query?: string): Promise<GmailMessage[]> => {
  try {
    const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8${qParam}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!listRes.ok) {
      throw new Error(`Gmail API returned status: ${listRes.status}`);
    }

    const listData = await listRes.json();
    const messageStubs = listData.messages || [];
    const fullMessages: GmailMessage[] = [];

    // Fetch details of each message sequentially (or in batch limit 8)
    for (const stub of messageStubs) {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const { sender, subject, date } = parseHeaders(detail.payload?.headers || []);
          const bodyText = extractBody(detail.payload);

          fullMessages.push({
            id: detail.id,
            sender,
            subject,
            date: date ? new Date(date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent",
            snippet: detail.snippet || "",
            bodyText: bodyText || detail.snippet || ""
          });
        }
      } catch (err) {
        console.error(`Error loading detail for message ${stub.id}:`, err);
      }
    }

    return fullMessages;
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    throw error;
  }
};

// Compose and Send Email with user notes / Feynman analytics
export const sendGmailMessage = async (
  token: string, 
  to: string, 
  subject: string, 
  bodyHtml: string
): Promise<boolean> => {
  try {
    const rfc822 = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      bodyHtml
    ].join("\r\n");

    // Convert RF2822 to base64url safe string
    const encodedEmail = btoa(unescape(encodeURIComponent(rfc822)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: encodedEmail })
      }
    );

    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Status ${sendRes.status}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to send Gmail message:", error);
    throw error;
  }
};
