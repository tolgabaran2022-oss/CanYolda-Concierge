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

export default function TermsOfServiceScreen() {
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
        <Text style={[S.title, { color: T.text }]}>Kullanım Koşulları</Text>
        <View style={S.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[S.updated, { color: T.textFaint }]}>Son güncelleme: {LAST_UPDATED}</Text>

        <Section title="1. Kabul" T={T}>
          {APP_NAME} uygulamasını kullanarak bu Kullanım Koşullarını kabul etmiş olursunuz. Bu koşulları kabul etmiyorsanız uygulamayı kullanmayınız.
        </Section>

        <Section title="2. Hizmet Tanımı" T={T}>
          {APP_NAME}, Türkiye'deki sokak hayvanlarını raporlamak ve takip etmek, sahiplendirme ilanları oluşturmak ve yönetmek, hayvan sahipleri arasında iletişim kurmak amacıyla sağlanan topluluk odaklı bir platformdur.
        </Section>

        <Section title="3. Hesap Koşulları" T={T}>
          {"• "}En az 13 yaşında olmalısınız{"\n"}
          {"• "}Doğru ve güncel bilgiler sağlamalısınız{"\n"}
          {"• "}Hesabınızın güvenliğinden siz sorumlusunuzdur{"\n"}
          {"• "}Hesabınız bir başkasına devredilemez{"\n"}
          {"• "}Sahte veya yanıltıcı hesap oluşturmak yasaktır
        </Section>

        <Section title="4. Kabul Edilebilir Kullanım" T={T}>
          Aşağıdaki eylemler yasaktır:{"\n"}
          {"• "}Gerçek olmayan hayvan raporu oluşturma{"\n"}
          {"• "}Başka kullanıcılara taciz veya tehdit{"\n"}
          {"• "}Spam veya tekrarlı içerik paylaşımı{"\n"}
          {"• "}Başka kullanıcıların hesabına izinsiz erişim girişimi{"\n"}
          {"• "}Uygulamanın teknik altyapısına zarar verme girişimi{"\n"}
          {"• "}Otomatik araçlarla veri kazıma (scraping){"\n"}
          {"• "}Ticari reklam içerikleri (ilanlar hariç)
        </Section>

        <Section title="5. Kullanıcı Oluşturulan İçerik" T={T}>
          Yüklediğiniz içerikler (fotoğraflar, açıklamalar, mesajlar) için şunları beyan edersiniz:{"\n"}
          {"• "}İlgili içeriği paylaşma hakkına sahipsiniz{"\n"}
          {"• "}İçerik üçüncü tarafların haklarını ihlal etmemektedir{"\n"}
          {"• "}İçerik gerçek ve doğrudur{"\n\n"}
          İçeriğinizi {APP_NAME} platformunda görüntülemek için bize kısıtlı, ücretsiz bir lisans vermiş olursunuz. Bu lisans hesabınızı sildiğinizde sona erer.
        </Section>

        <Section title="6. Uygulama İçi Satın Alımlar" T={T}>
          Öne çıkarma (boost) paketleri Apple App Store veya Google Play Store üzerinden satın alınır. Satın alımlar ilgili mağazanın iade politikasına tabidir. Dijital ürünlerin iadesi mağazanın takdirindedir.
        </Section>

        <Section title="7. Hesap Silme" T={T}>
          Hesabınızı istediğiniz zaman Hesap {">"} Tehlikeli Alan {">"} Hesabı Sil bölümünden silebilirsiniz. Hesap silme işlemi kişisel verilerinizi kaldırır ve kamu katkılarınızı (hayvan raporları, ilanlar) anonimleştirir.
        </Section>

        <Section title="8. Sorumluluk Sınırlaması" T={T}>
          {APP_NAME}, kullanıcı tarafından oluşturulan içeriklerden sorumlu değildir. Uygulama "olduğu gibi" sağlanmaktadır. Hizmet kesintilerinden doğan zararlar için sorumluluk üstlenilmez.
        </Section>

        <Section title="9. Değişiklikler" T={T}>
          Bu koşullar değiştirildiğinde uygulama içinde bildirim yapılır. Değişiklikler yayınlandıktan sonra uygulamayı kullanmaya devam etmeniz değişiklikleri kabul ettiğiniz anlamına gelir.
        </Section>

        <Section title="10. Uygulanacak Hukuk" T={T}>
          Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir. Anlaşmazlıklar İstanbul mahkemelerinde çözüme kavuşturulacaktır.
        </Section>

        <Section title="11. İletişim" T={T}>
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
});
