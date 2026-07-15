import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône boutique principale
const IconShop = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="25" y="35" width="50" height="45" rx="4" fill="#008933" />
    <Path d="M35 35 L65 35 L70 45 L30 45 L35 35Z" fill="#FFD700" />
    <Path d="M40 55 L60 55" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M50 45 L50 65" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

// Icônes des produits
const IconCredit = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#FF6600" strokeWidth="1.8" />
    <Path d="M12 6v6l4 2" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconInternet = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M3 12h18M12 3v18" stroke="#3B82F6" strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="1.8" />
  </Svg>
);

const IconFibre = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M2 12h20M4 6h16M4 18h16" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="2" fill="#10B981" />
  </Svg>
);

const IconCloud = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M18 10h-1.26A8 8 0 106 10H6a4 4 0 004 4h8a4 4 0 000-8z" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSoftphone = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#EC4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBLR = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke="#F59E0B" strokeWidth="1.8" />
    <Path d="M8 8h8M8 12h8M8 16h4" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export default function ShopScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [cart, setCart] = useState([]);

  // Catégories de produits
  const categories = [
    { id: 'credit', name: 'Crédit téléphonique', icon: IconCredit, color: '#FF6600', description: 'Rechargez votre crédit NT' },
    { id: 'internet', name: 'Forfaits Internet', icon: IconInternet, color: '#3B82F6', description: 'Forfaits data quotidiens/mensuels' },
    { id: 'fibre', name: 'Fibre Optique', icon: IconFibre, color: '#10B981', description: 'Abonnement Fibre FTTH' },
    { id: 'cloud', name: 'Services Cloud', icon: IconCloud, color: '#8B5CF6', description: 'Stockage cloud NT' },
    { id: 'softphone', name: 'Softphone', icon: IconSoftphone, color: '#EC4899', description: 'Téléphonie IP' },
    { id: 'blr', name: 'Blacklist Rouge', icon: IconBLR, color: '#F59E0B', description: 'Service BLR' },
  ];

  // Produits par catégorie
  const products = {
    credit: [
      { id: 'c1', name: 'Recharge 500 FCFA', price: 500, validity: 'Illimité', popular: true },
      { id: 'c2', name: 'Recharge 1000 FCFA', price: 1000, validity: 'Illimité', popular: true },
      { id: 'c3', name: 'Recharge 2000 FCFA', price: 2000, validity: 'Illimité', popular: true },
      { id: 'c4', name: 'Recharge 5000 FCFA', price: 5000, validity: 'Illimité', popular: true },
      { id: 'c5', name: 'Recharge 10000 FCFA', price: 10000, validity: 'Illimité', popular: false },
      { id: 'c6', name: 'Recharge 25000 FCFA', price: 25000, validity: 'Illimité', popular: false },
    ],
    internet: [
      { id: 'i1', name: 'Internet 500 Mo', price: 500, validity: '1 jour', data: '500 Mo', popular: true },
      { id: 'i2', name: 'Internet 1 Go', price: 1000, validity: '3 jours', data: '1 Go', popular: true },
      { id: 'i3', name: 'Internet 3 Go', price: 2500, validity: '7 jours', data: '3 Go', popular: true },
      { id: 'i4', name: 'Internet 5 Go', price: 4000, validity: '15 jours', data: '5 Go', popular: true },
      { id: 'i5', name: 'Internet 10 Go', price: 7000, validity: '30 jours', data: '10 Go', popular: true },
      { id: 'i6', name: 'Internet 20 Go', price: 12000, validity: '30 jours', data: '20 Go', popular: true },
      { id: 'i7', name: 'Internet 50 Go', price: 25000, validity: '30 jours', data: '50 Go', popular: false },
      { id: 'i8', name: 'Internet 100 Go', price: 45000, validity: '30 jours', data: '100 Go', popular: false },
    ],
    fibre: [
      { id: 'f1', name: 'Fibre 10 Mbps', price: 15000, validity: 'Mensuel', speed: '10 Mbps', popular: true },
      { id: 'f2', name: 'Fibre 30 Mbps', price: 25000, validity: 'Mensuel', speed: '30 Mbps', popular: true },
      { id: 'f3', name: 'Fibre 50 Mbps', price: 35000, validity: 'Mensuel', speed: '50 Mbps', popular: true },
      { id: 'f4', name: 'Fibre 100 Mbps', price: 50000, validity: 'Mensuel', speed: '100 Mbps', popular: false },
    ],
    cloud: [
      { id: 'cl1', name: 'Cloud 50 Go', price: 3000, validity: 'Mensuel', storage: '50 Go', popular: true },
      { id: 'cl2', name: 'Cloud 100 Go', price: 5000, validity: 'Mensuel', storage: '100 Go', popular: true },
      { id: 'cl3', name: 'Cloud 500 Go', price: 15000, validity: 'Mensuel', storage: '500 Go', popular: false },
    ],
    softphone: [
      { id: 's1', name: 'Softphone Basic', price: 5000, validity: 'Mensuel', minutes: '100 min', popular: true },
      { id: 's2', name: 'Softphone Pro', price: 10000, validity: 'Mensuel', minutes: '300 min', popular: true },
      { id: 's3', name: 'Softphone Business', price: 20000, validity: 'Mensuel', minutes: 'Illimité', popular: false },
    ],
    blr: [
      { id: 'b1', name: 'BLR Standard', price: 25000, validity: 'Annuel', description: 'Liste noire standard', popular: true },
      { id: 'b2', name: 'BLR Premium', price: 50000, validity: 'Annuel', description: 'Liste noire premium', popular: false },
    ],
  };

  const handleBuy = (product) => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro NT valide');
      return;
    }
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const confirmPurchase = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer votre PIN à 4 chiffres');
      return;
    }
    
    if (pin === '0000') {
      Alert.alert(
        'Confirmation',
        `Acheter ${selectedProduct.name} à ${selectedProduct.price} FCFA pour le ${phoneNumber} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => {
            Alert.alert('Succès', `Achat effectué avec succès !\n${selectedProduct.name}\nNuméro: ${phoneNumber}`);
            setCart([...cart, { ...selectedProduct, phoneNumber, date: new Date().toLocaleDateString('fr-FR') }]);
            setModalVisible(false);
            setPin('');
            setSelectedProduct(null);
            setPhoneNumber('');
          }}
        ]
      );
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  const currentProducts = selectedCategory ? products[selectedCategory.id] || [] : [];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boutique NT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconShop />
          <Text style={styles.illustrationText}>Tous les services NT dans votre poche</Text>
        </View>

        {/* SOLDE DISPONIBLE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>125 000 FCFA</Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>Achats instantanés</Text>
          </View>
        </View>

        {/* SECTION CATÉGORIES */}
        <Text style={styles.sectionLabel}>📱 Nos services</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(category => {
            const IconComponent = category.icon;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory?.id === category.id && styles.categoryCardSelected
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setSelectedProduct(null);
                }}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                  <IconComponent />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDesc}>{category.description}</Text>
                {selectedCategory?.id === category.id && (
                  <View style={styles.categoryCheck}>
                    <Text style={styles.categoryCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SECTION PRODUITS (si catégorie sélectionnée) */}
        {selectedCategory && (
          <>
            <Text style={styles.sectionLabel}>🛒 {selectedCategory.name}</Text>
            
            {/* Numéro de téléphone */}
            <View style={styles.phoneCard}>
              <Text style={styles.phoneLabel}>Numéro NT</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Ex: 93 45 22 71"
                placeholderTextColor="#AAA"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            {/* Liste des produits */}
            <View style={styles.productsGrid}>
              {currentProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleBuy(product)}
                >
                  {product.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Populaire</Text>
                    </View>
                  )}
                  <View style={styles.productIcon}>
                    {selectedCategory.id === 'credit' && <IconCredit />}
                    {selectedCategory.id === 'internet' && <IconInternet />}
                    {selectedCategory.id === 'fibre' && <IconFibre />}
                    {selectedCategory.id === 'cloud' && <IconCloud />}
                    {selectedCategory.id === 'softphone' && <IconSoftphone />}
                    {selectedCategory.id === 'blr' && <IconBLR />}
                  </View>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.data && <Text style={styles.productDetail}>{product.data}</Text>}
                  {product.speed && <Text style={styles.productDetail}>{product.speed}</Text>}
                  {product.storage && <Text style={styles.productDetail}>{product.storage}</Text>}
                  {product.minutes && <Text style={styles.productDetail}>{product.minutes}</Text>}
                  <Text style={styles.productValidity}>📅 {product.validity}</Text>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPrice}>{product.price} FCFA</Text>
                    <View style={styles.buyButton}>
                      <Text style={styles.buyButtonText}>Acheter</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* SECTION PROMOTIONS */}
        <View style={styles.promoCard}>
          <Text style={styles.promoTitle}>🎁 Offres spéciales</Text>
          <Text style={styles.promoText}>Achetez un forfait Internet 5 Go et recevez 500 FCFA offerts</Text>
          <Text style={styles.promoText}>Valable jusqu'au 30/06/2026</Text>
        </View>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informations importantes</Text>
          <Text style={styles.infoText}>• Recharge immédiate après achat</Text>
          <Text style={styles.infoText}>• Valable sur tous les réseaux NT</Text>
          <Text style={styles.infoText}>• Service client disponible 24/7</Text>
          <Text style={styles.infoText}>• Reçu envoyé par SMS</Text>
        </View>

      </ScrollView>

      {/* MODAL CONFIRMATION PIN */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setPin('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <IconShop />
            </View>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalSubtitle}>
              {selectedProduct?.name}
            </Text>
            <Text style={styles.modalPrice}>
              {selectedProduct?.price} FCFA
            </Text>
            <Text style={styles.modalPhone}>
              Numéro: {phoneNumber}
            </Text>
            
            <Text style={styles.modalLabel}>Entrez votre PIN pour confirmer</Text>
            <View style={styles.pinContainer}>
              <TextInput
                style={styles.pinInput}
                placeholder="••••"
                placeholderTextColor="#CCC"
                keyboardType="number-pad"
                secureTextEntry={!pinVisible}
                maxLength={4}
                value={pin}
                onChangeText={setPin}
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.pinEye}
                onPress={() => setPinVisible(!pinVisible)}
              >
                <Text>{pinVisible ? '👁️' : '🔒'}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  setPin('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmPurchase}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  illustrationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  balanceCard: {
    backgroundColor: '#008933',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  balanceLimit: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  balanceLimitText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingLeft: 20,
  },
  categoryCard: {
    width: 120,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: '#008933',
    backgroundColor: '#F0FFF4',
  },
  categoryIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  categoryDesc: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  categoryCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCheckText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  phoneCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  phoneLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  productIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    alignSelf: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  productValidity: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#008933',
  },
  buyButton: {
    backgroundColor: '#008933',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  promoCard: {
    backgroundColor: '#FFF5E6',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF660030',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6600',
    marginBottom: 8,
  },
  promoText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: '#F0FFF4',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00893330',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008933',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 6,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#008933',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 16,
    color: '#FF6600',
    fontWeight: '700',
    marginBottom: 8,
  },
  modalPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
    position: 'relative',
  },
  pinInput: {
    width: 120,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#1A1A1A',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingVertical: 8,
  },
  pinEye: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#008933',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});