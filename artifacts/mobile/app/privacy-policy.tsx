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

export default function PrivacyPolicyScreen() {
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
          accessibilityLabel={t("privacy.back")}
          accessibilityRole="button"
        >
          <Icon name="chevron-back" size={22} color={T.purple} />
        </Pressable>
        <Text style={[S.title, { color: T.text }]}>{t("privacy.title")}</Text>
        <View style={S.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[S.updated, { color: T.textFaint }]}>
          {t("privacy.lastUpdated", { date: t("privacy.lastUpdatedDate") })}
        </Text>

        <Section title={t("privacy.s1Title")} T={T}>
          {t("privacy.s1Body")}
        </Section>

        <Section title={t("privacy.s2Title")} T={T}>
          <Bold>{t("privacy.s2_1")}{"\n"}</Bold>
          {t("privacy.s2_1Body")}{"\n\n"}
          <Bold>{t("privacy.s2_2")}{"\n"}</Bold>
          {t("privacy.s2_2Body")}{"\n\n"}
          <Bold>{t("privacy.s2_3")}{"\n"}</Bold>
          {t("privacy.s2_3Body")}{"\n\n"}
          <Bold>{t("privacy.s2_4")}{"\n"}</Bold>
          {t("privacy.s2_4Body")}{"\n\n"}
          <Bold>{t("privacy.s2_5")}{"\n"}</Bold>
          {t("privacy.s2_5Body")}
        </Section>

        <Section title={t("privacy.s3Title")} T={T}>
          {t("privacy.s3Body")}
        </Section>

        <Section title={t("privacy.s4Title")} T={T}>
          {t("privacy.s4Body")}
        </Section>

        <Section title={t("privacy.s5Title")} T={T}>
          {t("privacy.s5Body")}
        </Section>

        <Section title={t("privacy.s6Title")} T={T}>
          {t("privacy.s6Body")}
        </Section>

        <Section title={t("privacy.s7Title")} T={T}>
          {t("privacy.s7Body", { contact: CONTACT })}
        </Section>

        <Section title={t("privacy.s8Title")} T={T}>
          {t("privacy.s8Body")}
        </Section>

        <Section title={t("privacy.s9Title")} T={T}>
          {t("privacy.s9Body")}
        </Section>

        <Section title={t("privacy.s10Title")} T={T}>
          {t("privacy.s10Body")}
        </Section>

        <Section title={t("privacy.s11Title")} T={T}>
          {t("privacy.s11Body", { contact: CONTACT })}
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
