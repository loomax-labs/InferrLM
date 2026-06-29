import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@kitchen_adventure_active_v1';

let memActive = false;

export const kitchenSessionStore = {
  async isActive(): Promise<boolean> {
    if (memActive) {
      return true;
    }
    const raw = await AsyncStorage.getItem(KEY);
    memActive = raw === '1';
    return memActive;
  },

  async start(): Promise<void> {
    console.log('kitchen_session_start');
    memActive = true;
    await AsyncStorage.setItem(KEY, '1');
  },

  async end(): Promise<void> {
    console.log('kitchen_session_end');
    memActive = false;
    await AsyncStorage.removeItem(KEY);
  },
};

export const isKitchenEndPhrase = (text: string): boolean => {
  return /\b(quit adventure|end game|stop adventure|exit adventure)\b/i.test(text);
};

export const isKitchenStartPhrase = (text: string): boolean => {
  return /\bkitchen adventure\b/i.test(text) || /\bstart kitchen\b/i.test(text);
};
