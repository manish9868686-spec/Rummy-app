/**
 * Game Navigation Stack — In-game screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameScreen from '../screens/GameScreen';
import RoundResultsScreen from '../screens/RoundResultsScreen';
import GameHistoryScreen from '../screens/GameHistoryScreen';
import GameReplayScreen from '../screens/GameReplayScreen';

const Stack = createNativeStackNavigator();

export default function GameStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        gestureEnabled: false,
        contentStyle: { backgroundColor: '#1B6B3A' },
      }}
    >
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen
        name="RoundResults"
        component={RoundResultsScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
      <Stack.Screen name="GameReplay" component={GameReplayScreen} />
    </Stack.Navigator>
  );
}
