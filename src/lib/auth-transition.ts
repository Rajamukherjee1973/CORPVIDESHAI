/** An initial account lookup may never replace a newer session transition. */
export function createAuthTransitionGuard() {
  let version = 0;
  return {
    observe: () => { version += 1; },
    initialIsCurrent: () => version === 0,
  };
}