// components/ScamShieldBanner.js
// 🛑 BOUCLIER DE PRÉVENTION DES ARNAQUES & ANTI-PHISHING
//
// 🎯 OBJECTIF :
// Protéger les utilisateurs des arnaques téléphoniques courantes
// (faux agents Niger Telecoms, fausses loteries, usurpation d'urgence).

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

export default function ScamShieldBanner({ style }) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const cardBg = isDark ? 'rgba(234, 179, 8, 0.08)' : '#FEFCE8';
  const borderColor = isDark ? 'rgba(234, 179, 8, 0.25)' : '#FEF08A';
  const textColor = isDark ? '#FDE047' : '#854D0E';
  const subTextColor = isDark ? '#CBD5E1' : '#475569';

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }, style]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.iconWrap}>
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke={textColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 8v4M12 16h.01"
              stroke={textColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: textColor }]}>
            Rappel de sécurité officiel
          </Text>
          <Text style={[styles.summary, { color: subTextColor }]} numberOfLines={expanded ? undefined : 1}>
            Niger Telecoms ne vous demandera JAMAIS de code secret ni d'avance de frais.
          </Text>
        </View>

        <Text style={[styles.toggleChevron, { color: textColor }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={[styles.tipItem, { color: subTextColor }]}>
            • <Text style={styles.tipBold}>Fausse loterie :</Text> Méfiez-vous de quiconque vous annonce un gain nécessitant un transfert préalable.
          </Text>
          <Text style={[styles.tipItem, { color: subTextColor }]}>
            • <Text style={styles.tipBold}>Code PIN :</Text> Ne communiquez jamais votre code confidentiel, même à une personne affirmant être un agent.
          </Text>
          <Text style={[styles.tipItem, { color: subTextColor }]}>
            • <Text style={styles.tipBold}>Vérification :</Text> Assurez-vous de connaître personnellement le destinataire avant de confirmer.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  summary: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 15,
  },
  toggleChevron: {
    fontSize: 10,
    marginLeft: 8,
    opacity: 0.8,
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(234, 179, 8, 0.2)',
  },
  tipItem: {
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 4,
  },
  tipBold: {
    fontWeight: '700',
  },
});
