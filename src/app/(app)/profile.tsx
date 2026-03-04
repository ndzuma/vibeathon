import { api } from '../../../convex/_generated/api';
import { Brand, FontFamily, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/contexts/theme-context';
import { authClient } from '@/lib/auth-client';
import { useMutation, useQuery } from 'convex/react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { PencilSimple, Camera, Moon, Sun } from 'phosphor-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const VIBE_CONFIG: Record<string, { label: string; color: string }> = {
  empty: { label: 'Empty', color: Brand.vibeEmpty },
  quiet: { label: 'Quiet', color: Brand.vibeQuiet },
  busy: { label: 'Busy', color: Brand.vibeBusy },
  chaos: { label: 'Chaos', color: Brand.vibeChaos },
};

interface EnrichedPlace {
  _id: string;
  name: string;
  category: string;
  address: string;
  currentVibe: string | null;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({
  name,
  avatarUrl,
  size = 68,
  onPress,
}: {
  name?: string;
  avatarUrl?: string | null;
  size?: number;
  onPress?: () => void;
}) {
  const initials = name
    ? name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase()
    : '?';

  const inner = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={{ position: 'relative' }}>
      {inner}
      <View style={[styles.avatarEditBadge, { right: 0, bottom: 0 }]}>
        <Camera size={12} color="#fff" weight="bold" />
      </View>
    </Pressable>
  );
}

// ─── Place rows ────────────────────────────────────────────────────────────────
function SavedPlaceRow({ place }: { place: EnrichedPlace }) {
  const theme = useTheme();
  const cfg = place.currentVibe ? VIBE_CONFIG[place.currentVibe] : null;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.placeRow,
        { borderBottomColor: theme.border },
        pressed && styles.placeRowPressed,
      ]}
      onPress={() => router.push(`/(app)/place/${place._id}` as any)}
    >
      <View style={styles.placeRowLeft}>
        <View style={[styles.placeDot, { backgroundColor: cfg?.color ?? theme.border }]} />
        <View>
          <Text style={[styles.placeName, { color: theme.textPrimary }]}>{place.name}</Text>
          <Text style={[styles.placeAddress, { color: theme.textSecondary }]}>{place.address}</Text>
        </View>
      </View>
      {cfg && (
        <Text style={[styles.placeVibe, { color: cfg.color }]}>{cfg.label}</Text>
      )}
    </Pressable>
  );
}

function AddedPlaceRow({ place }: { place: EnrichedPlace }) {
  const theme = useTheme();
  const cfg = place.currentVibe ? VIBE_CONFIG[place.currentVibe] : null;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.placeRow,
        { borderBottomColor: theme.border },
        pressed && styles.placeRowPressed,
      ]}
      onPress={() => router.push(`/(app)/place/${place._id}` as any)}
    >
      <View style={styles.placeRowLeft}>
        <View style={[styles.placeDot, { backgroundColor: cfg?.color ?? theme.border }]} />
        <View>
          <Text style={[styles.placeName, { color: theme.textPrimary }]}>{place.name}</Text>
          <Text style={[styles.placeAddress, { color: theme.textSecondary }]}>{place.address}</Text>
        </View>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          router.push(`/(app)/place/${place._id}/edit` as any);
        }}
        hitSlop={8}
        style={[styles.editBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <PencilSimple size={13} color={theme.textSecondary} weight="regular" />
      </Pressable>
    </Pressable>
  );
}

// ─── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentBio,
  authId,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentBio: string;
  authId: string;
}) {
  const theme = useTheme();
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ authId, name: name.trim() || undefined, bio: bio.trim() || undefined });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit profile</Text>
          <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
            {saving ? (
              <ActivityIndicator color={Brand.accent} size="small" />
            ) : (
              <Text style={[styles.modalSave, { color: Brand.accent }]}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll}>
          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Display name</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              autoCorrect={false}
            />
          </View>

          {/* Bio field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
              value={bio}
              onChangeText={setBio}
              placeholder="A short bio..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const theme = useTheme();
  const { isDark, toggle, mode } = useThemeContext();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const convexUser = useQuery(
    api.users.getMe,
    user?.id ? { authId: user.id } : 'skip'
  ) as { name: string; email: string; avatarUrl?: string | null; bio?: string | null } | null | undefined;

  const savedPlaces = useQuery(
    api.saves.getSavedPlaces,
    user?.id ? { userId: user.id } : 'skip'
  ) as EnrichedPlace[] | undefined;

  const addedPlaces = useQuery(
    api.places.listPlacesByUser,
    user?.id ? { addedBy: user.id } : 'skip'
  ) as EnrichedPlace[] | undefined;

  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const displayName = convexUser?.name ?? user?.name ?? 'Student';
  const displayEmail = convexUser?.email ?? user?.email ?? '';
  const avatarUrl = convexUser?.avatarUrl ?? null;
  const bio = convexUser?.bio ?? '';

  async function handleAvatarPress() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setAvatarUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': asset.mimeType ?? 'image/jpeg' },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { storageId } = await uploadRes.json();
      await updateProfile({ authId: user!.id, avatarStorageId: storageId });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await authClient.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Profile</Text>
        <Pressable
          style={[styles.editHeaderBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setEditModalVisible(true)}
          hitSlop={8}
        >
          <PencilSimple size={15} color={theme.textSecondary} weight="regular" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {avatarUploading ? (
            <View style={[styles.avatar, { width: 68, height: 68, borderRadius: 34 }]}>
              <ActivityIndicator color={Brand.accent} />
            </View>
          ) : (
            <Avatar name={displayName} avatarUrl={avatarUrl} size={68} onPress={handleAvatarPress} />
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{displayEmail}</Text>
            {bio ? (
              <Text style={[styles.userBio, { color: theme.textSecondary }]} numberOfLines={2}>{bio}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{savedPlaces?.length ?? '—'}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Saved</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{addedPlaces?.length ?? '—'}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Added</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>KU</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Campus</Text>
          </View>
        </View>

        {/* Saved places */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Saved places</Text>
          {savedPlaces === undefined ? (
            <ActivityIndicator color={Brand.accent} style={{ marginTop: 20 }} />
          ) : savedPlaces.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon, { color: theme.textTertiary }]}>◎</Text>
              <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No saved places yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Tap the bookmark icon on any place to save it
              </Text>
            </View>
          ) : (
            savedPlaces.map((p) => <SavedPlaceRow key={p._id} place={p} />)
          )}
        </View>

        {/* Places I added */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Places I added</Text>
          {addedPlaces === undefined ? (
            <ActivityIndicator color={Brand.accent} style={{ marginTop: 20 }} />
          ) : addedPlaces.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon, { color: theme.textTertiary }]}>◎</Text>
              <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No places added yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Add a place on the home screen
              </Text>
            </View>
          ) : (
            addedPlaces.map((p) => <AddedPlaceRow key={p._id} place={p} />)
          )}
        </View>

        {/* Appearance */}
        <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              {isDark
                ? <Moon size={18} color={Brand.accent} weight="fill" />
                : <Sun size={18} color={Brand.vibeBusy} weight="fill" />
              }
              <View>
                <Text style={[styles.settingsLabel, { color: theme.textPrimary }]}>
                  {isDark ? 'Dark mode' : 'Light mode'}
                </Text>
                <Text style={[styles.settingsSub, { color: theme.textSecondary }]}>
                  {mode === 'system' ? 'Following system' : 'Manual override'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: theme.border, true: Brand.accentMuted }}
              thumbColor={isDark ? Brand.accent : theme.textTertiary}
              ios_backgroundColor={theme.surface}
            />
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: Brand.danger + '44', backgroundColor: Brand.danger + '10' },
            pressed && styles.signOutBtnPressed,
          ]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutText, { color: Brand.danger }]}>Sign out</Text>
        </Pressable>
      </ScrollView>

      {/* Edit profile modal */}
      {user?.id && (
        <EditProfileModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          currentName={displayName}
          currentBio={bio}
          authId={user.id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.six,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.xl,
    letterSpacing: -0.5,
  },
  editHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.six,
    paddingBottom: 160,
    gap: Spacing.six,
  },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.five,
    ...Shadow.sm,
  },
  avatar: {
    backgroundColor: Brand.accentMuted,
    borderWidth: 1.5,
    borderColor: Brand.accent + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.sansBold,
    color: Brand.accent,
  },
  avatarEditBadge: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  userInfo: { flex: 1, gap: 3 },
  userName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
  },
  userBio: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 2,
    lineHeight: FontSize.xs * 1.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 3, flex: 1 },
  statValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.xl,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
  },
  statDivider: { width: 1, height: 32 },

  // Sections
  section: { gap: 0 },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    letterSpacing: -0.3,
    marginBottom: Spacing.four,
  },

  // Place rows (shared)
  placeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
  },
  placeRowPressed: { opacity: 0.7 },
  placeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  placeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  placeName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
  },
  placeAddress: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  placeVibe: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    textTransform: 'capitalize',
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.eight,
    gap: Spacing.two,
  },
  emptyIcon: { fontSize: 36, marginBottom: Spacing.two },
  emptyText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.base,
  },
  emptySub: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.6,
  },

  // Sign out
  signOutBtn: {
    height: 50,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnPressed: { opacity: 0.75 },
  signOutText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.base,
    letterSpacing: 0.2,
  },

  // Appearance / settings card
  settingsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  settingsLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.base,
  },
  settingsSub: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 1,
  },

  // Edit modal
  modalContainer: { flex: 1 },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: Spacing.six,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    letterSpacing: -0.2,
  },
  modalCancel: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
  },
  modalSave: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
  },
  modalScroll: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.six,
    gap: Spacing.five,
  },
  fieldGroup: { gap: Spacing.two },
  fieldLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldInput: {
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
  },
  fieldInputMulti: {
    height: 100,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
