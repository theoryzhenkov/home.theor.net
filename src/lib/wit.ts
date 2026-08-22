import { WitSsr } from '@theoryzhenkov/wit-astro';

// The wit connection: one SSR cache for the whole server, invalidated by
// the vault's SSE feed. The read key is a public-content credential by
// design (it also ships to the browser for search); rotate in wit
// settings + here together.
export const WIT_URL = 'https://wit.theor.net';
export const WIT_VAULT = '1ed481bb-b571-4d2d-b48c-e8b0f5ff8ef8';
export const WIT_READ_KEY = 'wit_read_1DQ6CAJaz25IxjcdYslkQVsqM-W4lEe_';

export const wit = new WitSsr({
  baseUrl: WIT_URL,
  vaultId: WIT_VAULT,
  key: WIT_READ_KEY,
});

