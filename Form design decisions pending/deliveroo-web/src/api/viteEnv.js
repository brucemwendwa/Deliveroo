// The ONLY module that touches import.meta. Babel transpiles ESM to CJS for Jest,
// where import.meta is a syntax error, so jest.config.cjs maps this file to a stub
// (src/__mocks__/viteEnvMock.cjs). Keep the import.meta reference here and nowhere else.
export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? '';

/** With no API origin configured we run against the localStorage mock backend. */
export const USE_MOCK_BACKEND = !API_BASE_URL;
