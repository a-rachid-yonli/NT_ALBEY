import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';

// Icône cloche
const IconBell = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône déconnexion
const IconLogout = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17l4-4-4-4M12 13h8" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône maison
const IconHome = ({ active }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M3 12L12 4l9 8" stroke={active ? '#FF6600' : '#AAAAAA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={active ? '#FF6600' : '#AAAAAA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône transactions
const IconTransactions = ({ active }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke={active ? '#FF6600' : '#AAAAAA'} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Icône QR Pay
const IconQRPay = () => (
  <View style={styles.qrPayButton}>
    <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke="#fff" strokeWidth="2" />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke="#fff" strokeWidth="2" />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke="#fff" strokeWidth="2" />
      <Path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2zM18 16h-2v2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  </View>
);

// Icône notifications
const IconNotifications = ({ active }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={active ? '#FF6600' : '#AAAAAA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône profil
const IconProfile = ({ active }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={active ? '#FF6600' : '#AAAAAA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={active ? '#FF6600' : '#AAAAAA'} strokeWidth="2" />
  </Svg>
);

const BottomNav = ({ active, navigation }) => {
  const items = [
    { key: 'Home', label: 'Accueil', icon: (a) => <IconHome active={a} /> },
    { key: 'Transactions', label: 'Transactions', icon: (a) => <IconTransactions active={a} /> },
    { key: 'QRPay', label: '', icon: () => <IconQRPay />, isSpecial: true },
    { key: 'Notifications', label: 'Notifications', icon: (a) => <IconNotifications active={a} /> },
    { key: 'Profile', label: 'Profil', icon: (a) => <IconProfile active={a} /> },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.navItem}
          onPress={() => {
            if (item.key === 'Home') navigation.navigate('Home');
            else if (item.key === 'Transactions') navigation.navigate('Transactions');
            else if (item.key === 'QRPay') navigation.navigate('QRPay');
            else if (item.key === 'Notifications') navigation.navigate('Notifications');
            else if (item.key === 'Profile') navigation.navigate('Profile');
          }}
        >
          {item.icon(active === item.key)}
          {!item.isSpecial && (
            <Text style={[styles.navLabel, active === item.key && styles.navLabelActive]}>
              {item.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function MainLayout({ children, activeScreen, onLogout }) {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Se déconnecter', 
          onPress: () => {
            if (onLogout && typeof onLogout === 'function') {
              onLogout();
            } else {
              navigation.replace('Login');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER FIXE */}
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
          />
        </View>

        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.bellWrapper}
            onPress={() => navigation.navigate('Notifications')}
          >
            <IconBell />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <IconLogout />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENU PRINCIPAL */}
      <View style={styles.content}>
        {children}
      </View>

      {/* BOTTOM NAV FIXE */}
      <BottomNav active={activeScreen} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,     // Largeur : 80
    height: 60,    // Hauteur : 40 (rectangle)
    resizeMode: 'contain',
     marginTop: 10
    
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bellWrapper: {
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  logoutButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#FF6600',
    fontWeight: '700',
  },
  qrPayButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});