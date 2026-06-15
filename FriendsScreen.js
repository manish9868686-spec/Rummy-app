/**
 * Friends Screen — Friend list, requests, search, invite
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { friendsAPI, usersAPI } from '../services/api';

export default function FriendsScreen() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'search'
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendsAPI.list(),
        friendsAPI.requests(),
      ]);
      setFriends(friendsRes.data || []);
      setRequests(requestsRes.data || { incoming: [], outgoing: [] });
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearchLoading(true);
    try {
      const res = await usersAPI.search(searchQuery.trim());
      setSearchResults(res.data || []);
    } catch {} finally {
      setSearchLoading(false);
    }
  };

  const sendRequest = async (userId) => {
    try {
      await friendsAPI.sendRequest(userId);
      Alert.alert('Sent!', 'Friend request sent.');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to send request.');
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      await friendsAPI.accept(friendshipId);
      fetchData();
    } catch {}
  };

  const rejectRequest = async (friendshipId) => {
    try {
      await friendsAPI.reject(friendshipId);
      fetchData();
    } catch {}
  };

  const removeFriend = async (friendshipId) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await friendsAPI.remove(friendshipId);
            fetchData();
          } catch {}
        },
      },
    ]);
  };

  const renderFriend = ({ item }) => (
    <View style={styles.friendRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.display_name || item.username || '?')[0].toUpperCase()}
        </Text>
        <View style={[styles.onlineDot, item.status === 'online' ? styles.online : styles.offline]} />
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.display_name || item.username}</Text>
        <Text style={styles.friendStatus}>{item.status === 'online' ? 'Online' : 'Offline'}</Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeFriend(item.friendship_id)}>
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequest = ({ item, type }) => (
    <View style={styles.friendRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.display_name || item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.display_name || item.username}</Text>
        <Text style={styles.friendStatus}>@{item.username}</Text>
      </View>
      {type === 'incoming' ? (
        <View style={styles.requestButtons}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => acceptRequest(item.friendship_id)}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={() => rejectRequest(item.friendship_id)}>
            <Text style={styles.rejectButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cancelButton} onPress={() => rejectRequest(item.friendship_id)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <View style={styles.friendRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.display_name || item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.display_name || item.username}</Text>
        <Text style={styles.friendStatus}>@{item.username}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => sendRequest(item.id)}>
        <Text style={styles.addButtonText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Friends</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'friends', label: `Friends (${friends.length})` },
            { key: 'requests', label: `Requests (${requests.incoming.length})` },
            { key: 'search', label: 'Search' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.friendship_id}
            renderItem={renderFriend}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState text="No friends yet. Search to add!" />}
          />
        )}

        {activeTab === 'requests' && (
          <View style={styles.requestsSection}>
            {requests.incoming.length > 0 && (
              <>
                <Text style={styles.subtitle}>Incoming ({requests.incoming.length})</Text>
                {requests.incoming.map(item => (
                  <View key={item.friendship_id}>{renderRequest({ item, type: 'incoming' })}</View>
                ))}
              </>
            )}
            {requests.outgoing.length > 0 && (
              <>
                <Text style={styles.subtitle}>Outgoing ({requests.outgoing.length})</Text>
                {requests.outgoing.map(item => (
                  <View key={item.friendship_id}>{renderRequest({ item, type: 'outgoing' })}</View>
                ))}
              </>
            )}
            {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
              <EmptyState text="No pending requests." />
            )}
          </View>
        )}

        {activeTab === 'search' && (
          <View style={styles.searchSection}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by username..."
                placeholderTextColor="#B0A898"
                autoCapitalize="none"
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
            {searchLoading ? (
              <ActivityIndicator style={styles.loader} color="#8B0000" />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchResult}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  searchQuery.length > 1
                    ? <EmptyState text="No users found." />
                    : <EmptyState text="Search for players to add as friends." />
                }
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function EmptyState({ text }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEF9F0' },
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginTop: 16, marginBottom: 16 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 6 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F5F0E8', alignItems: 'center',
  },
  tabActive: { backgroundColor: '#8B0000' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B6358' },
  tabTextActive: { color: '#FFF' },
  list: { paddingBottom: 100 },
  subtitle: {
    fontSize: 14, fontWeight: '700', color: '#6B6358',
    marginTop: 12, marginBottom: 8,
  },

  // Friend Row
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  avatar: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#8B0000', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#FFF',
  },
  online: { backgroundColor: '#4CAF50' },
  offline: { backgroundColor: '#9E9E9E' },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  friendStatus: { fontSize: 12, color: '#9E9589', marginTop: 2 },
  removeButton: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#FFF0F0',
  },
  removeButtonText: { color: '#D32F2F', fontSize: 12, fontWeight: '600' },
  requestButtons: { flexDirection: 'row', gap: 6 },
  acceptButton: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  rejectButton: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center',
  },
  rejectButtonText: { color: '#D32F2F', fontSize: 14, fontWeight: '700' },
  cancelButton: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#FFF0F0',
  },
  cancelButtonText: { color: '#D32F2F', fontSize: 12, fontWeight: '600' },
  addButton: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#8B0000',
  },
  addButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Search
  searchSection: { flex: 1 },
  searchRow: { flexDirection: 'row', marginBottom: 14, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: '#1A1A2E', borderWidth: 1, borderColor: '#E0D5C0',
  },
  searchButton: {
    backgroundColor: '#8B0000', borderRadius: 12,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  searchButtonText: { color: '#FFF', fontWeight: '700' },
  loader: { marginTop: 20 },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9E9589', textAlign: 'center' },
  requestsSection: { flex: 1 },
});
