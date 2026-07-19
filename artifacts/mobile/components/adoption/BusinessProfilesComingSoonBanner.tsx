import React from "react";
import { Image, StyleSheet, View } from "react-native";

const BANNER = require("@/assets/images/business-profiles-banner.png");

const BusinessProfilesComingSoonBanner = React.memo(() => (
  <View style={s.container}>
    <Image
      source={BANNER}
      style={s.image}
      resizeMode="cover"
      accessibilityLabel="Veteriner & Petshop İşletme Profilleri - Çok Yakında"
    />
  </View>
));

BusinessProfilesComingSoonBanner.displayName = "BusinessProfilesComingSoonBanner";
export default BusinessProfilesComingSoonBanner;

const s = StyleSheet.create({
  container: {
    width:           "100%",
    height:          170,
    borderRadius:    20,
    overflow:        "hidden",
    backgroundColor: "#F6F0FF",
  },
  image: {
    width:  "100%",
    height: "100%",
  },
});
