import React from "react";
import { GraduationCap, Library, User, Sparkles, BookOpen, ClipboardCheck, ChevronDown } from "lucide-react";
import AvatarMascot from "./AvatarMascot";

interface SideMenuProps {
  currentTab: "practice" | "vault" | "tests" | "profile";
  onTabChange: (tab: "practice" | "vault" | "tests" | "profile") => void;
  expression: "neutral" | "confused" | "amazed" | "thinking" | "happy";
  theme?: "light" | "dark";
  onOpenSupport?: () => void;
  activeCharacterId?: "sam" | "samantha" | "samson" | "sonny";
  onChangeCharacter?: (char: "sam" | "samantha" | "samson" | "sonny") => void;
}

export default function SideMenu({ 
  currentTab, 
  onTabChange, 
  expression, 
  theme = "light", 
  onOpenSupport,
  activeCharacterId = "sam",
  onChangeCharacter
}: SideMenuProps) {
  const tabs = [
    { id: "practice", label: "Practice", icon: GraduationCap },
    { id: "vault", label: "Vault", icon: Library },
    { id: "tests", label: "Tests", icon: ClipboardCheck },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  const availableCharacters = [
    { id: "sam", name: "Sam", role: "Original", flow: "Patient & encouraging", color: "#84cc16", emoji: "🟢", textClass: "text-[#4d7c0f] dark:text-[#a3e635]", activeBg: "bg-[#84cc16]/10 border-[#84cc16]/30", hoverBg: "hover:bg-[#84cc16]/10" },
    { id: "samantha", name: "Samantha", role: "The Empath", flow: "Nurturing & Socratic", color: "#ec4899", emoji: "💜", textClass: "text-[#be185d] dark:text-[#f472b6]", activeBg: "bg-[#ec4899]/10 border-[#ec4899]/30", hoverBg: "hover:bg-[#ec4899]/10" },
    { id: "samson", name: "Samson", role: "Challenger", flow: "Tough-love STEM", color: "#f97316", emoji: "🟠", textClass: "text-[#c2410c] dark:text-[#fb923c]", activeBg: "bg-[#f97316]/10 border-[#f97316]/30", hoverBg: "hover:bg-[#f97316]/10" },
    { id: "sonny", name: "Sonny", role: "Cool Peer", flow: "Casual & relatable", color: "#3b82f6", emoji: "🔵", textClass: "text-[#1d4ed8] dark:text-[#60a5fa]", activeBg: "bg-[#3b82f6]/10 border-[#3b82f6]/30", hoverBg: "hover:bg-[#3b82f6]/10" },
  ] as const;

  const isDark = theme === "dark";
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  
  const activeChar = availableCharacters.find(c => c.id === activeCharacterId) || availableCharacters[0];

  return (
    <aside className={`hidden lg:flex w-64 border-r border-zinc-200 flex-col h-screen sticky top-0 shrink-0 select-none ${isDark ? "bg-[#121318] border-zinc-800 text-white" : "bg-white text-black"}`}>
      {/* Brand Header */}
      <div className={`p-6 border-b border-zinc-200 flex flex-col items-center justify-center gap-2 relative ${isDark ? "bg-[#181a22] border-zinc-850" : "bg-[#fcfcfd]"}`}>
        
        {/* Clickable Avatar Area with dropdown toggle */}
        <button 
          id="character-toggle-desktop"
          onClick={() => setDropdownOpen(prev => !prev)}
          className="group relative flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 rounded-2xl p-1.5 transition-all hover:bg-zinc-100/30 dark:hover:bg-zinc-800/30 cursor-pointer w-full text-center"
        >
          <div className="relative">
            <AvatarMascot expression={expression} size="md" character={activeCharacterId} />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#181a22] border border-black rounded-full p-0.5 shadow-sm group-hover:scale-110 transition-transform">
              <ChevronDown className="w-3 h-3 text-black dark:text-white" />
            </div>
          </div>
          <div className="text-center mt-2.5">
            <h1 className={`text-xl font-black tracking-tight flex items-center gap-1 justify-center leading-none ${isDark ? "text-white" : "text-black"}`}>
              TEACH {activeChar.name.toUpperCase()}
            </h1>
            <p className={`text-[9px] font-extrabold uppercase tracking-wide mt-1 px-2 py-0.5 rounded-full inline-block ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
              {activeChar.role}
            </p>
          </div>
        </button>

        {/* Character Switching Dropdown Portal (Neo-brutalist custom list) */}
        {dropdownOpen && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            
            <div className={`absolute top-[92%] left-4 right-4 z-50 border-4 border-black rounded-2xl p-2 w-[calc(100%-2rem)] shadow-[4px_4px_0px_0px_#000] text-left select-none text-black ${isDark ? "bg-[#181922] text-white" : "bg-white text-black"}`}>
              <p className={`text-[9px] font-black uppercase tracking-wider px-2 pb-1.5 border-b mb-1 ${isDark ? "text-zinc-400 border-zinc-820" : "text-zinc-500 border-zinc-200"}`}>
                Switch Study Buddy
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availableCharacters.map((char) => {
                  const isCur = char.id === activeCharacterId;
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        if (onChangeCharacter) {
                          onChangeCharacter(char.id);
                        }
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer border border-transparent flex items-center gap-2.5
                        ${isCur 
                          ? isDark 
                            ? "bg-zinc-850 border-zinc-700 text-white" 
                            : "bg-zinc-100 border-zinc-200 text-black font-black"
                          : isDark
                            ? "hover:bg-zinc-800 text-zinc-300"
                            : "hover:bg-zinc-50 text-zinc-700"
                        }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full border border-black flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: char.color }}
                      >
                        <span className="text-sm">{char.emoji}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-black">{char.name}</p>
                          {isCur && <span className="text-[8px] font-bold uppercase bg-lime-400 text-black px-1 rounded">Active</span>}
                        </div>
                        <p className={`text-[9px] truncate ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{char.flow}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  id={`nav-btn-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border select-none cursor-pointer
                    ${isActive 
                      ? isDark
                        ? `${activeChar.activeBg} ${activeChar.textClass} shadow-sm`
                        : `${activeChar.activeBg} ${activeChar.textClass} shadow-sm`
                      : isDark
                        ? "bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-[#181920]/60"
                        : "bg-transparent text-gray-600 border-transparent hover:text-black hover:bg-gray-50"
                    }`}
                >
                  <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? activeChar.textClass : "text-gray-400"}`} />
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Technical help support bubble for Ayo */}
        <div 
          id="ayo-support-bubble"
          onClick={onOpenSupport}
          className={`p-4 rounded-xl border mt-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer select-none text-left
            ${isDark 
              ? "bg-[#181920]/80 border-zinc-805 hover:bg-[#232530]" 
              : "bg-gradient-to-br from-amber-50/50 to-amber-100/30 border-amber-200/50 hover:bg-amber-50"}`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
            </span>
            <p className="text-[9px] font-black uppercase text-amber-600 tracking-wider">Ayo's Support Hub</p>
          </div>
          <p className={`text-xs font-bold leading-snug ${isDark ? "text-zinc-250" : "text-zinc-800"}`}>
            Need help or got a complaint? Tell Ayo!
          </p>
          <span className={`text-[10px] font-extrabold flex items-center gap-1 mt-2 transition-colors
            ${isDark ? "text-[#a3e635] hover:text-[#84cc16]" : "text-[#4d7c0f] hover:text-[#3f620a]"}`}>
            Write message directly →
          </span>
        </div>

        {/* Info Card inside Side panel */}
        <div className={`p-4 rounded-xl border mt-6 shadow-sm ${isDark ? "bg-[#0e0f12]/80 border-zinc-805" : "bg-slate-50/80 border-slate-100"}`}>
          <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${activeChar.textClass}`}>Feynman Tip</p>
          <p className={`text-xs leading-relaxed font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            "If you can't explain it simply, you don't understand it well enough."
          </p>
        </div>
      </nav>
    </aside>
  );
}
