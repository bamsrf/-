/**
 * Hook to register a UI element as a tour spotlight target.
 *
 * Usage:
 *   const { ref, onLayout } = useTourTarget('tab-search');
 *   <View ref={ref} onLayout={onLayout}>...</View>
 *
 * Measures absolute window coordinates after layout and pushes them into
 * useOnboardingStore.tourTargets, where OnboardingOverlay reads them.
 */
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useOnboardingStore, TourTargetKey } from './store';

export function useTourTarget(key: TourTargetKey) {
  const ref = useRef<View>(null);
  const setTourTarget = useOnboardingStore((s) => s.setTourTarget);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        setTourTarget(key, { x, y, w, h });
      }
    });
  }, [key, setTourTarget]);

  const onLayout = useCallback(() => {
    // Defer to next tick — measureInWindow needs the view to be committed.
    requestAnimationFrame(measure);
  }, [measure]);

  return { ref, onLayout, remeasure: measure };
}
