/**
 * Game History Screen — Shows past game results
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gamesAPI } from '../services/api';
import { formatNumber } from '../utils/cards';

const VARIANT_NAMES = {
  points: 'Points', deals: 'Deals',
  pool_101: 'Pool 101', pool_201: 'Pool 201',
};

export default function GameHistoryScreen({ navigation }) {
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchGames = async (pageNum = 1) => {
    try {
      const res = await gamesAPI.history({ page: pageNum, limit: 20 });
      const newGames = res.data?.games || [];
      if (pageNum === 1) {
        setGames(newGames);
      } else {
        setGames(prev => [...prev, ...newGames]);
      }
      setHasMore(newGames.length === 20);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGames(); }, []);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGames(nextPage);
  };

  const getResultBadge = (rank) => {
    if (rank === 1) return { bg: '#E8F5E9', color: '#2E7D32', text: '1st 🥇' };
    if (rank === 2) return { bg: '#FFF8E1', color: '#F57F17', text: '2nd 🥈' };
    if (rank === 3) return { bg: '#FFF3E0', color: '#E65100', text: '3rd 🥉' };
    return { bg: '#F5F5F5', color: '#616161', text: `${rank}th` };
  };

  const renderGame = ({ item }) => {
    const badge = getResultBadge(item.rank);

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('GameReplay', { tableId: item.table_id })}
        activeOpacity={0.8}
      >
        <View style={styles.gameHeader}>
          <View style={styles.gameMeta}>
            <Text style={styles.gameVariant}>{VARIANT_NAMES[item.variant] || item.variant}</Text>
            <Text style={styles.gameDate}>
              {new Date(item.finished_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={[styles.resultBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.resultText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>

        <View style={styles.gameFooter}>
          <View style={styles.gamePlayers}>
            {item.players?.slice(0, 4).map((player, idx) => (
              <View key={idx} style={styles.miniPlayer}>
                <Text style={styles.miniPlayerRank}>#{player.rank}</Text>
                <Text style={styles.miniPlayerName}>{player.username}</Text>
                <Text style={styles.miniPlayerScore}>{player.final_score}pts</Text>
              </View>
            ))}
          </View>
          <View style={styles.chipInfo}>
            <Text style={[styles.chipAmount, item.chips_won > 0 ? styles.chipPositive : styles.chipNegative]}>
              {item.chips_won > 0 ? '+' : ''}{formatNumber(item.chips_won)}
            </Text>
            <Text style={styles.chipLabel}>chips</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Game History</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B0000" style={styles.loader} />
        ) : (
          <FlatList
            data={games}
            keyExtractor={(item) => item.table_id}
            renderItem={renderGame}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => { setPage(1); fetchGames(1); }}
                tintColor="#8B0000"
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🎴</Text>
                <Text style={styles.emptyText}>No games played yet</Text>
                <Text style={styles.emptySubtext}>Join a table and start playing!</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEF9F0' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backButton: { fontSize: 16, color: '#8B0000', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  placeholder: { width: 50 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  loader: { marginTop: 60 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  emptySubtext: { fontSize: 13, color: '#9E9589', marginTop: 4 },

  gameCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  gameHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F5F0E8',
  },
  gameMeta: {},
  gameVariant: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  gameDate: { fontSize: 11, color: '#9E9589', marginTop: 2 },
  resultBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  resultText: { fontSize: 14, fontWeight: '800' },
  gameFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  gamePlayers: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniPlayer: {
    alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#F5F0E8', borderRadius: 8,
  },
  miniPlayerRank: { fontSize: 10, fontWeight: '700', color: '#8B0000' },
  miniPlayerName: { fontSize: 11, color: '#1A1A2E', fontWeight: '500' },
  miniPlayerScore: { fontSize: 10, color: '#9E9589' },
  chipInfo: { alignItems: 'flex-end', justifyContent: 'center' },
  chipAmount: { fontSize: 20, fontWeight: '800' },
  chipPositive: { color: '#4CAF50' },
  chipNegative: { color: '#9E9E9E' },
  chipLabel: { fontSize: 10, color: '#9E9589' },
});
