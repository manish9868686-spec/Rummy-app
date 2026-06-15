/**
 * Game Screen — The main Rummy gameplay interface
 *
 * Features:
 * - Real-time card dealing with animations
 * - Drag-and-drop card arrangement
 * - Card sorting (suit/rank)
 * - Discard pile + closed deck interaction
 * - Declaration interface with meld grouping
 * - Turn timer
 * - In-game chat
 * - Opponent cards (face down)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Animated, PanResponder, Alert, Modal,
  TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore, useAuthStore, useChatStore, useUIStore } from '../store/stores';
import { socketManager } from '../services/api';
import {
  getSuitSymbol, getSuitColor, getCardDisplay, isJoker,
  sortBySuit, sortByRank,
} from '../utils/cards';
import { findMelds } from '../utils/cards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 52;
const CARD_OVERLAP = 30;
const CARD_HEIGHT = 74;

export default function GameScreen({ navigation }) {
  const {
    gameState, playerHand, melds, selectedCard,
    isInGame, currentTable, turnTimeLeft,
    setGameState, setPlayerHand, setMelds,
    selectCard, deselectCard, leaveGame,
    setTurnTimeLeft, showDeclareModal, hideDeclareModal,
  } = useGameStore();

  const { user } = useAuthStore();
  const { messages, addMessage } = useChatStore();
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showDeclare, setShowDeclare] = useState(false);
  const [declareGroups, setDeclareGroups] = useState([]);
  const [sortMode, setSortMode] = useState('suit');
  const [timerAnim] = useState(new Animated.Value(1));

  // ─── Socket Event Handlers ──────────────────────────

  useEffect(() => {
    if (!socketManager.connected) {
      socketManager.connect();
    }

    socketManager.on('table:state_changed', handleStateChanged);
    socketManager.on('game:dealt', handleDealt);
    socketManager.on('game:hand_update', handleHandUpdate);
    socketManager.on('game:turn', handleTurn);
    socketManager.on('game:declared', handleDeclared);
    socketManager.on('game:round_end', handleRoundEnd);
    socketManager.on('game:player_joined', handlePlayerJoined);
    socketManager.on('game:player_left', handlePlayerLeft);
    socketManager.on('game:error', handleError);
    socketManager.on('chat:message', handleChatMessage);

    return () => {
      socketManager.off('table:state_changed', handleStateChanged);
      socketManager.off('game:dealt', handleDealt);
      socketManager.off('game:hand_update', handleHandUpdate);
      socketManager.off('game:turn', handleTurn);
      socketManager.off('game:declared', handleDeclared);
      socketManager.off('game:round_end', handleRoundEnd);
      socketManager.off('game:player_joined', handlePlayerJoined);
      socketManager.off('game:player_left', handlePlayerLeft);
      socketManager.off('game:error', handleError);
      socketManager.off('chat:message', handleChatMessage);
    };
  }, []);

  const handleStateChanged = (state) => setGameState(state);
  const handleDealt = ({ hand, dealerSeat, wildJoker }) => {
    setPlayerHand(sortBySuit(hand));
    // Auto-suggest melds
    const result = findMelds(hand, wildJoker);
    setMelds(result.melds);
  };
  const handleHandUpdate = ({ hand }) => setPlayerHand(hand);
  const handleTurn = ({ seatIndex, phase }) => {
    // Start timer animation
    setTurnTimeLeft(30);
    Animated.timing(timerAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(timerAnim, {
        toValue: 0,
        duration: 30000,
        useNativeDriver: false,
      }).start();
    });
  };
  const handleDeclared = ({ seatIndex, username }) => {
    Alert.alert('Declaration!', `${username} has declared their hand!`);
  };
  const handleRoundEnd = ({ results }) => {
    useGameStore.getState().showRoundResults(results);
  };
  const handlePlayerJoined = ({ username, seatIndex }) => {};
  const handlePlayerLeft = ({ seatIndex }) => {};
  const handleError = ({ code, message }) => {
    Alert.alert('Game Error', message || code);
  };
  const handleChatMessage = (msg) => addMessage(msg);

  // ─── Game Actions ───────────────────────────────────

  const drawFromPile = () => {
    socketManager.emit('game:draw_pile', { tableId: currentTable?.id });
  };

  const drawFromDiscard = () => {
    socketManager.emit('game:draw_discard', { tableId: currentTable?.id });
  };

  const discardCard = (cardCode) => {
    if (!cardCode) return;
    socketManager.emit('game:discard', { tableId: currentTable?.id, cardCode });
    deselectCard();
  };

  const declareHand = () => {
    setShowDeclare(true);
  };

  const dropGame = () => {
    Alert.alert(
      'Drop Game',
      'Are you sure you want to drop? You\'ll get penalty points.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Drop',
          style: 'destructive',
          onPress: () => {
            socketManager.emit('game:drop', { tableId: currentTable?.id });
          },
        },
      ]
    );
  };

  const toggleSort = () => {
    const newMode = sortMode === 'suit' ? 'rank' : 'suit';
    setSortMode(newMode);
    const sorted = newMode === 'suit' ? sortBySuit(playerHand) : sortByRank(playerHand);
    setPlayerHand(sorted);
    socketManager.emit('game:sort', { tableId: currentTable?.id, sortBy: newMode });
  };

  const doDeclare = () => {
    // Use auto-suggested melds or manual groups
    const groups = declareGroups.length > 0 ? declareGroups : melds.map(m => m.cards);
    socketManager.emit('game:declare', { tableId: currentTable?.id, meldGroups: groups });
    setShowDeclare(false);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketManager.emit('chat:send', {
      tableId: currentTable?.id,
      message: chatInput.trim(),
      type: 'text',
    });
    setChatInput('');
  };

  const leaveTable = () => {
    Alert.alert('Leave Table', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          socketManager.emit('table:leave');
          leaveGame();
          navigation.goBack();
        },
      },
    ]);
  };

  // ─── Render ─────────────────────────────────────────

  const isMyTurn = gameState?.currentTurn === findMySeat();
  const canDraw = isMyTurn && gameState?.turnPhase === 'draw';
  const canDiscard = isMyTurn && gameState?.turnPhase === 'discard';

  function findMySeat() {
    if (!gameState?.players || !user) return -1;
    const player = gameState.players.find(p => p.userId === user.id);
    return player?.seatIndex ?? -1;
  }

  const mySeat = findMySeat();
  const hasDeclared = gameState?.players?.find(p => p.status === 'declared');

  // Timer bar color
  const timerColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: ['#EF5350', '#F9A825', '#4CAF50', '#4CAF50'],
  });

  if (!isInGame || !currentTable) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.noGameText}>No active game</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={leaveTable} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.tableInfo}>
            <Text style={styles.tableCode}>{currentTable?.table_code || '---'}</Text>
            <View style={styles.turnIndicator}>
              <View style={[styles.turnDot, isMyTurn && styles.turnDotActive]} />
              <Text style={styles.turnText}>
                {isMyTurn ? 'Your Turn' : 'Waiting...'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => setShowChat(!showChat)} style={styles.chatToggle}>
            <Text style={styles.chatToggleIcon}>💬</Text>
            {useChatStore.getState().unreadCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{useChatStore.getState().unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Timer Bar */}
        {isMyTurn && (
          <Animated.View
            style={[styles.timerBar, { width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: timerColor }]}
          />
        )}

        {/* Opponents Area */}
        <View style={styles.opponentsArea}>
          {gameState?.players?.map((player, idx) => {
            if (player.seatIndex === mySeat || !player.username) return null;
            return (
              <View key={idx} style={[styles.opponentSlot,
                player.seatIndex === gameState?.currentTurn && styles.opponentActive]}>
                <View style={styles.opponentAvatar}>
                  <Text style={styles.opponentAvatarText}>{player.username[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.opponentName}>{player.username}</Text>
                <View style={styles.opponentCards}>
                  {Array.from({ length: Math.min(player.cardCount || 0, 13) }).map((_, i) => (
                    <View key={i} style={styles.opponentCardBack} />
                  ))}
                </View>
                {player.status === 'declared' && (
                  <Text style={styles.declaredBadge}>DECLARED ✓</Text>
                )}
                {player.status === 'dropped' && (
                  <Text style={styles.droppedBadge}>DROPPED</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Table Center — Deck & Discard Pile */}
        <View style={styles.tableCenter}>
          {/* Closed Deck */}
          <TouchableOpacity
            style={[styles.deckPile, canDraw && styles.activePile]}
            onPress={drawFromPile}
            disabled={!canDraw}
            activeOpacity={0.7}
          >
            <View style={styles.deckStack}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.deckCard, { top: i * 2, left: i * 2 }]} />
              ))}
            </View>
            <Text style={styles.pileCount}>{gameState?.deckSize || 0}</Text>
            <Text style={styles.pileLabel}>Draw</Text>
          </TouchableOpacity>

          {/* Wild Joker Display */}
          <View style={styles.wildJokerDisplay}>
            <Text style={styles.wildJokerLabel}>Wild</Text>
            <View style={styles.wildJokerCard}>
              <Text style={styles.wildJokerText}>
                {gameState?.wildJoker ? getCardDisplay(gameState.wildJoker) : '?'}
              </Text>
            </View>
          </View>

          {/* Discard Pile */}
          <TouchableOpacity
            style={[styles.discardPile, canDraw && styles.activePile]}
            onPress={drawFromDiscard}
            disabled={!canDraw}
            activeOpacity={0.7}
          >
            {gameState?.discardTop ? (
              <CardFace cardCode={gameState.discardTop} size="medium" />
            ) : (
              <View style={styles.emptyPile} />
            )}
            <Text style={styles.pileLabel}>Discard</Text>
          </TouchableOpacity>
        </View>

        {/* Player's Hand */}
        <View style={styles.handArea}>
          {/* Action Buttons */}
          <View style={styles.handActions}>
            <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
              <Text style={styles.sortButtonText}>
                {sortMode === 'suit' ? '🔀 Suit' : '🔀 Rank'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declareButton, (!canDiscard || hasDeclared) && styles.buttonDisabled]}
              onPress={declareHand}
              disabled={!canDiscard || !!hasDeclared}
            >
              <Text style={styles.declareButtonText}>📢 DECLARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropButton} onPress={dropGame}>
              <Text style={styles.dropButtonText}>🏳️ Drop</Text>
            </TouchableOpacity>
          </View>

          {/* Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handScroll}
            style={styles.handScrollView}
          >
            {playerHand.map((cardCode, index) => {
              const isSelected = selectedCard === cardCode;
              const isWildJokerCard = isJoker(cardCode, gameState?.wildJoker);

              return (
                <TouchableOpacity
                  key={`${cardCode}-${index}`}
                  style={[
                    styles.handCard,
                    isSelected && styles.handCardSelected,
                    isWildJokerCard && styles.handCardJoker,
                    isSelected && isWildJokerCard && styles.handCardJokerSelected,
                  ]}
                  onPress={() => {
                    if (canDiscard) {
                      if (isSelected) {
                        discardCard(cardCode);
                      } else {
                        selectCard(cardCode);
                      }
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <CardFace cardCode={cardCode} size="small" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Turn prompt */}
          {canDraw && (
            <Text style={styles.turnPrompt}>Draw a card from the deck or discard pile</Text>
          )}
          {canDiscard && selectedCard && (
            <Text style={styles.turnPrompt}>Tap selected card again to discard,<br/>or select a different card</Text>
          )}
          {canDiscard && !selectedCard && (
            <Text style={styles.turnPrompt}>Select a card to discard</Text>
          )}
        </View>

        {/* Chat Overlay */}
        {showChat && (
          <View style={styles.chatOverlay}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Table Chat</Text>
              <TouchableOpacity onPress={() => { setShowChat(false); useChatStore.getState().clearUnread(); }}>
                <Text style={styles.closeChat}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={messages}
              keyExtractor={(item, idx) => item.id || idx.toString()}
              renderItem={({ item }) => (
                <View style={styles.chatBubble}>
                  <Text style={styles.chatUser}>{item.username}: </Text>
                  <Text style={styles.chatMsg}>{item.message}</Text>
                </View>
              )}
              style={styles.chatList}
              inverted={false}
            />
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor="#B0A898"
                onSubmitEditing={sendChat}
              />
              <TouchableOpacity style={styles.chatSend} onPress={sendChat}>
                <Text style={styles.chatSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Declare Modal */}
        <Modal visible={showDeclare} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.declareModal}>
              <Text style={styles.declareModalTitle}>Declare Your Hand</Text>
              <Text style={styles.declareModalSubtitle}>
                Your cards will be arranged into melds.
              </Text>

              <View style={styles.meldsPreview}>
                {melds.map((meld, idx) => (
                  <View key={idx} style={styles.meldGroup}>
                    <Text style={styles.meldType}>
                      {meld.type === 'pure_seq' ? '🧬 Pure Sequence' : meld.type === 'set' ? '🎯 Set' : '🔗 Sequence'}
                    </Text>
                    <View style={styles.meldCards}>
                      {meld.cards.map(card => (
                        <CardFace key={card} cardCode={card} size="tiny" />
                      ))}
                    </View>
                  </View>
                ))}
                {melds.length === 0 && (
                  <Text style={styles.noMelds}>No melds detected. You need at least one pure sequence to declare.</Text>
                )}
              </View>

              <View style={styles.declareModalButtons}>
                <TouchableOpacity
                  style={styles.cancelDeclare}
                  onPress={() => setShowDeclare(false)}
                >
                  <Text style={styles.cancelDeclareText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeclare, melds.length === 0 && styles.buttonDisabled]}
                  onPress={doDeclare}
                  disabled={melds.length === 0}
                >
                  <Text style={styles.confirmDeclareText}>Confirm Declare</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ─── Card Face Component ──────────────────────────────────

function CardFace({ cardCode, size = 'medium' }) {
  const suit = getSuitSymbol(cardCode);
  const color = getSuitColor(cardCode);
  const rank = cardCode.substring(1);
  const isJokerCard = cardCode.startsWith('J');

  const sizeStyles = {
    tiny: { width: 36, height: 52, fontSize: 10, suitSize: 12, rankSize: 12 },
    small: { width: 48, height: 68, fontSize: 13, suitSize: 16, rankSize: 16 },
    medium: { width: 64, height: 90, fontSize: 16, suitSize: 22, rankSize: 22 },
    large: { width: 80, height: 112, fontSize: 20, suitSize: 28, rankSize: 28 },
  };

  const s = sizeStyles[size] || sizeStyles.medium;

  return (
    <View style={[styles.cardFace, { width: s.width, height: s.height }, isJokerCard && styles.cardFaceJoker]}>
      {isJokerCard ? (
        <>
          <Text style={[styles.jokerSymbol, { fontSize: s.suitSize }]}>★</Text>
          <Text style={[styles.jokerText, { fontSize: s.fontSize - 2 }]}>JOKER</Text>
        </>
      ) : (
        <>
          <Text style={[styles.cardRank, { color, fontSize: s.rankSize }]}>{rank}</Text>
          <Text style={[styles.cardSuit, { color, fontSize: s.suitSize }]}>{suit}</Text>
        </>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B6B3A' },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noGameText: { fontSize: 18, color: '#FFF', marginBottom: 16 },
  backButton: {
    backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backButtonText: { color: '#8B0000', fontWeight: '700' },

  // Top Bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBarButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  topBarButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  tableInfo: { alignItems: 'center' },
  tableCode: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  turnIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  turnDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#9E9E9E', marginRight: 5,
  },
  turnDotActive: { backgroundColor: '#4CAF50' },
  turnText: { color: '#FFF', fontSize: 12 },
  chatToggle: { position: 'relative' },
  chatToggleIcon: { fontSize: 24 },
  chatBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#D32F2F', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  chatBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Timer
  timerBar: {
    height: 3,
    backgroundColor: '#4CAF50',
  },

  // Opponents
  opponentsArea: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', paddingVertical: 8, gap: 6,
  },
  opponentSlot: {
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12, padding: 8, minWidth: 85,
  },
  opponentActive: {
    backgroundColor: 'rgba(76,175,80,0.3)',
    borderWidth: 1, borderColor: '#4CAF50',
  },
  opponentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#8B0000', justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  opponentAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  opponentName: { color: '#FFF', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  opponentCards: { flexDirection: 'row', gap: 2 },
  opponentCardBack: {
    width: 18, height: 26, borderRadius: 3,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0D5C0',
  },
  declaredBadge: { color: '#4CAF50', fontSize: 10, fontWeight: '700', marginTop: 2 },
  droppedBadge: { color: '#EF5350', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // Table Center
  tableCenter: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingVertical: 16,
  },
  deckPile: {
    alignItems: 'center', padding: 8, borderRadius: 12,
  },
  activePile: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  deckStack: { position: 'relative', width: 56, height: 76 },
  deckCard: {
    position: 'absolute', width: 50, height: 70,
    backgroundColor: '#FFF', borderRadius: 6,
    borderWidth: 1, borderColor: '#D32F2F',
  },
  pileCount: { color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 4 },
  pileLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  wildJokerDisplay: { alignItems: 'center' },
  wildJokerLabel: { color: '#FF6F00', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  wildJokerCard: {
    width: 56, height: 76, borderRadius: 8,
    backgroundColor: '#FFF7E5', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FF6F00',
  },
  wildJokerText: { color: '#FF6F00', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  discardPile: {
    alignItems: 'center', padding: 8, borderRadius: 12,
  },
  emptyPile: {
    width: 50, height: 70, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed',
  },

  // Hand
  handArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingTop: 8,
    paddingBottom: 20,
  },
  handActions: {
    flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 6,
    paddingHorizontal: 14,
  },
  sortButton: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  sortButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  declareButton: {
    backgroundColor: '#4CAF50', borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 7,
    shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 3,
  },
  declareButtonText: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  dropButton: {
    backgroundColor: 'rgba(244,67,54,0.3)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#EF5350',
  },
  dropButtonText: { color: '#EF5350', fontSize: 12, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4 },
  handScrollView: { maxHeight: 94 },
  handScroll: {
    paddingHorizontal: 10, alignItems: 'center', gap: 2,
  },
  handCard: {
    marginHorizontal: 1,
    borderRadius: 6,
    transform: [],
  },
  handCardSelected: {
    transform: [{ translateY: -12 }],
    shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  handCardJoker: {
    borderWidth: 2, borderColor: '#FF6F00',
  },
  handCardJokerSelected: {
    transform: [{ translateY: -14 }],
  },
  turnPrompt: {
    color: 'rgba(255,255,255,0.8)', textAlign: 'center',
    fontSize: 12, marginTop: 8, fontStyle: 'italic',
  },

  // Card Face
  cardFace: {
    backgroundColor: '#FFFFFF', borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0D5C0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  cardFaceJoker: {
    backgroundColor: '#FFF7E5', borderColor: '#FF6F00',
  },
  cardRank: {
    fontWeight: '800',
  },
  cardSuit: {
    marginTop: 2,
  },
  jokerSymbol: {
    color: '#FF6F00',
  },
  jokerText: {
    color: '#FF6F00', fontWeight: '800', marginTop: 2,
  },

  // Chat overlay
  chatOverlay: {
    position: 'absolute', top: 60, left: 10, right: 10, bottom: 200,
    backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 16,
    padding: 12,
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  chatTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closeChat: { color: '#FFF', fontSize: 20 },
  chatList: { flex: 1 },
  chatBubble: {
    flexDirection: 'row', marginBottom: 6, paddingVertical: 4,
    paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
  },
  chatUser: { color: '#D4AF37', fontSize: 12, fontWeight: '700' },
  chatMsg: { color: '#E0D5C0', fontSize: 12, flex: 1 },
  chatInputRow: {
    flexDirection: 'row', marginTop: 8, gap: 8,
  },
  chatInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    color: '#FFF', fontSize: 13,
  },
  chatSend: {
    backgroundColor: '#8B0000', borderRadius: 8,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  chatSendText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Declare Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  declareModal: {
    backgroundColor: '#1A1A2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, minHeight: 300,
  },
  declareModalTitle: {
    color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4,
  },
  declareModalSubtitle: {
    color: '#9E9589', fontSize: 13, textAlign: 'center', marginBottom: 16,
  },
  meldsPreview: { marginBottom: 20 },
  meldGroup: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    padding: 10, marginBottom: 8,
  },
  meldType: { color: '#D4AF37', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  meldCards: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  noMelds: { color: '#EF5350', fontSize: 13, textAlign: 'center', padding: 16 },
  declareModalButtons: { flexDirection: 'row', gap: 12 },
  cancelDeclare: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelDeclareText: { color: '#FFF', fontWeight: '600' },
  confirmDeclare: {
    flex: 1, backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmDeclareText: { color: '#FFF', fontWeight: '800' },
});
