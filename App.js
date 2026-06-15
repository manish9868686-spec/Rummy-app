/**
 * Classic Indian Rummy — App Entry Point
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, useUIStore } from './store/stores';
import { lightTheme, darkTheme } from './theme/theme';
import AuthStack from './navigation/AuthStack';
import MainTabs from './navigation/MainTabs';
import GameStack from './navigation/GameStack';

// Custom navigation themes
const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.surface,
    text: lightTheme.colors.text,
    border: lightTheme.colors.border,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.text,
    border: darkTheme.colors.border,
  },
};

export default function App() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { theme, initializeTheme } = useUIStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeTheme();
      await initialize();
      setAppReady(true);
    }
    init();
  }, []);

  if (!appReady || isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={lightTheme.colors.primary} />
      </View>
    );
  }

  const isDark = theme === 'dark' || (theme === 'system' && false);
  const navTheme = isDark ? DarkNavTheme : LightNavTheme;

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? darkTheme.colors.background : lightTheme.colors.background}
      />
      <NavigationContainer theme={navTheme}>
        {isAuthenticated ? <MainNavigator /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function MainNavigator() {
  const { isInGame } = useAuthStore();
  const gameStore_isInGame = usesharedGameStore();
  const inGame = gameStore_isInGame;

  if (inGame) {
    return <GameStack />;
  }

  return <MainTabs />;
}

// This is just a re-export for clean access
import { useGameStore } from './store/stores';
function usesharedGameStore() {
  return useGameStore((s) => s.isInGame);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.background,
  },
});
