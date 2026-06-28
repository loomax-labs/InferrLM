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
      'Declare an immutable variable named \'appName\' with the value "AI Gallery"',
      'Print the numbers from 1 to 5 using a for loop.',
      'Write a function that returns the square of an integer input.',
      'Parse a JSON string and return the value of the "status" key.',
      'Debounce a search input callback by 300 milliseconds.',
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
