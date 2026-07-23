jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// @sentry/react-native, import edildiği anda native bridge/timer'lar kurar
// (init() çağrılmasa bile) — bu, jest process'inin testler bittikten sonra
// açık handle'lar yüzünden kapanmamasına yol açıyordu. Testlerde crash
// reporting'in kendisiyle ilgilenmiyoruz, sadece no-op bir stub yeterli.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));
