/**
 * Native modules the shared package touches as soon as it is imported. In-memory stand-ins from
 * `@yws/shared`'s own test utils, so a screen test never reaches for real storage or crypto.
 */
jest.mock(
  'expo-secure-store',
  () => jest.requireActual('../../../packages/shared/src/test-utils/native-mocks').secureStoreMock,
)
jest.mock(
  'expo-crypto',
  () => jest.requireActual('../../../packages/shared/src/test-utils/native-mocks').cryptoMock,
)
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Redirect: () => null,
}))
// Importing the notifications module warns about Expo Go on every run; nothing here needs it.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}))
