/* eslint-disable no-undef */
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  screensEnabled: jest.fn(() => false),
}));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('react-native-mmkv', () => {
  const storageMap = new Map();
  return {
    createMMKV: jest.fn(() => ({
      getString: jest.fn((key: string) => storageMap.get(key)),
      set: jest.fn((key: string, value: any) => storageMap.set(key, String(value))),
      getNumber: jest.fn((key: string) => {
        const v = storageMap.get(key);
        return v !== undefined ? Number(v) : undefined;
      }),
      getBoolean: jest.fn((key: string) => storageMap.get(key) === 'true'),
      contains: jest.fn((key: string) => storageMap.has(key)),
      remove: jest.fn((key: string) => storageMap.delete(key)),
      clearAll: jest.fn(() => storageMap.clear()),
    })),
  };
});
