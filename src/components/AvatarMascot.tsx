import React from "react";
import { motion } from "motion/react";

interface AvatarMascotProps {
  expression: "neutral" | "confused" | "amazed" | "thinking" | "happy";
  size?: "sm" | "md" | "lg" | "xl";
  character?: "sam" | "samantha" | "samson" | "sonny";
}

export default function AvatarMascot({ expression, size = "md", character = "sam" }: AvatarMascotProps) {
  const getDimensions = () => {
    switch (size) {
      case "sm": return "w-10 h-10 border-2 shadow-[2px_2px_0px_0px_#000]";
      case "md": return "w-16 h-16 border-4 shadow-[3px_3px_0px_0px_#000]";
      case "lg": return "w-28 h-28 border-4 shadow-[4px_4px_0px_0px_#000]";
      case "xl": return "w-40 h-40 border-4 shadow-[5px_5px_0px_0px_#000]";
    }
  };

  const getBackgroundColor = () => {
    switch (character) {
      case "samantha": return "#fbcfe8"; // Pink themed Samantha
      case "samson": return "#fdba74"; // Orange themed Samson
      case "sonny": return "#93c5fd"; // Blue themed Sonny
      default: return "#acf847"; // Green themed Sam
    }
  };

  const borderClass = "border-black select-none overflow-hidden relative rounded-full flex items-center justify-center " + getDimensions();

  // physical responsive bobbing
  const containerVariants = {
    animate: {
      y: [0, -4, 0],
      rotate: expression === "confused" ? [-2, 2, -2] : expression === "happy" ? [-1, 1, -1] : [0, -1, 0, 1, 0],
      scale: expression === "amazed" ? [1, 1.05, 1] : [1, 1.01, 1],
      transition: {
        duration: expression === "thinking" ? 3.5 : expression === "amazed" ? 2 : 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className={borderClass}
      variants={containerVariants}
      animate="animate"
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {/* Hand-drawn character with wobbly head, detailed facial expressions, blush, eyebrows, accessories */}
      <div className="w-full h-full relative">
        <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
          
          {/* Animated Think-Swirl or Little electric lightbulb above his head */}
          {expression === "thinking" && (
            <g id="think-bubble">
              <motion.circle 
                cx="50" 
                cy="10" 
                r="3" 
                fill="#3b82f6" 
                stroke="#000" 
                strokeWidth="1"
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <motion.circle 
                cx="58" 
                cy="14" 
                r="1.5" 
                fill="#3b82f6" 
                stroke="#000" 
                strokeWidth="1"
                animate={{ scale: [1, 0.6, 1], opacity: [0.8, 0.4, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            </g>
          )}

          {/* Confused sweat drop with slide down */}
          {expression === "confused" && (
            <motion.path 
              d="M 82,32 C 82,24 75,27 75,32 C 75,37 82,39 82,32 Z" 
              fill="#06b6d4" 
              stroke="#000"
              strokeWidth="2"
              animate={{ y: [0, 10, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
          )}

          {/* Sparkles / Stars for amazed state behind Mascot head */}
          {expression === "amazed" && (
            <g>
              <motion.path 
                d="M 14,20 L 17,25 L 23,23 L 19,28 L 21,33 L 16,30 L 11,32 L 14,27 L 10,22 L 15,23 Z" 
                fill="#eab308" 
                stroke="#000" 
                strokeWidth="1.5" 
                animate={{ scale: [1, 1.3, 1], rotate: [0, 20, 0], y: [0, -3, 0] }} 
                transition={{ repeat: Infinity, duration: 2 }} 
              />
              <motion.path 
                d="M 86,22 L 89,27 L 95,25 L 91,30 L 93,35 L 88,32 L 83,34 L 86,29 L 81,24 L 87,25 Z" 
                fill="#eab308" 
                stroke="#000" 
                strokeWidth="1.5" 
                animate={{ scale: [1.3, 1, 1.3], rotate: [0, -20, 0], y: [0, 3, 0] }} 
                transition={{ repeat: Infinity, duration: 2 }} 
              />
            </g>
          )}

          {/* Samson broad build shoulder backing */}
          {character === "samson" && (
            <path 
              d="M 18,74 C 18,84 10,95 10,103 L 90,103 C 90,95 82,84 82,74 Z" 
              fill="#d1d5db" 
              stroke="#000000" 
              strokeWidth="4.5" 
              strokeLinejoin="round" 
            />
          )}

          {/* White Torso / Body - organic hand-drawn line extending to bottom */}
          <path 
            d="M 36,73 C 32,84 30,94 32,103 L 68,103 C 70,94 68,84 64,73 Z" 
            fill="#ffffff" 
            stroke="#000000" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Samantha Flowing Hair (Back Side layer) */}
          {character === "samantha" && (
            <g id="samantha-back-hair">
              <path 
                d="M 23,45 C 10,48 11,80 16,84 C 20,88 28,78 28,68 Z" 
                fill="#f472b6" 
                stroke="#000" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d="M 77,45 C 90,48 89,80 84,84 C 80,88 72,78 72,68 Z" 
                fill="#f472b6" 
                stroke="#000" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </g>
          )}

          {/* Samson Dreadlocks Hair (Back Side layer) */}
          {character === "samson" && (
            <g id="samson-dreadlocks-back">
              {/* Left side locks */}
              <path d="M 23,45 C 13,42 6,55 8,72 C 9,84 14,84 16,74 C 18,65 24,56 24,46 Z" fill="#270e01" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 18,52 C 10,50 4,64 6,80 C 8,92 12,90 14,80 C 16,72 21,62 21,52 Z" fill="#1c0a00" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 14,60 C 6,58 2,72 4,88 C 6,98 10,96 11,88 C 12,82 17,70 17,60 Z" fill="#270e01" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Right side locks */}
              <path d="M 77,45 C 87,42 94,55 92,72 C 91,84 86,84 84,74 C 82,65 76,56 76,46 Z" fill="#270e01" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 82,52 C 90,50 96,64 94,80 C 92,92 88,90 86,80 C 84,72 79,62 79,52 Z" fill="#1c0a00" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 86,60 C 94,58 98,72 96,88 Q 94,98 90,96 C 89,88 84,82 84,60 Z" fill="#270e01" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Extras */}
              <path d="M 27,62 C 22,70 20,80 22,90 C 24,94 28,94 28,88 Z" fill="#1c0a00" stroke="#000" strokeWidth="3" />
              <path d="M 73,62 C 78,70 80,80 78,90 C 76,94 72,94 72,88 Z" fill="#1c0a00" stroke="#000" strokeWidth="3" />
            </g>
          )}

          {/* Mascot Head - Slightly rotated, hand-drawn wobbly white shape from image */}
          <motion.path 
            d="M 50,18 Q 23,19 22,46 Q 21,72 50,71 Q 79,70 78,44 Q 77,18 50,18 Z" 
            fill="#ffffff" 
            stroke="#000000" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            animate={expression === "thinking" ? { rotate: [-1.5, 1.5, -1.5] } : {}}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          />

          {/* Sonny Spikes hair */}
          {character === "sonny" && (
            <g id="sonny-spikes">
              <path 
                d="M 27,20 L 30,6 L 38,18 L 44,4 L 50,18 L 56,4 L 62,18 L 69,6 L 73,20" 
                fill="#2563eb" 
                stroke="#000" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </g>
          )}

          {/* Samson top hair dreadlocks */}
          {character === "samson" && (
            <g id="samson-top-hair-dreads">
              {/* Rugged heavy dreadlock loops on top and crown */}
              <path d="M 23,32 C 15,10 32,4 42,16 C 30,8 18,18 23,32 Z" fill="#270e01" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 77,32 C 85,10 68,4 58,16 C 70,8 82,18 77,32 Z" fill="#270e01" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Center thick tie of dread locks */}
              <path d="M 35,16 C 35,-2 65,-2 65,16 C 60,6 40,6 35,16 Z" fill="#1c0a00" stroke="#000" strokeWidth="3" strokeLinecap="round" />
              <path d="M 40,15 C 44,5 56,5 60,15" stroke="#000" strokeWidth="3" fill="none" />
              
              {/* Overlapping dreadlocks details */}
              <path d="M 26,30 C 26,16 38,15 44,24" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M 74,30 C 74,16 62,15 56,24" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />

              {/* Forehead dropping braids / dreads */}
              <path d="M 33,28 C 30,35 32,45 36,46 C 38,40 37,32 33,28 Z" fill="#1c0a00" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
              <path d="M 67,28 C 70,35 68,45 64,46 C 62,40 63,32 67,28 Z" fill="#1c0a00" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            </g>
          )}

          {/* Sam Grad cap on top of head */}
          {character === "sam" && (
            <g id="grad-cap">
              <polygon points="50,4 72,13 50,22 28,13" fill="#1e293b" stroke="#000" strokeWidth="4.5" strokeLinejoin="round" />
              <polygon points="40,16 40,21 60,21 60,16" fill="#1e293b" stroke="#000" strokeWidth="4" />
              <path d="M 50,13 L 34,15 L 32,24" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="32" cy="25" r="2.5" fill="#eab308" stroke="#000" strokeWidth="1" />
            </g>
          )}

          {/* Samantha Pink Bow */}
          {character === "samantha" && (
            <g id="samantha-bow" transform="translate(68, 22) rotate(15)">
              <polygon points="0,0 -14,-10 -14,10" fill="#db2777" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
              <polygon points="0,0 14,-10 14,10" fill="#db2777" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="0" cy="0" r="5.5" fill="#f472b6" stroke="#000" strokeWidth="3" />
            </g>
          )}

          {/* Sonny Retro headphones headband */}
          {character === "sonny" && (
            <g id="sonny-headphones-band">
              <path 
                d="M 22,46 C 22,12 78,12 78,46" 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="7" 
                strokeLinecap="round" 
              />
              <path 
                d="M 22,46 C 22,12 78,12 78,46" 
                fill="none" 
                stroke="#000" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
              {/* Ear Cups */}
              <rect x="11" y="38" width="11" height="19" rx="5" fill="#2563eb" stroke="#000000" strokeWidth="3.5" />
              <rect x="78" y="38" width="11" height="19" rx="5" fill="#2563eb" stroke="#000000" strokeWidth="3.5" />
            </g>
          )}

          {/* Blush on cheeks - Pink cute circles adding extreme polish and details */}
          {(expression === "happy" || expression === "amazed") && character !== "samson" && (
            <g id="blush">
              <motion.circle 
                cx="29" 
                cy="51" 
                r="4.5" 
                fill="#f43f5e" 
                opacity="0.5" 
                animate={{ scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.circle 
                cx="71" 
                cy="51" 
                r="4.5" 
                fill="#f43f5e" 
                opacity="0.5" 
                animate={{ scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.25 }}
              />
            </g>
          )}

          {/* Eyebrows - highly detailed and responsive addition requested! */}
          <g id="eyebrows">
            {character === "samson" ? (
              <>
                {/* Thick, dark, highly angled stern eyebrows for Samson */}
                <path d="M 23,34 L 42,38" stroke="#1c0a00" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M 77,34 L 58,38" stroke="#1c0a00" strokeWidth="4.5" strokeLinecap="round" />
              </>
            ) : expression === "confused" ? (
              <>
                {/* Slanted tilted worried brows */}
                <motion.path d="M 30,34 Q 35,37 39,39" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
                <motion.path d="M 70,34 Q 65,37 61,39" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : expression === "thinking" ? (
              <>
                {/* One brow up, one brow down */}
                <motion.path d="M 29,32 Q 35,30 40,33" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" animate={{ y: [0, -1, 0] }} transition={{ repeat: Infinity, duration: 2 }} />
                <motion.path d="M 71,36 Q 66,37 61,35" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : expression === "amazed" ? (
              <>
                {/* Highly curved excited eyebrows floating high */}
                <motion.path d="M 28,31 Q 35,24 41,31" stroke="#000" strokeWidth="3.2" strokeLinecap="round" fill="none" animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                <motion.path d="M 72,31 Q 65,24 59,31" stroke="#000" strokeWidth="3.2" strokeLinecap="round" fill="none" animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
              </>
            ) : (
              <>
                {/* Soft natural flat-curved brows */}
                <path d="M 29,35 Q 35,32 40,35" stroke="#000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 71,35 Q 65,32 60,35" stroke="#000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            )}
          </g>

          {/* Eyes - situation far apart, typical to the uploaded character */}
          <g id="eyes">
            {character === "samson" ? (
              <>
                {/* Thoroughly manly determined, stern eyes with focus scleras */}
                <path d="M 27,45 C 30,41 38,41 41,45 C 38,47 30,47 27,45 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M 73,45 C 70,41 62,41 59,45 C 62,47 70,47 73,45 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="34" cy="44.2" r="2.8" fill="#000000" />
                <circle cx="66" cy="44.2" r="2.8" fill="#000000" />
                <circle cx="33.5" cy="43.5" r="0.8" fill="#ffffff" />
                <circle cx="65.5" cy="43.5" r="0.8" fill="#ffffff" />
              </>
            ) : expression === "confused" && character !== "sonny" ? (
              <>
                {/* Worried squiggles/scrawls */}
                <path d="M 32,41 L 40,47 M 40,41 L 32,47" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
                <path d="M 60,41 L 68,47 M 68,41 L 60,47" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
              </>
            ) : expression === "amazed" && character !== "sonny" ? (
              <>
                {/* Shiny starry/sparkly eyes styled with multi-point stars! */}
                <path d="M 35,38 L 37,42 L 41,40 L 39,44 L 43,46 L 39,48 L 41,52 L 37,50 L 35,54 L 33,50 L 29,52 L 31,48 L 27,46 L 31,44 L 29,40 L 33,42 Z" fill="#000000" />
                <path d="M 65,38 L 67,42 L 71,40 L 69,44 L 73,46 L 69,48 L 71,52 L 67,50 L 65,54 L 63,50 L 59,52 L 61,48 L 57,46 L 61,44 L 59,40 L 63,42 Z" fill="#000000" />
                {/* Sparkle highlights */}
                <circle cx="35" cy="46" r="1.5" fill="#ffffff" />
                <circle cx="65" cy="46" r="1.5" fill="#ffffff" />
              </>
            ) : expression === "thinking" && character !== "sonny" ? (
              <>
                {/* Eyes focused sideways and slightly upwards */}
                <circle cx="38" cy="42" r="4" fill="#000000" />
                <circle cx="64" cy="42" r="4" fill="#000000" />
                <circle cx="39.5" cy="40.5" r="1" fill="#ffffff" />
                <circle cx="65.5" cy="40.5" r="1" fill="#ffffff" />
              </>
            ) : (
              character !== "sonny" && (
                <>
                  {/* Dots situated far apart matching dream style face, with cute tiny white light sparkles */}
                  <circle cx="35" cy="44" r="4" fill="#000000" />
                  <circle cx="65" cy="44" r="4" fill="#000000" />
                  <circle cx="36" cy="42.5" r="1" fill="#ffffff" />
                  <circle cx="66" cy="42.5" r="1" fill="#ffffff" />
                </>
              )
            )}
          </g>

          {/* Sonny COOL SHADES covering the eyes */}
          {character === "sonny" && (
            <g id="sonny-shades">
              <polygon points="23,39 46,39 43,51 26,51" fill="#111827" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
              <polygon points="54,39 77,39 74,51 57,51" fill="#111827" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
              <line x1="46" y1="42" x2="54" y2="42" stroke="#000" strokeWidth="4" />
              <line x1="23" y1="41" x2="18" y2="44" stroke="#000" strokeWidth="3.5" />
              <line x1="77" y1="41" x2="82" y2="44" stroke="#000" strokeWidth="3.5" />
              {/* Reflective shine stripes */}
              <line x1="28" y1="42" x2="35" y2="48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="59" y1="42" x2="66" y2="48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* Sam Elegant Round GLASSES */}
          {character === "sam" && (
            <g id="sam-glasses">
              <circle cx="35" cy="44" r="10.5" fill="none" stroke="#000000" strokeWidth="3.5" />
              <circle cx="65" cy="44" r="10.5" fill="none" stroke="#000000" strokeWidth="3.5" />
              <line x1="45.5" y1="44" x2="54.5" y2="44" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
              <line x1="24.5" y1="44" x2="19.5" y2="46" stroke="#000005" strokeWidth="3" />
              <line x1="75.5" y1="44" x2="80.5" y2="46" stroke="#000005" strokeWidth="3" />
            </g>
          )}



           {/* Mouth - friendly long line smile matching user's image */}
          <g id="mouth">
            {character === "samson" ? (
              /* Flat stern mouth line under mustache */
              <path d="M 42,58 H 58" fill="none" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
            ) : expression === "confused" ? (
              <path d="M 38,58 Q 50,67 62,58" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
            ) : expression === "thinking" ? (
              <path d="M 41,59 H 59" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
            ) : expression === "amazed" ? (
              <motion.path 
                d="M 36,56 Q 50,72 64,56 Z" 
                fill="#000000" 
                stroke="#000000" 
                strokeWidth="2.5"
                animate={{ scaleY: [0.9, 1.1, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            ) : expression === "happy" ? (
              <path d="M 34,53 Q 50,66 66,53" fill="none" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
            ) : (
              <path d="M 38,55 Q 50,64 62,55" fill="none" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" />
            )}
          </g>
        </svg>
      </div>
    </motion.div>
  );
}
