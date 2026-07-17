import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";

const LAST_UPDATED = "17 Temmuz 2026";
const APP_NAME     = "CanYoldaşı";
const CONTACT      = "destek@canyoldasi.app";

export default function PrivacyPolicyScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const T       = useTheme();
  const { width } = useWindowDimensions();
  const topPad  = Platform.OS === "web" ? (width < 1024 ? 54 : 16) : insets.top;

  return (
    <View style={[S.root, { backgroundColor: T.bg }]}>
      <View style={[S.header, { paddingTop: topPad + 8, backgroundColor: T.card, borderBottomColor: T.border }]}>
        <Pressable
          style={({ pressed }) => [S.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Icon name="chevron-back" size={22} color={T.purple} />
        </Pressable>
        <Text style={[S.title, { color: T.text }]}>Gizlilik Politikası</Text>
        <View style={S.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[S.updated, { color: T.textFaint }]}>Son güncelleme: {LAST_UPDATED}</Text>

        <Section title="1. Genel Bakış" T={T}>
          {APP_NAME} ("uygulama", "biz"), Türkiye'deki sokak hayvanlarını raporlamak, takip etmek ve sahiplendirme ilanlarını yönetmek için topluluk odaklı bir mobil uygulamadır. Bu Gizlilik Politikası, uygulama aracılığıyla toplanan, kullanılan ve paylaşılan kişisel verilerin nasıl işlendiğini açıklamaktadır.
        </Section>

        <Section title="2. Toplanan Veriler" T={T}>
          <Bold>2.1 Hesap Bilgileri{"\n"}</Bold>
          Kayıt sırasında ad, e-posta adresi ve telefon numarası toplanır. Şifreler bcrypt ile hashlenerek saklanır; düz metin olarak hiçbir zaman saklanmaz veya iletilmez.{"\n\n"}
          <Bold>2.2 Konum Bilgisi{"\n"}</Bold>
          Sokak hayvanı raporlanırken veya ilan oluşturulurken kullanıcının onayıyla konum bilgisi (enlem/boylam) alınır. Arka planda konum takibi yapılmaz.{"\n\n"}
          <Bold>2.3 Fotoğraflar{"\n"}</Bold>
          Hayvan raporları ve ilanlar için yüklenen fotoğraflar sunucumuzda saklanır. Fotoğraflar yalnızca uygulama içi amaçlarla kullanılır.{"\n\n"}
          <Bold>2.4 Mesajlar{"\n"}</Bold>
          Kullanıcılar arasındaki mesajlar şifreli bağlantı (HTTPS/TLS) üzerinden iletilir ve veritabanında saklanır. Mesajlar yalnızca ilgili konuşma katılımcıları tarafından okunabilir.{"\n\n"}
          <Bold>2.5 Uygulama İçi Satın Alımlar{"\n"}</Bold>
          Ödeme işlemleri Apple App Store veya Google Play Store tarafından gerçekleştirilir. Kredi kartı veya ödeme bilgileri {APP_NAME} sunucularında saklanmaz. Satın alım doğrulama RevenueCat üzerinden yapılır.
        </Section>

        <Section title="3. Verilerin Kullanımı" T={T}>
          Toplanan veriler şu amaçlarla kullanılır:{"\n"}
          {"• "}Hesap oluşturma ve kimlik doğrulama{"\n"}
          {"• "}Sokak hayvanı raporları ve sahiplendirme ilanlarının yönetimi{"\n"}
          {"• "}Kullanıcılar arasında mesajlaşma{"\n"}
          {"• "}Uygulama içi satın alım doğrulama{"\n"}
          {"• "}Hizmet kalitesinin iyileştirilmesi{"\n"}
          {"• "}Yasal yükümlülüklerin yerine getirilmesi
        </Section>

        <Section title="4. Veri Paylaşımı" T={T}>
          Kişisel verileriniz üçüncü taraflarla satılmaz veya kiralanmaz.{"\n\n"}
          Veriler yalnızca şu durumlarda paylaşılabilir:{"\n"}
          {"• "}Hizmet sağlayıcılar (RevenueCat — satın alım doğrulama){"\n"}
          {"• "}Yasal zorunluluklar (mahkeme kararı, yetkili makam talebi){"\n"}
          {"• "}Acil durumlarda can güvenliğini korumak için
        </Section>

        <Section title="5. Veri Güvenliği" T={T}>
          {"• "}Tüm iletişim HTTPS/TLS ile şifrelenir{"\n"}
          {"• "}Şifreler bcrypt ile hashlenerek saklanır{"\n"}
          {"• "}JWT token'ları kısa ömürlüdür (30 gün){"\n"}
          {"• "}Şifre sıfırlama kodları SHA-256 ile hashlenerek saklanır ve 10 dakika sonra geçersizleşir
        </Section>

        <Section title="6. Veri Saklama Süresi" T={T}>
          {"• "}Hesap verileri: Hesap silinene kadar{"\n"}
          {"• "}Hayvan raporları: Anonimleştirilerek süresiz (topluluk verisi){"\n"}
          {"• "}Sahiplendirme ilanları: Anonimleştirilerek süresiz{"\n"}
          {"• "}Mesajlar: Hesap silindiğinde erişim kesilir{"\n"}
          {"• "}Şifre sıfırlama tokenleri: Kullanıldıktan veya 10 dakika sonra
        </Section>

        <Section title="7. Kullanıcı Hakları" T={T}>
          KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında şu haklara sahipsiniz:{"\n"}
          {"• "}Verilerinize erişim ve kopyasını talep etme{"\n"}
          {"• "}Yanlış verilerin düzeltilmesini talep etme{"\n"}
          {"• "}Hesabınızı ve tüm kişisel verilerinizi silme (Hesap {">"} Tehlikeli Alan {">"} Hesabı Sil){"\n"}
          {"• "}Veri işlemeye itiraz etme{"\n\n"}
          Talepleriniz için: {CONTACT}
        </Section>

        <Section title="8. Çocukların Gizliliği" T={T}>
          Bu uygulama 13 yaşın altındaki çocuklara yönelik değildir. 13 yaş altı kullanıcıların kişisel verilerini kasıtlı olarak toplamayız.
        </Section>

        <Section title="9. Çerezler ve Takip" T={T}>
          Mobil uygulama çerez kullanmaz. Web sürümünde oturum yönetimi için AsyncStorage kullanılır. Reklam takibi veya üçüncü taraf analitik aracı kullanılmamaktadır.
        </Section>

        <Section title="10. Politika Değişiklikleri" T={T}>
          Bu politika güncellendiğinde uygulama içinde bildirim yapılır. Değişiklikler yayınlandıktan sonra uygulamayı kullanmaya devam etmeniz değişiklikleri kabul ettiğiniz anlamına gelir.
        </Section>

        <Section title="11. İletişim" T={T}>
          Gizlilik politikamızla ilgili sorularınız için:{"\n"}
          E-posta: {CONTACT}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, T }: { title: string; children: React.ReactNode; T: ReturnType<typeof useTheme> }) {
  return (
    <View style={S.section}>
      <Text style={[S.sectionTitle, { color: T.purpleDark }]}>{title}</Text>
      <Text style={[S.body, { color: T.text }]}>{children}</Text>
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={S.bold}>{children}</Text>;
}

const S = StyleSheet.create({
  root:    { flex: 1 },
  header:  {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 4 },
  updated: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 8,
  },
  body:  { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bold:  { fontFamily: "Inter_600SemiBold" },
});
