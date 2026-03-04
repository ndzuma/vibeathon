import { Redirect } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

/**
 * Login screen — placeholder until the full auth UI is built.
 * The root layout's route guard will redirect here for unauthenticated users.
 */
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Login screen coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { marginTop: 12, fontSize: 16, color: '#666' },
});
