import { onlineModelService } from './OnlineModelService';
import { isMainlandChina, isRemoteProviderOffered, providerBase } from './regionPolicy';
export class ProviderKeysService {
  static async validateApiKey(
    provider: string, 
    enableRemoteModels: boolean, 
    isLoggedIn: boolean
  ): Promise<{
    isValid: boolean;
    errorType?: 'remote_disabled' | 'no_key';
    errorMessage?: string;
  }> {
    if (provider === 'local' || provider === 'apple-foundation') {
      return { isValid: true };
    }
    if (!isRemoteProviderOffered(provider)) {
      return {
        isValid: false,
        errorType: 'no_key',
        errorMessage: 'This model is not available.',
      };
    }
    if (!enableRemoteModels || !isLoggedIn) {
      return {
        isValid: false,
        errorType: 'remote_disabled',
        errorMessage: 'Remote models require the "Enable Remote Models" setting to be turned on and you need to be signed in.'
      };
    }
    const hasKey = await onlineModelService.hasApiKey(provider);
    if (!hasKey) {
      return {
        isValid: false,
        errorType: 'no_key',
        errorMessage: `${provider.charAt(0).toUpperCase() + provider.slice(1)} requires an API key to function. Please add your API key in Settings.`
      };
    }
    return { isValid: true };
  }
  static getProviderDisplayName(provider: string): string {
    if (isMainlandChina() && providerBase(provider) === 'chatgpt') {
      return 'Compatible API';
    }
    if (!isRemoteProviderOffered(provider) && provider !== 'local' && provider !== 'apple-foundation') {
      return 'Remote API';
    }
    switch (provider) {
      case 'gemini': return 'Gemini';
      case 'chatgpt': return 'gpt-4.1';
      case 'claude': return 'Claude';
      case 'apple-foundation': return 'Apple Foundation';
      default: return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  }
}
