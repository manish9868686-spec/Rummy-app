/**
 * Classic Indian Rummy — Global State (Zustand)
 *
 * Manages auth, game state, socket events, and UI preferences.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { socketManager } from '../services/api';

// ─── Auth Store ────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  tokens: null,

  initialize: async () => {
    try {
      const [token, userJson] = await AsyncStorage.multiGet(['access_token', 'user']);
      if (token[1] && userJson[1]) {
        set({
          isAuthenticated: true,
          user: JSON.parse(userJson[1]),
          tokens: { access: token[1] },
          isLoading: false,
        });
        // Connect socket in background
        socketManager.connect().catch(() => {});
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (credentials) => {
    const { data } = await authAPI.login(credentials);
    await AsyncStorage.setItem('access_token', data.tokens.access);
    await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    set({
      user: data.user,
      isAuthenticated: true,
      tokens: data.tokens,
    });
    socketManager.connect().catch(() => {});
    return data;
  },

  register: async (data) => {
    const response = await authAPI.register(data);
    await AsyncStorage.setItem('access_token', response.data.tokens.access);
    await AsyncStorage.setItem('refresh_token', response.data.tokens.refresh);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    set({
      user: response.data.user,
      isAuthenticated: true,
      tokens: response.data.tokens,
    });
    socketManager.connect().catch(() => {});
    return response.data;
  },

  logout: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      await authAPI.logout(refreshToken);
    } catch {}
    socketManager.disconnect();
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    set({ user: null, isAuthenticated: false, tokens: null });
  },

  updateUser: (updates) => {
    const current = get().user;
    const updated = { ...current, ...updates };
    set({ user: updated });
    AsyncStorage.setItem('user', JSON.stringify(updated));
  },
}));

// ─── Game Store ────────────────────────────────────────────
export const useGameStore = create((set, get) => ({
  // Current game
  currentTable: null,
  gameState: null,
  playerHand: [],
  melds: [],
  isInGame: false,

  // UI state
  selectedCard: null,
  isSorting: false,
  showDeclareModal: false,
  showRoundResults: false,
  roundResults: null,

  // Timer
  turnTimeLeft: 0,

  // Actions
  setCurrentTable: (table) => set({ currentTable: table }),
  setGameState: (state) => set({ gameState: state, isInGame: !!state }),
  setPlayerHand: (hand) => set({ playerHand: hand }),
  setMelds: (melds) => set({ melds }),

  selectCard: (cardCode) => set({ selectedCard: cardCode }),
  deselectCard: () => set({ selectedCard: null }),

  toggleSort: () => set((state) => ({ isSorting: !state.isSorting })),

  showDeclare: () => set({ showDeclareModal: true }),
  hideDeclare: () => set({ showDeclareModal: false }),

  showRoundResults: (results) => set({ showRoundResults: true, roundResults: results }),
  hideRoundResults: () => set({ showRoundResults: false, roundResults: null }),

  leaveGame: () => {
    set({
      currentTable: null,
      gameState: null,
      playerHand: [],
      melds: [],
      isInGame: false,
      selectedCard: null,
      turnTimeLeft: 0,
    });
  },

  setTurnTimeLeft: (seconds) => set({ turnTimeLeft: seconds }),
}));

// ─── UI Store ──────────────────────────────────────────────
export const useUIStore = create((set, get) => ({
  theme: 'system',  // 'light' | 'dark' | 'system'
  soundEnabled: true,
  vibrationEnabled: true,
  showTutorial: false,

  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem('theme_pref', theme);
  },

  initializeTheme: async () => {
    const stored = await AsyncStorage.getItem('theme_pref');
    if (stored) set({ theme: stored });
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleVibration: () => set((s) => ({ vibrationEnabled: !s.vibrationEnabled })),
  setShowTutorial: (show) => set({ showTutorial: show }),
}));

// ─── Chat Store ────────────────────────────────────────────
export const useChatStore = create((set, get) => ({
  messages: [],
  unreadCount: 0,

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages.slice(-200), msg], // Keep last 200
    unreadCount: state.unreadCount + 1,
  })),

  clearUnread: () => set({ unreadCount: 0 }),
  clearMessages: () => set({ messages: [], unreadCount: 0 }),
}));
