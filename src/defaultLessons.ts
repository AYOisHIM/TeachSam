import { Lesson } from "./types";

export const DEFAULT_LESSONS: Lesson[] = [
  {
    id: "photosynthesis-basics",
    title: "Cell Biology Basics",
    subject: "Biology",
    content: `Photosynthesis is the process used by plants and other organisms to convert light energy into chemical energy that can later be released to fuel the organisms' activities. This chemical energy is stored in carbohydrate molecules, such as sugars, which are synthesized from carbon dioxide and water.

The process consists of two primary stages:
1. Light-Dependent Reactions:
This stage takes place in the thylakoid membranes of chloroplasts. It begins when light is absorbed by chlorophyll, exciting electrons. Water molecules (H2O) are split (photolysis) to replace these electrons, releasing oxygen gas (O2) as a byproduct. The energy from the excited electrons is used to pump protons and drive the synthesis of ATP (by ATP synthase) and NADPH. These two molecules act as energy carriers.

2. Light-Independent Reactions (Calvin Cycle):
This stage takes place in the stroma of chloroplasts. It does not require light directly but uses the ATP and NADPH generated in the first stage. Carbon dioxide (CO2) is captured from the atmosphere and combined with RuBP (a 5-carbon sugar) in a process called carbon fixation, catalyzed by the enzyme Rubisco. Through a series of reduction steps using NADPH and ATP, G3P (a 3-carbon sugar) is produced. Two G3P molecules can combine to form glucose (C6H12O6), providing fuel for the plant.`,
    status: "In Progress",
    progress: 45,
    dateAdded: "2 days ago",
    numPages: 14,
    concepts: [
      {
        id: "chlorophyll-capture",
        label: "Chlorophyll Capture",
        description: "How chlorophyll absorbs light energy in the thylakoid membrane to mobilize excited electrons.",
        status: "unlocked",
        analogy: "Think of chlorophyll like a tiny solar panel that catches sunlight to kick off a power grid!",
        connections: ["water-splitting"]
      },
      {
        id: "water-splitting",
        label: "Water Splitting",
        description: "Water (H2O) molecules are broken down to release oxygen as a byproduct and provide electrons.",
        status: "active",
        connections: ["atp-nadph-carriers"]
      },
      {
        id: "atp-nadph-carriers",
        label: "Energy Carriers (ATP/NADPH)",
        description: "Highly energetic carrier molecules transport energy accumulated from the thylakoids down to the stroma.",
        status: "locked",
        connections: ["carbon-fixation"]
      },
      {
        id: "carbon-fixation",
        label: "Carbon Fixation (RuBP)",
        description: "Inorganic CO2 is linked down to organic RuBP by the Rubisco enzyme.",
        status: "locked",
        connections: ["glucose-synthesis"]
      },
      {
        id: "glucose-synthesis",
        label: "Glucose Fuel Synthesis",
        description: "The end stage of the Calvin Cycle where chemical power is locked into sweet glucose sugar.",
        status: "locked",
        connections: []
      }
    ]
  },
  {
    id: "quantum-physics-duality",
    title: "The Quantum Enigma",
    subject: "Physics",
    content: `Light and matter exhibit behaviors of both waves and particles depending on the context of measurement. This is known as Wave-Particle Duality.

Key Concepts:
1. Double-Slit Experiment:
When light or electrons are fired at a barrier with two slits, they form an interference pattern of light and dark bands on a screen behind the barrier. This pattern is characteristic of waves interfering with each other—constructive and destructive interference. However, if detectors are placed at the slits to observe which slit each particle passes through, the interference pattern disappears, and particles behave like simple solid bullets.

2. Wave Function and Bohr's Copenhagen Interpretation:
Physical systems do not have definite properties prior to measurement. Instead, they are represented by a wave function (Psi), which represents a superposition of all possible states. The act of observation or measurement forces the wave function to 'collapse' into a single, localized, definite state. This means the observer is intimately connected to the observed reality.`,
    status: "In Progress",
    progress: 30,
    dateAdded: "Yesterday",
    numPages: 8,
    concepts: [
      {
        id: "wave-vs-particle",
        label: "Wave-Particle Duality",
        description: "The dual nature of light and mass behaving as waves or solid discrete packets.",
        status: "active",
        connections: ["double-slit"]
      },
      {
        id: "double-slit",
        label: "Double-Slit Interference",
        description: "Firing single particles through slits to observe self-interference patterns.",
        status: "locked",
        connections: ["observer-collapse"]
      },
      {
        id: "observer-collapse",
        label: "Measurement & Collapse",
        description: "How observation forces the wave function superposition state to resolve into one reality.",
        status: "locked",
        connections: []
      }
    ]
  },
  {
    id: "market-supply-demand",
    title: "Microeconomics 101",
    subject: "Economics",
    content: `Market equilibrium is reached through the interaction of buyers and sellers, governed by the laws of supply and demand.

1. The Law of Demand:
As the price of a good increases, the quantity demanded decreases. This is due to the substitution effect (consumers search for alternatives) and the income effect (consumers feel poorer). The demand curve slopes downward.

2. The Law of Supply:
As the price of a good increases, the quantity supplied increases. Producers want to maximize profit and are willing to allocate more resources to producing higher-priced goods. The supply curve slopes upward.

3. Equilibrium:
Equilibrium occurs at the intersection of the demand and supply curves. At this price point, quantity demanded equals quantity supplied. If price is above equilibrium, a surplus occurs, forcing price decreases. If price is below, a shortage occurs, bidding prices up.`,
    status: "New",
    progress: 0,
    dateAdded: "1 week ago",
    numPages: 5,
    concepts: [
      {
        id: "law-of-demand",
        label: "The Law of Demand",
        description: "Why buyers drop purchase volume as price climbs (Substitution & Income effects).",
        status: "active",
        connections: ["law-of-supply"]
      },
      {
        id: "law-of-supply",
        label: "The Law of Supply",
        description: "Why producers rush more goods to market when pricing tags spike.",
        status: "locked",
        connections: ["market-equilibrium"]
      },
      {
        id: "market-equilibrium",
        label: "Equilibrium & Shorts",
        description: "The point where supply meets demand. Surplus and shortage stabilization.",
        status: "locked",
        connections: []
      }
    ]
  }
];
