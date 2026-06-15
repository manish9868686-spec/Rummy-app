/**
 * Home Screen — Dashboard with quick play, daily rewards, leaderboard preview
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, useGameStore, useUIStore } from '../store/stores';
import { usersAPI, dailyRewardsAPI, leaderboardAPI, tablesAPI } from '../services/api';
import { formatNumber, getTierName } from '../utils/cards';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const { theme } = useUIStore();
  const [stats, setStats] = useState(null);
  const [dailyReward, setDailyReward] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, rewardRes, leaderRes] = await Promise.all([
        usersAPI.getStats().catch(() => ({ data: null })),
        dailyRewardsAPI.status().catch(() => ({ data: null })),
        leaderboardAPI.get({ limit: 5 }).catch(() => ({ data: { leaderboard: [] } })),
      ]);
      setStats(statsRes.data);
      setDailyReward(rewardRes.data);
      setTopPlayers(leaderRes.data?.leaderboard || []);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleClaimDaily = async () => {
    try {
      const res = await dailyRewardsAPI.claim();
      setDailyReward(prev => ({ ...prev, claimed_today: true, streak: res.data.streak }));
      updateUser({ chips_balance: (user?.chips_balance || 0) + res.data.reward });
    } catch {}
  };

  const handleQuickPlay = async () => {
    try {
      // Find or create a quick-match table
      const tables = await tablesAPI.list({ type: 'public', limit: 1 });
      if (tables.data?.tables?.length > 0) {
        const table = tables.data.tables[0];
        // Join via socket
        useGameStore.getState().setCurrentTable(table);
      }
    } catch {}
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await tablesAPI.joinByCode(joinCode.trim().toUpperCase());
      useGameStore.getState().setCurrentTable(res.data);
      setShowJoinInput(false);
      setJoinCode('');
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B0000" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>नमस्ते, {user?.display_name || user?.username}!</Text>
            <View style={styles.chipRow}>
              <Text style={styles.chipIcon}>🪙</Text>
              <Text style={styles.chipAmount}>{formatNumber(user?.chips_balance || 0)}</Text>
              <Text style={styles.chipLabel}>Chips</Text>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(user?.display_name || user?.username || '?')[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.playButton} onPress={handleQuickPlay} activeOpacity={0.85}>
            <Text style={styles.playIcon}>🎴</Text>
            <Text style={styles.playText}>Quick Play</Text>
            <Text style={styles.playSubtext}>Find a match instantly</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowJoinInput(!showJoinInput)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🔗</Text>
              <Text style={styles.actionText}>Join Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Tables')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🏆</Text>
              <Text style={styles.actionText}>Tournaments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Friends')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🤝</Text>
              <Text style={styles.actionText}>Private Table</Text>
            </TouchableOpacity>
          </View>

          {showJoinInput && (
            <View style={styles.joinInputRow}>
              <TextInput
                style={styles.joinInput}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#B0A898"
                maxLength={6}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.joinButton} onPress={handleJoinByCode}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Daily Reward */}
        {dailyReward && !dailyReward.claimed_today && (
          <TouchableOpacity style={styles.dailyRewardCard} onPress={handleClaimDaily} activeOpacity={0.85}>
            <View style={styles.dailyRewardContent}>
              <Text style={styles.dailyIcon}>🎁</Text>
              <View style={styles.dailyInfo}>
                <Text style={styles.dailyTitle}>Daily Reward — Day {dailyReward.streak + 1}</Text>
                <Text style={styles.dailyAmount}>+{formatNumber(dailyReward.next_reward)} Chips</Text>
              </View>
            </View>
            <Text style={styles.dailyTap}>Tap to claim →</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <StatItem value={stats.games_played} label="Games" />
              <StatItem value={stats.win_rate} label="Win %" suffix="%" />
              <StatItem value={stats.best_streak} label="Best Streak" />
              <StatItem value={getTierName(stats.rank_tier)} label="Rank" />
            </View>
          </View>
        )}

        {/* Leaderboard Preview */}
        <View style={styles.leaderboardCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile', { screen: 'Leaderboard' })}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {topPlayers.map((player, index) => (
            <View key={player.username || index} style={styles.playerRow}>
              <Text style={[styles.rankText, index < 3 && styles.topRank]}>#{player.rank}</Text>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>
                  {(player.display_name || player.username || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.display_name || player.username}</Text>
                <Text style={styles.playerStats}>
                  {player.games_won}W · {getTierName(player.rank_tier)}
                </Text>
              </View>
              <Text style={styles.playerPoints}>{formatNumber(player.season_pts)} pts</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, label, suffix = '' }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}{suffix}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEF9F0' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  chipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  chipIcon: { fontSize: 16, marginRight: 4 },
  chipAmount: { fontSize: 18, fontWeight: '700', color: '#D4AF37' },
  chipLabel: { fontSize: 13, color: '#6B6358', marginLeft: 4 },
  avatarContainer: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#8B0000', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  quickActions: { paddingHorizontal: 20, marginBottom: 16 },
  playButton: {
    backgroundColor: '#8B0000', borderRadius: 16,
    paddingVertical: 28, alignItems: 'center', marginBottom: 12,
    shadowColor: '#8B0000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  playIcon: { fontSize: 36, marginBottom: 8 },
  playText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  playSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },
  joinInputRow: {
    flexDirection: 'row', marginTop: 10, gap: 8,
  },
  joinInput: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 18,
    color: '#1A1A2E', borderWidth: 1, borderColor: '#E0D5C0',
    letterSpacing: 4, textAlign: 'center', fontWeight: '700',
    placeholderTextColor: '#B0A898',
  },
  joinButton: {
    backgroundColor: '#1B5E20', borderRadius: 12,
    paddingHorizontal: 24, justifyContent: 'center',
  },
  joinButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  dailyRewardCard: {
    marginHorizontal: 20, backgroundColor: '#FFF7E5',
    borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#F0D060', marginBottom: 16,
  },
  dailyRewardContent: { flexDirection: 'row', alignItems: 'center' },
  dailyIcon: { fontSize: 28, marginRight: 12 },
  dailyInfo: {},
  dailyTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  dailyAmount: { fontSize: 18, fontWeight: '700', color: '#D4AF37' },
  dailyTap: { color: '#8B0000', fontWeight: '600', fontSize: 13 },
  statsCard: {
    marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 14,
    padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#8B0000' },
  statLabel: { fontSize: 11, color: '#6B6358', marginTop: 2 },
  leaderboardCard: {
    marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 14,
    padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  seeAll: { color: '#8B0000', fontSize: 13, fontWeight: '600' },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F0E8',
  },
  rankText: { fontSize: 14, fontWeight: '700', color: '#9E9589', width: 32 },
  topRank: { color: '#D4AF37', fontSize: 16 },
  playerAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E0D5C0', justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  playerAvatarText: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  playerStats: { fontSize: 11, color: '#9E9589' },
  playerPoints: { fontSize: 14, fontWeight: '700', color: '#D4AF37' },
  spacer: { height: 40 },
});
