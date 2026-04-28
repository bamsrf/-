/**
 * Hook to register a UI element as a tour spotlight target.
 *
 * Usage:
 *   const { ref, onLayout } = useTourTarget('tab-search');
 *   <View ref={ref} onLayout={onLayout}>...</View>
 *
 * Measures absolute window coordinates after layout and pushes them into
 * useOnboardingStore.tourTargets. Also re-measures whenever the tour step
 * changes — layouts often shift after navigation/animations and the first
 * onLayout can capture stale coordinates.
 */
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useOnboardingStore, TourTargetKey } from './store';

export function useTourTarget(key: TourTargetKey) {
  const ref = useRef<View>(null);
  const setTourTarget = useOnboardingStore((s) => s.setTourTarget);
  const tourStep = useOnboardingStore((s) => s.tourStep);

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
    requestAnimationFrame(measure);
  }, [measure]);

  // Re-measure whenever the tour advances. Animations (segments collapsing,
  // modals sliding) often finish after the initial onLayout — without this,
  // the spotlight would lock onto a stale position.
  useEffect(() => {
    if (tourStep === null) return;
    const handles: ReturnType<typeof setTimeout>[] = [
      setTimeout(measure, 60),
      setTimeout(measure, 280),
      setTimeout(measure, 600),
    ];
    return () => {
      for (const h of handles) clearTimeout(h);
    };
  }, [tourStep, measure]);

  return { ref, onLayout, remeasure: measure };
}
