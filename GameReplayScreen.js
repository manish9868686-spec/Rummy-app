/**
 * Game Replay Screen — Step-by-step replay of a past game
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gamesAPI } from '../services/api';
import { getCardDisplay } from '../utils/cards';

export default function GameReplayScreen({ navigation, route }) {
  const { tableId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentAction, setCurrentAction] = useState(-1);

  useEffect(() => {
    async function load() {
      try {
        const res = await gamesAPI.replay(tableId);
        setData(res.data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [tableId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#8B0000" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const rounds = data?.rounds || [];
  const round = rounds[currentRound];
  const actions = round?.actions || [];
  const visibleActions = currentAction === -1 ? actions : actions.slice(0, currentAction + 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Game Replay</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Round Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roundSelector}>
          {rounds.map((r, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.roundTab, currentRound === idx && styles.roundTabActive]}
              onPress={() => { setCurrentRound(idx); setCurrentAction(-1); }}
            >
              <Text style={[styles.roundTabText, currentRound === idx && styles.roundTabTextActive]}>
                Round {r.round_number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setCurrentAction(Math.max(-1, currentAction - 1))}
            disabled={currentAction <= -1}
          >
            <Text style={styles.controlText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.actionCounter}>
            Action {currentAction + 1}/{actions.length}
          </Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setCurrentAction(Math.min(actions.length - 1, currentAction + 1))}
            disabled={currentAction >= actions.length - 1}
          >
            <Text style={styles.controlText}>▶</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => setCurrentAction(-1)}>
            <Text style={styles.controlText}>⏮ All</Text>
          </TouchableOpacity>
        </View>

        {/* Action List */}
        <ScrollView style={styles.actionsList} contentContainerStyle={styles.actionsContent}>
          {visibleActions.map((action, idx) => (
            <View
              key={idx}
              style={[
                styles.actionRow,
                idx === currentAction && styles.actionRowActive,
              ]}
            >
              <View style={styles.actionIndex}>
                <Text style={styles.actionIndexText}>{idx + 1}</Text>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionPlayer}>{action.username}</Text>
                <Text style={styles.actionType}>{formatAction(action)}</Text>
              </View>
              {action.card_code && (
                <View style={styles.actionCard}>
                  <Text style={styles.actionCardText}>{getCardDisplay(action.card_code)}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Final Hands */}
        {round?.hands && currentAction === -1 && (
          <View style={styles.handsSection}>
            <Text style={styles.handsTitle}>Final Hands</Text>
            {round.hands.map((hand, idx) => (
              <View key={idx} style={styles.handRow}>
                <Text style={styles.handPlayer}>
                  {hand.username} {hand.is_declared ? '✓' : `(${hand.points}pts)`}
                </Text>
                <View style={styles.handCards}>
                  {(hand.final_hand || hand.initial_hand || []).map((card, ci) => (
                    <View key={ci} style={styles.miniCard}>
                      <Text style={styles.miniCardText}>{getCardDisplay(card)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatAction(action) {
  switch (action.action_type) {
    case 'draw_pile': return 'Drew from closed deck';
    case 'draw_discard': return 'Picked from discard pile';
    case 'discard': return 'Discarded';
    case 'declare': return '📢 DECLARED';
    case 'drop': return '🏳️ Dropped';
    default: return action.action_type;
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEF9F0' },
  container: { flex: 1 },
  loader: { marginTop: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backButton: { fontSize: 16, color: '#8B0000', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  placeholder: { width: 50 },
  roundSelector: {
    maxHeight: 44, paddingHorizontal: 20, marginBottom: 8,
  },
  roundTab: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#F5F0E8', borderRadius: 10, marginRight: 6,
  },
  roundTabActive: { backgroundColor: '#8B0000' },
  roundTabText: { fontSize: 13, fontWeight: '600', color: '#6B6358' },
  roundTabTextActive: { color: '#FFF' },
  controls: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 8, gap: 12,
  },
  controlButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  controlText: { fontSize: 18, color: '#8B0000' },
  actionCounter: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  actionsList: { flex: 1, paddingHorizontal: 20 },
  actionsContent: { paddingBottom: 20 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 6,
  },
  actionRowActive: {
    backgroundColor: '#FFF7E5', borderWidth: 1, borderColor: '#D4AF37',
  },
  actionIndex: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  actionIndexText: { fontSize: 12, fontWeight: '700', color: '#8B0000' },
  actionInfo: { flex: 1 },
  actionPlayer: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  actionType: { fontSize: 12, color: '#6B6358', marginTop: 2 },
  actionCard: {
    backgroundColor: '#F5F0E8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionCardText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  handsSection: {
    padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0D5C0',
  },
  handsTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  handRow: { marginBottom: 12 },
  handPlayer: { fontSize: 13, fontWeight: '700', color: '#8B0000', marginBottom: 4 },
  handCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  miniCard: {
    backgroundColor: '#F5F0E8', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  miniCardText: { fontSize: 10, fontWeight: '600', color: '#1A1A2E' },
});
