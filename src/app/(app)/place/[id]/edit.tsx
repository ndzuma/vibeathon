import { api } from '../../../../../convex/_generated/api';
import { Brand, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/auth-client';
import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Image as ImageIcon, Link, MapPin, NavigationArrow, X } from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';

type Category = 'cafe' | 'library' | 'lab' | 'bar' | 'restaurant' | 'park' | 'gym' | 'shop' | 'other';

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'cafe', label: 'Café', emoji: '☕' },
  { key: 'library', label: 'Library', emoji: '📚' },
  { key: 'lab', label: 'Lab', emoji: '💻' },
  { key: 'bar', label: 'Bar', emoji: '🍺' },
  { key: 'restaurant', label: 'Food', emoji: '🍴' },
  { key: 'park', label: 'Park', emoji: '🌿' },
  { key: 'gym', label: 'Gym', emoji: '🏋' },
  { key: 'shop', label: 'Shop', emoji: '🛍' },
  { key: 'other', label: 'Other', emoji: '📍' },
];

const CAMPUS = { latitude: 51.4125, longitude: -0.3015, latitudeDelta: 0.01, longitudeDelta: 0.015 };

export default function EditPlaceScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();

  const place = useQuery(
    api.places.getPlace,
    id ? { id: id as any } : 'skip'
  ) as any;

  const updatePlace = useMutation(api.places.updatePlace);
  const generateUploadUrl = useMutation(api.places.generateUploadUrl);

  // Text fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('cafe');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);   // new local file picked
  const [imageUrl, setImageUrl] = useState('');                     // URL input value
  const [imageMode, setImageMode] = useState<'none' | 'url'>('none');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Location/map state
  const [lat, setLat] = useState(51.412);
  const [lng, setLng] = useState(-0.302);
  const [mapVisible, setMapVisible] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Pre-fill fields once place data loads (only once)
  useEffect(() => {
    if (place && !prefilled) {
      setName(place.name ?? '');
      setAddress(place.address ?? '');
      setDescription(place.description ?? '');
      setCategory((place.category as Category) ?? 'other');
      if (place.lat) setLat(place.lat);
      if (place.lng) setLng(place.lng);
      if (place.lat && place.lng) {
        setPinCoords({ latitude: place.lat, longitude: place.lng });
      }
      // Pre-fill imageUrl if place has a URL-based image but no storageId
      if (place.imageUrl && !place.imageStorageId) {
        setImageUrl(place.imageUrl);
        setImageMode('url');
      }
      setPrefilled(true);
    }
  }, [place, prefilled]);

  const isOwner = place && session?.user?.id && place.addedBy === session.user.id;

  // Derived: what image will actually show as preview
  const previewUri = imageUri ?? (imageMode === 'url' && imageUrl.trim() ? imageUrl.trim() : null) ?? place?.imageUrl ?? null;

  async function pickFromLibrary() {
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
      setImageUri(result.assets[0].uri);
      setImageMode('none');
      setImageUrl('');
    }
  }

  async function takePhoto() {
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
      setImageUri(result.assets[0].uri);
      setImageMode('none');
      setImageUrl('');
    }
  }

  function showImageOptions() {
    Alert.alert('Change photo', 'Choose a source', [
      { text: 'Camera roll', onPress: pickFromLibrary },
      { text: 'Take photo', onPress: takePhoto },
      { text: 'Paste URL', onPress: () => setImageMode('url') },
      { text: 'Remove photo', style: 'destructive', onPress: () => { setImageUri(null); setImageUrl(''); setImageMode('none'); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow location access.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const parts = [geo.name, geo.street, geo.city, geo.postalCode].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  }

  function handleMapPress(e: MapPressEvent) {
    setPinCoords(e.nativeEvent.coordinate);
  }

  function confirmMapPin() {
    if (pinCoords) {
      setLat(pinCoords.latitude);
      setLng(pinCoords.longitude);
    }
    setMapVisible(false);
  }

  async function uploadLocalImage(): Promise<string | null> {
    if (!imageUri) return null;
    setUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: blob,
      });
      const { storageId } = await uploadResponse.json();
      return storageId as string;
    } catch {
      Alert.alert('Upload failed', 'Could not upload image; saving without new photo.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Missing fields', 'Please enter a name and address.');
      return;
    }
    if (!isOwner) {
      Alert.alert('Not allowed', 'Only the person who added this place can edit it.');
      return;
    }
    setLoading(true);
    try {
      let storageId: string | null = null;
      let finalUrl: string | null = null;

      if (imageUri) {
        storageId = await uploadLocalImage();
      } else if (imageMode === 'url' && imageUrl.trim()) {
        finalUrl = imageUrl.trim();
      } else if (!imageUri && imageMode === 'none' && !imageUrl.trim()) {
        // User cleared the image — pass empty strings to signal removal if desired,
        // but since the backend field is optional we just leave existing values unless
        // user explicitly removed. We detect removal via previewUri being null when
        // place originally had an image.
        if (!previewUri && place?.imageUrl) {
          // cleared
          finalUrl = '';
        }
      }

      await updatePlace({
        id: id as any,
        name: name.trim(),
        address: address.trim(),
        description: description.trim() || undefined,
        category,
        lat,
        lng,
        imageStorageId: storageId as any ?? undefined,
        imageUrl: finalUrl !== null ? (finalUrl || undefined) : undefined,
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save changes.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state ──
  if (!place) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />
        <ActivityIndicator color={Brand.accent} size="large" />
      </View>
    );
  }

  // ── Unauthorized state ──
  if (place && session && !isOwner) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
          You don't have permission to edit this place.
        </Text>
        <Pressable style={[styles.backLink, { borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backLinkText, { color: theme.textPrimary }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={16} color={theme.textPrimary} weight="regular" />
        </Pressable>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Edit place</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Image picker ── */}
          <Pressable
            style={[styles.imagePicker, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={showImageOptions}
          >
            {previewUri ? (
              <>
                <Image source={{ uri: previewUri }} style={styles.imagePreview} />
                <Pressable
                  style={styles.imageRemoveBtn}
                  onPress={() => { setImageUri(null); setImageUrl(''); setImageMode('none'); }}
                  hitSlop={8}
                >
                  <X size={14} color="#fff" weight="bold" />
                </Pressable>
              </>
            ) : (
              <View style={styles.imagePickerInner}>
                <Camera size={28} color={theme.textTertiary} weight="regular" />
                <Text style={[styles.imagePickerText, { color: theme.textTertiary }]}>
                  Tap to change photo
                </Text>
                <View style={styles.imagePickerActions}>
                  <View style={[styles.imagePickerChip, { borderColor: theme.border }]}>
                    <ImageIcon size={12} color={theme.textSecondary} />
                    <Text style={[styles.imagePickerChipText, { color: theme.textSecondary }]}>Library</Text>
                  </View>
                  <View style={[styles.imagePickerChip, { borderColor: theme.border }]}>
                    <Camera size={12} color={theme.textSecondary} />
                    <Text style={[styles.imagePickerChipText, { color: theme.textSecondary }]}>Camera</Text>
                  </View>
                  <View style={[styles.imagePickerChip, { borderColor: theme.border }]}>
                    <Link size={12} color={theme.textSecondary} />
                    <Text style={[styles.imagePickerChipText, { color: theme.textSecondary }]}>URL</Text>
                  </View>
                </View>
              </View>
            )}
          </Pressable>

          {/* URL input */}
          {imageMode === 'url' && (
            <View style={[styles.fieldGroup, { marginTop: Spacing.three }]}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Image URL</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary },
                  urlFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
                onFocus={() => setUrlFocused(true)}
                onBlur={() => setUrlFocused(false)}
              />
            </View>
          )}

          <View style={styles.form}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Place name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary },
                  nameFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ground Floor Library"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Address + location helpers */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Address *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary },
                  addressFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Penryn Road, KT1 2EE"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => setAddressFocused(true)}
                onBlur={() => setAddressFocused(false)}
              />
              <View style={styles.locationRow}>
                <Pressable
                  style={[styles.locationChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={useCurrentLocation}
                  disabled={locating}
                >
                  {locating ? (
                    <ActivityIndicator size={12} color={Brand.accent} />
                  ) : (
                    <NavigationArrow size={12} color={Brand.accent} weight="fill" />
                  )}
                  <Text style={[styles.locationChipText, { color: Brand.accent }]}>
                    {locating ? 'Locating...' : 'Use my location'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.locationChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => { setPinCoords(lat && lng ? { latitude: lat, longitude: lng } : null); setMapVisible(true); }}
                >
                  <MapPin size={12} color={theme.textSecondary} weight="regular" />
                  <Text style={[styles.locationChipText, { color: theme.textSecondary }]}>
                    {pinCoords ? 'Pin set ✓' : 'Pin on map'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary },
                  descFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="What's this place like?"
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
                returnKeyType="default"
                onFocus={() => setDescFocused(true)}
                onBlur={() => setDescFocused(false)}
              />
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    style={[
                      styles.categoryChip,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      category === cat.key && { backgroundColor: Brand.accentMuted, borderColor: Brand.accent + '55' },
                    ]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      { color: theme.textSecondary },
                      category === cat.key && { color: Brand.accent },
                    ]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Save button */}
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleSave}
            disabled={loading || uploadingImage}
          >
            {loading || uploadingImage ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Save changes</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Map Modal */}
      <Modal visible={mapVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.mapModal, { backgroundColor: theme.bg }]}>
          <View style={[styles.mapHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.mapTitle, { color: theme.textPrimary }]}>Pin location</Text>
            <Pressable onPress={() => setMapVisible(false)} hitSlop={12}>
              <X size={20} color={theme.textSecondary} weight="regular" />
            </Pressable>
          </View>
          <Text style={[styles.mapHint, { color: theme.textSecondary }]}>
            Tap on the map to place a pin
          </Text>
          <MapView
            style={styles.map}
            initialRegion={pinCoords ? {
              latitude: pinCoords.latitude,
              longitude: pinCoords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            } : CAMPUS}
            onPress={handleMapPress}
            userInterfaceStyle={theme.isDark ? 'dark' : 'light'}
          >
            {pinCoords && (
              <Marker coordinate={pinCoords} pinColor={Brand.accent} />
            )}
          </MapView>
          <View style={[styles.mapFooter, { borderTopColor: theme.border }]}>
            <Pressable
              style={[styles.mapConfirmBtn, !pinCoords && styles.mapConfirmBtnDisabled]}
              onPress={confirmMapPin}
              disabled={!pinCoords}
            >
              <Text style={styles.mapConfirmText}>
                {pinCoords ? 'Confirm pin' : 'Tap map to set pin'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.six,
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
    textAlign: 'center',
  },
  backLink: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  backLinkText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.six,
    paddingBottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  title: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    letterSpacing: -0.2,
  },
  headerRight: { width: 32 },

  scroll: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.five,
    paddingBottom: 80,
  },

  // Image picker
  imagePicker: {
    height: 160,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: Spacing.five,
  },
  imagePreview: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  imagePickerText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    letterSpacing: 0.1,
  },
  imagePickerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  imagePickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  imagePickerChipText: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
  },

  // Form
  form: { gap: Spacing.five, marginBottom: Spacing.seven },
  fieldGroup: { gap: Spacing.two },
  label: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
  },
  input: {
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
  },
  inputMultiline: {
    height: 90,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },

  // Location helpers
  locationRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  locationChipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
  },

  // Category
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontFamily: FontFamily.sansMedium, fontSize: FontSize.xs },

  // CTA
  cta: {
    height: 54, borderRadius: Radius.pill,
    backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Map modal
  mapModal: { flex: 1 },
  mapHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: Spacing.six,
    paddingBottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  mapTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    letterSpacing: -0.3,
  },
  mapHint: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  map: { flex: 1 },
  mapFooter: {
    padding: Spacing.six,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.six,
    borderTopWidth: 1,
  },
  mapConfirmBtn: {
    height: 52, borderRadius: Radius.pill,
    backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  mapConfirmBtnDisabled: { opacity: 0.45 },
  mapConfirmText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
