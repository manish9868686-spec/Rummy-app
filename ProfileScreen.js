/**
 * Profile Screen — User profile, stats, achievements, settings, logout
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, useUIStore } from '../store/stores';
import { usersAPI, leaderboardAPI, achievementsAPI } from '../services/api';
import { formatNumber, getTierName } from '../utils/cards';
import { tierColors } from '../theme/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme, soundEnabled, toggleSound, vibrationEnabled, toggleVibration } = useUIStore();
  const [stats, setStats] = useState(null);
  const [rank, setRank] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('stats');

  const fetchData = async () => {
    try {
      const [statsRes, rankRes, achRes] = await Promise.all([
        usersAPI.getStats(),
        leaderboardAPI.getMyRank(),
        achievementsAPI.list(),
      ]);
      setStats(statsRes.data);
      setRank(rankRes.data);
      setAchievements(achRes.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const claimAchievement = async (code) => {
    try {
      await achievementsAPI.claim(code);
      fetchData();
      Alert.alert('Claimed!', 'Reward added to your balance.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to claim.');
    }
  };

  const completedAchievements = achievements.filter(a => a.is_completed);
  const pendingAchievements = achievements.filter(a => !a.is_completed);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#8B0000" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#8B0000" />}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {(user?.display_name || user?.username || '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.display_name || user?.username}</Text>
          <Text style={styles.username}>@{user?.username}</Text>

          <View style={styles.vipBadge}>
            <Text style={styles.vipText}>VIP {user?.vip_level || 0}</Text>
          </View>

          <View style={styles.chipRow}>
            <Text style={styles.chipIcon}>🪙</Text>
            <Text style={styles.chipAmount}>{formatNumber(user?.chips_balance || 0)}</Text>
            <Text style={styles.chipLabel}>Chips</Text>
            <Text style={styles.xpAmount}>⚡ {formatNumber(user?.xp_points || 0)} XP</Text>
          </View>
        </View>

        {/* Section Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'stats', label: 'Stats' },
            { key: 'achievements', label: `Achievements (${completedAchievements.length})` },
            { key: 'settings', label: 'Settings' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeSection === tab.key && styles.tabActive]}
              onPress={() => setActiveSection(tab.key)}
            >
              <Text style={[styles.tabText, activeSection === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Section */}
        {activeSection === 'stats' && stats && (
          <View style={styles.section}>
            {/* Rank */}
            <View style={styles.rankCard}>
              <View style={[styles.tierBadge, { backgroundColor: tierColors[stats.rank_tier] || '#CD7F32' }]}>
                <Text style={styles.tierText}>{getTierName(stats.rank_tier)}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankNumber}>#{rank?.rank || '—'}</Text>
                <Text style={styles.rankLabel}>Global Rank</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankNumber}>{formatNumber(stats.season_pts || 0)}</Text>
                <Text style={styles.rankLabel}>Season Pts</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard icon="🎮" value={stats.games_played} label="Games Played" />
              <StatCard icon="🏆" value={stats.games_won} label="Games Won" />
              <StatCard icon="📊" value={`${stats.win_rate}%`} label="Win Rate" />
              <StatCard icon="🔥" value={stats.best_streak} label="Best Streak" />
              <StatCard icon="⭐" value={stats.highest_score} label="High Score" />
              <StatCard icon="💯" value={formatNumber(stats.total_points)} label="Total Pts" />
            </View>
          </View>
        )}

        {/* Achievements Section */}
        {activeSection === 'achievements' && (
          <View style={styles.section}>
            {completedAchievements.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Completed ({completedAchievements.length})</Text>
                {completedAchievements.map(ach => (
                  <View key={ach.code} style={styles.achievementCardCompleted}>
                    <View style={styles.achievementIconCompleted}>✅</View>
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementName}>{ach.name}</Text>
                      <Text style={styles.achievementDesc}>{ach.description}</Text>
                    </View>
                    <View style={styles.achievementReward}>
                      <Text style={styles.rewardText}>+{formatNumber(ach.reward_chips)} 🪙</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>In Progress ({pendingAchievements.length})</Text>
            {pendingAchievements.map(ach => {
              const req = ach.requirement;
              const progress = ach.progress || 0;
              const target = req?.target || 1;
              const pct = Math.min(100, Math.round((progress / target) * 100));

              return (
                <View key={ach.code} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{getAchievementIcon(ach.category)}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementName}>{ach.name}</Text>
                    <Text style={styles.achievementDesc}>{ach.description}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{progress}/{target}</Text>
                  </View>
                  <View style={styles.achievementReward}>
                    <Text style={styles.rewardText}>+{formatNumber(ach.reward_chips)} 🪙</Text>
                    <Text style={styles.rewardXp}>+{formatNumber(ach.reward_xp)} XP</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>

            <View style={styles.settingsCard}>
              <Text style={styles.settingLabel}>Theme</Text>
              <View style={styles.themeRow}>
                {[
                  { key: 'light', label: '☀️ Light' },
                  { key: 'dark', label: '🌙 Dark' },
                  { key: 'system', label: '📱 System' },
                ].map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.themeOption, theme === t.key && styles.themeOptionActive]}
                    onPress={() => setTheme(t.key)}
                  >
                    <Text style={[styles.themeOptionText, theme === t.key && styles.themeOptionTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, soundEnabled && styles.toggleOn]}
                  onPress={toggleSound}
                >
                  <Text style={[styles.toggleText, soundEnabled && styles.toggleTextOn]}>
                    {soundEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Vibration</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, vibrationEnabled && styles.toggleOn]}
                  onPress={toggleVibration}
                >
                  <Text style={[styles.toggleText, vibrationEnabled && styles.toggleTextOn]}>
                    {vibrationEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Account</Text>

            <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate('GameHistory')}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Game History</Text>
                <Text style={styles.settingArrow}>→</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getAchievementIcon(category) {
  const icons = {
    games_played: '🎮', games_won: '🏆', streak: '🔥',
    points: '⭐', tournament: '🏅', social: '👥', special: '💎',
  };
  return icons[category] || '🎯';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEF9F0' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loader: { marginTop: 100 },

  // Profile Header
  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#8B0000', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  displayName: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  username: { fontSize: 14, color: '#9E9589', marginTop: 2 },
  vipBadge: {
    marginTop: 8, paddingHorizontal: 14, paddingVertical: 4,
    backgroundColor: '#D4AF37', borderRadius: 12,
  },
  vipText: { color: '#1A1A2E', fontSize: 12, fontWeight: '800' },
  chipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  chipIcon: { fontSize: 18 },
  chipAmount: { fontSize: 20, fontWeight: '800', color: '#D4AF37' },
  chipLabel: { fontSize: 12, color: '#6B6358', marginRight: 12 },
  xpAmount: { fontSize: 13, color: '#7B1FA2', fontWeight: '600' },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 4,
    backgroundColor: '#F5F0E8', borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#8B0000' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B6358' },
  tabTextActive: { color: '#FFF' },

  // Sections
  section: { paddingHorizontal: 20 },

  // Rank Card
  rankCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tierBadge: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    marginRight: 16,
  },
  tierText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  rankInfo: { flex: 1, alignItems: 'center' },
  rankNumber: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  rankLabel: { fontSize: 11, color: '#9E9589', marginTop: 2 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '30%', backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#8B0000' },
  statLabel: { fontSize: 10, color: '#9E9589', marginTop: 2, textAlign: 'center' },

  // Achievements
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#1A1A2E',
    marginBottom: 10, marginTop: 8,
  },
  achievementCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, marginBottom: 8, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  achievementCardCompleted: {
    flexDirection: 'row', backgroundColor: '#F0FFF0', borderRadius: 14,
    padding: 14, marginBottom: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#4CAF50',
  },
  achievementIconCompleted: { fontSize: 24, marginRight: 12 },
  achievementIcon: { fontSize: 24, marginRight: 12 },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  achievementDesc: { fontSize: 11, color: '#9E9589', marginTop: 2 },
  progressBar: {
    height: 4, backgroundColor: '#F5F0E8', borderRadius: 2,
    marginTop: 6, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#8B0000', borderRadius: 2,
  },
  progressText: { fontSize: 10, color: '#9E9589', marginTop: 3 },
  achievementReward: { alignItems: 'flex-end', marginLeft: 8 },
  rewardText: { fontSize: 12, fontWeight: '700', color: '#D4AF37' },
  rewardXp: { fontSize: 11, color: '#7B1FA2', marginTop: 2 },

  // Settings
  settingsCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  settingArrow: { fontSize: 18, color: '#9E9589' },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  themeOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F5F0E8', alignItems: 'center',
  },
  themeOptionActive: { backgroundColor: '#8B0000' },
  themeOptionText: { fontSize: 13, fontWeight: '600', color: '#6B6358' },
  themeOptionTextActive: { color: '#FFF' },
  toggleButton: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10,
    backgroundColor: '#F5F0E8',
  },
  toggleOn: { backgroundColor: '#4CAF50' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#9E9589' },
  toggleTextOn: { color: '#FFF' },
  logoutButton: {
    marginTop: 20, backgroundColor: '#FFF0F0', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#FFCDD2',
  },
  logoutText: { color: '#D32F2F', fontSize: 16, fontWeight: '700' },
  spacer: { height: 40 },
});
