import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';

import { Brand, FontFamily, FontSize, Radius, Spacing, Text as TextColors } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    headline: 'Know before\nyou go',
    sub: 'See real-time crowd levels for every spot on campus — empty, quiet, busy, or chaos.',
    accent: '#3B6EF8',
    blob1: ['#1A2E6E', '#0A0A0A'] as const,
    blob2: ['#0D1F4D', 'transparent'] as const,
    vibeLabel: 'BUSY',
    vibeColor: Brand.vibeBusy,
  },
  {
    id: '2',
    headline: 'Campus in\nyour pocket',
    sub: 'Cafés, labs, the library, the bar — browse every place around Kingston Uni in one feed.',
    accent: '#32D74B',
    blob1: ['#0D3320', '#0A0A0A'] as const,
    blob2: ['#082213', 'transparent'] as const,
    vibeLabel: 'QUIET',
    vibeColor: Brand.vibeQuiet,
  },
  {
    id: '3',
    headline: 'You shape\nthe vibe',
    sub: 'Drop a quick report and help your fellow students find the right spot at the right time.',
    accent: '#3B6EF8',
    blob1: ['#1A2E6E', '#0A0A0A'] as const,
    blob2: ['#2C1B4A', 'transparent'] as const,
    vibeLabel: 'YOUR CALL',
    vibeColor: Brand.accent,
  },
] as const;

async function completeOnboarding() {
  await SecureStore.setItemAsync('hasOnboarded', 'true');
  router.replace('/(auth)/login');
}

// ─── Dot indicator ────────────────────────────────────────────────────────────
function Dots({ current, total, accent }: { current: number; total: number; accent: string }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current
              ? [styles.dotActive, { backgroundColor: accent, width: 20 }]
              : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Individual slide ─────────────────────────────────────────────────────────
function Slide({ item }: { item: (typeof SLIDES)[number] }) {
  return (
    <View style={styles.slide}>
      {/* Ambient gradient blob — top */}
      <LinearGradient
        colors={item.blob1}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.blobTop}
        pointerEvents="none"
      />
      {/* Secondary blob — offset */}
      <LinearGradient
        colors={item.blob2}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.blobSide}
        pointerEvents="none"
      />

      {/* Vibe badge — floating in blob area */}
      <View style={[styles.vibeBadge, { borderColor: item.vibeColor + '55', backgroundColor: item.vibeColor + '22' }]}>
        <View style={[styles.vibeDot, { backgroundColor: item.vibeColor }]} />
        <Text style={[styles.vibeText, { color: item.vibeColor }]}>{item.vibeLabel}</Text>
      </View>

      {/* Content anchored to bottom third */}
      <View style={styles.content}>
        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.sub}>{item.sub}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const currentSlide = SLIDES[currentIndex];

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Skip button */}
      <Pressable
        style={styles.skip}
        onPress={completeOnboarding}
        hitSlop={12}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
      />

      {/* Bottom control area */}
      <View style={styles.footer}>
        <Dots current={currentIndex} total={SLIDES.length} accent={currentSlide.accent} />

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: currentSlide.accent },
            pressed && styles.ctaPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  skip: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: Spacing.six,
    zIndex: 10,
  },
  skipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    color: TextColors.secondary,
    letterSpacing: 0.2,
  },

  // ── Slide ──
  slide: {
    width: W,
    height: H,
    backgroundColor: Brand.bg,
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    top: -H * 0.1,
    left: -W * 0.2,
    width: W * 1.4,
    height: H * 0.65,
    borderRadius: W * 0.7,
    opacity: 0.9,
  },
  blobSide: {
    position: 'absolute',
    top: H * 0.05,
    right: -W * 0.3,
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    opacity: 0.6,
  },
  vibeBadge: {
    position: 'absolute',
    top: H * 0.28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  vibeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vibeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.xs,
    letterSpacing: 1.2,
  },

  // ── Content ──
  content: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.six,
  },
  headline: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.display,
    color: TextColors.primary,
    lineHeight: FontSize.display * 1.1,
    letterSpacing: -1,
    marginBottom: Spacing.four,
  },
  sub: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
    color: TextColors.secondary,
    lineHeight: FontSize.base * 1.6,
    letterSpacing: 0.1,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 52 : 32,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.six,
    gap: Spacing.five,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    height: 4,
    borderRadius: 2,
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cta: {
    width: '100%',
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
