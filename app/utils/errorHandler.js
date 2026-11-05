// utils/errorHandler.js
// 🛡️ Bouclier global d'erreurs & traducteur d'erreurs techniques en messages simples et clairs
import { LogBox } from 'react-native';

/**
 * Transforme n'importe quelle erreur technique (réseau, serveur, JSON, validation, etc.)
 * en un message simple, rassurant et compréhensible par tout le monde.
 */
export function humanizeError(rawError, fallback = 'Une opération n\'a pas pu aboutir. Veuillez réessayer.') {
  if (!rawError) return fallback;

  const raw =
    typeof rawError === 'string'
      ? rawError
      : typeof rawError?.message === 'string'
      ? rawError.message
      : String(rawError);

  const msg = raw.trim();
  if (!msg) return fallback;

  const lower = msg.toLowerCase();

  // 1. Erreurs de connexion Internet / Réseau / Timeout
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('internet') ||
    lower.includes('offline') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('socket')
  ) {
    return 'Connexion Internet instable. Vérifiez votre connexion et réessayez.';
  }

  if (
    lower.includes('aborted') ||
    lower.includes('aborterror') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('trop de temps')
  ) {
    return 'Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.';
  }

  // 2. Erreurs techniques JavaScript / JSON / Expo (jamais de jargon technique à l'écran)
  if (
    lower.includes('typeerror') ||
    lower.includes('referenceerror') ||
    lower.includes('syntaxerror') ||
    lower.includes('json parse') ||
    lower.includes('unexpected token') ||
    lower.includes('undefined is not') ||
    lower.includes('cannot read prop') ||
    lower.includes('null is not an object') ||
    lower.includes('presentcontactpickerasync') ||
    lower.includes('unavailabilityerror') ||
    lower.includes('native module') ||
    lower.includes('invariant violation')
  ) {
    return 'Une petite erreur technique est survenue. Veuillez réessayer.';
  }

  // 3. Erreurs HTTP ou validation serveur brute (Pydantic / FastAPI / SQL)
  if (
    lower.includes('information invalide :') ||
    lower.includes('value_error') ||
    lower.includes('type_error') ||
    lower.includes('string does not match') ||
    lower.includes('field required') ||
    lower.includes('ensure this value') ||
    lower.includes('validation error') ||
    lower.startsWith('{') ||
    lower.startsWith('[')
  ) {
    return 'Certaines informations saisies sont incorrectes. Veuillez vérifier les champs.';
  }

  if (lower.includes('http 500') || lower.includes('http 502') || lower.includes('http 503') || lower.includes('internal server error')) {
    return 'Le service NT Albey est momentanément indisponible. Réessayez dans quelques instants.';
  }

  if (lower.includes('http 401') || lower.includes('unauthorized') || lower.includes('invalid credentials')) {
    return 'Numéro de téléphone ou mot de passe incorrect.';
  }

  if (lower.includes('http 403') || lower.includes('forbidden')) {
    return 'Vous n\'avez pas accès à cette opération.';
  }

  if (lower.includes('http 404') || lower.includes('not found')) {
    return 'Compte ou information introuvable sur NT Albey.';
  }

  if (lower.includes('http 429') || lower.includes('too many requests')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
  }

  if (lower.includes('insufficient') || lower.includes('solde insuffisant')) {
    return 'Votre solde est insuffisant pour effectuer cette opération.';
  }

  return msg;
}

/**
 * Désactive les bannières et écrans rouges techniques d'Expo Go (LogBox / RedBox)
 * pour garder une expérience 100 % propre et premium.
 */
export function installGlobalErrorShield() {
  try {
    LogBox.ignoreAllLogs(true);
  } catch (_) {}

  // Empêche console.error de déclencher l'écran rouge d'Expo Go en mode développement
  if (!global.__ntalbeyConsoleShieldInstalled) {
    global.__ntalbeyConsoleShieldInstalled = true;
    const originalWarn = console.warn;
    console.error = (...args) => {
      try {
        const first = args[0] ? String(args[0]) : '';
        // Ignore les avertissements internes React / Expo bruyants
        if (
          first.includes('Warning:') ||
          first.includes('Non-serializable') ||
          first.includes('VirtualizedLists')
        ) {
          return;
        }
        originalWarn('ℹ️ [NT Albey Log]:', ...args);
      } catch (_) {}
    };
  }
}
