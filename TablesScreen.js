/**
 * Tables Screen — Lobby: browse tables, create tables, join via code
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tablesAPI } from '../services/api';
import { useGameStore } from '../store/stores';
import { formatNumber } from '../utils/cards';

const VARIANT_NAMES = {
  points: 'Points Rummy',
  deals: 'Deals Rummy',
  pool_101: 'Pool 101',
  pool_201: 'Pool 201',
};

export default function TablesScreen({ navigation }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const fetchTables = async () => {
    try {
      const params = { limit: 30 };
      if (filter !== 'all') params.type = filter;
      const res = await tablesAPI.list(params);
      setTables(res.data?.tables || []);
    } catch {
      Alert.alert('Error', 'Failed to load tables.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTables(); }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const joinTable = async (table) => {
    try {
      const res = await tablesAPI.get(table.id);
      useGameStore.getState().setCurrentTable(res.data);
      // Socket join will happen in GameScreen
      navigation.navigate('GameTab', { screen: 'Game' });
    } catch {
      Alert.alert('Error', 'Failed to join table.');
    }
  };

  const createTable = async (variant) => {
    try {
      const res = await tablesAPI.create({
        variant,
        table_type: 'public',
        max_players: 4,
        entry_fee: 0,
      });
      useGameStore.getState().setCurrentTable(res.data);
      navigation.navigate('GameTab', { screen: 'Game' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to create table.';
      Alert.alert('Error', msg);
    }
  };

  const renderTable = ({ item }) => (
    <TouchableOpacity
      style={styles.tableCard}
      onPress={() => joinTable(item)}
      activeOpacity={0.8}
    >
      <View style={styles.tableHeader}>
        <View style={styles.tableType}>
          <Text style={styles.tableTypeText}>
            {item.table_type === 'tournament' ? '🏆' : item.table_type === 'private' ? '🔒' : '🌐'}
          </Text>
        </View>
        <View style={styles.tableInfo}>
          <Text style={styles.tableName}>{VARIANT_NAMES[item.variant] || item.variant}</Text>
          <Text style={styles.tableCode}>#{item.table_code}</Text>
        </View>
        <View style={styles.tablePrize}>
          {item.entry_fee > 0 && (
            <Text style={styles.entryFee}>Entry: {formatNumber(item.entry_fee)}</Text>
          )}
          <Text style={styles.prizeText}>🪙 {formatNumber(item.prize_pool)}</Text>
        </View>
      </View>

      <View style={styles.tableFooter}>
        <View style={styles.playerCount}>
          <View style={styles.playerDots}>
            {Array.from({ length: item.max_players }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.playerDot,
                  i < item.current_players ? styles.playerDotFilled : styles.playerDotEmpty,
                ]}
              />
            ))}
          </View>
          <Text style={styles.playerCountText}>
            {item.current_players}/{item.max_players}
          </Text>
        </View>
        <Text style={styles.turnText}>{item.turn_duration}s turns</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Game Tables</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreate(!showCreate)}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>

        {/* Create Table Dropdown */}
        {showCreate && (
          <View style={styles.createDropdown}>
            <Text style={styles.createTitle}>Choose Variant:</Text>
            {Object.entries(VARIANT_NAMES).map(([key, name]) => (
              <TouchableOpacity
                key={key}
                style={styles.createOption}
                onPress={() => { createTable(key); setShowCreate(false); }}
              >
                <Text style={styles.createOptionText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filters */}
        <View style={styles.filterRow}>
          {['all', 'public', 'private', 'tournament'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Table List */}
        {loading ? (
          <ActivityIndicator size="large" color="#8B0000" style={styles.loader} />
        ) : (
          <FlatList
            data={tables}
            keyExtractor={(item) => item.id}
            renderItem={renderTable}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B0000" />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🃏</Text>
                <Text style={styles.emptyText}>No tables available</Text>
                <Text style={styles.emptySubtext}>Create one or check back later!</Text>
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  createButton: {
    backgroundColor: '#8B0000', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  createButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  createDropdown: {
    marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 14,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  createTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  createOption: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: '#F5F0E8', marginBottom: 6,
  },
  createOptionText: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F5F0E8',
  },
  filterActive: { backgroundColor: '#8B0000' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B6358' },
  filterTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  loader: { marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  emptySubtext: { fontSize: 13, color: '#9E9589', marginTop: 4 },

  // Table Card
  tableCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tableType: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  tableTypeText: { fontSize: 20 },
  tableInfo: { flex: 1 },
  tableName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  tableCode: { fontSize: 12, color: '#9E9589', marginTop: 2 },
  tablePrize: { alignItems: 'flex-end' },
  entryFee: { fontSize: 11, color: '#9E9589' },
  prizeText: { fontSize: 15, fontWeight: '700', color: '#D4AF37' },
  tableFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F5F0E8',
  },
  playerCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerDots: { flexDirection: 'row', gap: 3 },
  playerDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  playerDotFilled: { backgroundColor: '#4CAF50' },
  playerDotEmpty: { backgroundColor: '#E0D5C0' },
  playerCountText: { fontSize: 12, color: '#6B6358' },
  turnText: { fontSize: 12, color: '#9E9589' },
});
