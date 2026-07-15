// screens/QRScreen.js - Version avec scanner QR pour Mobile
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import MainLayout from '../components/MainLayout';
import QRScannerMobile from '../components/QRScannerMobile';

const { width } = Dimensions.get('window');

// Icônes SVG
const IconQrCode = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="30" y="30" width="15" height="15" rx="2" fill="#008933" />
    <Rect x="55" y="30" width="15" height="15" rx="2" fill="#008933" />
    <Rect x="30" y="55" width="15" height="15" rx="2" fill="#008933" />
    <Rect x="55" y="55" width="8" height="8" rx="1" fill="#008933" />
    <Rect x="67" y="55" width="8" height="8" rx="1" fill="#008933" />
    <Rect x="55" y="67" width="8" height="8" rx="1" fill="#008933" />
    <Rect x="67" y="67" width="8" height="8" rx="1" fill="#008933" />
  </Svg>
);

const IconScanner = () => (
  <Svg width="60" height="60" viewBox="0 0 100 100" fill="none">
    <Rect x="25" y="25" width="20" height="20" rx="3" stroke="#008933" strokeWidth="3" />
    <Rect x="55" y="25" width="20" height="20" rx="3" stroke="#008933" strokeWidth="3" />
    <Rect x="25" y="55" width="20" height="20" rx="3" stroke="#008933" strokeWidth="3" />
    <Rect x="55" y="55" width="10" height="10" rx="2" stroke="#008933" strokeWidth="3" />
    <Rect x="70" y="55" width="10" height="10" rx="2" stroke="#008933" strokeWidth="3" />
    <Rect x="55" y="70" width="10" height="10" rx="2" stroke="#008933" strokeWidth="3" />
    <Rect x="70" y="70" width="10" height="10" rx="2" stroke="#008933" strokeWidth="3" />
  </Svg>
);

const IconShare = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconDownload = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function QRScreen({ onLogout }) {
  const [activeTab, setActiveTab] = useState('scan');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scannedModalVisible, setScannedModalVisible] = useState(false);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  // Générer un QR Code
  const generateQRCode = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }
    
    const qrData = {
      type: 'payment_request',
      amount: amount,
      note: note,
      merchant: 'NT Albey User',
      phone: '93 45 22 71',
      date: new Date().toISOString(),
    };
    
    setGeneratedQR(qrData);
    setQrModalVisible(true);
  };

  // Ouvrir le scanner
  const openScanner = () => {
    setScannerVisible(true);
  };

  // Gérer le scan
  const handleScanResult = (data) => {
    setScannerVisible(false);
    console.log('Données scannées:', data);
    
    if (data) {
      if (data.amount && data.merchant) {
        setScannedData({
          type: data.type || 'payment',
          amount: data.amount,
          merchant: data.merchant,
          note: data.note || '',
          reference: data.reference || 'QR' + Math.floor(Math.random() * 1000000),
        });
      } else if (data.data) {
        setScannedData({
          type: 'payment',
          amount: data.data,
          merchant: 'Paiement scanné',
          reference: 'QR' + Math.floor(Math.random() * 1000000),
        });
      } else {
        setScannedData({
          type: 'payment',
          amount: data.toString(),
          merchant: 'Paiement scanné',
          reference: 'QR' + Math.floor(Math.random() * 1000000),
        });
      }
      setScannedModalVisible(true);
    }
  };

  // Scan manuel
  const handleManualScan = () => {
    if (!scanInput.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer des données');
      return;
    }
    
    try {
      const parsed = JSON.parse(scanInput);
      setScannedData({
        type: parsed.type || 'payment',
        amount: parsed.amount || scanInput,
        merchant: parsed.merchant || 'Paiement manuel',
        note: parsed.note || '',
        reference: parsed.reference || 'MAN' + Math.floor(Math.random() * 1000000),
      });
    } catch {
      setScannedData({
        type: 'payment',
        amount: scanInput,
        merchant: 'Paiement manuel',
        reference: 'MAN' + Math.floor(Math.random() * 1000000),
      });
    }
    setScannedModalVisible(true);
    setScanInput('');
  };

  const confirmPayment = () => {
    Alert.alert(
      'Confirmation',
      `Payer ${scannedData?.amount} FCFA à ${scannedData?.merchant || 'bénéficiaire'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => {
            Alert.alert('Succès', 'Paiement effectué avec succès !');
            setScannedModalVisible(false);
            setScannedData(null);
          }
        }
      ]
    );
  };

  const handleShare = () => {
    Alert.alert('Partager', 'QR Code prêt à être partagé');
  };

  const handleDownload = () => {
    Alert.alert('Télécharger', 'QR Code téléchargé avec succès');
  };

  return (
    <MainLayout activeScreen="QRPay" onLogout={onLogout}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]} 
          onPress={() => setActiveTab('scan')}
        >
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'generate' && styles.tabActive]} 
          onPress={() => setActiveTab('generate')}
        >
          <Text style={[styles.tabText, activeTab === 'generate' && styles.tabTextActive]}>Générer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
        {activeTab === 'scan' ? (
          <View style={styles.scanContainer}>
            {/* Bouton pour scanner */}
            <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
              <IconScanner />
              <Text style={styles.scanButtonText}>Scanner un QR Code</Text>
            </TouchableOpacity>

            {/* Alternative manuelle */}
            <View style={styles.manualScanContainer}>
              <Text style={styles.manualScanTitle}>Ou entrez manuellement</Text>
              <View style={styles.manualScanInput}>
                <TextInput
                  style={styles.manualScanTextInput}
                  placeholder="Code ou données"
                  placeholderTextColor="#AAA"
                  value={scanInput}
                  onChangeText={setScanInput}
                />
                <TouchableOpacity style={styles.manualScanButton} onPress={handleManualScan}>
                  <Text style={styles.manualScanButtonText}>Valider</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.scanInfo}>
              <Text style={styles.scanInfoTitle}>Comment payer ?</Text>
              <View style={styles.scanInfoStep}>
                <Text style={styles.scanInfoNumber}>1</Text>
                <Text style={styles.scanInfoText}>Demandez le QR Code au marchand</Text>
              </View>
              <View style={styles.scanInfoStep}>
                <Text style={styles.scanInfoNumber}>2</Text>
                <Text style={styles.scanInfoText}>Scannez le QR Code avec votre appareil</Text>
              </View>
              <View style={styles.scanInfoStep}>
                <Text style={styles.scanInfoNumber}>3</Text>
                <Text style={styles.scanInfoText}>Confirmez le montant et payez</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.generateContainer}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceAmount}>125 000 FCFA</Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Générer un QR Code</Text>
              <Text style={styles.inputLabel}>Montant à recevoir</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>FCFA</Text>
                <TextInput 
                  style={styles.amountInput} 
                  placeholder="0" 
                  keyboardType="numeric" 
                  value={amount} 
                  onChangeText={setAmount} 
                />
              </View>
              <View style={styles.suggestionsRow}>
                {['5000', '10000', '25000', '50000'].map(sug => (
                  <TouchableOpacity key={sug} style={styles.suggestionChip} onPress={() => setAmount(sug)}>
                    <Text style={styles.suggestionText}>{sug} FCFA</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Note (optionnel)</Text>
              <TextInput 
                style={styles.noteInput} 
                placeholder="Ex: Paiement commande" 
                value={note} 
                onChangeText={setNote} 
              />
              <TouchableOpacity style={styles.generateButton} onPress={generateQRCode}>
                <Text style={styles.generateButtonText}>Générer QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL SCANNER QR CODE */}
      {scannerVisible && (
        <QRScannerMobile
          onScan={handleScanResult}
          onClose={() => setScannerVisible(false)}
        />
      )}

      {/* MODAL QR CODE GÉNÉRÉ */}
      <Modal visible={qrModalVisible} transparent onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.modalTitle}>Votre QR Code</Text>
            <View style={styles.qrCodeBox}>
              {generatedQR && (
                <QRCode
                  value={JSON.stringify(generatedQR)}
                  size={200}
                  color="#008933"
                  backgroundColor="white"
                />
              )}
            </View>
            <Text style={styles.qrAmount}>{amount} FCFA</Text>
            {note !== '' && <Text style={styles.qrNote}>{note}</Text>}
            <Text style={styles.qrValidite}>Valable 15 minutes</Text>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrActionButton} onPress={handleShare}>
                <IconShare />
                <Text style={styles.qrActionText}>Partager</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrActionButton} onPress={handleDownload}>
                <IconDownload />
                <Text style={styles.qrActionText}>Télécharger</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setQrModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL RÉSULTAT SCAN */}
      <Modal visible={scannedModalVisible} transparent onRequestClose={() => setScannedModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.scanResultModal}>
            <Text style={styles.modalTitle}>Détails du paiement</Text>
            <View style={styles.resultIcon}>
              <IconScanner />
            </View>
            <Text style={styles.resultMerchant}>{scannedData?.merchant || 'Bénéficiaire'}</Text>
            <Text style={styles.resultAmount}>{scannedData?.amount || '0'} FCFA</Text>
            {scannedData?.note && <Text style={styles.resultNote}>{scannedData.note}</Text>}
            {scannedData?.reference && (
              <Text style={styles.resultRef}>Réf: {scannedData.reference}</Text>
            )}
            <View style={styles.resultButtons}>
              <TouchableOpacity style={styles.cancelResultButton} onPress={() => setScannedModalVisible(false)}>
                <Text style={styles.cancelResultText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmResultButton} onPress={confirmPayment}>
                <Text style={styles.confirmResultText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 20, 
    paddingVertical: 8 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderRadius: 12 
  },
  tabActive: { 
    backgroundColor: '#E8F5E9' 
  },
  tabText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#666' 
  },
  tabTextActive: { 
    color: '#008933' 
  },
  scanContainer: {
    flex: 1,
  },
  scanButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#008933', 
    paddingVertical: 20, 
    borderRadius: 16, 
    gap: 12,
    marginVertical: 20,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonText: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '700',
    textAlign: 'center',
  },
  manualScanContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  manualScanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  manualScanInput: {
    flexDirection: 'row',
    gap: 10,
  },
  manualScanTextInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  manualScanButton: {
    backgroundColor: '#008933',
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualScanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scanInfo: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 24, 
    borderRadius: 20, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scanInfoTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 16,
    color: '#1A1A1A',
  },
  scanInfoStep: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    gap: 12 
  },
  scanInfoNumber: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#008933', 
    color: '#FFF', 
    textAlign: 'center', 
    textAlignVertical: 'center', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  scanInfoText: { 
    fontSize: 14, 
    color: '#555', 
    flex: 1,
    lineHeight: 20,
  },
  generateContainer: {
    flex: 1,
  },
  balanceCard: { 
    backgroundColor: '#008933', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  balanceLabel: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 14, 
    marginBottom: 4 
  },
  balanceAmount: { 
    color: '#FFFFFF', 
    fontSize: 28, 
    fontWeight: '800' 
  },
  formCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  formTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 16,
    color: '#1A1A1A',
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#666', 
    marginBottom: 8, 
    marginTop: 12 
  },
  amountInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 2, 
    borderBottomColor: '#008933', 
    paddingBottom: 8, 
    marginBottom: 16 
  },
  currencySymbol: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#008933', 
    marginRight: 8 
  },
  amountInput: { 
    flex: 1, 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#1A1A1A', 
    padding: 0 
  },
  suggestionsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 16 
  },
  suggestionChip: { 
    backgroundColor: '#F0FFF4', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#008933' 
  },
  suggestionText: { 
    color: '#008933', 
    fontSize: 14, 
    fontWeight: '500' 
  },
  noteInput: { 
    backgroundColor: '#F5F5F5', 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 14, 
    borderWidth: 1, 
    borderColor: '#EEEEEE', 
    marginBottom: 20 
  },
  generateButton: { 
    backgroundColor: '#008933', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  generateButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  qrCodeBox: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  qrAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#008933',
    marginBottom: 4,
  },
  qrNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  qrValidite: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  qrActionText: {
    color: '#008933',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },

  // Scan Result Modal
  scanResultModal: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1A1A1A',
  },
  resultIcon: {
    marginVertical: 16,
  },
  resultMerchant: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  resultAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#008933',
    marginBottom: 8,
  },
  resultNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultRef: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelResultButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelResultText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmResultButton: {
    flex: 1,
    backgroundColor: '#008933',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmResultText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});