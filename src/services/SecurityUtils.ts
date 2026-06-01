import * as SecureStore from 'expo-secure-store';

export const TRUSTED_EMAIL_PROVIDERS = [
  'gmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'zohomail.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'gmx.com',
  'gmx.us',
  'gmx.co.uk',
  'aol.com'
];

export const AUTH_ATTEMPTS_KEY = 'inferra_secure_auth_attempts';
export const MAX_AUTH_ATTEMPTS = 5;
export const AUTH_LOCKOUT_DURATION = 15 * 60 * 1000;
export const PASSWORD_MIN_LENGTH = 8;

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 1000);
};

export const validateEmail = (email: string): { valid: boolean; sanitized?: string; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const sanitized = sanitizeInput(email);

  if (sanitized.length > 320) {
    return { valid: false, error: 'Email is too long' };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }

  const domain = sanitized.split('@')[1]?.toLowerCase();
  const suspiciousDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];

  if (suspiciousDomains.includes(domain)) {
    return { valid: false, error: 'Temporary email addresses are not allowed' };
  }

  return { valid: true, sanitized };
};

export const isEmailFromTrustedProvider = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const domain = email.split('@')[1]?.toLowerCase();
  return TRUSTED_EMAIL_PROVIDERS.includes(domain);
};

export const validatePassword = (password: string, strict: boolean = false): { valid: boolean; message?: string; isWeak?: boolean } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  
  if (!strict) {
    return { valid: true };
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: true, isWeak: true, message: `Your password is weak. Consider using at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!(hasUpperCase && hasLowerCase && (hasNumbers || hasSpecialChars))) {
    return { 
      valid: true, 
      isWeak: true,
      message: 'Your password is weak. Consider including uppercase, lowercase, and numbers or special characters' 
    };
  }
  
  return { valid: true };
};

export const validateName = (name: string): { valid: boolean; sanitized?: string; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const sanitized = sanitizeInput(name);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (sanitized.length > 100) {
    return { valid: false, error: 'Name is too long' };
  }

  if (sanitized.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  const nameRegex = /^[a-zA-Z0-9\s\-'\.]+$/;
  if (!nameRegex.test(sanitized)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  const suspiciousPatterns = [
    /admin/i,
    /root/i,
    /system/i,
    /null/i,
    /undefined/i,
    /test/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return { valid: false, error: 'Invalid name' };
    }
  }

  return { valid: true, sanitized };
};

export const checkRateLimiting = async (): Promise<boolean> => {
  try {
    const attemptsData = await SecureStore.getItemAsync(AUTH_ATTEMPTS_KEY);

    if (!attemptsData) {
      return true;
    }

    const { attempts, timestamp } = JSON.parse(attemptsData);
    const now = Date.now();

    if (now - timestamp > AUTH_LOCKOUT_DURATION) {
      await SecureStore.deleteItemAsync(AUTH_ATTEMPTS_KEY);
      return true;
    }

    if (attempts >= MAX_AUTH_ATTEMPTS) {
      return false;
    }

    return true;
  } catch (error) {
    return true;
  }
};

export const incrementAuthAttempts = async (): Promise<void> => {
  try {
    const attemptsData = await SecureStore.getItemAsync(AUTH_ATTEMPTS_KEY);

    const now = Date.now();

    if (!attemptsData) {
      const newData = JSON.stringify({ attempts: 1, timestamp: now });
      await SecureStore.setItemAsync(AUTH_ATTEMPTS_KEY, newData);
      return;
    }

    const { attempts, timestamp } = JSON.parse(attemptsData);

    if (now - timestamp > AUTH_LOCKOUT_DURATION) {
      const newData = JSON.stringify({ attempts: 1, timestamp: now });
      await SecureStore.setItemAsync(AUTH_ATTEMPTS_KEY, newData);
      return;
    }

    const newData = JSON.stringify({ attempts: attempts + 1, timestamp });
    await SecureStore.setItemAsync(AUTH_ATTEMPTS_KEY, newData);
  } catch (error) {
    if (__DEV__) {
      console.error('auth_attempts_error', error);
    }
  }
};

export const resetAuthAttempts = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_ATTEMPTS_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('reset_auth_attempts_error', error);
    }
  }
};

export const validateReportContent = (content: string): { valid: boolean; sanitized?: string; error?: string } => {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required' };
  }

  if (content.length < 10) {
    return { valid: false, error: 'Report content must be at least 10 characters' };
  }

  if (content.length > 5000) {
    return { valid: false, error: 'Report content is too long' };
  }

  const sanitized = sanitizeInput(content);
  return { valid: true, sanitized };
};

export const validateProvider = (provider: string): { valid: boolean; sanitized?: string; error?: string } => {
  if (!provider || typeof provider !== 'string') {
    return { valid: false, error: 'Provider is required' };
  }

  const allowedProviders = ['openai', 'gemini', 'claude', 'local'];
  const sanitized = sanitizeInput(provider.toLowerCase());

  if (!allowedProviders.includes(sanitized)) {
    return { valid: false, error: 'Invalid provider' };
  }

  return { valid: true, sanitized };
};

export const validateCategory = (category: string): { valid: boolean; sanitized?: string; error?: string } => {
  if (!category || typeof category !== 'string') {
    return { valid: false, error: 'Category is required' };
  }

  const allowedCategories = ['inappropriate', 'harmful', 'incorrect', 'bias', 'other'];
  const sanitized = sanitizeInput(category.toLowerCase());

  if (!allowedCategories.includes(sanitized)) {
    return { valid: false, error: 'Invalid category' };
  }

  return { valid: true, sanitized };
}; 
