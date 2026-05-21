import React from "react";
import { motion } from "motion/react";

interface AvatarMascotProps {
  expression: "neutral" | "confused" | "amazed" | "thinking" | "happy";
  size?: "sm" | "md" | "lg" | "xl";
}

export default function AvatarMascot({ expression, size = "md" }: AvatarMascotProps) {
  const getDimensions = () => {
    switch (size) {
      case "sm": return "w-10 h-10 border-2 shadow-[2px_2px_0px_0px_#000]";
      case "md": return "w-16 h-16 border-4 shadow-[3px_3px_0px_0px_#000]";
      case "lg": return "w-28 h-28 border-4 shadow-[4px_4px_0px_0px_#000]";
      case "xl": return "w-40 h-40 border-4 shadow-[5px_5px_0px_0px_#000]";
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
      style={{ backgroundColor: "#acf847" }} // Vibrant lime green background matching neo-brutalist theme
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

          {/* White Torso / Body - organic hand-drawn line extending to bottom */}
          <path 
            d="M 36,73 C 32,84 30,94 32,103 L 68,103 C 70,94 68,84 64,73 Z" 
            fill="#ffffff" 
            stroke="#000000" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

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

          {/* Blush on cheeks - Pink cute circles adding extreme polish and details */}
          {(expression === "happy" || expression === "amazed") && (
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
            {expression === "confused" && (
              <>
                {/* Slanted tilted worried brows */}
                <motion.path d="M 30,34 Q 35,37 39,39" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
                <motion.path d="M 70,34 Q 65,37 61,39" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            )}
            {expression === "thinking" && (
              <>
                {/* One brow up, one brow down */}
                <motion.path d="M 29,32 Q 35,30 40,33" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" animate={{ y: [0, -1, 0] }} transition={{ repeat: Infinity, duration: 2 }} />
                <motion.path d="M 71,36 Q 66,37 61,35" stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            )}
            {expression === "amazed" && (
              <>
                {/* Highly curved excited eyebrows floating high */}
                <motion.path d="M 28,31 Q 35,24 41,31" stroke="#000" strokeWidth="3.2" strokeLinecap="round" fill="none" animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                <motion.path d="M 72,31 Q 65,24 59,31" stroke="#000" strokeWidth="3.2" strokeLinecap="round" fill="none" animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
              </>
            )}
            {(expression === "happy" || expression === "neutral") && (
              <>
                {/* Soft natural flat-curved brows */}
                <path d="M 29,35 Q 35,32 40,35" stroke="#000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 71,35 Q 65,32 60,35" stroke="#000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            )}
          </g>

          {/* Eyes - situation far apart, typical to the uploaded character */}
          <g id="eyes">
            {expression === "confused" && (
              <>
                {/* Worried squiggles/scrawls */}
                <path d="M 32,41 L 40,47 M 40,41 L 32,47" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
                <path d="M 60,41 L 68,47 M 68,41 L 60,47" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
              </>
            )}
            {expression === "amazed" && (
              <>
                {/* Shiny starry/sparkly eyes styled with multi-point stars! */}
                <path d="M 35,38 L 37,42 L 41,40 L 39,44 L 43,46 L 39,48 L 41,52 L 37,50 L 35,54 L 33,50 L 29,52 L 31,48 L 27,46 L 31,44 L 29,40 L 33,42 Z" fill="#000000" />
                <path d="M 65,38 L 67,42 L 71,40 L 69,44 L 73,46 L 69,48 L 71,52 L 67,50 L 65,54 L 63,50 L 59,52 L 61,48 L 57,46 L 61,44 L 59,40 L 63,42 Z" fill="#000000" />
                {/* Sparkle highlights */}
                <circle cx="35" cy="46" r="1.5" fill="#ffffff" />
                <circle cx="65" cy="46" r="1.5" fill="#ffffff" />
              </>
            )}
            {expression === "thinking" && (
              <>
                {/* Eyes focused sideways and slightly upwards */}
                <circle cx="38" cy="42" r="4" fill="#000000" />
                <circle cx="64" cy="42" r="4" fill="#000000" />
                <circle cx="39.5" cy="40.5" r="1" fill="#ffffff" />
                <circle cx="65.5" cy="40.5" r="1" fill="#ffffff" />
              </>
            )}
            {(expression === "happy" || expression === "neutral") && (
              <>
                {/* Dots situated far apart matching dream style face, with cute tiny white light sparkles */}
                <circle cx="35" cy="44" r="4" fill="#000000" />
                <circle cx="65" cy="44" r="4" fill="#000000" />
                <circle cx="36" cy="42.5" r="1" fill="#ffffff" />
                <circle cx="66" cy="42.5" r="1" fill="#ffffff" />
              </>
            )}
          </g>

          {/* Mouth - friendly long line smile matching user's image */}
          <g id="mouth">
            {expression === "confused" && (
              <path d="M 38,58 Q 50,67 62,58" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
            )}
            {expression === "thinking" && (
              <path d="M 41,59 H 59" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
            )}
            {expression === "amazed" && (
              <motion.path 
                d="M 36,56 Q 50,72 64,56 Z" 
                fill="#000000" 
                stroke="#000000" 
                strokeWidth="2.5"
                animate={{ scaleY: [0.9, 1.1, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {expression === "happy" && (
              <path d="M 34,53 Q 50,66 66,53" fill="none" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
            )}
            {expression === "neutral" && (
              <path d="M 38,55 Q 50,64 62,55" fill="none" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" />
            )}
          </g>
        </svg>
      </div>
    </motion.div>
  );
}
