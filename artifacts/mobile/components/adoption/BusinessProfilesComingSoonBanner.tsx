import React from "react";
import { Image, StyleSheet, View } from "react-native";

const BANNER = require("@/assets/images/business-profiles-banner.png");

const BusinessProfilesComingSoonBanner = React.memo(() => (
  <View style={s.root}>
    <Image
      source={BANNER}
      style={s.image}
      resizeMode="contain"
      accessibilityLabel="Veteriner & Petshop İşletme Profilleri - Çok Yakında"
    />
  </View>
));

BusinessProfilesComingSoonBanner.displayName = "BusinessProfilesComingSoonBanner";
export default BusinessProfilesComingSoonBanner;

const s = StyleSheet.create({
  root: {
    width:     "100%",
    maxWidth:  720,
    alignSelf: "stretch",
  },
  image: {
    width:       "100%",
    aspectRatio: 2.35,
  },
});
