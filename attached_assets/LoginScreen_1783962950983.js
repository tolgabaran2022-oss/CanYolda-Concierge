// LoginScreen.js — canyoldaşı giriş ekranı
//
// Gerekli paketler:
//   npx expo install expo-linear-gradient
//   npx expo install @expo-google-fonts/quicksand expo-font
//
// hero.jpg dosyasını projenizde assets/ klasörüne koyun.

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';

const COLORS = {
  cream: '#FBF2EA',
  purple900: '#26215C',
  purple600: '#534AB7',
  purple500: '#6C5CE7',
  purple200: '#CECBF6',
  muted: '#8B8798',
  white: '#FFFFFF',
};

export default function LoginScreen({ navigation }) {
  const { height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />

      {/* Hero görseli */}
      <View style={[styles.heroWrap, { height: height * 0.58 }]}>
        <Image
          source={require('./assets/hero.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
          accessible
          accessibilityLabel="canyoldaşı — Dostların için her şey bir tık uzağında"
        />
        {/* Görselden krem zemine yumuşak geçiş */}
        <LinearGradient
          colors={['rgba(251,242,234,0)', COLORS.cream]}
          style={styles.heroFade}
          pointerEvents="none"
        />
      </View>

      {/* Buton alanı */}
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <Pressable
          onPress={() => navigation?.navigate?.('Login')}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[COLORS.purple500, COLORS.purple600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>Giriş yap</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => navigation?.navigate?.('Register')}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.btnSecondaryText}>Kayıt ol</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation?.navigate?.('ForgotPassword')}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text style={styles.forgot}>Şifremi unuttum?</Text>
        </Pressable>

        <Text style={styles.terms}>
          Devam ederek{' '}
          <Text style={styles.termsLink}>Kullanım Koşulları</Text> ve{' '}
          <Text style={styles.termsLink}>Gizlilik Politikası</Text>
          {"'nı kabul etmiş olursunuz."}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  heroWrap: {
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
    justifyContent: 'flex-start',
  },
  btn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    shadowColor: COLORS.purple600,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 16.5,
    fontFamily: 'Quicksand_700Bold',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.purple200,
    shadowColor: COLORS.purple900,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  btnSecondaryText: {
    color: COLORS.purple900,
    fontSize: 16.5,
    fontFamily: 'Quicksand_700Bold',
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  forgot: {
    textAlign: 'center',
    fontSize: 14.5,
    color: COLORS.purple600,
    fontFamily: 'Quicksand_600SemiBold',
    paddingVertical: 2,
  },
  terms: {
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 20,
    color: COLORS.muted,
    fontFamily: 'Quicksand_500Medium',
    paddingHorizontal: 6,
  },
  termsLink: {
    color: COLORS.purple600,
    fontFamily: 'Quicksand_700Bold',
  },
});
