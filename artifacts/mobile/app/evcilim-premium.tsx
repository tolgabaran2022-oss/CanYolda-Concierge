import { Icon } from "@/components/Icon";
import { usePetPremium } from "@/contexts/PetPremiumContext";
import { fetchPetPremiumOfferings, purchasePetPremium, restorePurchases } from "@/services/revenueCat";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

const PURPLE = "#7C45D9";
const features = [
  ["paw", "Sınırsız evcil hayvan"],
  ["notifications-outline", "Sınırsız akıllı hatırlatıcı"],
  ["medical-outline", "İlaç ve doz takibi"],
  ["document-text-outline", "Belge kasası ve sağlık raporu"],
  ["people-outline", "Aile ve bakıcı paylaşımı"],
] as const;

export default function EvcilimPremiumScreen() {
  const router = useRouter();
  const { refresh } = usePetPremium();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(Platform.OS !== "web");
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetchPetPremiumOfferings()
      .then((items) => {
        setPackages(items);
        const annual = items.find((p) => /annual|year/i.test(p.identifier));
        setSelected(annual ?? items[0] ?? null);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  async function buy() {
    if (!selected || buying) return;
    setBuying(true);
    try {
      await purchasePetPremium(selected);
      await refresh(true);
      Alert.alert("Evcilim Premium Aktif", "Premium özelliklerin kullanıma açıldı.", [{ text: "Devam Et", onPress: () => router.back() }]);
    } catch (error: unknown) {
      const e = error as { userCancelled?: boolean };
      if (!e?.userCancelled) Alert.alert("Satın Alma Tamamlanamadı", "Lütfen tekrar deneyin.");
    } finally { setBuying(false); }
  }

  async function restore() {
    try {
      await restorePurchases();
      await refresh(true);
      Alert.alert("Kontrol Tamamlandı", "Satın alımların güncellendi.");
    } catch { Alert.alert("Geri Yüklenemedi", "Lütfen daha sonra tekrar deneyin."); }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.content}>
        <Pressable onPress={() => router.back()} style={s.close} accessibilityLabel="Kapat"><Icon name="close" size={22} color="#4E3B66" /></Pressable>
        <LinearGradient colors={["#9B6EE8", PURPLE]} style={s.hero}>
          <Icon name="diamond-outline" size={36} color="#FFF" />
          <Text style={s.heroTitle}>Evcilim Premium</Text>
          <Text style={s.heroSub}>Dostunun bakımını eksiksiz ve birlikte yönet.</Text>
        </LinearGradient>

        <View style={s.features}>
          {features.map(([icon, label]) => <View key={label} style={s.feature}><View style={s.icon}><Icon name={icon} size={19} color={PURPLE} /></View><Text style={s.featureText}>{label}</Text><Icon name="checkmark-circle" size={20} color="#42B96B" /></View>)}
        </View>

        <Text style={s.sectionTitle}>Paketini Seç</Text>
        {Platform.OS === "web" ? (
          <View style={s.notice}><Text style={s.noticeText}>Premium satın alma işlemi iOS veya Android uygulamasından yapılabilir.</Text></View>
        ) : loading ? <ActivityIndicator color={PURPLE} /> : packages.length === 0 ? (
          <View style={s.notice}><Text style={s.noticeText}>Paketler şu anda yüklenemiyor.</Text></View>
        ) : packages.map((pkg) => {
          const active = selected?.identifier === pkg.identifier;
          return <Pressable key={pkg.identifier} onPress={() => setSelected(pkg)} style={[s.package, active && s.packageActive]}>
            <View style={[s.radio, active && s.radioActive]}>{active && <Icon name="checkmark" size={14} color="#FFF" />}</View>
            <View style={{ flex: 1 }}><Text style={s.packageName}>{pkg.product.title || pkg.identifier}</Text><Text style={s.packageSub}>{pkg.product.description || "Evcilim Premium erişimi"}</Text></View>
            <Text style={s.price}>{pkg.product.priceString}</Text>
          </Pressable>;
        })}

        <Pressable disabled={!selected || buying || Platform.OS === "web"} onPress={buy} style={[s.buy, (!selected || buying || Platform.OS === "web") && { opacity: .45 }]}>
          <LinearGradient colors={["#9B55ED", PURPLE]} style={s.buyInner}>{buying ? <ActivityIndicator color="#FFF" /> : <Text style={s.buyText}>Premium’a Geç</Text>}</LinearGradient>
        </Pressable>
        {Platform.OS !== "web" && <Pressable onPress={restore}><Text style={s.restore}>Satın Alımları Geri Yükle</Text></Pressable>}
        <Text style={s.foot}>Premium sona erdiğinde mevcut kayıtların silinmez. Aboneliğini mağaza hesabından yönetebilirsin.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F7F3FD"},content:{padding:20,paddingBottom:36},close:{width:42,height:42,borderRadius:21,backgroundColor:"#FFF",alignItems:"center",justifyContent:"center",alignSelf:"flex-end",marginBottom:8},
  hero:{borderRadius:28,padding:26,alignItems:"center",gap:8},heroTitle:{fontSize:27,fontFamily:"Inter_700Bold",color:"#FFF"},heroSub:{fontSize:14,fontFamily:"Inter_400Regular",color:"rgba(255,255,255,.86)",textAlign:"center"},
  features:{backgroundColor:"#FFF",borderRadius:24,padding:14,marginTop:16},feature:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:10},icon:{width:38,height:38,borderRadius:19,backgroundColor:"#F3ECFF",alignItems:"center",justifyContent:"center"},featureText:{flex:1,fontSize:14,fontFamily:"Inter_600SemiBold",color:"#211733"},
  sectionTitle:{fontSize:18,fontFamily:"Inter_700Bold",color:"#211733",marginTop:22,marginBottom:10},package:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#FFF",borderRadius:18,borderWidth:1,borderColor:"#E8DEF4",padding:15,marginBottom:10},packageActive:{borderColor:PURPLE,backgroundColor:"#F7F0FF"},radio:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:"#CBBBE3",alignItems:"center",justifyContent:"center"},radioActive:{backgroundColor:PURPLE,borderColor:PURPLE},packageName:{fontSize:15,fontFamily:"Inter_700Bold",color:"#211733"},packageSub:{fontSize:12,fontFamily:"Inter_400Regular",color:"#8C8699",marginTop:3},price:{fontSize:16,fontFamily:"Inter_700Bold",color:"#211733"},
  notice:{backgroundColor:"#FFF",borderRadius:18,padding:18},noticeText:{fontSize:13,fontFamily:"Inter_400Regular",color:"#71677E",textAlign:"center"},buy:{borderRadius:18,overflow:"hidden",marginTop:10},buyInner:{height:56,alignItems:"center",justifyContent:"center"},buyText:{fontSize:16,fontFamily:"Inter_700Bold",color:"#FFF"},restore:{textAlign:"center",fontSize:13,fontFamily:"Inter_600SemiBold",color:PURPLE,marginTop:18},foot:{fontSize:11,fontFamily:"Inter_400Regular",color:"#9992A4",textAlign:"center",lineHeight:17,marginTop:16},
});
