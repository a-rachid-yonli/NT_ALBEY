// index.js
// 🎯 Interception ciblée du warning DateTimePicker AVANT tout import lourd
//    → Le hoisting ES6 fait que LogBox.ignoreLogs placé dans App.js
//      s'exécute APRÈS que la lib ait émis le warning.
//    → On utilise require() pour charger App APRÈS avoir configuré le filtre.
//
//    Ce filtre ne touche QUE le warning cosmétique de DateTimePicker.
//    Tous les autres warnings et erreurs restent visibles.

// 1️⃣ Patch ciblé de console.warn (le plus fiable — bypass complet)
const _originalWarn = console.warn;
console.warn = (...args) => {
  const first = args[0];
  if (
    typeof first === 'string' &&
    first.includes('DateTimePicker') &&
    first.includes('deprecated')
  ) {
    return; // silencieux — warning purement cosmétique
  }
  _originalWarn.apply(console, args);
};

// 2️⃣ Ceinture + bretelles : LogBox.ignoreLogs avec regex (couvre d'autres formats)
try {
  const { LogBox } = require('react-native');
  LogBox.ignoreLogs([
    /DateTimePicker.*deprecated/i,
    /onChange.*is deprecated/i,
  ]);
} catch (_) {}

// 3️⃣ Chargement de App APRÈS configuration du filtre
const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);