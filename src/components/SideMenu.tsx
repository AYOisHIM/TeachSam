import React from "react";
import { GraduationCap, Library, User, Sparkles, BookOpen, ClipboardCheck } from "lucide-react";
import AvatarMascot from "./AvatarMascot";

interface SideMenuProps {
  currentTab: "practice" | "vault" | "tests" | "profile";
  onTabChange: (tab: "practice" | "vault" | "tests" | "profile") => void;
  expression: "neutral" | "confused" | "amazed" | "thinking" | "happy";
  onTriggerPro: () => void;
  theme?: "light" | "dark";
}

export default function SideMenu({ currentTab, onTabChange, expression, onTriggerPro, theme = "light" }: SideMenuProps) {
  const tabs = [
    { id: "practice", label: "Practice", icon: GraduationCap },
    { id: "vault", label: "Vault", icon: Library },
    { id: "tests", label: "Tests", icon: ClipboardCheck },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  const isDark = theme === "dark";

  return (
    <aside className={`hidden lg:flex w-64 border-r-4 border-black flex-col h-screen sticky top-0 shrink-0 select-none ${isDark ? "bg-[#121318] text-white" : "bg-white text-black"}`}>
      {/* Brand Header */}
      <div className={`p-6 border-b-4 border-black flex flex-col items-center justify-center gap-2 ${isDark ? "bg-[#181a22]" : "bg-[#fcfcfd]"}`}>
        <AvatarMascot expression={expression} size="md" />
        <div className="text-center mt-1">
          <h1 className={`text-2xl font-black tracking-tight flex items-center gap-1.5 justify-center ${isDark ? "text-white" : "text-black"}`}>
            TEACH SAM
          </h1>
          <p className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Teach your buddy
          </p>
        </div>
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        <ul className="space-y-3">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  id={`nav-btn-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-sm transition-all border-4 select-none
                    ${isActive 
                      ? "bg-[#84cc16] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]" 
                      : isDark
                        ? "bg-[#181920] text-gray-300 border-transparent hover:border-white hover:bg-zinc-805 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                        : "bg-white text-gray-700 border-transparent hover:border-black hover:bg-gray-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                >
                  <IconComponent className="w-5 h-5 shrink-0" />
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Info Card inside Side panel */}
        <div className={`p-4 rounded-2xl border-4 border-black mt-6 shadow-[2px_2px_0px_0px_#000] ${isDark ? "bg-[#0e0f12]" : "bg-slate-50"}`}>
          <p className="text-xs font-black uppercase text-[#84cc16] mb-1">Feynman Tip</p>
          <p className={`text-xs leading-relaxed font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            "If you can't explain it simply, you don't understand it well enough."
          </p>
        </div>
      </nav>

      {/* Get Pro Promo panel matching screenshot */}
      <div className={`p-4 border-t-4 border-black ${isDark ? "bg-[#0e0f12]" : "bg-slate-100"}`}>
        <button
          id="btn-get-pro"
          onClick={onTriggerPro}
          className="w-full bg-[#84cc16] text-black font-black text-sm uppercase py-3.5 px-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-white fill-white animate-pulse" />
          GET PRO
        </button>
      </div>
    </aside>
  );
}
