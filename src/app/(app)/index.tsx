import { api } from '../../../convex/_generated/api';
import { Brand, FontFamily, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { MagnifyingGlass, Plus, X } from 'phosphor-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = 'cafe' | 'library' | 'lab' | 'bar' | 'restaurant' | 'park' | 'gym' | 'shop' | 'other';

interface EnrichedPlace {
  _id: string;
  name: string;
  category: Category;
  description?: string;
  address: string;
  imageUrl?: string | null;
  currentVibe: string | null;
  vibeCount: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES: { key: Category | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '✦' },
  { key: 'cafe', label: 'Café', emoji: '☕' },
  { key: 'library', label: 'Library', emoji: '📚' },
  { key: 'lab', label: 'Lab', emoji: '💻' },
  { key: 'bar', label: 'Bar', emoji: '🍺' },
  { key: 'restaurant', label: 'Food', emoji: '🍴' },
  { key: 'park', label: 'Park', emoji: '🌿' },
  { key: 'gym', label: 'Gym', emoji: '🏋' },
  { key: 'shop', label: 'Shop', emoji: '🛍' },
];

const VIBE_CONFIG: Record<string, { label: string; color: string }> = {
  empty: { label: 'Empty', color: Brand.vibeEmpty },
  quiet: { label: 'Quiet', color: Brand.vibeQuiet },
  busy: { label: 'Busy', color: Brand.vibeBusy },
  chaos: { label: 'Chaos', color: Brand.vibeChaos },
};

// ─── Vibe badge ────────────────────────────────────────────────────────────────
function VibeBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const cfg = VIBE_CONFIG[level];
  if (!cfg) return null;
  return (
    <View style={[styles.vibeBadge, { borderColor: cfg.color + '55', backgroundColor: cfg.color + '22' }]}>
      <View style={[styles.vibeDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.vibeText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
    </View>
  );
}

// ─── Place card ────────────────────────────────────────────────────────────────
function PlaceCard({ place }: { place: EnrichedPlace }) {
  const theme = useTheme();
  const catEmoji = CATEGORIES.find((c) => c.key === place.category)?.emoji ?? '📍';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.cardPressed,
      ]}
      onPress={() => router.push(`/(app)/place/${place._id}` as any)}
    >
      {/* Image / placeholder */}
      <View style={[styles.cardImage, { backgroundColor: theme.surface }]}>
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImageEmoji}>{catEmoji}</Text>
          </View>
        )}
        <VibeBadge level={place.currentVibe} />
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: theme.textPrimary }]} numberOfLines={1}>{place.name}</Text>
        <Text style={[styles.cardAddress, { color: theme.textSecondary }]} numberOfLines={1}>{place.address}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.cardCategoryPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardCategoryText, { color: theme.textSecondary }]}>{catEmoji} {place.category}</Text>
          </View>
          {place.vibeCount > 0 && (
            <Text style={[styles.cardVibeCount, { color: theme.textTertiary }]}>
              {place.vibeCount} report{place.vibeCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Category pill ─────────────────────────────────────────────────────────────
function CategoryPill({
  item,
  active,
  onPress,
}: {
  item: (typeof CATEGORIES)[number];
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.categoryPill,
        { backgroundColor: theme.surface, borderColor: theme.border },
        active && { backgroundColor: Brand.accentMuted, borderColor: Brand.accent + '55' },
        pressed && styles.categoryPillPressed,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.categoryPillText,
        { color: theme.textSecondary },
        active && { color: Brand.accent },
      ]}>
        {item.emoji} {item.label}
      </Text>
    </Pressable>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchFocused, setSearchFocused] = useState(false);

  // Queries
  const allPlaces = useQuery(
    api.places.listPlaces,
    selectedCategory === 'all' ? {} : { category: selectedCategory }
  ) as EnrichedPlace[] | undefined;

  const searchResults = useQuery(
    api.places.searchPlaces,
    searchQuery.trim().length > 1 ? { query: searchQuery.trim() } : 'skip'
  ) as EnrichedPlace[] | undefined;

  const trendingPlaces = useQuery(api.places.getTrendingPlaces, { limit: 10 }) as EnrichedPlace[] | undefined;

  const gemPlaces = useQuery((api as any).ratings.getGems, { limit: 8 }) as (EnrichedPlace & {
    avgRating: number;
    likeCount: number;
  })[] | undefined;

  const isSearching = searchQuery.trim().length > 1;
  const displayedPlaces = isSearching ? (searchResults ?? []) : (allPlaces ?? []);
  const isLoading = isSearching ? searchResults === undefined : allPlaces === undefined;

  const renderPlace = useCallback(
    ({ item }: { item: EnrichedPlace }) => <PlaceCard place={item} />,
    []
  );

  const keyExtractor = useCallback((item: EnrichedPlace) => item._id, []);

  const ListHeader = useMemo(() => (
    <View>
      {/* Trending strip — only shown when not searching */}
      {!isSearching && trendingPlaces && trendingPlaces.length > 0 && (
        <View>
          <SectionHeader title="Trending now" subtitle="Last 30 min · chaos → empty" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}
          >
            {trendingPlaces.map((p) => (
              <Pressable
                key={p._id}
                style={({ pressed }) => [
                  styles.trendingChip,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && styles.trendingChipPressed,
                ]}
                onPress={() => router.push(`/(app)/place/${p._id}` as any)}
              >
                <VibeBadge level={p.currentVibe} />
                <Text style={[styles.trendingName, { color: theme.textPrimary }]} numberOfLines={1}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Gems strip — only shown when not searching */}
      {!isSearching && gemPlaces && gemPlaces.length > 0 && (
        <View>
          <SectionHeader title="Hidden gems" subtitle="Highly rated · not overcrowded" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}
          >
            {gemPlaces.map((p) => (
              <Pressable
                key={p._id}
                style={({ pressed }) => [
                  styles.gemChip,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && styles.trendingChipPressed,
                ]}
                onPress={() => router.push(`/(app)/place/${p._id}` as any)}
              >
                <View style={styles.gemMeta}>
                  <Text style={[styles.gemRating, { color: Brand.accent }]}>★ {p.avgRating.toFixed(1)}</Text>
                  {p.likeCount > 0 && (
                    <Text style={[styles.gemLikes, { color: theme.textTertiary }]}>· {p.likeCount} ♥</Text>
                  )}
                </View>
                <Text style={[styles.trendingName, { color: theme.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                <VibeBadge level={p.currentVibe} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <SectionHeader
        title={isSearching ? `Results for "${searchQuery}"` : 'All places'}
        subtitle={isLoading ? undefined : `${displayedPlaces.length} place${displayedPlaces.length !== 1 ? 's' : ''}`}
      />
    </View>
  ), [isSearching, trendingPlaces, gemPlaces, searchQuery, isLoading, displayedPlaces.length, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* Fixed header */}
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.appName, { color: theme.textPrimary }]}>QueueQuest</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Kingston University</Text>
          </View>
          {/* Add place button */}
          <Pressable
            style={[styles.addBtn, { backgroundColor: Brand.accentMuted, borderColor: Brand.accent + '55' }]}
            onPress={() => router.push('/(app)/place/add' as any)}
          >
            <Plus size={18} color={Brand.accent} weight="bold" />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={[
          styles.searchBar,
          { backgroundColor: theme.surface, borderColor: theme.border },
          searchFocused && { borderColor: Brand.accent + '66' },
        ]}>
          <MagnifyingGlass size={16} color={theme.textTertiary} weight="regular" />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search places..."
            placeholderTextColor={theme.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={14} color={theme.textTertiary} weight="bold" />
            </Pressable>
          )}
        </View>

        {/* Category pills */}
        {!isSearching && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat.key}
                item={cat}
                active={selectedCategory === cat.key}
                onPress={() => setSelectedCategory(cat.key as Category | 'all')}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Brand.accent} size="large" />
        </View>
      ) : displayedPlaces.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon, { color: theme.textTertiary }]}>◎</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {isSearching ? 'No results found' : 'No places yet'}
          </Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            {isSearching
              ? 'Try a different search term'
              : 'Be the first to add a place on campus'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedPlaces}
          keyExtractor={keyExtractor}
          renderItem={renderPlace}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.feed}
          showsVerticalScrollIndicator={false}
          numColumns={1}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const TAB_BAR_CLEARANCE = 160;

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.six,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appName: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.xl,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
    paddingVertical: 0,
  },

  // Category pills
  categoryRow: {
    paddingBottom: 2,
    gap: Spacing.two,
  },
  categoryPill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryPillPressed: { opacity: 0.75 },
  categoryPillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    letterSpacing: 0.2,
  },

  // Feed
  feed: {
    paddingHorizontal: Spacing.six,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section headers
  sectionHeader: {
    marginTop: Spacing.six,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 2,
  },

  // Trending strip
  trendingRow: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    maxWidth: 180,
  },
  trendingChipPressed: { opacity: 0.75 },
  trendingName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    flexShrink: 1,
  },

  // Gems chip
  gemChip: {
    flexDirection: 'column',
    gap: 4,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    width: 160,
  },
  gemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gemRating: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.xs,
    letterSpacing: 0.2,
  },
  gemLikes: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
  },

  // Place card
  card: {
    borderRadius: Radius.xl,
    marginBottom: Spacing.four,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardImage: {
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  cardImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageEmoji: { fontSize: 40, opacity: 0.3 },
  cardInfo: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    letterSpacing: -0.2,
  },
  cardAddress: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    letterSpacing: 0.1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  cardCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  cardCategoryText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  cardVibeCount: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
  },

  // Vibe badge
  vibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  vibeDot: { width: 5, height: 5, borderRadius: 2.5 },
  vibeText: { fontFamily: FontFamily.sansSemiBold, fontSize: 9, letterSpacing: 1 },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.ten,
    gap: Spacing.three,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.two },
  emptyTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.6,
  },
});
