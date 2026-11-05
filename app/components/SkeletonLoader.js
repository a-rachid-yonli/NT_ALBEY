// components/SkeletonLoader.js
// ✨ Effet Skeleton Shimmer fluide pour le chargement des transactions
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { ThemedView as View } from '../context/LanguageContext';

export function TransactionSkeletonList({ count = 4 }) {
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.listWrap}>
      {Array.from({ length: count }).map((_, idx) => (
        <Animated.View
          key={`skeleton-tx-${idx}`}
          style={[styles.card, { opacity: pulseAnim }]}
        >
          <View style={styles.avatar} />
          <View style={styles.middle}>
            <View style={styles.linePrimary} />
            <View style={styles.lineSecondary} />
          </View>
          <View style={styles.right}>
            <View style={styles.amountLine} />
            <View style={styles.badgeLine} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    width: '100%',
    gap: 10,
    paddingVertical: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  middle: {
    flex: 1,
    gap: 8,
  },
  linePrimary: {
    width: '68%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  lineSecondary: {
    width: '44%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amountLine: {
    width: 64,
    height: 13,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  badgeLine: {
    width: 44,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
});
