/**
 * Forgot Password Screen
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    // In production: call API to send reset email
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {!sent ? (
            <View style={styles.card}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#B0A898"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleReset} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Send Reset Link</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.successIcon}>✉️</Text>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                If an account exists for {email}, we've sent a password reset link.
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FEF9F0' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 12, left: 12 },
  backText: { fontSize: 16, color: '#8B0000', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B6358', textAlign: 'center', marginBottom: 24 },
  inputGroup: { width: '100%', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  input: {
    backgroundColor: '#F5F0E8', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: '#1A1A2E', borderWidth: 1, borderColor: '#E0D5C0',
  },
  button: {
    backgroundColor: '#8B0000', borderRadius: 12, paddingVertical: 15,
    paddingHorizontal: 32, alignItems: 'center', width: '100%',
    shadowColor: '#8B0000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  successIcon: { fontSize: 48, marginBottom: 16 },
});
