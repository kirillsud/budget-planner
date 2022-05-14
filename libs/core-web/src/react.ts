import { DependencyList, useEffect } from 'react';

export function useEffectAsync(effect: () => Promise<void>, deps?: DependencyList) {
  useEffect(() => {
    effect();
  }, deps);
}
