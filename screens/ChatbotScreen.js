import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
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

// Icône envoyer
const IconSend = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Réponses du chatbot
const chatbotResponses = {
  'bonjour': 'Bonjour ! 👋 Comment puis-je vous aider aujourd\'hui ?',
  'salut': 'Salut ! 👋 Que puis-je faire pour vous ?',
  'hello': 'Hello ! 👋 How can I help you today ?',
  'transfert': 'Pour effectuer un transfert d\'argent :\n1. Allez dans "Envoyer"\n2. Choisissez un bénéficiaire\n3. Saisissez le montant\n4. Confirmez avec votre PIN',
  'envoyer': 'Pour envoyer de l\'argent, rendez-vous dans le menu "Envoyer" sur votre page d\'accueil.',
  'retrait': 'Pour retirer de l\'argent :\n1. Allez dans "Retrait"\n2. Choisissez votre méthode\n3. Saisissez le montant\n4. Confirmez avec votre PIN',
  'pin': 'Pour changer votre PIN :\n1. Allez dans "Profil"\n2. Cliquez sur "Sécurité"\n3. Choisissez "Changer mon PIN"\n4. Suivez les instructions',
  'mot de passe': 'Pour réinitialiser votre mot de passe, cliquez sur "Mot de passe oublié" sur l\'écran de connexion.',
  'compte': 'Vous pouvez gérer votre compte dans la section "Profil" de l\'application.',
  'facture': 'Pour payer une facture :\n1. Allez dans "Paiement"\n2. Choisissez la catégorie\n3. Saisissez les informations\n4. Confirmez avec votre PIN',
  'paiement': 'Pour effectuer un paiement, utilisez le menu "Paiement" sur votre page d\'accueil.',
  'carte': 'Pour gérer vos cartes virtuelles, rendez-vous dans "Visa & Cartes" depuis l\'accueil.',
  'visa': 'La section "Visa & Cartes" vous permet de créer des cartes virtuelles et de les recharger.',
  'gouv': 'Gouv-Pay vous permet de payer vos impôts et taxes en ligne depuis l\'application.',
  'boutique': 'La Boutique NT vous permet d\'acheter des forfaits, crédit téléphonique et services NT.',
  'merci': 'Avec plaisir ! 😊 N\'hésitez pas si vous avez d\'autres questions.',
  'thanks': 'You\'re welcome ! 😊 Feel free to ask if you have more questions.',
  'aide': 'Voici ce que je peux faire pour vous :\n• Répondre à vos questions sur l\'application\n• Vous guider sur les transferts et paiements\n• Vous aider avec votre compte\n• Vous orienter vers le support',
  'support': 'Vous pouvez contacter notre support :\n• Par téléphone : 555\n• Par email : support@ntalbey.ne\n• Dans l\'application : section "Profil" > "Support"',
  'default': 'Je n\'ai pas compris votre question. 😅\n\nVoici quelques sujets que je peux traiter :\n• Transfert d\'argent 💰\n• Paiement de factures 📄\n• Gestion du compte 👤\n• Carte Visa 💳\n• Gouv-Pay 🏛️\n• Boutique NT 🛍️\n\nOu tapez "aide" pour plus d\'options.'
};

// Messages du chatbot
const initialMessages = [
  {
    id: 1,
    text: 'Bonjour ! 👋 Je suis l\'assistant virtuel NT Albey.\nComment puis-je vous aider aujourd\'hui ?',
    isUser: false,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function ChatbotScreen({ navigation, onLogout }) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const getBotResponse = (text) => {
    const lowerText = text.toLowerCase().trim();
    
    // Vérifier si le message contient des mots-clés
    for (const [key, response] of Object.entries(chatbotResponses)) {
      if (lowerText.includes(key)) {
        return response;
      }
    }
    return chatbotResponses.default;
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    // Ajouter le message de l'utilisateur
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isUser: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simuler la réponse du bot après un délai
    setTimeout(() => {
      const botResponse = getBotResponse(inputText);
      const botMessage = {
        id: messages.length + 2,
        text: botResponse,
        isUser: false,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  // Suggestions rapides
  const quickSuggestions = [
    { label: '💰 Transfert', value: 'transfert' },
    { label: '📄 Facture', value: 'facture' },
    { label: '👤 Compte', value: 'compte' },
    { label: '💳 Carte', value: 'carte' },
    { label: '🆘 Aide', value: 'aide' },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Assistant NT Albey</Text>
            <Text style={styles.headerStatus}>En ligne</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* MESSAGES */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.isUser ? styles.messageWrapperUser : styles.messageWrapperBot,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.messageBubbleUser : styles.messageBubbleBot,
                ]}
              >
                {!message.isUser && (
                  <View style={styles.messageAvatar}>
                    <Text style={styles.messageAvatarText}>🤖</Text>
                  </View>
                )}
                <View style={styles.messageContent}>
                  <Text style={[
                    styles.messageText,
                    message.isUser ? styles.messageTextUser : styles.messageTextBot,
                  ]}>
                    {message.text}
                  </Text>
                  <Text style={styles.messageTime}>{message.time}</Text>
                </View>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>🤖</Text>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* SUGGESTIONS RAPIDES */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
          contentContainerStyle={styles.suggestionsContent}
        >
          {quickSuggestions.map((sug, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => {
                setInputText(sug.value);
                setTimeout(() => sendMessage(), 100);
              }}
            >
              <Text style={styles.suggestionText}>{sug.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* INPUT */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Écrivez votre message..."
            placeholderTextColor="#AAA"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <IconSend />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botAvatarText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerStatus: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageWrapperUser: {
    alignItems: 'flex-end',
  },
  messageWrapperBot: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageBubbleUser: {
    backgroundColor: '#008933',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleBot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  messageAvatarText: {
    fontSize: 16,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextBot: {
    color: '#1A1A1A',
  },
  messageTime: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  typingContainer: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingText: {
    fontSize: 18,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#008933',
  },
  typingDot1: {
    opacity: 0.3,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.9,
  },
  suggestionsContainer: {
    maxHeight: 50,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  suggestionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00893330',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#008933',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 80,
    color: '#1A1A1A',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});