import { InteractionManager } from 'react-native';

const modalCloseMs = 220;

export const afterModalClose = (fn: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(fn, modalCloseMs);
  });
};
