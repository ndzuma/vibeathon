import { api } from '../../../convex/_generated/api';
import { Brand, FontFamily, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

const { height: H } = Dimensions.get('window');

// ─── Vibe colour lookup ────────────────────────────────────────────────────────
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
  lat: number;
  lng: number;
  currentVibe: string | null;
  vibeCount: number;
}

// ─── Kingston University campus centre ────────────────────────────────────────
const CAMPUS_REGION: Region = {
  latitude: 51.4125,
  longitude: -0.3015,
  latitudeDelta: 0.008,
  longitudeDelta: 0.012,
};

// ─── Dark map style (Google Maps dark) ────────────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0A' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.55)' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1C1C1E' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.4)' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.7)' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.4)' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0D1F0D' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C1E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2A2A2E' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#252528' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1C1C20' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#141414' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1929' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2A4A7A' }] },
];

// ─── Custom map marker ─────────────────────────────────────────────────────────
function PlaceMarker({ place, selected }: { place: EnrichedPlace; selected: boolean }) {
  const cfg = place.currentVibe ? VIBE_CONFIG[place.currentVibe] : null;
  const color = cfg?.color ?? 'rgba(255,255,255,0.4)';
  return (
    <View style={[
      styles.markerOuter,
      {
        borderColor: color,
        backgroundColor: color + '22',
        transform: [{ scale: selected ? 1.2 : 1 }],
      },
    ]}>
      <View style={[styles.markerDot, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function MapScreen() {
  const theme = useTheme();
  const places = useQuery(api.places.listPlaces, {}) as EnrichedPlace[] | undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const selectedPlace = places?.find((p) => p._id === selectedId);

  function onMarkerPress(place: EnrichedPlace) {
    const newId = selectedId === place._id ? null : place._id;
    setSelectedId(newId);
    if (newId) {
      mapRef.current?.animateToRegion(
        {
          latitude: place.lat,
          longitude: place.lng,
          latitudeDelta: 0.003,
          longitudeDelta: 0.005,
        },
        350
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Map</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Kingston University · Penryn Road</Text>
      </View>

      {/* Map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={CAMPUS_REGION}
          customMapStyle={theme.isDark ? DARK_MAP_STYLE : []}
          showsUserLocation
          showsCompass={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          mapType={Platform.OS === 'android' ? 'standard' : 'standard'}
          onPress={() => setSelectedId(null)}
        >
          {places?.map((p) => (
            <Marker
              key={p._id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              onPress={() => onMarkerPress(p)}
              tracksViewChanges={false}
            >
              <PlaceMarker place={p} selected={selectedId === p._id} />
            </Marker>
          ))}
        </MapView>

        {places === undefined && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={Brand.accent} size="large" />
          </View>
        )}
      </View>

      {/* Bottom sheet */}
      <ScrollView
        contentContainerStyle={[styles.sheet, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected place card */}
        {selectedPlace && (
          <Pressable
            style={[styles.selectedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push(`/(app)/place/${selectedPlace._id}` as any)}
          >
            <View style={styles.selectedCardContent}>
              <View style={styles.selectedInfo}>
                <Text style={[styles.selectedName, { color: theme.textPrimary }]}>{selectedPlace.name}</Text>
                <Text style={[styles.selectedAddress, { color: theme.textSecondary }]}>{selectedPlace.address}</Text>
              </View>
              {selectedPlace.currentVibe && (
                <View style={[
                  styles.selectedVibe,
                  {
                    backgroundColor: VIBE_CONFIG[selectedPlace.currentVibe]?.color + '22',
                    borderColor: VIBE_CONFIG[selectedPlace.currentVibe]?.color + '55',
                  }
                ]}>
                  <Text style={[
                    styles.selectedVibeText,
                    { color: VIBE_CONFIG[selectedPlace.currentVibe]?.color }
                  ]}>
                    {selectedPlace.currentVibe.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.selectedCta, { color: Brand.accent }]}>View details →</Text>
          </Pressable>
        )}

        {/* All places list */}
        <Text style={[styles.listTitle, { color: theme.textPrimary }]}>All places</Text>
        {places === undefined ? (
          <ActivityIndicator color={Brand.accent} style={{ marginTop: 20 }} />
        ) : (
          places.map((p) => {
            const cfg = p.currentVibe ? VIBE_CONFIG[p.currentVibe] : null;
            const isActive = p._id === selectedId;
            return (
              <Pressable
                key={p._id}
                style={({ pressed }) => [
                  styles.listItem,
                  { borderBottomColor: theme.border },
                  isActive && { backgroundColor: Brand.accentMuted },
                  pressed && styles.listItemPressed,
                ]}
                onPress={() => onMarkerPress(p)}
              >
                <View style={styles.listItemLeft}>
                  <View style={[
                    styles.listDot,
                    { backgroundColor: cfg?.color ?? theme.border }
                  ]} />
                  <View>
                    <Text style={[styles.listName, { color: theme.textPrimary }]}>{p.name}</Text>
                    <Text style={[styles.listAddress, { color: theme.textSecondary }]}>{p.address}</Text>
                  </View>
                </View>
                {cfg && (
                  <Text style={[styles.listVibe, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const MAP_HEIGHT = H * 0.42;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.six,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.xl,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 2,
  },

  // Map
  mapWrapper: {
    height: MAP_HEIGHT,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Marker
  markerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Bottom sheet
  sheet: {
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.five,
  },

  // Selected card
  selectedCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.five,
    ...Shadow.sm,
  },
  selectedCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  selectedInfo: { flex: 1, marginRight: Spacing.three },
  selectedName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.base,
    letterSpacing: -0.2,
  },
  selectedAddress: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  selectedVibe: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  selectedVibeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  selectedCta: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
  },

  // List
  listTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.md,
    letterSpacing: -0.3,
    marginBottom: Spacing.four,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderRadius: Radius.sm,
  },
  listItemPressed: { opacity: 0.7 },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  listName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    letterSpacing: -0.1,
  },
  listAddress: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  listVibe: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
});
