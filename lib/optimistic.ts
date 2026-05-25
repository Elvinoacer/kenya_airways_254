export type OptimisticPatch<T> = {
  before: T | null;
  after: T;
};

export function applyOptimistic<T>(
  getState: () => T,
  setState: (v: T) => void,
) {
  return async function optimistic<TPatch>(
    patcher: (
      cur: T,
    ) =>
      | { newState: T; revert?: () => void }
      | Promise<{ newState: T; revert?: () => void }>,
  ) {
    const cur = getState();
    const res = await patcher(cur as T);
    const { newState, revert } = res as any;
    setState(newState);
    return {
      rollback: () => {
        if (typeof revert === "function") revert();
        else setState(cur as T);
      },
    };
  };
}
