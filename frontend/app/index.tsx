import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/theme';
import LoginScreen from '../src/screens/LoginScreen';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ALERION</Text>
          <Text style={styles.logoSubtext}>ALERT</Text>
        </View>
        <ActivityIndicator size="large" color={Colors.dark.accent} style={styles.loader} />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.dark.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.accent,
    letterSpacing: 8,
    marginTop: 4,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});
