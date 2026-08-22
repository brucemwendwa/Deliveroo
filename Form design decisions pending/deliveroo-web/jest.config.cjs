module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.cjs',
    '\\.(jpg|jpeg|png|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.cjs',
    // import.meta is a syntax error once Babel emits CJS — see src/api/viteEnv.js
    'viteEnv$': '<rootDir>/src/__mocks__/viteEnvMock.cjs',
    // Leaflet needs layout APIs jsdom lacks — see src/__mocks__/reactLeafletMock.jsx
    '^react-leaflet$': '<rootDir>/src/__mocks__/reactLeafletMock.jsx',
    '^leaflet$': '<rootDir>/src/__mocks__/leafletMock.cjs'
  },
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
  // Full-app renders with userEvent are slow under parallel workers; 5s is too tight.
  testTimeout: 20000
};
