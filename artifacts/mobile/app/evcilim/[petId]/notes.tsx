import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import { apiGetNotes, apiCreateNote, apiUpdateNote, apiDeleteNote, type ApiPetNote } from "@/lib/petManagementApi";

const P     = "#7B5EA7";
const P2    = "#9E78CC";
const DARK  = "#191330";
const BODY  = "#8F8A9D";
const BG    = "#F6F1FF";
const WHITE = "#FFFFFF";
const BORDER= "#EEE8F5";
const RED   = "#FF3B30";

function formatDate(s: string) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
}

/* ── Note Card ───────────────────────────────────────── */
function NoteCard({ note, onEdit, onDelete }: { note: ApiPetNote; onEdit: () => void; onDelete: () => void }) {
  return (
    <Pressable style={({ pressed }) => [nc.card, pressed && { opacity: 0.85 }]} onPress={onEdit}>
      <View style={nc.top}>
        <View style={nc.iconWrap}>
          <Ionicons name="document-text-outline" size={18} color={P} />
        </View>
        <View style={nc.info}>
          <Text style={nc.title}>{note.title}</Text>
          <Text style={nc.date}>{formatDate(note.updatedAt)}</Text>
        </View>
        <Pressable style={nc.deleteBtn} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={RED} />
        </Pressable>
      </View>
      {note.content ? (
        <Text style={nc.content} numberOfLines={3}>{note.content}</Text>
      ) : null}
    </Pressable>
  );
}
const nc = StyleSheet.create({
  card:      { backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 10, ...Platform.select({ ios: { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 } }) },
  top:       { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  iconWrap:  { width: 36, height: 36, borderRadius: 18, backgroundColor: `${P}18`, alignItems: "center", justifyContent: "center" },
  info:      { flex: 1 },
  title:     { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  date:      { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  deleteBtn: { padding: 4 },
  content:   { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 20 },
});

/* ── Add/Edit Modal ───────────────────────────────────── */
function AddEditModal({ visible, initial, onClose, onSave }: {
  visible: boolean;
  initial: ApiPetNote | null;
  onClose: () => void;
  onSave: (title: string, content: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setTitle(initial?.title ?? ""); setContent(initial?.content ?? ""); }
  }, [visible, initial]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Hata", "Başlık giriniz."); return; }
    setSaving(true);
    try { await onSave(title.trim(), content.trim()); onClose(); }
    catch { Alert.alert("Hata", "Kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const fld = { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 as const, fontFamily: "Inter_400Regular" as const, color: DARK, borderWidth: 1.5 as const, borderColor: `${P}22` };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: WHITE }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[am.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={DARK} /></Pressable>
          <Text style={am.title}>{initial ? "Notu Düzenle" : "Not Ekle"}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={am.form}>
          <View style={am.field}>
            <Text style={am.label}>Başlık *</Text>
            <TextInput style={fld} value={title} onChangeText={setTitle} placeholder="Notun başlığı..." placeholderTextColor={BODY} />
          </View>
          <View style={[am.field, { flex: 1 }]}>
            <Text style={am.label}>İçerik</Text>
            <TextInput
              style={[fld, { flex: 1, textAlignVertical: "top", minHeight: 200 }]}
              value={content}
              onChangeText={setContent}
              placeholder="Not içeriği..."
              placeholderTextColor={BODY}
              multiline
            />
          </View>
          <Pressable style={am.saveBtn} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={[P2, P]} style={am.saveGrad}>
              <Ionicons name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
              <Text style={am.saveTxt}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const am = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  title:  { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  form:   { flex: 1, paddingHorizontal: 20, gap: 14, paddingBottom: 24 },
  field:  { gap: 6 },
  label:  { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  saveBtn:{ borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveGrad:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:{ fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ── Main Screen ─────────────────────────────────────── */
export default function NotesScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { user } = useAuth();
  const { getPet } = usePets();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pet = getPet(petId ?? "");
  const [notes, setNotes] = useState<ApiPetNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ApiPetNote | null>(null);

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try { setNotes(await apiGetNotes(petId, user.id)); }
    finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (title: string, content: string) => {
    if (!petId || !user) return;
    if (editing) {
      const updated = await apiUpdateNote(petId, editing.id, user.id, { title, content });
      setNotes((prev) => prev.map((n) => n.id === editing.id ? updated : n));
    } else {
      const created = await apiCreateNote(petId, user.id, { title, content });
      setNotes((prev) => [created, ...prev]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (note: ApiPetNote) => {
    Alert.alert("Sil", `"${note.title}" silinecek?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          if (!petId || !user) return;
          await apiDeleteNote(petId, note.id, user.id);
          setNotes((prev) => prev.filter((n) => n.id !== note.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={st.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View>
          <Text style={st.headerTitle}>Notlar</Text>
          {pet ? <Text style={st.headerSub}>{pet.name}</Text> : null}
        </View>
        <Pressable style={st.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(null); setModalVisible(true); }}>
          <LinearGradient colors={[P2, P]} style={st.addGrad}>
            <Ionicons name="add" size={22} color={WHITE} />
          </LinearGradient>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={P} size="large" /></View>
      ) : notes.length === 0 ? (
        <View style={st.empty}>
          <LinearGradient colors={[`${P2}20`, `${P}10`]} style={st.emptyCircle}>
            <Ionicons name="pencil-outline" size={40} color={P} />
          </LinearGradient>
          <Text style={st.emptyTitle}>Not Yok</Text>
          <Text style={st.emptySub}>Hayvanınla ilgili önemli bilgileri not al</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onEdit={() => { setEditing(item); setModalVisible(true); }}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <AddEditModal
        visible={modalVisible}
        initial={editing}
        onClose={() => { setModalVisible(false); setEditing(null); }}
        onSave={handleSave}
      />
    </View>
  );
}
const st = StyleSheet.create({
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle:{ fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  headerSub:  { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  addBtn:     { borderRadius: 19, overflow: "hidden" },
  addGrad:    { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  empty:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  emptyCircle:{ width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 22 },
});
