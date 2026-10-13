module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-mmkv|react-redux|@reduxjs|immer)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
