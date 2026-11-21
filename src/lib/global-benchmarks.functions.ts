import { createServerFn } from '@tanstack/react-start';

export const readGlobalBenchmarks = createServerFn({ method: 'GET' }).handler(async () => {
  const { setResponseHeader } = await import('@tanstack/react-start/server');
  setResponseHeader('Cache-Control', 'no-store');
  const { fetchGlobalBenchmarks } = await import('./global-benchmarks.server');
  return fetchGlobalBenchmarks();
});