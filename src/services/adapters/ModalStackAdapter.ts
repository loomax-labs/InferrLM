import { InteractionManager } from 'react-native';

const modalCloseMs = 320;

export const afterModalClose = (fn: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(fn, modalCloseMs);
  });
};
