// components/NTMapCard.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { API } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

const NTMapCard = ({ onTouchStart, onTouchEnd }) => {
  const { t } = useTranslation();
  const webViewRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les lieux depuis l'API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await API.getWithdrawLocations();
        // Transformer en format attendu par la carte
        const formatted = data.map(loc => ({
          name: loc.name,
          lat: loc.lat,
          lng: loc.lng,
        }));
        setLocations(formatted);
      } catch (error) {
        console.error('Erreur chargement lieux:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLocations();
  }, []);

  // Générer le HTML avec les données dynamiques
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Points de vente NT Albey</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body { margin: 0; padding: 0; }
      #map { height: 100vh; width: 100vw; }
      /* Masquer les attributions */
      .leaflet-control-attribution { display: none !important; }
      .leaflet-bottom .leaflet-control { display: none !important; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map = L.map('map', { attributionControl: false }).setView([13.5, 2.1], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ''
      }).addTo(map);
      var locations = ${JSON.stringify(locations)};
      locations.forEach(function(loc) {
        var marker = L.marker([loc.lat, loc.lng]).addTo(map);
        marker.bindPopup('<strong>' + loc.name + '</strong>');
      });
      if (locations.length > 0) {
        var group = new L.featureGroup();
        locations.forEach(function(loc) {
          group.addLayer(L.marker([loc.lat, loc.lng]));
        });
        map.fitBounds(group.getBounds().pad(0.2));
      }
    </script>
  </body>
  </html>
  `;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#008933" />
        <Text style={{ marginTop: 10, color: '#666' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.label}>📍 {t('home.pointsOfSale')}</Text>
      </View>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8ECF0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    backgroundColor: '#008933',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  webview: {
    flex: 1,
  },
});

export default NTMapCard;