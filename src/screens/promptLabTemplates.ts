export type TemplateOption = {
  key: string;
  label: string;
  choices: string[];
  default: string;
};

export type PromptTemplate = {
  id: string;
  label: string;
  examples: string[];
  options?: TemplateOption[];
  buildPrompt?: (content: string, opts: Record<string, string>) => string;
};

const toneKey = 'tone';
const styleKey = 'style';
const langKey = 'language';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'free_form',
    label: 'Free form',
    examples: [
      'Suggest 3 topics for a podcast about "Friendships in your 20s".',
      'Outline the key sections needed in a basic logo design brief.',
      'List 3 pros and 3 cons to consider before buying a smart watch.',
      'Write a short, optimistic quote about the future of technology.',
      'Generate 3 potential names for a mobile app that helps users identify plants.',
      'Explain the difference between AI and machine learning in 2 sentences.',
      'Create a simple haiku about a cat sleeping in the sun.',
      'List 3 ways to make instant noodles taste better using common kitchen ingredients.',
      'Break down the pros and cons of running LLMs on-device vs in the cloud.',
      'What are 5 test prompts to evaluate reasoning in a small language model?',
    ],
  },
  {
    id: 'rewrite_tone',
    label: 'Rewrite tone',
    options: [{
      key: toneKey,
      label: 'Tone',
      choices: ['Formal', 'Casual', 'Friendly', 'Polite', 'Enthusiastic', 'Concise'],
      default: 'Formal',
    }],
    buildPrompt: (content, opts) =>
      `Rewrite the following text using a ${(opts[toneKey] || 'Formal').toLowerCase()} tone: ${content}`,
    examples: [
      'Hey team, just wanted to remind everyone about the meeting tomorrow @ 10. Be there!',
      'Our new software update includes several bug fixes and performance improvements.',
      'Due to the fact that the weather was bad, we decided to postpone the event.',
      'Please find attached the requested documentation for your perusal.',
      'Welcome to the team. Review the onboarding materials.',
    ],
  },
  {
    id: 'summarize',
    label: 'Summarize',
    options: [{
      key: styleKey,
      label: 'Style',
      choices: [
        'Key bullet points (3-5)',
        'Short paragraph (1-2 sentences)',
        'Concise summary (~50 words)',
        'Headline / title',
        'One-sentence summary',
      ],
      default: 'Key bullet points (3-5)',
    }],
    buildPrompt: (content, opts) =>
      `Please summarize the following in ${(opts[styleKey] || 'Key bullet points (3-5)').toLowerCase()}: ${content}`,
    examples: [
      'The new Pixel phone features an advanced camera system with improved low-light performance and AI-powered editing tools. The display is brighter and more energy-efficient. It runs on the latest Tensor chip, offering faster processing and enhanced security features. Battery life has also been extended, providing all-day power for most users.',
      'Beginning this Friday, January 24, giant pandas Bao Li and Qing Bao are officially on view to the public at the Smithsonian\'s National Zoo and Conservation Biology Institute (NZCBI). The 3-year-old bears arrived in Washington this past October, undergoing a quarantine period before making their debut. Under NZCBI\'s new agreement with the CWCA, Qing Bao and Bao Li will remain in the United States for ten years, until April 2034, in exchange for an annual fee of $1 million. The pair are still too young to breed, as pandas only reach sexual maturity between ages 4 and 7. "Kind of picture them as like awkward teenagers right now," Lally told WUSA9. "We still have about two years before we would probably even see signs that they\'re ready to start mating."',
    ],
  },
  {
    id: 'code_snippet',
    label: 'Code',
    options: [{
      key: langKey,
      label: 'Language',
      choices: ['C++', 'Java', 'JavaScript', 'Kotlin', 'Python', 'Swift', 'TypeScript'],
      default: 'JavaScript',
    }],
    buildPrompt: (content, opts) =>
      `Write a ${opts[langKey] || 'JavaScript'} code snippet to ${content}`,
    examples: [
      'Create an alert box that says "Hello, World!"',
      'Declare an immutable variable named \'appName\' with the value "AI Gallery"',
      'Print the numbers from 1 to 5 using a for loop.',
      'Write a function that returns the square of an integer input.',
      'Parse a JSON string and return the value of the "status" key.',
      'Debounce a search input callback by 300 milliseconds.',
    ],
  },
  {
    id: 'explain',
    label: 'Explain',
    examples: [
      'Explain simply what a hash table is and when to use one vs an array.',
      'Walk through how gradient descent works in 3 short paragraphs.',
      'What is speculative decoding in LLM inference?',
      'Explain retrieval-augmented generation to a product manager in plain language.',
      'How does KV-cache reuse speed up autoregressive text generation?',
    ],
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    examples: [
      'If a train leaves A at 9am going 60mph and another leaves B at 10am going 80mph toward A, when do they meet? Show step-by-step reasoning.',
      'A farmer has chickens and rabbits with 35 heads and 94 legs. How many of each? Think step by step.',
      'You have a 3L jug and a 5L jug. Measure exactly 4L of water. List each step.',
      'Is it faster to sort 10,000 items in memory or fetch a pre-sorted page from a remote API? Compare trade-offs step by step.',
    ],
  },
  {
    id: 'structured',
    label: 'Structured',
    examples: [
      'Extract the following meeting notes into JSON with keys: title, date, attendees, action_items.\n\nNotes: Standup Jan 12. Alice, Bob, Chen. Ship v2.1 by Friday. Bob fixes login bug. Chen updates docs.',
      'Convert this bullet list into a valid JSON array of objects with "name" and "priority" fields:\n- Fix crash on launch (high)\n- Add dark mode toggle (medium)\n- Update onboarding copy (low)',
      'Classify sentiment as positive, neutral, or negative and return JSON: {"sentiment": "", "confidence": 0.0}\n\nText: The app is mostly great but sync fails on slow networks.',
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    examples: [
      'Write a 6-line sci-fi micro-story about a phone that only works offline.',
      'Describe a busy marketplace using all five senses in under 100 words.',
      'Write a product tagline for an on-device AI assistant that never sends data to the cloud.',
      'Compose a limerick about debugging code at 2am.',
    ],
  },
  {
    id: 'debug',
    label: 'Debug',
    examples: [
      'Find the bug and fix this function:\nfunction merge(a, b) { return a.sort().concat(b.sort()); }',
      'Why might this Python loop be slow on large lists?\nfor i in range(len(data)):\n  if data[i] > 0:\n    result.append(data[i])',
      'This React component re-renders on every keystroke. Suggest 2 concrete fixes:\nconst Search = () => { const [q, setQ] = useState(""); const rows = heavyFilter(q); return <FlatList data={rows} />; }',
    ],
  },
];

export const DEFAULT_TEMPLATE = PROMPT_TEMPLATES[0];

export const buildTemplatePrompt = (
  template: PromptTemplate,
  content: string,
  opts: Record<string, string>,
) => {
  if (!template.buildPrompt) return content;
  return template.buildPrompt(content, opts);
};

export const defaultTemplateOpts = (template: PromptTemplate) => {
  const opts: Record<string, string> = {};
  template.options?.forEach(opt => {
    opts[opt.key] = opt.default;
  });
  return opts;
};
