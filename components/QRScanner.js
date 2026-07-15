// components/QRScanner.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { QrReader } from 'react-qr-reader';

const { width, height } = Dimensions.get('window');

export default function QRScanner({ onScan, onClose, flashOn }) {
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const handleScan = (result) => {
    if (result) {
      const data = result?.text || result;
      try {
        const parsed = JSON.parse(data);
        onScan(parsed);
      } catch {
        onScan({ data: data, type: 'text' });
      }
    }
  };

  const handleError = (err) => {
    console.warn('Erreur scanner:', err);
    setError('Erreur de caméra. Vérifiez les permissions.');
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scanner QR Code</Text>
        <TouchableOpacity onPress={toggleCamera} style={styles.flipButton}>
          <Text style={styles.flipText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scannerContainer}>
        <QrReader
          onResult={handleScan}
          onError={handleError}
          constraints={{
            facingMode: facingMode,
            audio: false,
          }}
          style={styles.scanner}
          ViewFinder={() => (
            <View style={styles.overlay}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.instruction}>Placez le QR Code dans le cadre</Text>
            </View>
          )}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFF',
    fontSize: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  flipButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: {
    fontSize: 24,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanner: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#008933',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,0,0,0.85)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#000',
    fontWeight: '600',
  },
});