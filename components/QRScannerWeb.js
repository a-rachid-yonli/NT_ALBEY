// components/QRScannerWeb.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function QRScannerWeb({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    // Démarrer la caméra uniquement sur le web
    if (Platform.OS === 'web') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        // Démarrer le scan après le chargement de la vidéo
        setTimeout(() => startScanning(), 1500);
      }
    } catch (err) {
      console.error('Erreur caméra:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    // Simuler un scan pour le moment
    // Dans une version finale, on utiliserait une vraie bibliothèque de scan
    if (!scanned) {
      setTimeout(() => {
        // Simuler un QR Code scanné
        const simulatedData = {
          type: 'payment',
          amount: '25000',
          merchant: 'Boutique Al Nour',
          note: 'Paiement marchand',
          reference: 'QR' + Math.floor(Math.random() * 1000000),
        };
        setScanned(true);
        onScan(simulatedData);
      }, 3000);
    }
  };

  // Pour le web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { stopCamera(); onClose(); }} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scanner QR Code</Text>
          <TouchableOpacity onPress={startCamera} style={styles.flipButton}>
            <Text style={styles.flipText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scannerContainer}>
          <video
            ref={videoRef}
            style={styles.videoElement}
            playsInline
            muted
          />
          <View style={styles.overlay}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.instruction}>
              {isScanning ? '🔍 Scan en cours...' : '📷 Placez le QR Code dans le cadre'}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { setError(null); startCamera(); }}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Pour mobile - utiliser le scanner natif
  return null;
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
    backgroundColor: '#000',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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