import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { apiSendAssistantMessage } from "@/lib/petManagementApi";
import { usePetPremium } from "@/contexts/PetPremiumContext";

type Message = { id: string; role: "user" | "assistant"; content: string };

function mkId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function redirectToPremiumModal(router: ReturnType<typeof useRouter>, petId: string, feature: string) {
  router.replace({
    pathname: "/pets",
    params: {
      openPremium: "true",
      premiumSource: feature,
      premiumReturnTo: encodeURIComponent(`/evcilim/${petId}/${feature}`),
    },
  } as Parameters<typeof router.replace>[0]);
}

export default function AssistantScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t } = useTranslation();
  const C = useColors();
  const router = useRouter();
  const { isPremium, isLoading: premiumLoading } = usePetPremium();
  const gateChecked = useRef(false);

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const suggestions = [
    t("pets.assistant.suggestions.s1"),
    t("pets.assistant.suggestions.s2"),
    t("pets.assistant.suggestions.s3"),
    t("pets.assistant.suggestions.s4"),
  ];

  useEffect(() => {
    setMessages([{
      id: mkId(), role: "assistant",
      content: t("pets.assistant.welcomeMsg"),
    }]);
  }, []);

  useEffect(() => {
    if (premiumLoading || gateChecked.current) return;
    gateChecked.current = true;
    if (!isPremium && petId) redirectToPremiumModal(router, petId, "assistant");
  }, [premiumLoading, isPremium, petId, router]);

  const sendMessage = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || !petId || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: mkId(), role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const result = await apiSendAssistantMessage(petId, msg);
      if (result.unavailable) {
        setUnavailable(true);
        setMessages(prev => [...prev, { id: mkId(), role: "assistant", content: t("pets.assistant.unavailableMsg") }]);
      } else {
        setMessages(prev => [...prev, { id: mkId(), role: "assistant", content: result.reply }]);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg === "premium_required") {
        if (petId) redirectToPremiumModal(router, petId, "assistant");
        return;
      }
      setMessages(prev => [...prev, { id: mkId(), role: "assistant", content: t("pets.assistant.errorMsg") }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [petId, sending, router, t]);

  const S = makeStyles(C);

  return (
    <SafeAreaView style={S.flex} edges={["bottom"]}>
      <Stack.Screen options={{
        title: t("pets.assistant.title"),
        headerBackTitle: t("pets.assistant.backTitle"),
        headerRight: () => (
          <View style={S.premiumPill}>
            <Icon name="diamond-outline" size={12} color={C.purple} />
            <Text style={S.premiumPillTxt}>{t("pets.assistant.premium")}</Text>
          </View>
        ),
      }} />

      <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={S.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(m => (
            <View key={m.id} style={[S.bubble, m.role === "user" ? S.bubbleUser : S.bubbleAI]}>
              {m.role === "assistant" && (
                <View style={S.aiAvatar}>
                  <Icon name="sparkles-outline" size={14} color="#fff" />
                </View>
              )}
              <View style={[S.bubbleBody, m.role === "user" ? S.bubbleBodyUser : S.bubbleBodyAI]}>
                <Text style={m.role === "user" ? S.bubbleTxtUser : S.bubbleTxtAI}>{m.content}</Text>
              </View>
            </View>
          ))}
          {sending && (
            <View style={[S.bubble, S.bubbleAI]}>
              <View style={S.aiAvatar}><Icon name="sparkles-outline" size={14} color="#fff" /></View>
              <View style={[S.bubbleBody, S.bubbleBodyAI, S.typingBubble]}>
                <ActivityIndicator size="small" color={C.textMuted} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions (only if fresh) */}
        {messages.length <= 1 && !sending && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.suggRow}>
            {suggestions.map((s) => (
              <Pressable key={s} style={S.suggChip} onPress={() => sendMessage(s)}>
                <Text style={S.suggTxt}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={S.inputRow}>
          <TextInput
            style={S.textInput}
            placeholder={unavailable ? t("pets.assistant.unavailablePlaceholder") : t("pets.assistant.inputPlaceholder")}
            placeholderTextColor={C.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            editable={!unavailable}
          />
          <Pressable
            style={[S.sendBtn, (!input.trim() || sending || unavailable) && S.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || sending || unavailable}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name="send-outline" size={18} color="#fff" />
            }
          </Pressable>
        </View>

        <Text style={S.disclaimer}>{t("pets.assistant.disclaimer")}</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex:           { flex: 1, backgroundColor: C.bg },
    premiumPill:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${C.purple}12`, borderRadius: 50 },
    premiumPillTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.purple },
    msgList:        { padding: 16, paddingBottom: 8, gap: 12 },
    bubble:         { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    bubbleUser:     { justifyContent: "flex-end" },
    bubbleAI:       { justifyContent: "flex-start" },
    aiAvatar:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.purple, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 },
    bubbleBody:     { maxWidth: "80%", borderRadius: 18, padding: 12 },
    bubbleBodyUser: { backgroundColor: C.purple, borderBottomRightRadius: 4 },
    bubbleBodyAI:   { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
    bubbleTxtUser:  { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 20 },
    bubbleTxtAI:    { fontSize: 14, fontFamily: "Inter_400Regular", color: C.text, lineHeight: 20 },
    typingBubble:   { paddingVertical: 14, paddingHorizontal: 16 },
    suggRow:        { paddingHorizontal: 12, paddingBottom: 8, gap: 8, flexDirection: "row" },
    suggChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: `${C.purple}12`, borderWidth: 1, borderColor: `${C.purple}20` },
    suggTxt:        { fontSize: 13, fontFamily: "Inter_400Regular", color: C.purple },
    inputRow:       { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: C.border, backgroundColor: C.card },
    textInput:      { flex: 1, minHeight: 42, maxHeight: 100, backgroundColor: C.bg, borderRadius: 21, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: C.text },
    sendBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },
    sendBtnDisabled:{ backgroundColor: C.border },
    disclaimer:     { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", paddingHorizontal: 20, paddingBottom: 10, paddingTop: 4, backgroundColor: C.card },
  });
}
