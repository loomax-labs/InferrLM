import { getHomepageHTML } from '../tcp/http/homepageTemplate';
import {
  chinaPickerName,
  errorProviderName,
  isBlockedProviderUrl,
  isRemoteProviderOffered,
  localApiWording,
  rejectBlockedEndpoint,
  setRegionReader,
  userFacingApiName,
} from '../regionPolicy';

describe('mainland China offer policy', () => {
  afterEach(() => {
    setRegionReader(null);
  });

  it('keeps the usual names and addresses outside mainland China', () => {
    setRegionReader(() => 'US');
    expect(isRemoteProviderOffered('gemini')).toBe(true);
    expect(isRemoteProviderOffered('claude')).toBe(true);
    expect(isRemoteProviderOffered('chatgpt')).toBe(true);
    expect(isBlockedProviderUrl('https://api.openai.com/v1')).toBe(false);
    expect(isBlockedProviderUrl('https://api.groq.com/openai/v1')).toBe(false);
    expect(userFacingApiName()).toBe('OpenAI API');
    expect(errorProviderName('chatgpt')).toBe('OpenAI');
    expect(chinaPickerName('chatgpt', 'ChatGPT')).toBe('ChatGPT');
    expect(localApiWording('OpenAI-compatible API')).toBe('OpenAI-compatible API');
    expect(getHomepageHTML()).toContain('OpenAI-Compatible API');
    expect(() => rejectBlockedEndpoint('https://api.openai.com/v1')).not.toThrow();
  });

  it('withholds banned providers in mainland China and keeps a compatible API without their addresses', () => {
    setRegionReader(() => 'CN');
    expect(isRemoteProviderOffered('gemini')).toBe(false);
    expect(isRemoteProviderOffered('claude')).toBe(false);
    expect(isRemoteProviderOffered('gemini_clone_a')).toBe(false);
    expect(isRemoteProviderOffered('chatgpt')).toBe(true);
    expect(isRemoteProviderOffered('chatgpt_clone_1')).toBe(true);

    expect(isBlockedProviderUrl('https://api.openai.com/v1')).toBe(true);
    expect(isBlockedProviderUrl('https://platform.openai.com/api-keys')).toBe(true);
    expect(isBlockedProviderUrl('https://chatgpt.com/')).toBe(true);
    expect(isBlockedProviderUrl('https://api.anthropic.com/v1')).toBe(true);
    expect(isBlockedProviderUrl('https://generativelanguage.googleapis.com/v1beta')).toBe(true);
    expect(isBlockedProviderUrl('https://ai.google.dev/')).toBe(true);
    expect(isBlockedProviderUrl('https://api.groq.com/openai/v1')).toBe(false);
    expect(isBlockedProviderUrl('https://api.together.xyz/v1')).toBe(false);
    expect(isBlockedProviderUrl('https://notopenai.com/v1')).toBe(false);

    expect(userFacingApiName()).toBe('API');
    expect(errorProviderName('chatgpt')).toBe('Compatible API');
    expect(errorProviderName('gemini')).toBe('Remote API');
    expect(chinaPickerName('chatgpt', 'ChatGPT')).toBe('Compatible API');
    expect(chinaPickerName('gemini', 'Gemini')).toBe('Select a Model');
    expect(localApiWording('Point any OpenAI-compatible client at the chat API.')).toBe(
      'Point any compatible client at the chat API.',
    );
    expect(() => rejectBlockedEndpoint('https://api.openai.com/v1')).toThrow('Set an API address in Settings.');
    expect(() => rejectBlockedEndpoint('')).toThrow('Set an API address in Settings.');
    expect(() => rejectBlockedEndpoint('https://api.groq.com/openai/v1')).not.toThrow();

    const page = getHomepageHTML();
    expect(page).toContain('Compatible API');
    expect(page.toLowerCase()).not.toContain('openai');
    expect(page.toLowerCase()).not.toContain('chatgpt');
    expect(page).not.toContain('api.openai.com');
    expect(page).toContain('id="chat-api"');
    expect(page).toContain("getElementById('chat-api')");
  });
});
