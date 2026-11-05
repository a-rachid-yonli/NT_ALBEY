// screens/FAQScreen.js - Version premium harmonisée
// ✅ Design homogène avec les autres écrans (mêmes radius, ombres, palette, badges)
// ✅ Multilingue + Chatbot unifié + Visa retiré
// ✅ v3 : FUSION INTELLIGENTE (données API + FAQ locale enrichie)
// ✅ v3 : Bouton "555" ouvre l'app téléphone NATIVE via Linking
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { API } from '../services/api';
import { useTranslation, TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView } from '../context/LanguageContext';

// ═══════════════════════════════════════════════════════════
// 🎨 PALETTE CENTRALISÉE (identique à tous les écrans)
// ═══════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  textPrimary:  '#0F172A',
  textSecondary:'#64748B',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  borderSoft:   '#F1F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAFC',
  background:   '#F1F5F9',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  success:      '#10B981',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  shadow:       '#0F172A',
};

// ═══════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronDown = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// ✅ Catégories à masquer (fonctionnalités "coming soon")
const HIDDEN_CATEGORY_IDS = ['cards'];

// ═══════════════════════════════════════════════════════════
// 📚 FAQ LOCALE ENRICHIE (fallback si l'API ne renvoie rien)
//    Contenu construit à partir des fichiers partagés :
//    SendMoney, Withdraw, TransferToAgency, Shop, Chatbot,
//    Profile, History, LanguageContext, etc.
// ═══════════════════════════════════════════════════════════
const LOCAL_FAQ = [
  {
    id: 'general',
    category: 'Général',
    icon: '📋',
    questions: [
      {
        q: "Qu'est-ce que NT Albey ?",
        a: "NT Albey est l'application mobile officielle de Niger Télécoms. Elle vous permet d'envoyer et recevoir de l'argent, payer vos factures (NIGELEC, NDE, Canal+…), recharger votre crédit, gérer vos cartes Visa virtuelles, épargner et bien plus encore — 24h/24 et 7j/7.",
      },
      {
        q: "L'application est-elle sécurisée ?",
        a: "Oui. NT Albey utilise :\n• Une authentification par mot de passe (8 à 20 caractères)\n• L'authentification biométrique (empreinte digitale / Face ID)\n• Le chiffrement de vos données sensibles\n• Une session verrouillée automatiquement après inactivité\n\nNe partagez jamais votre mot de passe. Notre équipe ne vous le demandera jamais.",
      },
      {
        q: "Que faire si j'ai oublié mon mot de passe ?",
        a: "Sur l'écran de connexion, cliquez sur « Mot de passe oublié ? ». Suivez les instructions pour réinitialiser votre mot de passe. Si le problème persiste, contactez le support au 555.",
      },
      {
        q: "Comment changer mon mot de passe ?",
        a: "Allez dans « Profil » → « Sécurité » → « Changer mon mot de passe ». Saisissez votre ancien mot de passe, puis le nouveau (8 à 20 caractères) deux fois pour confirmation.",
      },
      {
        q: "Puis-je utiliser l'application hors connexion ?",
        a: "Non, une connexion Internet est requise pour toutes les transactions et l'affichage du solde en temps réel. En cas de coupure, l'application vous le signalera clairement.",
      },
    ],
  },
  {
    id: 'transfer',
    category: 'Transfert & Envoi',
    icon: '💸',
    questions: [
      {
        q: "Comment envoyer de l'argent à un compte NT Albey ?",
        a: "1. Sur l'accueil, tapez sur « Transfert compte à compte »\n2. Saisissez le montant souhaité\n3. Choisissez un contact favori ou entrez un numéro (+227)\n4. Confirmez avec votre mot de passe ou votre empreinte\n\nVous pouvez aussi scanner le QR Code du bénéficiaire pour pré-remplir son compte.",
      },
      {
        q: "Comment transférer de l'argent à retirer au guichet ?",
        a: "1. Tapez sur « Transfert d'argent » depuis l'accueil\n2. Choisissez le montant\n3. Renseignez le numéro et le nom du bénéficiaire\n4. Sélectionnez la région de retrait\n5. Confirmez\n\nUn code de retrait unique est généré. Le bénéficiaire le présente dans n'importe quelle agence NT Albey de la région choisie.",
      },
      {
        q: "Quels sont les frais de transfert ?",
        a: "Les frais dépendent du type d'opération :\n• Compte à compte : calculés automatiquement par NT Albey\n• Guichet : 100 FCFA fixes (≤ 15 000 FCFA) ou 1,5 % au-delà\n• Retrait : 50 FCFA fixes (≤ 15 000 FCFA) ou 0,75 % au-delà\n\nVous pouvez choisir « Frais inclus » ou « Hors frais » avant de valider.",
      },
      {
        q: "Qu'est-ce que le QR Code NT Albey ?",
        a: "Chaque utilisateur dispose d'un QR Code personnel visible en bas de l'accueil, régénéré automatiquement toutes les 4 minutes pour votre sécurité. Un émetteur peut le scanner pour vous envoyer de l'argent sans saisir votre numéro.",
      },
      {
        q: "Puis-je enregistrer un bénéficiaire en favori ?",
        a: "Oui. Après avoir saisi un numéro, une option « ⭐ Ajouter aux favoris » apparaît si le numéro existe sur NT Albey. Vos favoris apparaissent en haut de l'écran « Envoyer » pour un accès rapide.",
      },
      {
        q: "Que se passe-t-il si le bénéficiaire n'est pas sur NT Albey ?",
        a: "L'application vous affiche « Compte introuvable sur NT Albey ». Vous ne pouvez pas envoyer d'argent à un numéro non enregistré via le compte à compte. Pour un transfert guichet, le numéro doit tout de même être valide (commence par 83 ou 93, suivi de 6 chiffres).",
      },
    ],
  },
  {
    id: 'withdraw',
    category: 'Retrait',
    icon: '🏦',
    questions: [
      {
        q: "Comment retirer de l'argent en agence ?",
        a: "1. Tapez sur « Envoi à moi-même » depuis l'accueil\n2. Saisissez le montant souhaité\n3. Sélectionnez votre région de retrait\n4. Confirmez avec mot de passe ou empreinte\n\nPrésentez-vous avec une pièce d'identité dans n'importe quelle agence NT Albey de la région choisie.",
      },
      {
        q: "Quels sont les frais de retrait ?",
        a: "• 50 FCFA fixes pour un montant ≤ 15 000 FCFA\n• 0,75 % du montant au-delà de 15 000 FCFA\n\nLes frais peuvent être inclus dans le montant saisi ou ajoutés au total débité (option « Frais inclus » / « Hors frais »).",
      },
      {
        q: "Quel est le montant maximum de retrait ?",
        a: "Le montant maximum par opération est de 500 000 FCFA. Pour des montants supérieurs, contactez votre agence NT Albey.",
      },
    ],
  },
  {
    id: 'shop',
    category: 'Boutique NT',
    icon: '🛍️',
    questions: [
      {
        q: "Qu'est-ce que la Boutique NT ?",
        a: "La Boutique NT vous permet de recharger votre compte NT directement depuis l'application :\n• 📦 Stock NT (pour revendre du crédit)\n• 📱 Crédit téléphonique (pour vous ou un proche)\n• 📞 Softphone (crédit pour appels via Softphone NT)\n• 📡 BLR (réabonnement Boucle Locale Radio)",
      },
      {
        q: "Comment recharger mon crédit téléphonique ?",
        a: "1. Ouvrez la Boutique NT\n2. Sélectionnez « Crédit »\n3. Choisissez « Pour moi » ou « Pour un autre »\n4. Saisissez le montant (100 à 5 000 000 FCFA)\n5. Confirmez\n\nLe crédit est disponible immédiatement après validation.",
      },
      {
        q: "Comment recharger le crédit d'un proche ?",
        a: "Dans « Crédit », sélectionnez « Pour un autre », saisissez le numéro du bénéficiaire (doit commencer par 83 ou 93, suivi de 6 chiffres), puis le montant. Le crédit arrive immédiatement sur son téléphone.",
      },
      {
        q: "Qu'est-ce que le Softphone ?",
        a: "Le Softphone est un service NT permettant de passer des appels via Internet. Vous pouvez recharger le crédit Softphone d'un numéro NT depuis la Boutique. Cela nécessite un numéro NT valide (83 ou 93).",
      },
      {
        q: "Qu'est-ce que la BLR ?",
        a: "La BLR (Boucle Locale Radio) est un service Internet haut débit de NT Albey. Depuis la Boutique, vous pouvez :\n1. Saisir votre numéro BLR (ex : BLR0000NY)\n2. Vérifier votre abonnement (type, prix, facture impayée)\n3. Renouveler votre abonnement en quelques secondes.",
      },
      {
        q: "Quel est le montant maximum de recharge ?",
        a: "Le montant maximum par recharge est de 5 000 000 FCFA dans la Boutique (Stock, Crédit, Softphone). Le prix de réabonnement BLR dépend de votre abonnement et est affiché avant validation.",
      },
    ],
  },
  {
    id: 'bills',
    category: 'Factures & Paiements',
    icon: '📄',
    questions: [
      {
        q: "Comment payer une facture ?",
        a: "1. Tapez sur « Paiement » depuis l'accueil\n2. Choisissez la catégorie : Électricité, Eau, TV, Scolarité, Assurance\n3. Sélectionnez le fournisseur (NIGELEC, NDE, Canal+…)\n4. Saisissez la référence (compteur, abonné, matricule…)\n5. Confirmez avec votre mot de passe",
      },
      {
        q: "Quels fournisseurs sont disponibles ?",
        a: "• ⚡ Électricité : NIGELEC\n• 💧 Eau : NDE\n• 📺 TV : Canal+, TNT\n• 🎓 Scolarité : Lycées et collèges partenaires\n• 🛡️ Assurance : CAREN, SANLAM, SUNU\n\nDe nouveaux fournisseurs sont ajoutés régulièrement.",
      },
      {
        q: "Qu'est-ce que Gouv-Pay ?",
        a: "Gouv-Pay vous permet de payer vos impôts, taxes et services administratifs (carte d'identité, etc.) directement depuis NT Albey. Sélectionnez « Gouv-Pay » sur l'accueil pour commencer.",
      },
      {
        q: "Puis-je sauvegarder un paiement pour plus tard ?",
        a: "Oui. Lors d'un paiement, une case « Sauvegarder ce paiement » vous permet de le retrouver rapidement dans vos paiements récents.",
      },
    ],
  },
  {
    id: 'visa',
    category: 'Cartes Visa',
    icon: '💳',
    questions: [
      {
        q: "Comment créer une carte Visa virtuelle ?",
        a: "1. Depuis l'accueil, tapez sur « Visa & Cartes »\n2. Cliquez sur « Nouvelle » ou « Créer une carte »\n3. Confirmez la création\n\nVotre carte virtuelle est immédiatement disponible pour les paiements en ligne.",
      },
      {
        q: "Comment recharger ma carte Visa ?",
        a: "1. Ouvrez « Visa & Cartes »\n2. Sélectionnez la carte à recharger\n3. Choisissez « Recharger »\n4. Saisissez le montant\n5. Confirmez avec mot de passe ou empreinte\n\nLe montant est débité de votre solde Albey principal.",
      },
      {
        q: "Combien de cartes puis-je créer ?",
        a: "Vous pouvez créer plusieurs cartes virtuelles pour séparer vos usages (achats en ligne, abonnements, etc.). Chaque carte a son propre solde.",
      },
    ],
  },
  {
    id: 'savings',
    category: 'Épargne',
    icon: '🏦',
    questions: [
      {
        q: "Comment fonctionne l'épargne NT Albey ?",
        a: "Vous pouvez créer des enveloppes d'épargne avec un nom, un objectif, et éventuellement une date de blocage. Vous y ajoutez ou retirez de l'argent à tout moment (sauf si une date de blocage est définie).",
      },
      {
        q: "Puis-je retirer mon épargne à tout moment ?",
        a: "Oui, sauf si vous avez défini une date de déblocage. Dans ce cas, l'épargne reste bloquée jusqu'à cette date, après quoi elle devient librement retirable.",
      },
      {
        q: "Qu'est-ce que l'épargne automatique ?",
        a: "Lors de la création d'une épargne, vous pouvez activer le « 🤖 Épargne automatique » avec un montant et une fréquence (hebdomadaire ou mensuelle). Le montant est alors prélevé automatiquement sur votre solde.",
      },
    ],
  },
  {
    id: 'security',
    category: 'Sécurité & Biométrie',
    icon: '🔐',
    questions: [
      {
        q: "Comment activer la connexion par empreinte ?",
        a: "1. Allez dans « Profil » → « Préférences »\n2. Activez « Authentification biométrique »\n3. Confirmez avec votre empreinte\n\nUne fois activée, vous pouvez vous connecter et confirmer vos transactions avec votre empreinte (compatible avec Face ID sur iPhone).",
      },
      {
        q: "Pourquoi mon empreinte ne fonctionne pas ?",
        a: "Vérifiez :\n• Que votre appareil dispose d'un capteur biométrique\n• Que votre empreinte est enregistrée dans les réglages système\n• Que la biométrie est activée pour CE compte dans « Profil »\n\nSi le problème persiste, utilisez votre mot de passe ou réactivez l'empreinte depuis votre profil.",
      },
      {
        q: "Que faire si mon appareil est perdu ou volé ?",
        a: "Contactez immédiatement le support au 555 pour faire bloquer votre compte. Depuis un autre appareil, reconnectez-vous puis changez votre mot de passe. Ne partagez jamais votre mot de passe.",
      },
      {
        q: "Combien de tentatives de mot de passe avant blocage ?",
        a: "Après 5 tentatives échouées, votre compte est temporairement bloqué (5 minutes). Un compteur vous indique le temps restant avant de pouvoir réessayer.",
      },
    ],
  },
  {
    id: 'notifications',
    category: 'Notifications & Historique',
    icon: '🔔',
    questions: [
      {
        q: "Comment consulter l'historique de mes transactions ?",
        a: "Depuis l'accueil, tapez sur « Historique ». Vous y trouverez toutes vos opérations avec filtres par type (Envois, Retraits, Paiements, Achats…) et par période. Vous pouvez aussi partager un reçu en PDF ou copier les détails.",
      },
      {
        q: "Où trouver mes notifications ?",
        a: "Tapez sur la cloche 🔔 en haut à droite de l'écran, ou ouvrez le menu → « Notifications ». Les notifications de crédit reçu, paiement effectué, code de retrait, etc. y sont répertoriées.",
      },
      {
        q: "Comment exporter un reçu en PDF ?",
        a: "Ouvrez le détail d'une transaction depuis l'historique, puis tapez sur « Partager » (bouton PDF). Un reçu professionnel NT Albey est généré et peut être partagé par mail, WhatsApp, etc.",
      },
    ],
  },
  {
    id: 'support',
    category: 'Support & Assistance',
    icon: '💬',
    questions: [
      {
        q: "Comment contacter le support ?",
        a: "Trois options :\n• 📞 Par téléphone : 555 (appel gratuit)\n• 💬 Par chat : Cliquez sur le bouton flottant 🤖 en bas de l'écran ou depuis cette FAQ\n• 📧 Par email : support@ntalbey.ne\n\nUn conseiller humain peut prendre le relais à tout moment via le chat.",
      },
      {
        q: "Comment parler à un humain (pas au bot) ?",
        a: "Dans le chat, tapez « agent », « humain », « conseiller » ou « service client ». Une carte « Parler à un conseiller » apparaît. Cliquez dessus pour être mis en relation avec un agent du support.",
      },
      {
        q: "Quels sont les horaires du support ?",
        a: "Le support NT Albey est disponible 24h/24 et 7j/7 via le chat et le téléphone (555). Les temps de réponse peuvent varier selon l'affluence.",
      },
      {
        q: "Que faire en cas d'échec d'une transaction ?",
        a: "Si une transaction échoue, aucune somme n'est débitée de votre compte. Réessayez dans quelques instants. Si le problème persiste, contactez le support au 555 avec la référence de la transaction (visible dans « Historique »).",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// 📞 APPEL NATIF VERS LE 555
// ═══════════════════════════════════════════════════════════
const openPhoneDialer = async () => {
  const phoneNumber = 'tel:555';
  try {
    const supported = await Linking.canOpenURL(phoneNumber);
    if (supported) {
      await Linking.openURL(phoneNumber);
    } else {
      // Fallback : certains émulateurs ne supportent pas le dialer
      Alert.alert(
        'Appel impossible',
        'Votre appareil ne peut pas passer d\'appel. Contactez le support au 555 ou par email : support@ntalbey.ne',
        [{ text: 'OK' }]
      );
    }
  } catch (e) {
    if (__DEV__) console.log('❌ [FAQ] Impossible d\'ouvrir le dialer :', e?.message);
    Alert.alert(
      'Appel impossible',
      'Impossible d\'ouvrir l\'application téléphone. Composez le 555 manuellement.',
      [{ text: 'OK' }]
    );
  }
};

// ═══════════════════════════════════════════════════════════
// 🏠 COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function FAQScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [faqData, setFaqData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ v3 : FUSION INTELLIGENTE API + LOCAL_FAQ
  useEffect(() => {
    const loadFaq = async () => {
      try {
        const data = await API.getFaq();
        const filteredApi = (data || []).filter(
          (cat) => !HIDDEN_CATEGORY_IDS.includes(cat.id)
        );

        // On commence par la FAQ locale
        const merged = LOCAL_FAQ.map((localCat) => {
          const apiCat = filteredApi.find((c) => c.id === localCat.id);
          if (!apiCat) return localCat; // L'API n'a pas cette catégorie, on garde la locale
          
          return {
            ...localCat,
            // On garde les questions de l'API + on ajoute celles de la locale qui manquent
            questions: [
              ...(apiCat.questions || []),
              ...localCat.questions.filter(
                (localQ) => !(apiCat.questions || []).some((apiQ) => apiQ.q === localQ.q)
              ),
            ],
          };
        });

        // On ajoute les catégories de l'API qui ne sont PAS dans la locale
        filteredApi.forEach((apiCat) => {
          if (!merged.some((m) => m.id === apiCat.id)) {
            merged.push(apiCat);
          }
        });

        setFaqData(merged);
      } catch (error) {
        console.warn('Erreur chargement FAQ:', error);
        if (__DEV__) {
          console.log('⚠️ [FAQ] API en erreur → utilisation de la FAQ locale enrichie');
        }
        // ✅ Fallback silencieux (pas d'Alert bloquant l'utilisateur)
        setFaqData(LOCAL_FAQ);
      } finally {
        setIsLoading(false);
      }
    };
    loadFaq();
  }, []);

  const toggleExpand = (categoryId, questionIndex) => {
    const key = `${categoryId}-${questionIndex}`;
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Ouvre le ChatbotScreen unifié (logique inchangée)
  const handleOpenChatbot = () => {
    navigation.navigate('Chatbot');
  };

  // Filtrage selon la recherche (logique inchangée)
  const filteredFaq = faqData
    .map((category) => ({
      ...category,
      questions: (category.questions || []).filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0);

  // ═══════════════ LOADING ═══════════════
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <IconBack />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('faq.title')}</Text>
            <Text style={styles.headerSubtitle}>Centre d'aide</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ═══════════ HEADER ═══════════ */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('faq.title')}</Text>
          <Text style={styles.headerSubtitle}>Centre d'aide</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
      >
        {/* ═══════════ ILLUSTRATION (hero premium) ═══════════ */}
        <View style={styles.heroContainer}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroEmoji}>❓</Text>
          </View>
          <Text style={styles.heroTitle}>{t('faq.illustration')}</Text>
          <Text style={styles.heroSubtitle}>{t('faq.subtitle')}</Text>
        </View>

        {/* ═══════════ RECHERCHE ═══════════ */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconWrap}>
            <IconSearch />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={t('faq.searchPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════ CATÉGORIES ET QUESTIONS ═══════════ */}
        {filteredFaq.map((category) => (
          <View key={category.id} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconWrap}>
                <Text style={styles.categoryIconText}>{category.icon}</Text>
              </View>
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
                    <View
                      style={[
                        styles.chevronContainer,
                        isExpanded && styles.chevronExpanded,
                      ]}
                    >
                      <IconChevronDown
                        color={isExpanded ? COLORS.primary : COLORS.textMuted}
                      />
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

        {/* ═══════════ CONTACT SUPPORT ═══════════ */}
        <View style={styles.supportCard}>
          <View style={styles.supportIconWrap}>
            <Text style={styles.supportIcon}>💬</Text>
          </View>
          <Text style={styles.supportTitle}>{t('faq.notFound')}</Text>
          <Text style={styles.supportText}>{t('faq.contactUs')}</Text>
          <View style={styles.supportButtons}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleOpenChatbot}
              activeOpacity={0.85}
            >
              <Text style={styles.supportButtonText}>
                🤖 {t('chatbot.title')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.supportButton, styles.supportButtonSecondary]}
              onPress={openPhoneDialer}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Appeler le support au 555"
            >
              <Text
                style={[
                  styles.supportButtonText,
                  styles.supportButtonSecondaryText,
                ]}
              >
                📞 555
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM — HARMONISÉS
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 30 },

  // ═══════════════ HEADER ═══════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  // ═══════════════ LOADING ═══════════════
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // ═══════════════ HERO ═══════════════
  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 24,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ═══════════════ RECHERCHE ═══════════════
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
    height: 52,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  // ═══════════════ CATÉGORIE ═══════════════
  categoryContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    marginBottom: 8,
    gap: 10,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
  },
  categoryIconText: { fontSize: 18 },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },

  // ═══════════════ QUESTIONS ═══════════════
  questionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    paddingRight: 12,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: COLORS.primarySoft,
  },
  answerContainer: {
    paddingBottom: 14,
    paddingTop: 0,
    paddingLeft: 2,
  },
  answerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ═══════════════ SUPPORT CARD ═══════════════
  supportCard: {
    backgroundColor: COLORS.primarySoft,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
    alignItems: 'center',
  },
  supportIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  supportIcon: { fontSize: 26 },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  supportButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  supportButtonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}40`,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  supportButtonSecondaryText: {
    color: COLORS.primary,
  },
});