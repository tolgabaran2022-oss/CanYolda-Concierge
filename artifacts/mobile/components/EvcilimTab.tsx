import { Icon } from "@/components/Icon";
import { EvcilimPremiumModal } from "@/app/evcilim-premium";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { usePets, type Pet } from "@/contexts/PetsContext";
import { usePetPremium } from "@/contexts/PetPremiumContext";
import {
  apiGetVaccinations,
  apiGetAppointments,
  apiGetNutrition,
  buildReminders,
  type ApiVaccination,
  type ApiAppointment,
  type ApiNutrition,
  type ApiReminder,
} from "@/lib/petManagementApi";
import {
  buildPetMeta,
  buildPetSubtitle,
} from "@/utils/petFormatters";

/* ── Design tokens ──────────────────────────────────────────────────────────── */
const C = {
  purple:      "#7C45D9",
  purpleDark:  "#5F319F",
  purpleLight: "#F7F3FD",
  purpleBorder:"#CDB8EF",
  text:        "#1D1733",
  textSec:     "#8C8699",
  card:        "#FFFFFF",
  border:      "#EDE7F3",
  bg:          "#F5F2FB",
  orange:      "#EFA547",
  orangeBg:    "#FFF7ED",
  green:       "#43B96C",
  greenBg:     "#EDFFF4",
  red:         "#E55D6F",
};

const SHADOW_SM = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  android: { elevation: 2 },
  default: {},
});
const SHADOW_MD = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 14 },
  android: { elevation: 4 },
  default: {},
});

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function formatReminderDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateStr; }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   1. EMPTY STATE (no pets)
══════════════════════════════════════════════════════════════════════════════ */
const HERO_IMAGE = require("../assets/images/hero-pets-animals.png");
const FEATURE_CARDS = [
  { icon: "vaccine",           label: "Aşı Takibi" },
  { icon: "calendar",          label: "Randevular" },
  { icon: "nutrition-outline", label: "Beslenme" },
  { icon: "clipboard-outline", label: "Sağlık Kayıtları" },
] as const;

function NoPetsState({ onAdd, addingPet, botPad }: { onAdd: () => void; addingPet: boolean; botPad: number }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[np.container, { paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* ── Hero: lavender glow + animals ── */}
      <View style={np.heroWrap}>
        <View style={np.glow} />
        {/* sparkles */}
        <Text style={[np.sparkle, { top: 18, right: "18%" }]}>✦</Text>
        <Text style={[np.sparkle, { top: 28, left: "14%" }]}>✦</Text>
        <Text style={[np.sparkle, { bottom: 14, left: "22%" }]}>✦</Text>
        <Text style={[np.sparkle, np.sparkleSm, { top: 48, right: "30%" }]}>✦</Text>
        <Image
          source={HERO_IMAGE}
          style={np.heroImg}
          contentFit="contain"
          accessibilityLabel="Sevimli kedi ve köpek"
        />
      </View>

      {/* ── Headline ── */}
      <Text style={np.headline}>Dostunun bakım yolculuğu{"\n"}burada başlasın</Text>

      {/* ── Description ── */}
      <Text style={np.desc}>
        Aşılarını, randevularını, beslenme ve sağlık bilgilerini tek yerden kolayca yönet.
      </Text>

      {/* ── 2×2 feature cards ── */}
      <View style={np.grid}>
        {FEATURE_CARDS.map(({ icon, label }) => (
          <View key={label} style={[np.card, SHADOW_SM]}>
            <View style={np.cardIcon}>
              <Icon name={icon} size={20} color={C.purple} />
            </View>
            <Text style={np.cardTxt}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Trust badge ── */}
      <View style={np.badge} accessibilityRole="text">
        <Icon name="checkmark-circle" size={16} color="#2a7a47" />
        <Text style={np.badgeTxt}>İlk evcil hayvanın ücretsiz</Text>
      </View>

      {/* ── CTA ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="İlk dostunu ekle"
        disabled={addingPet}
        style={({ pressed }) => [
          np.cta,
          SHADOW_MD,
          { opacity: addingPet ? 0.7 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onAdd();
        }}
      >
        <LinearGradient
          colors={["#9B6EE8", C.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={np.ctaGrad}
        >
          {addingPet
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Icon name="add-circle-outline" size={20} color="#fff" /><Text style={np.ctaTxt}>İlk Dostumu Ekle</Text></>
          }
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}
const np = StyleSheet.create({
  container:  { paddingHorizontal: 20, paddingTop: 4, alignItems: "center" },
  heroWrap:   { width: "100%", alignItems: "center", justifyContent: "center", marginBottom: 4, position: "relative", height: 230 },
  glow:       { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "#ECE2FF", opacity: 0.72 },
  heroImg:    { width: 260, height: 220, alignSelf: "center", zIndex: 1 },
  sparkle:    { position: "absolute", fontSize: 11, color: C.purple, opacity: 0.55, zIndex: 2 },
  sparkleSm:  { fontSize: 7, opacity: 0.38 },
  headline:   { fontSize: 23, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", letterSpacing: -0.5, lineHeight: 32, marginBottom: 10, marginTop: 6 },
  desc:       { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSec, textAlign: "center", lineHeight: 22, paddingHorizontal: 6, marginBottom: 18 },
  grid:       { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%", marginBottom: 16 },
  card:       { width: "47%", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5D8F5", padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3ECFF", alignItems: "center", justifyContent: "center" },
  cardTxt:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, flex: 1 },
  badge:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8FFF1", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, marginBottom: 16 },
  badgeTxt:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1d6a38" },
  cta:        { width: "100%", borderRadius: 50, overflow: "hidden" },
  ctaGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, paddingHorizontal: 24 },
  ctaTxt:     { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});

/* ══════════════════════════════════════════════════════════════════════════════
   2. PET PROFILE CARD
══════════════════════════════════════════════════════════════════════════════ */
function PetProfileCard({
  pets,
  selectedIndex,
  onSelectIndex,
  onAdd,
  addingPet,
  onEdit,
  onOpenSelector,
}: {
  pets: Pet[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onAdd: () => void;
  addingPet: boolean;
  onEdit: () => void;
  onOpenSelector: () => void;
}) {
  const pet = pets[selectedIndex]!;
  const subtitle = buildPetSubtitle(pet.type, pet.breed, pet.gender);
  const meta     = buildPetMeta(pet.birthDate, pet.age, pet.weight);

  return (
    <View style={pc.wrap}>
      {/* Profile card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Evcil hayvan detayını aç"
        style={({ pressed }) => [pc.card, SHADOW_MD, { opacity: pressed ? 0.95 : 1 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(); }}
      >
        <View style={pc.row}>
          {/* Avatar */}
          <View style={pc.avatarRing}>
            {pet.image ? (
              <Image
                source={{ uri: pet.image }}
                style={pc.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient colors={["#A07FE0", C.purple]} style={pc.avatarFallback}>
                <Icon name="paw" size={30} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            )}
          </View>

          {/* Info */}
          <View style={pc.info}>
            <View style={pc.nameRow}>
              <Text style={pc.name} numberOfLines={1}>{pet.name}</Text>
              <Icon name="checkmark-circle" size={18} color="#5856D6" />
            </View>

            {subtitle ? (
              <Text style={pc.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}

            {meta ? (
              <View style={pc.pill}>
                <Text style={pc.pillTxt}>{meta}</Text>
              </View>
            ) : null}
          </View>

          {/* Dropdown arrow */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Evcil hayvan değiştir"
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenSelector();
            }}
          >
            <Icon name="chevron-down" size={20} color={C.textSec} />
          </Pressable>
        </View>
      </Pressable>

      {/* Dot indicators — only when >1 pet */}
      {pets.length > 1 && (
        <View style={pc.dots}>
          {pets.map((_, i) => (
            <Pressable
              key={i}
              hitSlop={10}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectIndex(i); }}
            >
              <View style={[pc.dot, i === selectedIndex && pc.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Add pet button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Yeni evcil hayvan ekle"
        disabled={addingPet}
        style={({ pressed }) => [pc.addBtn, { opacity: addingPet ? 0.55 : pressed ? 0.82 : 1 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
      >
        {addingPet
          ? <ActivityIndicator size="small" color={C.purple} />
          : <><Icon name="add-circle-outline" size={18} color={C.purple} /><Text style={pc.addTxt}>Evcil Hayvan Ekle</Text></>
        }
      </Pressable>
    </View>
  );
}
const pc = StyleSheet.create({
  wrap:          { marginHorizontal: 20, marginTop: 16 },
  card:          {
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 110,
  },
  row:           { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  avatarRing:    {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 2.5, borderColor: C.purple,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatar:        { width: 73, height: 73, borderRadius: 36 },
  avatarFallback:{ width: 73, height: 73, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  info:          { flex: 1, gap: 5 },
  nameRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  name:          { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.4, flex: 1 },
  subtitle:      { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSec, lineHeight: 18 },
  pill:          { alignSelf: "flex-start", backgroundColor: `${C.purple}14`, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  pillTxt:       { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.purple },
  dots:          { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 14 },
  dot:           { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#D8D0E8" },
  dotActive:     { width: 20, height: 7, borderRadius: 4, backgroundColor: C.purple },
  addBtn:        {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 14,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.purpleBorder,
    borderStyle: "dashed",
    backgroundColor: "#F7F2FF",
  },
  addTxt:        { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.purple },
});

/* ══════════════════════════════════════════════════════════════════════════════
   3. PET SELECTOR SHEET (bottom modal)
══════════════════════════════════════════════════════════════════════════════ */
function PetSelectorSheet({
  visible,
  pets,
  selectedPetId,
  onSelect,
  onAdd,
  addingPet,
  onClose,
  onDelete,
  deletingPetId,
}: {
  visible: boolean;
  pets: Pet[];
  selectedPetId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  addingPet: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  deletingPetId: string | null;
}) {
  const [pendingDeletePet, setPendingDeletePet] = useState<Pet | null>(null);

  useEffect(() => {
    if (visible && pets.length === 0) onClose();
  }, [pets.length, visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={ss.container}>
        <Pressable style={ss.backdrop} onPress={onClose} />
        <View style={ss.sheet}>
          <View style={ss.handle} />
          <Text style={ss.title}>Evcil Dostlarım</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={ss.list}
            contentContainerStyle={ss.listContent}
          >
            {pets.map((pet) => {
              const isSelected  = pet.id === selectedPetId;
              const isDeleting  = deletingPetId === pet.id;
              const anyDeleting = deletingPetId !== null;
              const subtitle    = buildPetSubtitle(pet.type, pet.breed, pet.gender);
              return (
                <Pressable
                  key={pet.id}
                  style={({ pressed }) => [
                    ss.row,
                    isSelected && ss.rowSelected,
                    pressed && { opacity: 0.82 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSelect(pet.id);
                    onClose();
                  }}
                >
                  {/* ── Delete icon (left) ─────────────── */}
                  <Pressable
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={`${pet.name} evcil hayvanını sil`}
                    style={ss.deleteBtn}
                    disabled={anyDeleting}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPendingDeletePet(pet);
                    }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={C.red} />
                    ) : (
                      <Icon
                        name="trash-outline"
                        size={18}
                        color={anyDeleting ? "#D8D0E8" : C.red}
                      />
                    )}
                  </Pressable>

                  {/* ── Avatar ─────────────────────────── */}
                  <View style={ss.avatarWrap}>
                    {pet.image ? (
                      <Image
                        source={{ uri: pet.image }}
                        style={ss.avatar}
                        contentFit="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={["#A07FE0", C.purple]}
                        style={ss.avatarFallback}
                      >
                        <Icon name="paw" size={20} color="rgba(255,255,255,0.9)" />
                      </LinearGradient>
                    )}
                  </View>

                  {/* ── Name / subtitle ────────────────── */}
                  <View style={ss.rowInfo}>
                    <Text
                      style={[ss.petName, isSelected && ss.petNameSelected]}
                      numberOfLines={1}
                    >
                      {pet.name}
                    </Text>
                    {subtitle ? (
                      <Text style={ss.petSub} numberOfLines={1}>{subtitle}</Text>
                    ) : null}
                  </View>

                  {/* ── Selected checkmark (right) ─────── */}
                  {isSelected && (
                    <Icon name="checkmark-circle" size={22} color={C.purple} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            disabled={addingPet}
            style={({ pressed }) => [ss.addBtn, { opacity: addingPet ? 0.55 : pressed ? 0.82 : 1 }]}
            onPress={() => { onClose(); onAdd(); }}
          >
            {addingPet
              ? <ActivityIndicator size="small" color={C.purple} />
              : <><Icon name="add-circle-outline" size={20} color={C.purple} /><Text style={ss.addBtnTxt}>Evcil Hayvan Ekle</Text></>
            }
          </Pressable>
        </View>
      </View>

      {/* ── Delete confirmation modal ───────────────────────────── */}
      <Modal
        visible={!!pendingDeletePet}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPendingDeletePet(null)}
      >
        <View style={dm.overlay}>
          <Pressable style={dm.backdrop} onPress={() => setPendingDeletePet(null)} />
          <View style={dm.card}>
            <Text style={dm.title}>
              {pendingDeletePet?.name} silinsin mi?
            </Text>
            <Text style={dm.body}>
              Bu evcil hayvan profilini silmek istediğine emin misin? Bu işlem geri alınamaz.
            </Text>
            <View style={dm.btns}>
              <Pressable
                style={({ pressed }) => [dm.cancelBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setPendingDeletePet(null)}
              >
                <Text style={dm.cancelTxt}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [dm.deleteBtn, pressed && { opacity: 0.8 }]}
                onPress={async () => {
                  if (!pendingDeletePet) return;
                  const pet = pendingDeletePet;
                  setPendingDeletePet(null);
                  await onDelete(pet.id);
                }}
              >
                <Text style={dm.deleteTxt}>Sil</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
const ss = StyleSheet.create({
  container:       { flex: 1, justifyContent: "flex-end" },
  backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:           {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "72%",
  },
  handle:          { width: 40, height: 5, borderRadius: 3, backgroundColor: "#D8D0E8", alignSelf: "center", marginTop: 12, marginBottom: 2 },
  title:           { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.4, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  list:            { flexGrow: 0 },
  listContent:     { paddingVertical: 8 },
  row:             { flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 24, paddingVertical: 14, gap: 12 },
  rowSelected:     { backgroundColor: `${C.purple}0A` },
  deleteBtn:       { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarWrap:      { width: 52, height: 52, borderRadius: 26, overflow: "hidden", flexShrink: 0 },
  avatar:          { width: 52, height: 52 },
  avatarFallback:  { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  rowInfo:         { flex: 1 },
  petName:         { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  petNameSelected: { color: C.purple, fontFamily: "Inter_700Bold" },
  petSub:          { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSec, marginTop: 2 },
  addBtn:          {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    marginHorizontal: 24, marginTop: 12,
    height: 52, borderRadius: 18,
    borderWidth: 1.5, borderColor: C.purpleBorder, borderStyle: "dashed",
    backgroundColor: "#F7F2FF",
  },
  addBtnTxt:       { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.purple },
});
const dm = StyleSheet.create({
  overlay:   { flex: 1, alignItems: "center", justifyContent: "center" },
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  card:      {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 32,
    padding: 24,
    gap: 12,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 12 },
      default: {},
    }),
  },
  title:     { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.3, textAlign: "center" },
  body:      { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSec, lineHeight: 20, textAlign: "center" },
  btns:      { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#F5F2FB", borderWidth: 1, borderColor: C.border },
  cancelTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.textSec },
  deleteBtn: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: C.red },
  deleteTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});

/* ══════════════════════════════════════════════════════════════════════════════
   4. QUICK STATUS CARDS
══════════════════════════════════════════════════════════════════════════════ */
function QuickStatusCards({
  vaccinations,
  appointments,
  nutrition,
  petId,
  onNav,
}: {
  vaccinations: ApiVaccination[];
  appointments: ApiAppointment[];
  nutrition: ApiNutrition | null;
  petId: string;
  onNav: (route: string) => void;
}) {
  const nextVacc = vaccinations
    .filter((v) => v.nextDueDate)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];

  const nextAppt = appointments
    .filter((a) => a.status === "upcoming")
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  let daysLeft: number | null = null;
  let stockKg = "";
  if (nutrition && nutrition.dailyAmountGrams > 0) {
    daysLeft = Math.floor(nutrition.remainingAmountGrams / nutrition.dailyAmountGrams);
    const kg = nutrition.remainingAmountGrams / 1000;
    stockKg = `${kg.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg`;
  }

  const cards = [
    {
      label:     "Sonraki Aşı",
      value:     nextVacc?.vaccineName ?? "Kayıt yok",
      secondary: nextVacc ? formatDateShort(nextVacc.nextDueDate) : "Aşı ekle",
      icon:      "calendar-outline" as const,
      color:     C.orange,
      bg:        C.orangeBg,
      route:     `/evcilim/${petId}/vaccinations`,
      isEmpty:   !nextVacc,
    },
    {
      label:     "Yaklaşan Randevu",
      value:     nextAppt?.title ?? "Randevu yok",
      secondary: nextAppt ? formatDateShort(nextAppt.appointmentDate) : "Randevu oluştur",
      icon:      "calendar-outline" as const,
      color:     C.purple,
      bg:        C.purpleLight,
      route:     `/evcilim/${petId}/appointments`,
      isEmpty:   !nextAppt,
    },
    {
      label:     "Mama Durumu",
      value:     daysLeft !== null ? `${daysLeft} gün kaldı` : "Kayıt yok",
      secondary: stockKg || "Beslenme ekle",
      icon:      "nutrition-outline" as const,
      color:     C.green,
      bg:        C.greenBg,
      route:     `/evcilim/${petId}/nutrition`,
      isEmpty:   daysLeft === null,
    },
  ];

  return (
    <View style={qs.section}>
      <Text style={qs.title}>Hızlı Durum</Text>
      <View style={qs.row}>
        {cards.map((c) => (
          <Pressable
            key={c.label}
            accessibilityRole="button"
            style={({ pressed }) => [qs.card, { backgroundColor: c.bg }, pressed && { opacity: 0.84 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNav(c.route); }}
          >
            <Text style={[qs.label, { color: c.color }]} numberOfLines={2}>{c.label}</Text>
            <Text
              style={[qs.value, c.isEmpty && qs.valueEmpty]}
              numberOfLines={2}
            >
              {c.value}
            </Text>
            <View style={qs.bottom}>
              <Icon name={c.icon} size={14} color={c.color} />
              <Text style={[qs.secondary, { color: c.isEmpty ? c.color : C.textSec }]} numberOfLines={1}>
                {c.secondary}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const qs = StyleSheet.create({
  section:   { marginHorizontal: 20, marginTop: 24 },
  title:     { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12, letterSpacing: -0.3 },
  row:       { flexDirection: "row", gap: 10 },
  card:      { flex: 1, borderRadius: 18, padding: 13, minHeight: 112, justifyContent: "space-between" },
  label:     { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2, marginBottom: 4 },
  value:     { fontSize: 13, fontFamily: "Inter_700Bold", color: C.text, lineHeight: 18, flex: 1 },
  valueEmpty:{ color: C.textSec, fontFamily: "Inter_500Medium" },
  bottom:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  secondary: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textSec, flex: 1 },
});

/* ══════════════════════════════════════════════════════════════════════════════
   4. MANAGEMENT GRID (4 cols × 2 rows, all purple icons)
══════════════════════════════════════════════════════════════════════════════ */
type GridItem = {
  key:   string;
  label: string;
  icon:  string;
  route: string;
  badge?: number;
  premium?: boolean;
};

function ManagementGrid({
  petId,
  vaccinations,
  appointments,
  isPremium,
  onNav,
  onPremiumNav,
}: {
  petId: string;
  vaccinations: ApiVaccination[];
  appointments: ApiAppointment[];
  isPremium: boolean;
  onNav: (route: string) => void;
  onPremiumNav: (source: string, destination: string) => void;
}) {
  const overdueVacc  = vaccinations.filter((v) => v.status === "overdue").length;
  const upcomingAppt = appointments.filter((a) => a.status === "upcoming").length;

  const GRID: GridItem[] = [
    { key: "id",           label: "Kimlik",    icon: "id-card-outline",          route: `/evcilim/${petId}/identification` },
    { key: "health",       label: "Sağlık",    icon: "heart-outline",            route: `/evcilim/${petId}/health` },
    { key: "vaccinations", label: "Aşılar",    icon: "shield-checkmark-outline", route: `/evcilim/${petId}/vaccinations`, badge: overdueVacc || undefined },
    { key: "appointments", label: "Randevular", icon: "calendar-outline",         route: `/evcilim/${petId}/appointments`, badge: upcomingAppt || undefined },
    { key: "nutrition",    label: "Beslenme",   icon: "nutrition-outline",        route: `/evcilim/${petId}/nutrition` },
    { key: "documents",    label: "Belgeler",   icon: "document-text-outline",   route: `/evcilim/${petId}/documents`, premium: true },
    { key: "medications",  label: "İlaçlar",    icon: "medical-outline",          route: `/evcilim/${petId}/medications`, premium: true },
    { key: "notes",        label: "Notlar",     icon: "pencil-outline",           route: `/evcilim/${petId}/notes` },
  ];

  return (
    <View style={mg.section}>
      <Text style={mg.title}>Yönetim</Text>
      <View style={mg.grid}>
        {GRID.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} ekranını aç`}
            style={({ pressed }) => [mg.cell, pressed && { opacity: 0.75 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (item.premium && !isPremium) {
                onPremiumNav(item.key, item.route);
              } else {
                onNav(item.route);
              }
            }}
          >
            <View style={mg.iconBox}>
              <Icon name={item.icon} size={22} color={C.purple} />
              {item.badge !== undefined && item.badge > 0 && (
                <View style={mg.badge}>
                  <Text style={mg.badgeTxt}>{item.badge}</Text>
                </View>
              )}
              {item.premium && !isPremium && (
                <View style={mg.premiumBadge}>
                  <Icon name="diamond" size={9} color="#fff" />
                </View>
              )}
            </View>
            <Text style={mg.cellLabel} numberOfLines={2}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const mg = StyleSheet.create({
  section:   { marginHorizontal: 20, marginTop: 24 },
  title:     { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12, letterSpacing: -0.3 },
  grid:      { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  cell:      {
    width: "23.5%",
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
    ...SHADOW_SM,
  },
  iconBox:   {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${C.purple}14`,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  badge:     { position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: C.red, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.card },
  premiumBadge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.purple, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.card },
  badgeTxt:  { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  cellLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.text, textAlign: "center", lineHeight: 15, paddingHorizontal: 4 },
});

/* ══════════════════════════════════════════════════════════════════════════════
   4b. AI ASSISTANT CARD
══════════════════════════════════════════════════════════════════════════════ */
function AIAssistantCard({ petId, isPremium, onNav, onPremiumNav }: {
  petId: string;
  isPremium: boolean;
  onNav: (r: string) => void;
  onPremiumNav: (source: string, destination: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [ai.card, pressed && { opacity: 0.85 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (isPremium) {
          onNav(`/evcilim/${petId}/assistant`);
        } else {
          onPremiumNav("assistant", `/evcilim/${petId}/assistant`);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel="AI Hayvan Asistanı"
    >
      <View style={ai.iconWrap}>
        <Icon name="sparkles-outline" size={22} color="#fff" />
      </View>
      <View style={ai.body}>
        <Text style={ai.title}>AI Hayvan Asistanı</Text>
        <Text style={ai.sub}>Evcil hayvanın hakkında anlık sorular sor.</Text>
      </View>
      {!isPremium && (
        <View style={ai.premiumPill}>
          <Icon name="diamond" size={10} color="#fff" />
          <Text style={ai.premiumTxt}>Premium</Text>
        </View>
      )}
      <Icon name="chevron-forward" size={18} color={C.purple} />
    </Pressable>
  );
}
const ai = StyleSheet.create({
  card:       { marginHorizontal: 20, marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: `${C.purple}10`, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: `${C.purple}28`, ...SHADOW_SM },
  iconWrap:   { width: 44, height: 44, borderRadius: 14, backgroundColor: C.purple, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  body:       { flex: 1 },
  title:      { fontSize: 15, fontFamily: "Inter_700Bold", color: C.purple },
  sub:        { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSec, marginTop: 2 },
  premiumPill:{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50, backgroundColor: C.purple },
  premiumTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
});

/* ══════════════════════════════════════════════════════════════════════════════
   5. UPCOMING REMINDERS
══════════════════════════════════════════════════════════════════════════════ */
function UpcomingReminders({
  reminders,
  petId,
  onNav,
}: {
  reminders: ApiReminder[];
  petId: string;
  onNav: (route: string) => void;
}) {
  const upcoming = reminders
    .filter((r) => {
      try { return new Date(r.date) >= new Date(new Date().setHours(0, 0, 0, 0)); }
      catch { return true; }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <View style={ur.section}>
      <View style={ur.header}>
        <Text style={ur.title}>Yaklaşan Hatırlatmalar</Text>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Tüm hatırlatmaları görüntüle"
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNav(`/evcilim/${petId}/reminders`); }}
        >
          <Text style={ur.seeAll}>Tümünü Gör</Text>
        </Pressable>
      </View>

      {upcoming.length === 0 ? (
        <View style={ur.emptyCard}>
          <View style={ur.emptyIconWrap}>
            <Icon name="calendar-outline" size={26} color={C.green} />
          </View>
          <View style={ur.emptyText}>
            <Text style={ur.emptyTitle}>Yaklaşan hatırlatman yok</Text>
            <Text style={ur.emptySub}>Aşı, randevu veya bakım hatırlatıcısı ekleyebilirsin.</Text>
          </View>
          <Pressable
            hitSlop={8}
            style={ur.emptyBtn}
            accessibilityRole="button"
            onPress={() => onNav(`/evcilim/${petId}/reminders`)}
          >
            <Text style={ur.emptyBtnTxt}>Hatırlatıcı Ekle</Text>
          </Pressable>
        </View>
      ) : (
        <View style={ur.list}>
          {upcoming.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              style={({ pressed }) => [ur.item, pressed && { opacity: 0.85 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={[ur.iconWrap, { backgroundColor: `${r.color}18` }]}>
                <Icon name={r.icon} size={18} color={r.color} />
              </View>
              <View style={ur.mid}>
                <Text style={ur.itemTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={ur.itemDate}>{formatReminderDate(r.date)}</Text>
              </View>
              <View style={[ur.alarmWrap, { backgroundColor: `${r.color}18` }]}>
                <Icon name="alarm-outline" size={18} color={r.color} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
const ur = StyleSheet.create({
  section:      { marginHorizontal: 20, marginTop: 24, marginBottom: 8 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title:        { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.3 },
  seeAll:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.purple },
  emptyCard:    {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 110,
    ...SHADOW_SM,
  },
  emptyIconWrap:{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${C.green}14`, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  emptyText:    { flex: 1 },
  emptyTitle:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 4 },
  emptySub:     { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSec, lineHeight: 17 },
  emptyBtn:     { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: `${C.purple}12`, borderRadius: 10, flexShrink: 0 },
  emptyBtnTxt:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.purple },
  list:         { gap: 10 },
  item:         {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: C.border,
    ...SHADOW_SM,
  },
  iconWrap:     { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  mid:          { flex: 1 },
  itemTitle:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  itemDate:     { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSec, marginTop: 2 },
  alarmWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

/* ══════════════════════════════════════════════════════════════════════════════
   6. LOADING SKELETON
══════════════════════════════════════════════════════════════════════════════ */
function Skeleton({ w, h, r = 12 }: { w: number | string; h: number; r?: number }) {
  return <View style={{ width: w as number, height: h, borderRadius: r, backgroundColor: "#EDE7F3" }} />;
}

function LoadingSkeleton() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 80 }} scrollEnabled={false}>
      <View style={{ marginHorizontal: 20 }}>
        <View style={[{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#EDE7F3", padding: 16, flexDirection: "row", gap: 14, alignItems: "center" }, SHADOW_MD]}>
          <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: "#EDE7F3" }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton w={120} h={20} r={6} />
            <Skeleton w={160} h={14} r={6} />
            <Skeleton w={100} h={26} r={13} />
          </View>
        </View>
      </View>
      <View style={{ marginHorizontal: 20, marginTop: 24 }}>
        <Skeleton w={120} h={20} r={6} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, height: 112, borderRadius: 18, backgroundColor: "#EDE7F3" }} />
          ))}
        </View>
      </View>
      <View style={{ marginHorizontal: 20, marginTop: 24 }}>
        <Skeleton w={80} h={20} r={6} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <View key={i} style={{ width: "23.5%", height: 88, borderRadius: 18, backgroundColor: "#EDE7F3" }} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   7. MAIN EXPORTED COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export function EvcilimTab({ botPad }: { botPad: number }) {
  const { pets, isLoading: petsLoading, error: petsError, refresh: refreshPets, deletePet } = usePets();
  const { user } = useAuth();
  const { status: premiumStatus, isPremium, refresh: refreshPetPremiumStatus } = usePetPremium();
  const router   = useRouter();

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [premiumSource, setPremiumSource]     = useState<string | undefined>(undefined);
  const [premiumReturnTo, setPremiumReturnTo] = useState<string | undefined>(undefined);
  const [vaccinations, setVaccinations]   = useState<ApiVaccination[]>([]);
  const [appointments, setAppointments]   = useState<ApiAppointment[]>([]);
  const [nutrition, setNutrition]         = useState<ApiNutrition | null>(null);
  const [dataLoading, setDataLoading]     = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [deletingPetId, setDeletingPetId] = useState<string | null>(null);
  const [addingPet, setAddingPet]         = useState(false);
  const addingPetLockRef                  = useRef(false);
  const openPremiumLockRef                = useRef(false);

  // Read navigation params — add.tsx / feature screens send openPremium="true"
  // when they detect a premium gate, so the modal opens automatically.
  const { openPremium, premiumSource: paramSource, premiumReturnTo: paramReturnTo } =
    useLocalSearchParams<{ openPremium?: string; premiumSource?: string; premiumReturnTo?: string }>();

  // Open the premium modal when we arrive with openPremium="true".
  // We do NOT call router.replace here — doing so remounts the component and
  // resets premiumModalOpen to false before React can paint the modal.
  // The param is cleared instead when the modal closes (see onClose below).
  useEffect(() => {
    if (openPremium !== "true") return;
    if (paramSource) setPremiumSource(paramSource);
    if (paramReturnTo) setPremiumReturnTo(decodeURIComponent(paramReturnTo));
    setPremiumModalOpen(true);
  }, [openPremium, paramSource, paramReturnTo]);

  // Validate/initialize selectedPetId whenever pets list changes.
  // If the current selection still exists → keep it (this prevents
  // the dashboard jumping to a newly-added pet that gets prepended).
  // Otherwise fall back to the first pet in the list.
  useEffect(() => {
    if (pets.length === 0) { setSelectedPetId(null); return; }
    setSelectedPetId((prev) => {
      if (prev && pets.some((p) => p.id === prev)) return prev;
      return pets[0]!.id;
    });
  }, [pets]);

  const selectedPet  = pets.find((p) => p.id === selectedPetId) ?? null;
  const selectedIndex = Math.max(0, pets.findIndex((p) => p.id === selectedPetId));

  // Refresh premium status whenever the Evcilim tab gains focus.
  // This ensures the cached status is never stale after the user adds/deletes
  // a pet or navigates away and back.
  useFocusEffect(
    useCallback(() => {
      refreshPetPremiumStatus(false).catch(() => {});
    }, [refreshPetPremiumStatus])
  );

  const nav = useCallback(
    (route: string) => router.push(route as Parameters<typeof router.push>[0]),
    [router]
  );

  // Centralized premium-feature gate.
  // Refreshes premium status, then either navigates to the feature (premium)
  // or opens the modal (non-premium).  A ref lock prevents double-taps.
  const openPremiumFeature = useCallback(async (source: string, destination: string) => {
    if (openPremiumLockRef.current) return;
    openPremiumLockRef.current = true;
    try {
      const fresh = await refreshPetPremiumStatus(false);
      if (fresh?.isPremium) {
        nav(destination);
        return;
      }
      setPremiumSource(source);
      setPremiumReturnTo(destination);
      setPremiumModalOpen(true);
    } catch {
      Alert.alert(
        "Bağlantı Hatası",
        "Premium durum kontrol edilemedi. Lütfen internet bağlantınızı kontrol edin."
      );
    } finally {
      openPremiumLockRef.current = false;
    }
  }, [refreshPetPremiumStatus, nav]);

  const handleAddPet = useCallback(async () => {
    // Synchronous ref guard prevents double-invocation within the same render cycle
    if (addingPetLockRef.current) return;
    addingPetLockRef.current = true;
    setAddingPet(true);

    try {
      // Fast path: cached status already says blocked → open premium modal immediately
      if (premiumStatus !== null && !premiumStatus.canAddPet) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPremiumSource("add_pet");
        setPremiumReturnTo("/evcilim/add");
        setPremiumModalOpen(true);
        return;
      }

      const fresh = await refreshPetPremiumStatus(false);
      if (fresh?.canAddPet) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        nav("/evcilim/add");
      } else if (fresh === null) {
        // Not authenticated
        Alert.alert("Oturum Gerekli", "Evcil hayvan eklemek için lütfen giriş yapın.");
      } else {
        // canAddPet === false
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPremiumSource("add_pet");
        setPremiumReturnTo("/evcilim/add");
        setPremiumModalOpen(true);
      }
    } catch {
      // API error — show clear error, do not silently redirect to premium or form
      Alert.alert(
        "Bağlantı Hatası",
        "Evcil hayvan bilgileri şu anda alınamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      addingPetLockRef.current = false;
      setAddingPet(false);
    }
  }, [premiumStatus, refreshPetPremiumStatus, nav]);

  const handleDeletePet = useCallback(async (id: string) => {
    setDeletingPetId(id);
    try {
      await deletePet(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("yetkisiz") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("403")) {
        Alert.alert("Yetki Hatası", "Bu evcil hayvanı silme yetkiniz yok.");
      } else {
        Alert.alert("Hata", "Evcil hayvan silinemedi. Lütfen tekrar deneyin.");
      }
    } finally {
      setDeletingPetId(null);
    }
  }, [deletePet]);

  const loadData = useCallback(async (petId: string, userId: string) => {
    setDataLoading(true);
    try {
      const [v, a, n] = await Promise.all([
        apiGetVaccinations(petId),
        apiGetAppointments(petId),
        apiGetNutrition(petId),
      ]);
      setVaccinations(v);
      setAppointments(a);
      setNutrition(n);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPet && user) {
      loadData(selectedPet.id, user.id);
    }
  }, [selectedPet?.id, user?.id, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPets();
    if (selectedPet && user) {
      await loadData(selectedPet.id, user.id);
    }
    setRefreshing(false);
  }, [refreshPets, selectedPet, user, loadData]);

  if (petsLoading) {
    return <LoadingSkeleton />;
  }

  if (petsError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 }}>
        <Icon name="alert-circle-outline" size={48} color={C.red} />
        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text, textAlign: "center" }}>
          Evcil hayvan bilgileri yüklenemedi.
        </Text>
        <Pressable
          style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: C.purple }]}
          onPress={refreshPets}
        >
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" }}>Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  if (pets.length === 0) {
    return <NoPetsState onAdd={handleAddPet} addingPet={addingPet} botPad={botPad} />;
  }

  const reminders = selectedPet ? buildReminders(vaccinations, appointments, nutrition) : [];

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: botPad + 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.purple} />
        }
      >
        {/* Pet profile card */}
        <PetProfileCard
          pets={pets}
          selectedIndex={selectedIndex}
          onSelectIndex={(i) => setSelectedPetId(pets[i]!.id)}
          onAdd={handleAddPet}
          addingPet={addingPet}
          onEdit={() => selectedPet && nav(`/evcilim/${selectedPet.id}`)}
          onOpenSelector={() => setPetSelectorOpen(true)}
        />

      {dataLoading ? (
        <View style={{ alignItems: "center", paddingTop: 48 }}>
          <ActivityIndicator color={C.purple} size="large" />
        </View>
      ) : selectedPet ? (
        <>
          <QuickStatusCards
            vaccinations={vaccinations}
            appointments={appointments}
            nutrition={nutrition}
            petId={selectedPet.id}
            onNav={nav}
          />
          <ManagementGrid
            petId={selectedPet.id}
            vaccinations={vaccinations}
            appointments={appointments}
            isPremium={isPremium}
            onNav={nav}
            onPremiumNav={openPremiumFeature}
          />
          <AIAssistantCard petId={selectedPet.id} isPremium={isPremium} onNav={nav} onPremiumNav={openPremiumFeature} />
          <UpcomingReminders
            reminders={reminders}
            petId={selectedPet.id}
            onNav={nav}
          />
        </>
      ) : null}
      </ScrollView>
      <PetSelectorSheet
        visible={petSelectorOpen}
        pets={pets}
        selectedPetId={selectedPetId}
        onSelect={(id) => setSelectedPetId(id)}
        onAdd={handleAddPet}
        addingPet={addingPet}
        onClose={() => setPetSelectorOpen(false)}
        onDelete={handleDeletePet}
        deletingPetId={deletingPetId}
      />

      <EvcilimPremiumModal
        visible={premiumModalOpen}
        onClose={() => {
          setPremiumModalOpen(false);
          setPremiumSource(undefined);
          setPremiumReturnTo(undefined);
          // Clear navigation params so re-focus does not re-open the modal.
          if (openPremium === "true") {
            router.setParams({ openPremium: "", premiumSource: "", premiumReturnTo: "" } as Record<string, string>);
          }
        }}
        source={premiumSource ?? "add_pet"}
        returnTo={premiumReturnTo ?? "/evcilim/add"}
      />
    </>
  );
}
