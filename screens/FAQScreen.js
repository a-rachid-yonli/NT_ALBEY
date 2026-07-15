import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import MainLayout from '../components/MainLayout';

const { width } = Dimensions.get('window');

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône chevron bas
const IconChevronDown = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône recherche
const IconSearch = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#999" strokeWidth="1.8" />
    <Path d="M21 21l-4.35-4.35" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const faqData = [
  {
    id: 'general',
    category: 'Général',
    icon: '📋',
    questions: [
      {
        q: 'Qu\'est-ce que NT Albey ?',
        a: 'NT Albey est une plateforme de paiement numérique mobile de Niger Télécoms qui vous permet d\'effectuer des transferts d\'argent, des paiements de factures, des achats en ligne, et bien plus encore, directement depuis votre téléphone.',
      },
      {
        q: 'Comment créer un compte NT Albey ?',
        a: 'Pour créer un compte NT Albey, cliquez sur "S\'inscrire" sur l\'écran de connexion. Remplissez vos informations (nom, numéro de téléphone, PIN) et acceptez les conditions d\'utilisation.',
      },
      {
        q: 'Quels sont les frais de transaction ?',
        a: 'Les frais de transaction varient selon le type d\'opération. Les transferts entre comptes NT Albey sont gratuits. Les retraits et paiements peuvent avoir des frais minimes. Consultez la grille tarifaire dans l\'application.',
      },
    ],
  },
  {
    id: 'transfers',
    category: 'Transferts',
    icon: '💰',
    questions: [
      {
        q: 'Comment envoyer de l\'argent à un proche ?',
        a: 'Rendez-vous dans "Envoyer" depuis l\'accueil, sélectionnez un bénéficiaire, saisissez le montant et confirmez avec votre PIN. Le transfert est instantané.',
      },
      {
        q: 'Puis-je envoyer de l\'argent à un non-utilisateur NT Albey ?',
        a: 'Oui ! Avec la fonction "Transfert Guichet", vous pouvez envoyer de l\'argent à une personne qui n\'a pas de compte. Elle recevra un code de retrait à présenter en agence.',
      },
      {
        q: 'Quel est le montant maximum par transfert ?',
        a: 'Le montant maximum dépend de votre niveau de vérification (KYC). Pour un compte vérifié, vous pouvez transférer jusqu\'à 500 000 FCFA par jour.',
      },
    ],
  },
  {
    id: 'payments',
    category: 'Paiements',
    icon: '💳',
    questions: [
      {
        q: 'Comment payer une facture Nigelec ?',
        a: 'Allez dans "Paiement" sur l\'accueil, choisissez "Électricité", sélectionnez Nigelec, saisissez votre numéro de compteur et le montant, puis confirmez.',
      },
      {
        q: 'Puis-je payer mes impôts avec NT Albey ?',
        a: 'Oui ! Utilisez la fonction "Gouv-Pay" pour payer vos impôts, taxes, amendes et autres services publics en ligne.',
      },
      {
        q: 'Que faire en cas de paiement échoué ?',
        a: 'En cas d\'échec, vérifiez que vous avez suffisamment de solde et que les informations saisies sont correctes. Si le problème persiste, contactez notre support au 555.',
      },
    ],
  },
  {
    id: 'cards',
    category: 'Cartes Visa',
    icon: '💳',
    questions: [
      {
        q: 'Comment créer une carte virtuelle ?',
        a: 'Allez dans "Visa & Cartes" depuis l\'accueil, puis cliquez sur "Nouvelle carte". Une carte virtuelle avec un numéro unique sera générée instantanément.',
      },
      {
        q: 'Comment recharger ma carte virtuelle ?',
        a: 'Dans "Visa & Cartes", sélectionnez votre carte et cliquez sur "Recharger". Saisissez le montant et confirmez avec votre PIN.',
      },
      {
        q: 'Où puis-je utiliser ma carte virtuelle ?',
        a: 'Votre carte virtuelle Visa peut être utilisée pour tous les achats en ligne acceptant les cartes Visa (Amazon, Netflix, Apple, etc.).',
      },
    ],
  },
  {
    id: 'security',
    category: 'Sécurité',
    icon: '🔒',
    questions: [
      {
        q: 'Comment changer mon PIN ?',
        a: 'Allez dans "Profil" > "Sécurité" > "Changer mon PIN". Saisissez votre ancien PIN, puis le nouveau, et confirmez.',
      },
      {
        q: 'Que faire si j\'oublie mon PIN ?',
        a: 'Sur l\'écran de connexion, cliquez sur "Mot de passe oublié". Suivez les instructions pour réinitialiser votre PIN via un code de vérification.',
      },
      {
        q: 'Comment vérifier mon identité (KYC) ?',
        a: 'Allez dans "Profil" > "Vérifier mon identité (KYC)" et suivez les instructions pour télécharger votre pièce d\'identité. Cela augmentera vos limites de transaction.',
      },
    ],
  },
];

export default function FAQScreen({ navigation, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (categoryId, questionIndex) => {
    const key = `${categoryId}-${questionIndex}`;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filteredFaq = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationEmoji}>❓</Text>
          <Text style={styles.illustrationTitle}>Foire aux questions</Text>
          <Text style={styles.illustrationText}>Trouvez rapidement des réponses à vos questions</Text>
        </View>

        {/* RECHERCHE */}
        <View style={styles.searchContainer}>
          <IconSearch />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une question..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CATÉGORIES ET QUESTIONS */}
        {filteredFaq.map((category) => (
          <View key={category.id} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryTitle}>{category.category}</Text>
            </View>

            {category.questions.map((item, index) => {
              const key = `${category.id}-${index}`;
              const isExpanded = expandedItems[key];

              return (
                <View key={key} style={styles.questionContainer}>
                  <TouchableOpacity
                    style={styles.questionItem}
                    onPress={() => toggleExpand(category.id, index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questionText}>{item.q}</Text>
                    <View style={[
                      styles.chevronContainer,
                      isExpanded && styles.chevronExpanded
                    ]}>
                      <IconChevronDown />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* CONTACT SUPPORT */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>📞 Vous n'avez pas trouvé votre réponse ?</Text>
          <Text style={styles.supportText}>Contactez notre support client 24/7</Text>
          <View style={styles.supportButtons}>
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>📞 555</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.supportButton, styles.supportButtonSecondary]}>
              <Text style={[styles.supportButtonText, styles.supportButtonSecondaryText]}>💬 Chatbot</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
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
    marginTop: 24,
    marginBottom: 20,
  },
  illustrationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  illustrationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  illustrationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  clearText: {
    color: '#999',
    fontSize: 14,
    padding: 8,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  questionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    paddingRight: 12,
  },
  chevronContainer: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  answerContainer: {
    paddingBottom: 14,
    paddingTop: 4,
  },
  answerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  supportCard: {
    backgroundColor: '#F0FFF4',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00893330',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  supportButton: {
    backgroundColor: '#008933',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  supportButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#008933',
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  supportButtonSecondaryText: {
    color: '#008933',
  },
});