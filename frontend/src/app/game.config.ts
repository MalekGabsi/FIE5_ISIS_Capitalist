/** Base URL of the NestJS backend; static images are served from its root. */
export const BACKEND_URL = 'http://localhost:3000';

export const GRAPHQL_URL = `${BACKEND_URL}/graphql`;

/** Period of the game progression tick (money / production completion). */
export const TICK_MS = 100;

export const USERNAME_STORAGE_KEY = 'isis-capitalist.username';
