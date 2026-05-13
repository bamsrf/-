/**
 * ArchetypeChip — маленький chip с архетипом коллекционера под аватаркой/ником.
 *
 * Тянет ачивки юзера, считает архетип и рисует chip. Если archetype=Новичок и
 * `hideRookie=true` — ничего не рисуем (новые юзеры не получают chip).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { api } from '../lib/api';
import { computeArchetype, ArchetypeInfo } from '../lib/archetype';
import { TIER_AURA } from './achievement-scenes';
import type { MyAchievementsResponse } from '../lib/types';

interface Props {
  /** null/undefined → текущий юзер */
  username?: string | null;
  /** Не рисовать chip, если архетип = Новичок (default true) */
  hideRookie?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ArchetypeChip({ username, hideRookie = true, style }: Props) {
  const [archetype, setArchetype] = useState<ArchetypeInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data: MyAchievementsResponse = username
          ? await api.getAchievementsByUsername(username)
          : await api.getMyAchievements();
        if (cancelled) return;
        setArchetype(computeArchetype(data));
      } catch {
        if (!cancelled) setArchetype(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!archetype) return null;
  if (hideRookie && archetype.key === 'rookie') return null;

  const tone = TIER_AURA[archetype.tierKey] || TIER_AURA.simple;

  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: tone.aura,
          backgroundColor: tone.aura + '15',
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: tone.aura }]}>
        {archetype.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
