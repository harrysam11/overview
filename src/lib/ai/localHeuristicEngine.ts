import type { Habit } from "@/lib/data/habitStore";

export interface HeuristicInsight {
  title: string;
  category: "analysis" | "stack" | "motivation" | "qna";
  content: string;
}

const STOIC_QUOTES = [
  {
    author: "Marcus Aurelius",
    quote: "At dawn, when you have trouble getting out of bed, tell yourself: 'I have to go to work—as a human being. What do I have to complain of, if I'm going to do what I was born for?'",
    principle: "Overcome morning inertia by connecting habits to identity and purpose.",
  },
  {
    author: "Epictetus",
    quote: "First say to yourself what you would be; and then do what you have to do.",
    principle: "Small daily actions cast votes for the type of person you wish to become.",
  },
  {
    author: "Seneca",
    quote: "We suffer more often in imagination than in reality. Begin at once to live, and count each separate day as a separate life.",
    principle: "The resistance before starting a habit is always larger in your mind than the execution itself.",
  },
  {
    author: "James Clear",
    quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
    principle: "Make your good habits obvious, attractive, easy, and satisfying.",
  },
];

export const generateHeuristicHabitAnalysis = (habits: Habit[]): string => {
  if (!habits || habits.length === 0) {
    return [
      "### Habit System Assessment",
      "No active habits tracked yet. To establish a solid foundation:",
      "1. **Start with 1 Keystone Habit:** Choose a single keystone routine (e.g. 15-minute morning walk or daily journal).",
      "2. **The 2-Minute Rule:** Scale down the entry friction until it takes less than 2 minutes to begin.",
      "3. **Track Daily:** Consistency beats intensity every time.",
    ].join("\n\n");
  }

  const doHabits = habits.filter((h) => h.type === "do");
  const dontHabits = habits.filter((h) => h.type === "dont");

  const sections: string[] = [];

  sections.push("### 📊 Local System Analysis");
  sections.push(
    `You are currently managing **${habits.length} habits** (${doHabits.length} constructive habits, ${dontHabits.length} boundary/quit habits).`
  );

  // Workload and cognitive fatigue assessment
  if (habits.length > 7) {
    sections.push(
      "⚠️ **High Cognitive Load Detected:** Tracking more than 7 habits simultaneously increases willpower friction and abandonment risk. Consider temporarily focusing on your top 3 keystone habits until they become fully automatic."
    );
  } else if (habits.length <= 3) {
    sections.push(
      "✅ **Optimal Focus Zone:** Maintaining 1–3 focused habits maximizes automaticity and willpower preservation. You have high odds of lasting habit compounding."
    );
  } else {
    sections.push(
      "⚖️ **Balanced Routine:** Your routine volume is within sustainable limits. Ensure your physical environment supports each habit trigger."
    );
  }

  // Constructive insights
  sections.push("### 💡 3 Actionable Recommendations");
  sections.push(
    [
      `1. **Keystone Anchor:** Anchor your primary habit (${doHabits[0]?.name || "daily review"}) immediately after a fixed daily anchor like making coffee or brushing teeth.`,
      `2. **Boundary Protection:** For ${dontHabits.length > 0 ? `"${dontHabits[0].name}"` : "negative impulses"}, introduce a 10-minute delay pause to let the dopamine craving peak and subside.`,
      "3. **Never Miss Twice:** If an unexpected disruption breaks your streak, scale down the habit to a 30-second version rather than skipping completely.",
    ].join("\n")
  );

  return sections.join("\n\n");
};

export const generateHeuristicHabitStack = (habits: Habit[]): string => {
  if (!habits || habits.length === 0) {
    return [
      "### Habit Stacking Blueprint",
      "Habit stacking formula: *After [CURRENT HABIT], I will [NEW HABIT].*",
      "Add at least 1 habit in your tracker to generate a customized sequence.",
    ].join("\n\n");
  }

  const doHabits = habits.filter((h) => h.type === "do");
  const habitNames = doHabits.map((h) => h.name);

  const morningHabits = habitNames.slice(0, Math.ceil(habitNames.length / 2));
  const eveningHabits = habitNames.slice(Math.ceil(habitNames.length / 2));

  const sections: string[] = [];
  sections.push("### ⚡ Custom Habit Stacking Protocol");
  sections.push("By chaining habits together, the completion of one behavior triggers the next without decision fatigue.");

  if (morningHabits.length > 0) {
    sections.push("#### ☀️ Morning Momentum Stack");
    let currentCue = "I wake up and drink a glass of water";
    const morningStackLines = morningHabits.map((name) => {
      const line = `- **After** ${currentCue}, **I will** ${name}.`;
      currentCue = `I finish ${name}`;
      return line;
    });
    sections.push(morningStackLines.join("\n"));
  }

  if (eveningHabits.length > 0) {
    sections.push("#### 🌙 Evening Wind-down Stack");
    let currentCue = "I finish my evening meal or close my laptop";
    const eveningStackLines = eveningHabits.map((name) => {
      const line = `- **After** ${currentCue}, **I will** ${name}.`;
      currentCue = `I complete ${name}`;
      return line;
    });
    sections.push(eveningStackLines.join("\n"));
  }

  sections.push("#### 🎯 Friction Reduction Tip");
  sections.push("Lay out the physical tools (e.g. book, shoes, journal) the evening before so beginning the first step requires zero startup effort.");

  return sections.join("\n\n");
};

export const generateHeuristicStoicBoost = (habits: Habit[]): string => {
  const quote = STOIC_QUOTES[Math.floor(Math.random() * STOIC_QUOTES.length)];
  const habitContext = habits.length > 0 ? `your commitment to "${habits[0].name}"` : "your daily practice";

  return [
    "### 🏛️ Stoic Reflection & Daily Focus",
    `> "${quote.quote}"`,
    `— **${quote.author}**`,
    `**Core Principle:** ${quote.principle}`,
    `**Today's Application:** When resistance whispers that you can postpone ${habitContext}, recognize that discipline is not a burden but freedom from impulsive drift. Commit to just 5 focused minutes right now.`,
  ].join("\n\n");
};

export const generateHeuristicResponse = (prompt: string, habits: Habit[]): string => {
  const lower = prompt.toLowerCase();

  if (lower.includes("analyze") || lower.includes("overview") || lower.includes("review") || lower.includes("score")) {
    return generateHeuristicHabitAnalysis(habits);
  }
  if (lower.includes("stack") || lower.includes("routine") || lower.includes("morning") || lower.includes("evening") || lower.includes("schedule")) {
    return generateHeuristicHabitStack(habits);
  }
  if (lower.includes("stoic") || lower.includes("motivation") || lower.includes("inspire") || lower.includes("boost") || lower.includes("quote")) {
    return generateHeuristicStoicBoost(habits);
  }
  if (lower.includes("procrastinat") || lower.includes("lazy") || lower.includes("resist") || lower.includes("tired")) {
    return [
      "### 🛡️ Defeating Habit Resistance",
      "Resistance is highest in the first 120 seconds. Use the **5-Minute Rule**:",
      "1. Tell yourself you only have to do the habit for 5 minutes.",
      "2. If you genuinely want to stop after 5 minutes, you have full permission.",
      "3. In 85% of cases, breaking the activation barrier carries you through completion.",
    ].join("\n\n");
  }
  if (lower.includes("streak") || lower.includes("break") || lower.includes("miss")) {
    return [
      "### 🔄 The 'Never Miss Twice' Rule",
      "- One missed day is an accident; two missed days is the start of a new habit.",
      "- If life disrupts your schedule today, complete an abbreviated 1-minute version.",
      "- Protecting the identity of being someone who shows up is far more important than the scale of the execution.",
    ].join("\n\n");
  }

  // General coaching advice
  return [
    `### 🧠 Habit Coach Guidance on "${prompt.trim()}"`,
    `When approaching habits in HabitFlow:`,
    `- **Clarity:** Define the exact trigger, time, and location.`,
    `- **Micro-steps:** Make the starting friction so tiny that you cannot talk yourself out of it.`,
    habits.length > 0
      ? `- **Current Context:** You have ${habits.length} habits logged. Keep refining the consistency of your keystone routine before adding new obligations.`
      : `- **Next Action:** Add your first habit in the tracker to unlock personalized momentum and stacking diagnostics.`,
  ].join("\n\n");
};
