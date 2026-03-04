import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Home screen — placeholder until the full home UI is built.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home screen coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, color: '#333' },
});
