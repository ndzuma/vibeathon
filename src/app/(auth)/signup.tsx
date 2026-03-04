import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/auth-client';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function SignupScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const upsertUser = useMutation(api.users.upsertUser);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        Alert.alert('Sign up failed', result.error.message ?? 'Please try again.');
      } else {
        if (result.data?.user) {
          const u = result.data.user;
          await upsertUser({
            authId: u.id,
            name: u.name ?? name.trim(),
            email: u.email,
          }).catch(() => {/* non-fatal */});
        }
        router.replace('/(app)' as any);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} translucent backgroundColor="transparent" />

      {/* Ambient gradient blobs */}
      <LinearGradient
        colors={theme.isDark ? ['#2C1B4A', '#0A0A0A'] : ['#E8DFFF', '#F5F5F7']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.blob}
        pointerEvents="none"
      />
      <LinearGradient
        colors={theme.isDark ? ['#1A2E6E', 'transparent'] : ['#D6E4FF', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.blobSide}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={18} color={theme.textSecondary} weight="regular" />
            <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Join QueueQuest and start sharing vibes</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.textPrimary },
                  nameFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                ref={emailRef}
                style={[
                  styles.input,
                  { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.textPrimary },
                  emailFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@uni.ac.uk"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.textPrimary },
                  passwordFocused && { borderColor: Brand.accent + '88', backgroundColor: theme.inputFocusBg },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Create account</Text>
              )}
            </Pressable>

            <Text style={[styles.terms, { color: theme.textTertiary }]}>
              By continuing you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          {/* Footer link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={[styles.footerLink, { color: Brand.accent }]}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  blob: {
    position: 'absolute', top: -120, left: -60, width: 580, height: 480, borderRadius: 300, opacity: 0.8,
  },
  blobSide: {
    position: 'absolute', top: 60, right: -100, width: 380, height: 380, borderRadius: 190, opacity: 0.45,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.six,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.seven,
  },
  backText: { fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, letterSpacing: 0.2 },
  header: { marginBottom: Spacing.eight },
  title: { fontFamily: FontFamily.sansBold, fontSize: FontSize.xxl, letterSpacing: -0.8, marginBottom: Spacing.two },
  subtitle: { fontFamily: FontFamily.sans, fontSize: FontSize.base, letterSpacing: 0.1 },
  form: { gap: Spacing.four, marginBottom: Spacing.seven },
  fieldGroup: { gap: Spacing.two },
  label: { fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, letterSpacing: 0.3 },
  input: {
    height: 50, borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.four, fontFamily: FontFamily.sans, fontSize: FontSize.base,
  },
  cta: {
    height: 54, borderRadius: Radius.pill, backgroundColor: Brand.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two,
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaText: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.base, color: '#FFFFFF', letterSpacing: 0.2 },
  terms: { fontFamily: FontFamily.sans, fontSize: FontSize.xs, textAlign: 'center', lineHeight: FontSize.xs * 1.6 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: FontFamily.sans, fontSize: FontSize.sm },
  footerLink: { fontFamily: FontFamily.sansSemiBold, fontSize: FontSize.sm },
});
