/**
 * Round Results Screen — Shows scores after each round
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore, useAuthStore } from '../store/stores';

export default function RoundResultsScreen({ navigation }) {
  const { roundResults, hideRoundResults, leaveGame, currentTable } = useGameStore();
  const { user } = useAuthStore();

  if (!roundResults) return null;

  const results = roundResults || [];
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const userResult = results.find(r => r.userId === user?.id);

  const handleContinue = () => {
    hideRoundResults();
    navigation.goBack();
  };

  const handleLeave = () => {
    hideRoundResults();
    leaveGame();
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.icon}>
          {userResult?.rank === 1 ? '🏆' : userResult?.rank === 2 ? '🥈' : '🎴'}
        </Text>
        <Text style={styles.title}>
          {userResult?.rank === 1 ? 'Victory!' : 'Round Over'}
        </Text>
        <Text style={styles.subtitle}>
          {userResult?.rank === 1
            ? `You won ${userResult?.chipsWon || 0} chips!`
            : `You placed #${userResult?.rank} with ${userResult?.deadwood} points`}
        </Text>

        {/* Rankings */}
        <View style={styles.rankingsCard}>
          <Text style={styles.rankingsTitle}>Final Standings</Text>
          {sorted.map((player, idx) => (
            <View
              key={idx}
              style={[
                styles.rankingRow,
                player.userId === user?.id && styles.myRankingRow,
              ]}
            >
              <View style={[styles.rankBadge, getRankBadgeStyle(player.rank)]}>
                <Text style={styles.rankBadgeText}>#{player.rank}</Text>
              </View>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingName}>
                  {player.username}
                  {player.userId === user?.id ? ' (You)' : ''}
                </Text>
                <Text style={styles.rankingStatus}>
                  {player.status === 'declared' ? '✓ Declared' :
                   player.status === 'dropped' ? '✗ Dropped' : '—'}
                </Text>
              </View>
              <Text style={styles.rankingScore}>{player.deadwood} pts</Text>
            </View>
          ))}
        </View>

        {/* Payouts */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutTitle}>Payout</Text>
          {sorted.map((player, idx) => (
            <View key={idx} style={styles.payoutRow}>
              <Text style={styles.payoutName}>{player.username}</Text>
              <Text style={[styles.payoutAmount,
                (player.chipsWon || 0) > 0 ? styles.positive : styles.negative]}>
                {(player.chipsWon || 0) > 0 ? `+${player.chipsWon}` : `${player.chipsWon || 0}`} chips
              </Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Text style={styles.leaveButtonText}>Leave Table</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={handleContinue}>
            <Text style={styles.playButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getRankBadgeStyle(rank) {
  switch (rank) {
    case 1: return { backgroundColor: '#FFD700' };
    case 2: return { backgroundColor: '#C0C0C0' };
    case 3: return { backgroundColor: '#CD7F32' };
    default: return { backgroundColor: '#4A4A6A' };
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1A1A2E' },
  container: {
    flexGrow: 1, padding: 20, alignItems: 'center', paddingTop: 40,
  },
  icon: { fontSize: 64, marginBottom: 12 },
  title: { color: '#FFF', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#9E9589', fontSize: 16, marginBottom: 28, textAlign: 'center' },

  rankingsCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 18, marginBottom: 16,
  },
  rankingsTitle: { color: '#D4AF37', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  rankingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2D2D4A',
  },
  myRankingRow: {
    backgroundColor: 'rgba(139,0,0,0.2)', borderRadius: 8,
    paddingHorizontal: 8, marginHorizontal: -8,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rankBadgeText: { color: '#1A1A2E', fontWeight: '800', fontSize: 13 },
  rankingInfo: { flex: 1 },
  rankingName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  rankingStatus: { color: '#9E9589', fontSize: 12, marginTop: 2 },
  rankingScore: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  payoutCard: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 18, marginBottom: 24,
  },
  payoutTitle: { color: '#D4AF37', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  payoutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2D2D4A',
  },
  payoutName: { color: '#FFF', fontSize: 14 },
  payoutAmount: { fontSize: 14, fontWeight: '700' },
  positive: { color: '#4CAF50' },
  negative: { color: '#EF5350' },

  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  leaveButton: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  leaveButtonText: { color: '#EF5350', fontWeight: '700', fontSize: 16 },
  playButton: {
    flex: 2, backgroundColor: '#8B0000', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  playButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
