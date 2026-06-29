export type TemplateOption = {
  key: string;
  label: string;
  choices: string[];
  default: string;
};

export type PromptTemplate = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  placeholder: string;
  examples: string[];
  options?: TemplateOption[];
  buildPrompt?: (content: string, opts: Record<string, string>) => string;
};

const toneKey = 'tone';
const styleKey = 'style';
const langKey = 'language';
const audienceKey = 'audience';
const targetLangKey = 'targetLang';
const formatKey = 'format';
const focusKey = 'focus';
const lengthKey = 'length';
const emailToneKey = 'emailTone';
const creativeKey = 'creativeStyle';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'free_form',
    label: 'Free form',
    hint: 'Send any prompt as-is',
    icon: 'flask-outline',
    placeholder: 'Write anything you want to test…',
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
      'Explain simply what a hash table is and when to use one vs an array.',
      'Walk through how gradient descent works in 3 short paragraphs.',
      'Write a 6-line sci-fi micro-story about a phone that only works offline.',
      'If a train leaves A at 9am going 60mph and another leaves B at 10am going 80mph toward A, when do they meet? Show step-by-step reasoning.',
    ],
  },
  {
    id: 'rewrite_tone',
    label: 'Rewrite tone',
    hint: 'Change how your text sounds',
    icon: 'format-letter-case',
    placeholder: 'Paste the text you want rewritten…',
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
    hint: 'Condense long passages',
    icon: 'text-short',
    placeholder: 'Paste the text you want summarized…',
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
      'Beginning this Friday, January 24, giant pandas Bao Li and Qing Bao are officially on view to the public at the Smithsonian\'s National Zoo and Conservation Biology Institute (NZCBI). The 3-year-old bears arrived in Washington this past October, undergoing a quarantine period before making their debut.',
    ],
  },
  {
    id: 'code_snippet',
    label: 'Code snippet',
    hint: 'Generate a small code sample',
    icon: 'code-braces',
    placeholder: 'Describe what the code should do…',
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
      'Declare an immutable variable named \'appName\' with the value "InferrLM"',
      'Print the numbers from 1 to 5 using a for loop.',
      'Write a function that returns the square of an integer input.',
      'Parse a JSON string and return the value of the "status" key.',
      'Debounce a search input callback by 300 milliseconds.',
    ],
  },
  {
    id: 'explain',
    label: 'Explain',
    hint: 'Teach a concept clearly',
    icon: 'lightbulb-outline',
    placeholder: 'Paste a topic or passage to explain…',
    options: [{
      key: audienceKey,
      label: 'Audience',
      choices: ['Beginner', 'Developer', 'Executive', 'Student'],
      default: 'Beginner',
    }],
    buildPrompt: (content, opts) =>
      `Explain the following to a ${(opts[audienceKey] || 'Beginner').toLowerCase()}: ${content}`,
    examples: [
      'What a hash table is and when to use one instead of an array.',
      'How retrieval-augmented generation differs from standard chat completion.',
      'Why KV-cache reuse speeds up autoregressive text generation.',
      'What speculative decoding does during LLM inference.',
    ],
  },
  {
    id: 'translate',
    label: 'Translate',
    hint: 'Convert text to another language',
    icon: 'translate',
    placeholder: 'Paste the text you want translated…',
    options: [{
      key: targetLangKey,
      label: 'Language',
      choices: ['Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Korean', 'Portuguese', 'Chinese (Simplified)'],
      default: 'Spanish',
    }],
    buildPrompt: (content, opts) =>
      `Translate the following to ${opts[targetLangKey] || 'Spanish'}. Preserve meaning and tone:\n${content}`,
    examples: [
      'Please restart the app after updating your settings.',
      'Our team will review your request and respond within two business days.',
      'The meeting has been moved to 3 PM. Let me know if that works for you.',
    ],
  },
  {
    id: 'structured',
    label: 'Structured',
    hint: 'Extract or reformat data',
    icon: 'code-json',
    placeholder: 'Paste raw notes or text to structure…',
    options: [{
      key: formatKey,
      label: 'Format',
      choices: ['JSON', 'Markdown table', 'Bullet list', 'YAML'],
      default: 'JSON',
    }],
    buildPrompt: (content, opts) =>
      `Convert the following into ${opts[formatKey] || 'JSON'}. Return only the formatted output:\n${content}`,
    examples: [
      'Meeting notes: Standup Jan 12. Attendees: Alice, Bob, Chen. Action: ship v2.1 by Friday. Bob fixes login bug.',
      'Products: Widget A $12 in stock, Widget B $8 out of stock, Widget C $15 in stock.',
      'Sentiment check: The app is mostly great but sync fails on slow networks.',
    ],
  },
  {
    id: 'debug',
    label: 'Debug code',
    hint: 'Find bugs and suggest fixes',
    icon: 'bug-outline',
    placeholder: 'Paste code or describe the bug…',
    options: [{
      key: focusKey,
      label: 'Focus',
      choices: ['Bug fix', 'Performance', 'Security', 'Readability'],
      default: 'Bug fix',
    }],
    buildPrompt: (content, opts) =>
      `Review the following for ${(opts[focusKey] || 'Bug fix').toLowerCase()} issues. Explain the problem and provide a fixed version:\n${content}`,
    examples: [
      'function merge(a, b) { return a.sort().concat(b.sort()); }',
      'for i in range(len(data)):\n  if data[i] > 0:\n    result.append(data[i])',
      'const fetchData = async () => { const res = await fetch(url); return res.json(); }',
    ],
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    hint: 'Step-by-step problem solving',
    icon: 'brain',
    placeholder: 'Enter a logic or math problem…',
    buildPrompt: (content) =>
      `Solve the following step by step. Show reasoning before the final answer:\n${content}`,
    examples: [
      'A train leaves A at 9am at 60mph. Another leaves B at 10am at 80mph toward A. When do they meet?',
      'You have 3L and 5L jugs. Measure exactly 4L of water. List each step.',
      'A farmer has 35 heads and 94 legs among chickens and rabbits. How many of each?',
    ],
  },
  {
    id: 'proofread',
    label: 'Proofread',
    hint: 'Fix grammar and clarity',
    icon: 'spellcheck',
    placeholder: 'Paste text to proofread…',
    buildPrompt: (content) =>
      `Proofread and improve the following text. Fix grammar, spelling, and awkward phrasing. Return the corrected version:\n${content}`,
    examples: [
      'Their going to submit the report tomorow, unless their is a blocker.',
      'The data shows that users prefers dark mode and faster load times.',
      'Can you please review this and let me know if their is any issues?',
    ],
  },
  {
    id: 'expand',
    label: 'Expand',
    hint: 'Add detail to short text',
    icon: 'arrow-expand-horizontal',
    placeholder: 'Paste brief notes or bullets to expand…',
    options: [{
      key: lengthKey,
      label: 'Length',
      choices: ['Short expansion', 'Detailed expansion', 'Double the length'],
      default: 'Detailed expansion',
    }],
    buildPrompt: (content, opts) =>
      `Expand the following with a ${(opts[lengthKey] || 'Detailed expansion').toLowerCase()}. Keep the original meaning:\n${content}`,
    examples: [
      'On-device AI: private, fast, works offline.',
      'Launch goals: improve retention, reduce crash rate, ship dark mode.',
      'Product idea: plant ID app with offline model and care reminders.',
    ],
  },
  {
    id: 'email',
    label: 'Email draft',
    hint: 'Turn notes into an email',
    icon: 'email-outline',
    placeholder: 'Paste bullet points or a rough draft…',
    options: [{
      key: emailToneKey,
      label: 'Tone',
      choices: ['Professional', 'Friendly', 'Urgent', 'Apologetic'],
      default: 'Professional',
    }],
    buildPrompt: (content, opts) =>
      `Draft a ${(opts[emailToneKey] || 'Professional').toLowerCase()} email from the following notes:\n${content}`,
    examples: [
      'Follow up on proposal. Sent last Tuesday. Need answer by Friday. Offer call.',
      'Thanks for interview. Excited about role. Ask about next steps and timeline.',
      'Report outage. Service down since 2am. Fix in progress. ETA 4 hours.',
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    hint: 'Stories, poems, and copy',
    icon: 'feather',
    placeholder: 'Describe what you want written…',
    options: [{
      key: creativeKey,
      label: 'Style',
      choices: ['Short story', 'Poem', 'Tagline', 'Dialogue'],
      default: 'Short story',
    }],
    buildPrompt: (content, opts) =>
      `Write a ${(opts[creativeKey] || 'Short story').toLowerCase()} based on the following prompt:\n${content}`,
    examples: [
      'A phone that only works offline in a world obsessed with the cloud.',
      'A busy night market where every vendor sells memories instead of goods.',
      'An on-device AI assistant that never sends data to the cloud.',
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

export const getTemplatePrefix = (
  template: PromptTemplate,
  opts: Record<string, string>,
) => {
  if (!template.buildPrompt) return '';
  return template.buildPrompt('', opts);
};

export const defaultTemplateOpts = (template: PromptTemplate) => {
  const opts: Record<string, string> = {};
  template.options?.forEach(opt => {
    opts[opt.key] = opt.default;
  });
  return opts;
};
