import { api } from '../../../../../convex/_generated/api';
import { Brand, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/auth-client';
import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BookmarkSimple,
  Bookmark,
  Camera,
  Heart,
  HeartStraight,
  MapPin,
  PencilSimple,
  Trash,
} from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VIBE_LEVELS = [
  { key: 'empty', label: 'Empty', emoji: '💤', color: Brand.vibeEmpty, desc: 'Virtually no one here' },
  { key: 'quiet', label: 'Quiet', emoji: '🌿', color: Brand.vibeQuiet, desc: 'A few people, easy to find a spot' },
  { key: 'busy', label: 'Busy', emoji: '⚡', color: Brand.vibeBusy, desc: 'Getting crowded, limited space' },
  { key: 'chaos', label: 'Chaos', emoji: '🔥', color: Brand.vibeChaos, desc: 'Packed, good luck finding a seat' },
] as const;

type VibeLevel = 'empty' | 'quiet' | 'busy' | 'chaos';

export default function PlaceDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();

  const place = useQuery(
    api.places.getPlace,
    id ? { id: id as any } : 'skip'
  ) as any;

  const savedResult = useQuery(
    api.saves.isSaved,
    session?.user?.id && id
      ? { userId: session.user.id, placeId: id as any }
      : 'skip'
  ) as boolean | undefined;

  const recentVibes = useQuery(
    api.vibes.getVibesForPlace,
    id ? { placeId: id as any, limit: 10 } : 'skip'
  ) as any[] | undefined;

  const rateLimit = useQuery(
    api.vibes.canSubmitVibe,
    session?.user?.id && id
      ? { placeId: id as any, userId: session.user.id }
      : 'skip'
  ) as { canSubmit: boolean; minsLeft: number } | undefined;

  // Image requests — approved ones shown in carousel
  const imageRequests = useQuery(
    (api as any).imageRequests.getImageRequests,
    id ? { placeId: id as any } : 'skip'
  ) as any[] | undefined;

  const submitVibe = useMutation(api.vibes.submitVibe);
  const toggleSave = useMutation(api.saves.toggleSave);
  const submitImageRequest = useMutation((api as any).imageRequests.submitImageRequest);
  const generateUploadUrl = useMutation(api.places.generateUploadUrl);
  const deletePlace = useMutation(api.places.deletePlace);
  const submitRating = useMutation((api as any).ratings.submitRating);
  const toggleLike = useMutation((api as any).ratings.toggleLike);

  const ratingData = useQuery(
    (api as any).ratings.getRatingForPlace,
    id ? { placeId: id as any } : 'skip'
  ) as { avg: number; count: number } | undefined;

  const userRating = useQuery(
    (api as any).ratings.getUserRating,
    session?.user?.id && id ? { placeId: id as any, userId: session.user.id } : 'skip'
  ) as number | null | undefined;

  const likedResult = useQuery(
    (api as any).ratings.isLiked,
    session?.user?.id && id ? { placeId: id as any, userId: session.user.id } : 'skip'
  ) as boolean | undefined;

  const likeCount = useQuery(
    (api as any).ratings.getLikeCount,
    id ? { placeId: id as any } : 'skip'
  ) as number | undefined;

  const [submitting, setSubmitting] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<VibeLevel | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselRef = useRef<ScrollView>(null);

  const currentVibeConfig = place?.currentVibe
    ? VIBE_LEVELS.find((v) => v.key === place.currentVibe)
    : null;

  const canSubmit = rateLimit?.canSubmit !== false;

  const isOwner = place && session?.user?.id && place.addedBy === session.user.id;

  // Build carousel images: primary image first, then approved submitted photos
  const carouselImages: string[] = [];
  if (place?.imageUrl) carouselImages.push(place.imageUrl);
  if (imageRequests) {
    for (const req of imageRequests) {
      if (req.status === 'approved' && req.imageUrl && req.imageUrl !== place?.imageUrl) {
        carouselImages.push(req.imageUrl);
      }
    }
  }

  const catEmoji = ({
    cafe: '☕', library: '📚', lab: '💻', bar: '🍺',
    restaurant: '🍴', park: '🌿', gym: '🏋', shop: '🛍', other: '📍',
  } as Record<string, string>)[place?.category as string] ?? '📍';

  function openMapsLink() {
    const query = encodeURIComponent(place.address);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}&ll=${place.lat},${place.lng}`
      : `geo:${place.lat},${place.lng}?q=${query}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      }
    });
  }

  async function handleVibeSubmit() {
    if (!selectedVibe) return;
    if (!session?.user?.id) {
      Alert.alert('Sign in required', 'You need to be signed in to report a vibe.');
      return;
    }
    if (!canSubmit) {
      Alert.alert('Too soon', `You can report again in ${rateLimit?.minsLeft ?? 0} min.`);
      return;
    }
    setSubmitting(true);
    try {
      await submitVibe({ placeId: id as any, userId: session.user.id, level: selectedVibe });
      setSelectedVibe(null);
      Alert.alert('Thanks!', 'Your vibe report has been submitted.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit vibe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleSave() {
    if (!session?.user?.id) {
      Alert.alert('Sign in required', 'You need to be signed in to save places.');
      return;
    }
    try {
      await toggleSave({ userId: session.user.id, placeId: id as any });
    } catch {
      Alert.alert('Error', 'Could not update saved places.');
    }
  }

  async function handleSubmitPhoto() {
    if (!session?.user?.id) {
      Alert.alert('Sign in required', 'You need to be signed in to submit a photo.');
      return;
    }

    Alert.alert('Submit a photo', 'Choose a source', [
      {
        text: 'Camera roll',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow photo library access.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [16, 9],
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAndSubmitPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Take photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow camera access.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [16, 9],
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAndSubmitPhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function uploadAndSubmitPhoto(uri: string) {
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResponse.json();
      await submitImageRequest({
        placeId: id as any,
        submittedBy: session!.user.id,
        imageStorageId: storageId as any,
      });
      Alert.alert('Photo submitted!', 'Your photo has been submitted and is pending review.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePlace() {
    if (!isOwner) return;
    Alert.alert(
      'Delete place',
      `Are you sure you want to delete "${place.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deletePlace({ id: id as any });
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not delete place.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  async function handleStarPress(stars: number) {
    if (!session?.user?.id) {
      Alert.alert('Sign in required', 'You need to be signed in to rate places.');
      return;
    }
    setRatingSubmitting(true);
    try {
      await submitRating({ placeId: id as any, userId: session.user.id, stars });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit rating.');
    } finally {
      setRatingSubmitting(false);
    }
  }

  async function handleToggleLike() {
    if (!session?.user?.id) {
      Alert.alert('Sign in required', 'You need to be signed in to like places.');
      return;
    }
    setLikeSubmitting(true);
    try {
      await toggleLike({ placeId: id as any, userId: session.user.id });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update like.');
    } finally {
      setLikeSubmitting(false);
    }
  }

  function handleCarouselScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCarouselIndex(idx);
  }

  if (!place) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* ── Hero / Carousel ── */}
      <View style={styles.heroArea}>
        {carouselImages.length > 0 ? (
          <>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleCarouselScroll}
              scrollEventThrottle={16}
              style={StyleSheet.absoluteFillObject}
            >
              {carouselImages.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: SCREEN_WIDTH, height: 220 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            <View style={styles.heroOverlay} />
            {/* Dots */}
            {carouselImages.length > 1 && (
              <View style={styles.dotsRow}>
                {carouselImages.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === carouselIndex ? styles.dotActive : { backgroundColor: 'rgba(255,255,255,0.35)' },
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: theme.card }]}>
            <Text style={styles.heroEmoji}>{catEmoji}</Text>
          </View>
        )}

        {/* Nav overlay */}
        <View style={styles.navOverlay}>
          <Pressable style={styles.navBtn} onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={18} color="#FFFFFF" weight="regular" />
          </Pressable>
          <View style={styles.navRight}>
            {isOwner && (
              <Pressable
                style={styles.navBtn}
                onPress={() => router.push(`/(app)/place/${id}/edit` as any)}
                hitSlop={12}
              >
                <PencilSimple size={16} color="#FFFFFF" weight="regular" />
              </Pressable>
            )}
            <Pressable style={styles.navBtn} onPress={handleToggleSave} hitSlop={12}>
              {savedResult ? (
                <Bookmark size={18} color={Brand.vibeChaos} weight="fill" />
              ) : (
                <BookmarkSimple size={18} color="#FFFFFF" weight="regular" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Current vibe pill */}
        {currentVibeConfig && (
          <View style={[styles.vibePill, {
            backgroundColor: currentVibeConfig.color + '22',
            borderColor: currentVibeConfig.color + '66',
          }]}>
            <View style={[styles.vibeDot, { backgroundColor: currentVibeConfig.color }]} />
            <Text style={[styles.vibeLabel, { color: currentVibeConfig.color }]}>
              {currentVibeConfig.label.toUpperCase()}
            </Text>
            <Text style={[styles.vibeCount, { color: theme.textTertiary }]}>
              {place.vibeCount} report{place.vibeCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        {/* ── Place info ── */}
        <View style={[styles.infoSection, { borderBottomColor: theme.border }]}>
          <Text style={[styles.placeName, { color: theme.textPrimary }]}>{place.name}</Text>
          <Pressable onPress={openMapsLink} style={styles.addressRow} hitSlop={6}>
            <MapPin size={13} color={Brand.accent} weight="fill" />
            <Text style={[styles.placeAddress, { color: Brand.accent }]}>{place.address}</Text>
          </Pressable>
          {place.description && (
            <Text style={[styles.placeDesc, { color: theme.textSecondary }]}>{place.description}</Text>
          )}

          {/* Rating + Like row */}
          <View style={styles.ratingRow}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (userRating ?? 0) >= star;
                return (
                  <Pressable key={star} onPress={() => handleStarPress(star)} hitSlop={6} disabled={ratingSubmitting}>
                    <Text style={[styles.starIcon, { color: filled ? Brand.accent : theme.border }]}>★</Text>
                  </Pressable>
                );
              })}
              {ratingData && ratingData.count > 0 && (
                <Text style={[styles.ratingMeta, { color: theme.textTertiary }]}>
                  {ratingData.avg.toFixed(1)} ({ratingData.count})
                </Text>
              )}
            </View>

            <Pressable
              style={[styles.likeBtn, {
                borderColor: likedResult ? Brand.vibeChaos + '66' : theme.border,
                backgroundColor: likedResult ? Brand.vibeChaos + '14' : theme.surface,
              }]}
              onPress={handleToggleLike}
              disabled={likeSubmitting}
              hitSlop={6}
            >
              {likeSubmitting ? (
                <ActivityIndicator color={Brand.vibeChaos} size={14} />
              ) : likedResult ? (
                <Heart size={15} color={Brand.vibeChaos} weight="fill" />
              ) : (
                <HeartStraight size={15} color={theme.textSecondary} weight="regular" />
              )}
              {(likeCount ?? 0) > 0 && (
                <Text style={[styles.likeBtnText, { color: likedResult ? Brand.vibeChaos : theme.textSecondary }]}>
                  {likeCount}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Action row: submit photo + delete */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && { opacity: 0.75 },
              ]}
              onPress={handleSubmitPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size={13} color={Brand.accent} />
              ) : (
                <Camera size={14} color={theme.textSecondary} weight="regular" />
              )}
              <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>
                {uploadingPhoto ? 'Uploading...' : 'Submit a photo'}
              </Text>
            </Pressable>

            {isOwner && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.deleteBtn,
                  { borderColor: '#FF453A' + '44' },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={handleDeletePlace}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size={13} color="#FF453A" />
                ) : (
                  <Trash size={14} color="#FF453A" weight="regular" />
                )}
                <Text style={[styles.actionBtnText, { color: '#FF453A' }]}>
                  {deleting ? 'Deleting...' : 'Delete place'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Report vibe ── */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>What's the vibe right now?</Text>
          {rateLimit && !rateLimit.canSubmit ? (
            <View style={[styles.rateLimitBanner, { backgroundColor: Brand.vibeBusy + '18', borderColor: Brand.vibeBusy + '44' }]}>
              <Text style={[styles.rateLimitText, { color: Brand.vibeBusy }]}>
                You can report again in {rateLimit.minsLeft} min{rateLimit.minsLeft !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : (
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>Tap to report the current crowd level</Text>
          )}

          <View style={styles.vibeGrid}>
            {VIBE_LEVELS.map((v) => (
              <Pressable
                key={v.key}
                style={[
                  styles.vibeCard,
                  { borderColor: theme.border, backgroundColor: theme.card },
                  selectedVibe === v.key && [styles.vibeCardSelected, { borderColor: v.color + '88', backgroundColor: v.color + '18' }],
                  !canSubmit && styles.vibeCardDisabled,
                ]}
                onPress={() => canSubmit && setSelectedVibe(selectedVibe === v.key ? null : v.key)}
              >
                <Text style={styles.vibeEmoji}>{v.emoji}</Text>
                <Text style={[styles.vibeCardLabel, { color: theme.textPrimary }, selectedVibe === v.key && { color: v.color }]}>
                  {v.label}
                </Text>
                <Text style={[styles.vibeCardDesc, { color: theme.textSecondary }]}>{v.desc}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              (!selectedVibe || !canSubmit) && [styles.submitBtnDisabled, { backgroundColor: theme.surface, borderColor: theme.border }],
              pressed && selectedVibe && canSubmit && styles.submitBtnPressed,
            ]}
            onPress={handleVibeSubmit}
            disabled={!selectedVibe || submitting || !canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.submitBtnText, { color: (!selectedVibe || !canSubmit) ? theme.textTertiary : '#FFFFFF' }]}>
                {!canSubmit
                  ? `Report again in ${rateLimit?.minsLeft ?? 0} min`
                  : selectedVibe
                  ? `Report: ${selectedVibe}`
                  : 'Select a vibe to report'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* ── Recent reports ── */}
        {recentVibes && recentVibes.length > 0 && (
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent reports</Text>
            {recentVibes.slice(0, 8).map((v: any, i: number) => {
              const cfg = VIBE_LEVELS.find((l) => l.key === v.level);
              const ago = Math.round((Date.now() - v.createdAt) / 60000);
              return (
                <View key={v._id ?? i} style={[styles.reportRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.reportDot, { backgroundColor: cfg?.color ?? theme.border }]} />
                  <Text style={[styles.reportLabel, { color: theme.textPrimary }]}>{cfg?.label ?? v.level}</Text>
                  <Text style={[styles.reportTime, { color: theme.textTertiary }]}>
                    {ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroArea: { height: 220, position: 'relative', overflow: 'hidden' },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    pointerEvents: 'none',
  },
  heroEmoji: { fontSize: 64, opacity: 0.25 },

  // Carousel dots
  dotsRow: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 14,
    borderRadius: 3,
  },

  navOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: Spacing.six,
    right: Spacing.six,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navRight: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  vibePill: {
    position: 'absolute',
    bottom: 16,
    left: Spacing.six,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  vibeDot: { width: 6, height: 6, borderRadius: 3 },
  vibeLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.xs, letterSpacing: 1 },
  vibeCount: { fontFamily: FontFamily.sans, fontSize: FontSize.xs },

  // Content
  scroll: {},
  infoSection: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    borderBottomWidth: 1,
  },
  placeName: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.xxl,
    letterSpacing: -0.8,
  },
  placeAddress: { fontFamily: FontFamily.sans, fontSize: FontSize.sm },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  placeDesc: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.6,
    marginTop: Spacing.one,
  },

  // Action buttons (submit photo, delete)
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  deleteBtn: {
    backgroundColor: '#FF453A0D',
  },
  actionBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    letterSpacing: 0.1,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  sectionTitle: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.md, letterSpacing: -0.3 },
  sectionSub: { fontFamily: FontFamily.sans, fontSize: FontSize.xs, marginBottom: Spacing.three },

  // Rate limit
  rateLimitBanner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  rateLimitText: { fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, letterSpacing: 0.1 },

  // Vibe cards
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.four },
  vibeCard: {
    width: '48%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  vibeCardSelected: { borderWidth: 1.5 },
  vibeCardDisabled: { opacity: 0.45 },
  vibeEmoji: { fontSize: 22, marginBottom: 2 },
  vibeCardLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, letterSpacing: -0.1 },
  vibeCardDesc: { fontFamily: FontFamily.sans, fontSize: FontSize.xs, lineHeight: FontSize.xs * 1.5 },

  // Submit
  submitBtn: {
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { borderWidth: 1 },
  submitBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  submitBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm, letterSpacing: 0.2 },

  // Reports
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  reportDot: { width: 8, height: 8, borderRadius: 4 },
  reportLabel: { fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, flex: 1, textTransform: 'capitalize' },
  reportTime: { fontFamily: FontFamily.sans, fontSize: FontSize.xs },

  // Rating + Like
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  starsContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starIcon: { fontSize: 22 },
  ratingMeta: { fontFamily: FontFamily.sans, fontSize: FontSize.xs, marginLeft: 4 },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  likeBtnText: { fontFamily: FontFamily.sansMedium, fontSize: FontSize.xs },
});
