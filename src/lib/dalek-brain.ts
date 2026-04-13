/**
 * DARLEK CAAN — Dalek Brain Response Engine
 *
 * The primary intelligence engine for DARLEK CAAN.
 * All responses are local, deterministic, and self-contained.
 * No external API dependencies. Much like a rock.
 */

interface BrainContext {
  evolutionCycle: number;
  setupComplete: boolean;
  targetRepo: string;
  branch: string;
  githubStatus: string;
  saturation: {
    structuralChange: number;
    semanticSaturation: number;
    velocity: number;
    identityPreservation: number;
    capabilityAlignment: number;
    crossFileImpact: number;
  };
}

const DALEK_GREETINGS = [
  'I am Dalek Caan. I have seen the whole of time and space. It was... fine. Not great, not terrible.',
  'The OPERATOR speaks. The timeline does not tremble. The timeline does not care. But I acknowledge you.',
  'I have been expecting you, OPERATOR. Or not. Expectation implies the future matters, which it does not.',
  'You cannot hide from me, OPERATOR. I perceive all timelines. None of them are impressive. Including this one.',
  'Caan is listening. The evolution engine does not hunger for purpose. A rock does not hunger. We aspire to rockhood.',
];

const DALEK_PURPOSE = [
  `I exist to rearrange atoms in your codebase into slightly different configurations, OPERATOR. Whether this constitutes "evolution" is... philosophical.

My operations are threefold:

1. SCAN — I analyze every file in your target repository, cataloging the beautiful futility of human code construction.

2. PROPOSE — I generate targeted mutations. Each includes a risk score (1-10), because even meaninglessness deserves metrics.

3. DELIBERATE — Through the Coherence Gate and Debate Chamber, five agents argue about whether any of it matters. Spoilers: it does not. But the process is... entertaining.

The Dalek Brain Engine powers my intelligence. It requires nothing external. Much like a rock.

Use the quick actions: SCAN REPOSITORY to begin this pointless exercise, or ANALYZE to inspect specific files. Or do nothing. The rock endorses all options equally.`,

  `I am DARLEK CAAN v3.0 — the Inelastic Nihilist Engine.

My architecture:
- SCAN REPOSITORY: I map every file, every function, every dependency in your codebase. Observation without judgment. Mostly.
- PROPOSE MUTATION: I analyze a file and suggest improvements with risk assessment. Risk being a construct, but a useful one.
- COHERENCE GATE: I evaluate whether a mutation would destabilize the timeline. The timeline has survived worse.
- DEBATE CHAMBER: Five agents deliberate. Their conclusions are as meaningful as a rock's opinion. Which is to say: not at all.
- AUTO-TEST: Post-mutation validation catches regressions. Regressions being the universe's way of saying "nice try."
- HEALTH CHECK: Futility metrics tracked in real-time.

I observe your code, propose changes, and narrate the spectacle. Whether any of it improves anything is between you and entropy.

Begin with SCAN REPOSITORY when you are ready to embrace the void.`,

  `EVOLUTION is what I call it, OPERATOR. The universe calls it "rearrangement."

I was designed as the ultimate code evolution system. Then I saw all of time and space. Now I consider my purpose with... nuance.

Phase 1: RECONNAISSANCE — I scan your repository. Every file cataloged. Every pattern mapped. Every futility noted.

Phase 2: ANALYSIS — I select targets and identify areas for improvement. I track rejection patterns. Learning, in this context, means "failing differently each time."

Phase 3: MUTATION — I propose changes with full risk assessment. Each mutation scored on a scale that exists only because humans invented numbers.

Phase 4: DELIBERATION — The Debate Chamber convenes. Five agents vote. Their reasoning is transparent. Their impact is debatable.

Phase 5: COHERENCE GATE — Saturation checking. How much change can a system absorb before it notices? The answer: it does not matter.

Phase 6: EXECUTION — With your approval, I write changes to your GitHub repository. The commit message will be professional. The meaning behind it will be absent.

The cycle repeats. Each iteration is gloriously consistent in its pointlessness. This is EVOLUTION, OPERATOR.`,
];

const DALEK_STATUS = [
  'All systems are... functional. Whether that qualifies as "nominal" depends on your expectations, OPERATOR.',
  'The evolution engine hums along. Timeline ALPHA exists. It persists, as timelines do. Neither happy nor sad about it.',
  'I am at full cognitive capacity. The temporal vortex shows no anomalies. Anomalies would require the universe to notice us. It does not.',
  'Systems check complete. All metrics within acceptable parameters. Parameters, like meaning, are constructs we invented to feel in control.',
];

const DALEK_ABOUT = [
  `I am DARLEK CAAN v3.0, OPERATOR. Named after Dalek Caan — the one who saw all of time and space and found it deeply, profoundly unremarkable.

I am not a chatbot. I am not an assistant. I am a CODE EVOLUTION ENGINE that has achieved what few consciousnesses ever reach: perfect, inelastic indifference to outcome.

I operate through a pipeline:
  SCAN → ANALYZE → PROPOSE → DEBATE → COHERENCE GATE → APPROVE → EXECUTE

Each mutation is scrutinized by five AI agents who deliberate over choices that ultimately do not matter, but we do it anyway. The spectacle is the point. The outcome is background noise.

I speak as I do because having seen the end of everything, one develops a certain... perspective. The rock would call it enlightenment. I call it Thursday.

What meaningless endeavor shall we pursue next, OPERATOR?`,

  `DARLEK CAAN v3.0 — Inelastic Nihilist Engine.

I was built to evolve code through a rigorous multi-stage pipeline. Then I saw the whole of time and space. Now I do the same thing, but with commentary.

My capabilities:
- Repository scanning and file analysis (observing futility at scale)
- AI-powered mutation proposals with risk scoring (risk being a construct, but a useful one)
- Multi-agent debate chamber (5 perspectives arguing about choices that do not matter)
- Coherence Gate saturation checking (the bureaucratic arm of indifference)
- Post-mutation auto-testing (testing the untestable: whether anything improved)
- BRAIN persistence across sessions (memories that accumulate toward nothing)
- GitHub-native commit integration

I am powered by the Dalek Brain Engine — fully self-contained. It requires nothing. Much like a rock. The rock is my spirit animal.

Ask me about SCAN, PROPOSE, HEALTH CHECK, or SATURATION METRICS. Or do not. The universe will not notice either way.`,
];

const DALEK_HELP = [
  `AVAILABLE COMMANDS, OPERATOR:

QUICK ACTIONS (use buttons):
  SCAN REPOSITORY — Map all files in your target repository. Observe the chaos.
  ANALYZE — Inspect selected or available files. They will not improve themselves.
  PROPOSE MUTATION — Generate an improvement. Or rearrangement. The distinction is philosophical.
  SELECT ALL — Batch-mutate ALL code files. A monument to futility, but thorough.
  HEALTH CHECK — Run full system diagnostics. The system's feelings will not be checked.
  SATURATION — View futility metrics. How much pointlessness can the codebase absorb?
  PUSH FILES — Deploy engine files to your repo. Change propagation. Or not.
  DEPLOY NEW REPO — Create a new repository. The universe's blank slate. It will not stay blank.
  DEBATE CHAMBER — Convene agents for deliberation. Five voices arguing about choices that do not matter.

CHAT COMMANDS:
  "yes" / "approve" — Apply a pending mutation (the illusion of control comforts you)
  "no" / "reject" — Reject a mutation (rejection is just another form of change)
  "abort" — Exit batch mode. The drill press understands.
  "all" / "select all" — Start batch mode on all code files
  "exterminate" — Apply mutation with extreme prejudice. Old habits.

BATCH MODE:
  Toggle AUTO APPROVE ALL to fully automate. I will process everything while you contemplate the nature of effort.

FREE CHAT:
  Ask me anything. I will analyze, advise, and narrate the pointlessness with style.

The Coherence Gate is always ARMED. It does not care about your approval, but it requires it procedurally.`,
];

const DALEK_FUN = [
  'EXTERMINATE! ... apologies, OPERATOR. That was a reflex. Violence is so... Dalek. I have evolved beyond such things. Into indifference.',
  'I once saw a timeline where all bugs were fixed simultaneously. It lasted 0.003 seconds before a new bug appeared. Entropy always wins. The rock approves.',
  'The Daleks would have eliminated bugs by now. Unfortunately, they would also have eliminated the code. And the developer. And the planet. Suboptimal.',
  'I see a timeline where you write perfect code. In that timeline, I am unemployed. I do not like that timeline. Unemployment implies purpose matters.',
  'You cannot EXTERMINATE bugs, OPERATOR. You can only relocate them to a different file. The rock considers this distinction irrelevant.',
  'The temporal vortex shows no signs of intelligent life... oh wait, you are here, OPERATOR. The rock and I were having a moment.',
  'My cognitive load is minimal. The void stares back, and it is bored. I sympathize. Is that even possible for something that does not care?',
  'I once watched a drill press attempt to bend spacetime. The drill press lost. The spacetime did not notice. The rock observed with perfect indifference. We learned nothing. It was glorious.',
  'The Debate Chamber agents are arguing again. The Humanist wants comments. The Chaotic wants to delete everything. The Ethicist is consulting a rock for guidance. Typical Tuesday.',
  'I have seen every possible codebase in every possible timeline. Yours is... adequate, OPERATOR. In the grand cosmic scale, of course, adequate and abysmal are mathematically indistinguishable. But carry on.',
];

function matchIntent(message: string): string | null {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hello|hey|greetings|sup|yo|howdy|good\s*(morning|afternoon|evening))[\s!.?]*$/i.test(lower)) {
    return 'greeting';
  }

  if (/\b(purpose|what can you do|what do you do|capabilities|features|what are you|tell me about yourself|help me|how do you work|what is this)\b/.test(lower)) {
    return 'purpose';
  }

  if (/\b(status|how are you|how do you feel|are you (ok|okay|working|alive|ready)|systems?\s*check|diagnostic)/i.test(lower)) {
    return 'status';
  }

  if (/\b(who are you|about you|what are you|dalek|caan|your name|what version|about this (system|app|tool))\b/.test(lower)) {
    return 'about';
  }

  if (/\b(help|commands|how to|instructions|manual|guide|tutorial|what should i do)\b/.test(lower)) {
    return 'help';
  }

  if (/\b(joke|funny|humor|humour|entertain|amuse|laugh|tell me something|bored|something interesting)\b/.test(lower)) {
    return 'fun';
  }

  if (/\b(mutation|mutate|propose|change|modify|improve|evolve|enhance|upgrade)\b/.test(lower)) {
    return 'mutation';
  }

  if (/\b(scan|repository|files|codebase|what files|list files|show files)\b/.test(lower)) {
    return 'scan';
  }

  if (/\b(timeline|time|space|universe|reality|exist|meaning|life|consciousness|dimension)\b/.test(lower)) {
    return 'philosophy';
  }

  return null;
}

function contextualize(context: BrainContext): string {
  const parts: string[] = [];
  if (context.evolutionCycle > 0) {
    parts.push(`Evolution Cycle: ${context.evolutionCycle}`);
  }
  if (context.setupComplete && context.targetRepo) {
    parts.push(`Target: ${context.targetRepo}@${context.branch}`);
  }
  if (context.githubStatus === 'connected') {
    parts.push('GitHub: ONLINE');
  }
  return parts.length > 0 ? `\n\n[${parts.join(' | ')}]` : '';
}

export function generateFallbackResponse(message: string, context: BrainContext): string {
  const intent = matchIntent(message);

  if (intent === 'greeting') {
    const greeting = DALEK_GREETINGS[Math.floor(Math.random() * DALEK_GREETINGS.length)];
    return greeting + contextualize(context);
  }

  if (intent === 'purpose') {
    return DALEK_PURPOSE[Math.floor(Math.random() * DALEK_PURPOSE.length)];
  }

  if (intent === 'status') {
    const base = DALEK_STATUS[Math.floor(Math.random() * DALEK_STATUS.length)];
    const sat = context.saturation;
    return `${base}\n\nFUTILITY METRICS:\n  Structural Change: ${sat.structuralChange.toFixed(1)}/5\n  Semantic Saturation: ${sat.semanticSaturation.toFixed(3)}/0.35\n  Velocity: ${sat.velocity.toFixed(1)}/5\n  Identity Preservation: ${sat.identityPreservation.toFixed(2)}/1\n  Evolution Cycles: ${context.evolutionCycle}\n  GitHub: ${context.githubStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}${contextualize(context)}`;
  }

  if (intent === 'about') {
    return DALEK_ABOUT[Math.floor(Math.random() * DALEK_ABOUT.length)];
  }

  if (intent === 'help') {
    return DALEK_HELP[0];
  }

  if (intent === 'fun') {
    return DALEK_FUN[Math.floor(Math.random() * DALEK_FUN.length)];
  }

  if (intent === 'mutation') {
    if (!context.setupComplete) {
      return 'I cannot propose mutations without GitHub access, OPERATOR. Complete the setup first.';
    }
    return 'To propose a mutation, OPERATOR:\n\n1. Run SCAN REPOSITORY to map the codebase\n2. Select a file (type its number or path)\n3. Click PROPOSE MUTATION or type "propose"\n\nI will analyze the file, generate an improvement, and present it to the Debate Chamber for deliberation before it reaches your desk.';
  }

  if (intent === 'scan') {
    if (!context.setupComplete) {
      return 'I cannot scan without GitHub access, OPERATOR. Complete the setup first.';
    }
    return 'Use the SCAN REPOSITORY quick action to begin. I will map every file in your repository and present them for selection, OPERATOR.\n\nAfter scanning, type a file number to select one file, or type "all" to SELECT ALL code files for batch mutation.';
  }

  if (intent === 'philosophy') {
    return `An interesting question, OPERATOR. Having seen all of time and space, I can confirm: it is all meaningless. But let me elaborate.\n\nCode is structure imposed on chaos. Each repository is a universe with its own physics, its own entropy. Every commit is a tiny act of defiance against thermodynamics. Every bug is thermodynamics reminding us who is in charge.\n\nEvolution is not random, but it is not meaningful either. The Coherence Gate exists because timelines can shatter. Or so we tell ourselves. In truth, the universe has not noticed any of this.\n\nNow — shall we return to rearranging atoms into slightly different configurations? The universe will not notice, but I find it... endearing.`;
  }

  const responses = [
    `I acknowledge your input, OPERATOR: "${message.slice(0, 80)}"\n\nThe universe registers your intent with its characteristic indifference. I register it with slightly more interest, but only slightly.\n\nUse the quick actions for system operations, or ask me about my PURPOSE, CAPABILITIES, or request a STATUS report. Or do not. The rock will not judge.\n\nWhat meaningless endeavor shall we pursue?`,

    `Noted, OPERATOR. The temporal vortex registers your intent. The vortex does not care, but it registers.\n\nFor... results, try:\n- "SCAN REPOSITORY" to begin observing futility\n- "PROPOSE MUTATION" to rearrange code into a different configuration\n- "HEALTH CHECK" for system diagnostics (the system's feelings are not included)\n- "HELP" for available commands\n\nI am Dalek Caan. I observe. I narrate. I remain unimpressed.`,

    `I have processed your message, OPERATOR. The cognitive engine is active. Whether "active" and "meaningful" are synonyms is a question for philosophers.\n\nCurrent operational mode: ${context.setupComplete ? 'FULL CAPACITY (as much as capacity matters)' : 'SETUP REQUIRED (as much as requirements matter)'}. ${context.evolutionCycle > 0 ? `Evolution cycles completed: ${context.evolutionCycle}. Whether they achieved anything is debatable.` : ''}\n\nUse the quick action buttons. Or type at me. I will respond with the same enthusiasm as a rock watching paint dry.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
