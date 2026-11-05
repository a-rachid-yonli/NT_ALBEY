// utils/voiceAssistant.js
// 🎙️ Assistance Vocale en Langues Locales (Français & Haoussa)
//    - Synthèse vocale de confirmation pour toutes les sorties d'argent
//    - Convertisseur intelligent de nombres en Haoussa nigérien
//    - Support multi-plateforme (expo-audio & Web)
import { Platform } from 'react-native';

/**
 * Convertit un montant numérique en mots en langue Haoussa (Niger).
 * @param {number|string} num
 * @returns {string}
 */
export function numberToHaoussaWords(num) {
  const n = parseInt(String(num).replace(/\D/g, ''), 10);
  if (isNaN(n) || n <= 0) return 'sifili';

  const units = ['', 'daya', 'biyu', 'uku', 'hudu', 'biyar', 'shida', 'bakwai', 'takwas', 'tara'];
  const teens = [
    'goma', 'sha daya', 'sha biyu', 'sha uku', 'sha hudu',
    'sha biyar', 'sha shida', 'sha bakwai', 'sha takwas', 'sha tara',
  ];
  const tens = [
    '', 'goma', 'ashirin', 'talatin', 'arba\'in',
    'hamsin', 'sittin', 'saba\'in', 'tamanin', 'tasa\'in',
  ];

  function convertBelow1000(val) {
    if (val === 0) return '';
    let res = '';
    const h = Math.floor(val / 100);
    const rem = val % 100;

    if (h > 0) {
      res = h === 1 ? 'dari' : `dari ${units[h]}`;
    }

    if (rem > 0) {
      let remStr = '';
      if (rem < 10) {
        remStr = units[rem];
      } else if (rem < 20) {
        remStr = teens[rem - 10];
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        remStr = tens[t] + (u > 0 ? ` da ${units[u]}` : '');
      }
      res = res ? `${res} da ${remStr}` : remStr;
    }
    return res;
  }

  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    const rem = n % 1000000;
    const mStr = millions === 1 ? 'Miliyan daya' : `Miliyan ${convertBelow1000(millions)}`;
    return rem > 0 ? `${mStr} da ${numberToHaoussaWords(rem)}` : mStr;
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    let tStr = '';
    if (thousands === 1) tStr = 'Dubu daya';
    else if (thousands === 10) tStr = 'Dubu goma';
    else if (thousands === 100) tStr = 'Dubu dari';
    else tStr = `Dubu ${convertBelow1000(thousands)}`;

    return rem > 0 ? `${tStr} da ${convertBelow1000(rem)}` : tStr;
  }

  return convertBelow1000(n);
}

/**
 * Convertit un nombre à deux chiffres (0-99) en mots en français.
 * Idéal pour prononcer un numéro de téléphone par paires.
 */
export function twoDigitsToFrenchWords(pairStr) {
  const str = String(pairStr).trim();
  if (!str) return '';

  if (str.length === 2 && str.startsWith('0')) {
    const digitWords = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const second = parseInt(str[1], 10);
    return `zéro ${digitWords[second] || second}`;
  }

  const num = parseInt(str, 10);
  if (isNaN(num)) return str;

  const units = [
    'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'
  ];

  if (num < 20) return units[num];

  const tens = {
    20: 'vingt',
    30: 'trente',
    40: 'quarante',
    50: 'cinquante',
    60: 'soixante',
  };

  if (num >= 20 && num < 70) {
    const t = Math.floor(num / 10) * 10;
    const u = num % 10;
    if (u === 0) return tens[t];
    if (u === 1) return `${tens[t]}-et-un`;
    return `${tens[t]}-${units[u]}`;
  }

  if (num >= 70 && num < 80) {
    const rem = num - 60; // 10 to 19
    if (rem === 11) return 'soixante-et-onze';
    return `soixante-${twoDigitsToFrenchWords(String(rem))}`;
  }

  if (num >= 80 && num < 90) {
    const u = num % 10;
    if (u === 0) return 'quatre-vingts';
    return `quatre-vingt-${units[u]}`;
  }

  if (num >= 90 && num < 100) {
    const rem = num - 80; // 10 to 19
    return `quatre-vingt-${twoDigitsToFrenchWords(String(rem))}`;
  }

  return String(num);
}

/**
 * Convertit une paire de chiffres en mots en Haoussa.
 */
export function twoDigitsToHaoussaWords(pairStr) {
  const str = String(pairStr).trim();
  if (!str) return '';

  if (str.length === 2 && str.startsWith('0')) {
    const units = ['sifili', 'daya', 'biyu', 'uku', 'hudu', 'biyar', 'shida', 'bakwai', 'takwas', 'tara'];
    const second = parseInt(str[1], 10);
    return `sifili ${units[second] || second}`;
  }

  const num = parseInt(str, 10);
  if (isNaN(num)) return str;
  return numberToHaoussaWords(num);
}

/**
 * Formate un numéro de téléphone de 8 chiffres par paires de mots
 * Ex: 97816549 -> "quatre-vingt-dix-sept, quatre-vingt-un, soixante-cinq, quarante-neuf"
 */
export function formatPhoneByPairs(phone, lang = 'fr') {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11 && clean.startsWith('227')) {
    clean = clean.slice(3);
  } else if (clean.length > 8) {
    clean = clean.slice(-8);
  }

  if (clean.length !== 8) {
    return clean;
  }

  const pairs = [
    clean.slice(0, 2),
    clean.slice(2, 4),
    clean.slice(4, 6),
    clean.slice(6, 8),
  ];

  if (lang === 'ha') {
    return pairs.map(twoDigitsToHaoussaWords).join(', ');
  }
  return pairs.map(twoDigitsToFrenchWords).join(', ');
}

/**
 * Construit le message vocal de confirmation selon le type de sortie et la langue.
 */
export function buildVoiceConfirmationText({
  type = 'transfer_p2p',
  amount = 0,
  recipientName = '',
  recipientPhone = '',
  lang = 'fr',
}) {
  const numericVal = parseInt(String(amount).replace(/\D/g, ''), 10) || 0;
  const nameOrPhone = recipientName && !recipientName.startsWith('+227')
    ? recipientName
    : (recipientPhone ? `au numéro ${recipientPhone}` : 'au destinataire');

  if (lang === 'ha') {
    const haoussaAmount = numberToHaoussaWords(numericVal);
    const targetName = recipientName && !recipientName.startsWith('+227') ? recipientName : '';

    switch (type) {
      case 'shop_credit_self':
        return `Tabbatar da sayen katin waya. Za ku saka kudin CFA ${haoussaAmount} na katin waya a wayarku.`;
      case 'shop_credit_other': {
        const phonePairsHa = formatPhoneByPairs(recipientPhone, 'ha');
        return `Tabbatar da sayen katin waya. Za ku tura kudin CFA ${haoussaAmount} na katin waya ga lamba ${phonePairsHa || recipientPhone}.`;
      }
      case 'shop_softphone': {
        const phonePairsHa = formatPhoneByPairs(recipientPhone, 'ha');
        return `Tabbatar da caji. Za ku tura kudin CFA ${haoussaAmount} na Softphone ga lamba ${phonePairsHa || recipientPhone}.`;
      }
      case 'shop_stock':
        return `Tabbatar da sayen jari. Za ku sayi jarin katin waya na CFA ${haoussaAmount}.`;
      case 'shop_blr':
        return `Tabbatar da biyan kudin intanet na BLR. Za ku biya kudin CFA ${haoussaAmount} don lambar ${recipientPhone || 'BLR'}.`;
      case 'shop':
        return `Tabbatar da sayayya. Za ku biya kudin CFA ${haoussaAmount}.`;
      case 'transfer_agency': {
        const phonePairsHa = formatPhoneByPairs(recipientPhone, 'ha');
        const phonePart = phonePairsHa ? `lamba ${phonePairsHa}` : '';
        const who = targetName && phonePart
          ? `${targetName}, ${phonePart}`
          : (targetName || phonePart || 'abokin ciniki');
        return `Tabbatar da aikawa. Za ku tura kudin CFA ${haoussaAmount} don amsa a ofishin Niger Telecoms ga ${who}.`;
      }
      case 'withdraw':
        return `Tabbatar da cire kudi. Za ku cire kudin CFA ${haoussaAmount} a ofishin Niger Telecoms.`;
      case 'transfer_p2p':
      default:
        return `Tabbatar da aikawa. Za ku tura kudin CFA ${haoussaAmount} ga ${targetName || recipientPhone || 'abokin ciniki'}.`;
    }
  }

  // Français
  const formattedAmount = numericVal.toLocaleString('fr-FR');
  switch (type) {
    case 'shop_credit_self':
      return `Confirmation d'achat de crédit. Vous allez recharger ${formattedAmount} Francs CFA de crédit de communication sur votre ligne.`;
    case 'shop_credit_other': {
      const phonePairsFr = formatPhoneByPairs(recipientPhone, 'fr');
      return `Confirmation de recharge de crédit. Vous allez envoyer ${formattedAmount} Francs CFA de crédit au numéro ${phonePairsFr || recipientPhone}.`;
    }
    case 'shop_softphone': {
      const phonePairsFr = formatPhoneByPairs(recipientPhone, 'fr');
      return `Confirmation de recharge Softphone. Vous allez envoyer ${formattedAmount} Francs CFA au numéro ${phonePairsFr || recipientPhone}.`;
    }
    case 'shop_stock':
      return `Confirmation d'achat de stock. Vous allez acheter ${formattedAmount} Francs CFA de stock de crédit.`;
    case 'shop_blr':
      return `Confirmation de réabonnement BLR. Vous allez payer ${formattedAmount} Francs CFA pour l'abonnement numéro ${recipientPhone}.`;
    case 'shop':
      return `Confirmation d'achat. Vous allez payer ${formattedAmount} Francs CFA pour ${recipientName || 'votre commande'}.`;
    case 'transfer_agency': {
      const phonePairsFr = formatPhoneByPairs(recipientPhone, 'fr');
      const targetName = recipientName && !recipientName.startsWith('+227') ? recipientName : '';
      let targetPhrase = '';
      if (targetName && phonePairsFr) {
        targetPhrase = `à ${targetName}, au numéro ${phonePairsFr}`;
      } else if (phonePairsFr) {
        targetPhrase = `au numéro ${phonePairsFr}`;
      } else if (targetName) {
        targetPhrase = `à ${targetName}`;
      } else {
        targetPhrase = `au destinataire`;
      }
      return `Confirmation de transfert d'argent. Vous allez envoyer ${formattedAmount} Francs CFA pour retrait au guichet ${targetPhrase}.`;
    }
    case 'withdraw':
      return `Confirmation de retrait. Vous allez retirer ${formattedAmount} Francs CFA en espèces au guichet Niger Telecoms.`;
    case 'transfer_p2p':
    default:
      return `Confirmation d'envoi. Vous allez envoyer ${formattedAmount} Francs CFA à ${nameOrPhone}.`;
  }
}

let activePlayer = null;
let activeAudioElement = null;
let activeSubscription = null;
let activeTimer = null;

export const stopVoice = async () => {
  try {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
    if (activeSubscription && typeof activeSubscription.remove === 'function') {
      try { activeSubscription.remove(); } catch (_) {}
      activeSubscription = null;
    }
    if (activePlayer) {
      try {
        if (typeof activePlayer.pause === 'function') activePlayer.pause();
        if (typeof activePlayer.remove === 'function') activePlayer.remove();
      } catch (_) {}
      activePlayer = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    if (activeAudioElement) {
      try { activeAudioElement.pause(); } catch (_) {}
      activeAudioElement = null;
    }
  } catch (_) {}
};

/**
 * Joue le message vocal de confirmation.
 */
export const speakConfirmation = async ({
  text,
  lang = 'fr',
  onStart,
  onDone,
  onError,
}) => {
  await stopVoice();

  const cleanLang = lang === 'ha' ? 'ha' : 'fr';
  const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${cleanLang}&q=${encodeURIComponent(text)}`;

  // 1. Web
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const audio = new Audio(audioUrl);
      activeAudioElement = audio;
      if (onStart) onStart();
      audio.onplay = () => { if (onStart) onStart(); };
      audio.onended = () => {
        activeAudioElement = null;
        if (onDone) onDone();
      };
      audio.onerror = (e) => {
        activeAudioElement = null;
        if (onError) onError(e);
      };
      await audio.play();
      return;
    } catch (e) {
      if (onError) onError(e);
      return;
    }
  }

  // 2. React Native (Android / iOS)
  try {
    const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch (_) {}

    const player = createAudioPlayer({ uri: audioUrl });
    activePlayer = player;

    if (onStart) onStart();
    player.play();

    let startedPlaying = false;
    let finished = false;

    const finishPlayback = () => {
      if (!finished) {
        finished = true;
        if (activeTimer) {
          clearInterval(activeTimer);
          activeTimer = null;
        }
        if (activeSubscription && typeof activeSubscription.remove === 'function') {
          try { activeSubscription.remove(); } catch (_) {}
          activeSubscription = null;
        }
        activePlayer = null;
        if (onDone) onDone();
      }
    };

    if (typeof player.addListener === 'function') {
      activeSubscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!status) return;
        if (status.playbackState === 'playing') {
          startedPlaying = true;
        } else if (
          startedPlaying &&
          (status.playbackState === 'paused' ||
            status.playbackState === 'stopped' ||
            status.playbackState === 'ended' ||
            (status.duration > 0 && status.currentTime >= status.duration - 0.2))
        ) {
          finishPlayback();
        }
      });
    }

    // Polling de contrôle (ne coupe QUE si la lecture a bien commencé puis s'est arrêtée)
    activeTimer = setInterval(() => {
      try {
        if (!player) {
          finishPlayback();
          return;
        }
        if (player.playing) {
          startedPlaying = true;
        } else if (startedPlaying && !player.playing && !player.isBuffering) {
          finishPlayback();
        }
      } catch (_) {
        finishPlayback();
      }
    }, 500);

    // Timeout de sécurité max 14s
    setTimeout(() => {
      finishPlayback();
    }, 14000);
  } catch (err) {
    if (__DEV__) console.log('Erreur expo-audio:', err);
    if (onError) onError(err);
  }
};
