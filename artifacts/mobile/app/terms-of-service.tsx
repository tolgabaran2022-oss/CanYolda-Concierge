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
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";

const CONTACT = "destek@canyoldasi.app";

export default function TermsOfServiceScreen() {
  const { t }   = useTranslation();
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
          accessibilityLabel={t("terms.back")}
          accessibilityRole="button"
        >
          <Icon name="chevron-back" size={22} color={T.purple} />
        </Pressable>
        <Text style={[S.title, { color: T.text }]}>{t("terms.title")}</Text>
        <View style={S.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[S.updated, { color: T.textFaint }]}>
          {t("terms.lastUpdated", { date: t("terms.lastUpdatedDate") })}
        </Text>

        <Section title={t("terms.s1Title")} T={T}>
          {t("terms.s1Body")}
        </Section>

        <Section title={t("terms.s2Title")} T={T}>
          {t("terms.s2Body")}
        </Section>

        <Section title={t("terms.s3Title")} T={T}>
          {t("terms.s3Body")}
        </Section>

        <Section title={t("terms.s4Title")} T={T}>
          {t("terms.s4Body")}
        </Section>

        <Section title={t("terms.s5Title")} T={T}>
          {t("terms.s5Body")}
        </Section>

        <Section title={t("terms.s6Title")} T={T}>
          {t("terms.s6Body")}
        </Section>

        <Section title={t("terms.s7Title")} T={T}>
          {t("terms.s7Body")}
        </Section>

        <Section title={t("terms.s8Title")} T={T}>
          {t("terms.s8Body")}
        </Section>

        <Section title={t("terms.s9Title")} T={T}>
          {t("terms.s9Body")}
        </Section>

        <Section title={t("terms.s10Title")} T={T}>
          {t("terms.s10Body")}
        </Section>

        <Section title={t("terms.s11Title")} T={T}>
          {t("terms.s11Body", { contact: CONTACT })}
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
