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
    const targetName = recipientName || recipientPhone || 'abokin ciniki';

    switch (type) {
      case 'transfer_agency':
        return `Tabbatar da aikawa. Za ku tura kudin CFA ${haoussaAmount} don amsa a ofishin Niger Telecoms ga ${targetName}.`;
      case 'withdraw':
        return `Tabbatar da cire kudi. Za ku cire kudin CFA ${haoussaAmount} a ofishin Niger Telecoms.`;
      case 'transfer_p2p':
      default:
        return `Tabbatar da aikawa. Za ku tura kudin CFA ${haoussaAmount} ga ${targetName}.`;
    }
  }

  // Français
  const formattedAmount = numericVal.toLocaleString('fr-FR');
  switch (type) {
    case 'transfer_agency':
      return `Confirmation de transfert d'argent. Vous allez envoyer ${formattedAmount} Francs CFA pour retrait au guichet à ${nameOrPhone}.`;
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
