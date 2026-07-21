import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Linking, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import {
  apiGetPetDocuments, apiCreatePetDocument, apiDeletePetDocument,
  apiUpdatePetDocument, type ApiPetDocument,
} from "@/lib/petManagementApi";
import { usePetPremium } from "@/contexts/PetPremiumContext";

const SHADOW = {
  shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
};

const CATEGORY_KEYS = ["vaccination_card", "prescription", "lab_results", "health_record", "insurance", "identification", "other"] as const;
const CATEGORY_META: Record<typeof CATEGORY_KEYS[number], { icon: string; color: string }> = {
  vaccination_card: { icon: "shield-checkmark-outline", color: "#FF9500" },
  prescription:     { icon: "medical-outline",          color: "#E55D6F" },
  lab_results:      { icon: "flask-outline",            color: "#7B5EA7" },
  health_record:    { icon: "document-text-outline",    color: "#34C759" },
  insurance:        { icon: "shield-outline",           color: "#5856D6" },
  identification:   { icon: "id-card-outline",          color: "#FF9500" },
  other:            { icon: "folder-outline",           color: "#8C8699" },
};

type CatKey = typeof CATEGORY_KEYS[number];

function catMeta(key: string) {
  return CATEGORY_META[key as CatKey] ?? CATEGORY_META.other;
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function uploadFile(uri: string, name: string, mime: string): Promise<string> {
  const token = await AsyncStorage.getItem("@canyoldasi:jwt");
  const body = new FormData();
  if (typeof File !== "undefined" && uri.startsWith("blob:")) {
    const blob = await fetch(uri).then(r => r.blob());
    body.append("file", new File([blob], name, { type: mime }));
  } else {
    body.append("file", { uri, name, type: mime } as unknown as Blob);
  }
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST", body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("upload_failed");
  const data = await res.json() as { url?: string };
  if (!data.url) throw new Error("upload_failed");
  return data.url;
}

function isImage(mime: string) { return mime.startsWith("image/"); }

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

export default function DocumentsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t } = useTranslation();
  const C = useColors();
  const router = useRouter();
  const { isPremium, isLoading: premiumLoading } = usePetPremium();
  const gateChecked = useRef(false);

  const [documents, setDocuments]         = useState<ApiPetDocument[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [editingDoc, setEditingDoc]       = useState<ApiPetDocument | null>(null);
  const [editTitle, setEditTitle]         = useState("");
  const [editCategory, setEditCategory]   = useState<CatKey>("other");
  const [editDate, setEditDate]           = useState("");
  const [editNotes, setEditNotes]         = useState("");
  const [editSaving, setEditSaving]       = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CatKey | "all">("all");

  const categoryLabels: Record<string, string> = {
    vaccination_card: t("pets.documents.categories.vaccination_card"),
    prescription:     t("pets.documents.categories.prescription"),
    lab_results:      t("pets.documents.categories.lab_results"),
    health_record:    t("pets.documents.categories.health_record"),
    insurance:        t("pets.documents.categories.insurance"),
    identification:   t("pets.documents.categories.identification"),
    other:            t("pets.documents.categories.other"),
  };

  const load = useCallback(async () => {
    if (!petId) return;
    try { setDocuments(await apiGetPetDocuments(petId)); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [petId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (premiumLoading || gateChecked.current) return;
    gateChecked.current = true;
    if (!isPremium && petId) redirectToPremiumModal(router, petId, "documents");
  }, [premiumLoading, isPremium, petId, router]);

  const handleAdd = async () => {
    if (!isPremium) {
      if (petId) redirectToPremiumModal(router, petId, "documents");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t("pets.documents.errPermission"), t("pets.documents.errPermissionMsg")); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled || !result.assets[0] || !petId) return;
    const a = result.assets[0];
    const name = a.fileName ?? `pet-doc-${Date.now()}.jpg`;
    const mime = a.mimeType ?? "image/jpeg";
    setUploading(true);
    try {
      const url = await uploadFile(a.uri, name, mime);
      const doc = await apiCreatePetDocument(petId, {
        title: name.replace(/\.[^.]+$/, "") || "Belge",
        category: "other",
        fileUrl: url, fileName: name, mimeType: mime,
        fileSize: a.fileSize ?? 0,
        documentDate: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setDocuments(prev => [doc, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "premium_required") {
        if (petId) redirectToPremiumModal(router, petId, "documents");
        return;
      }
      Alert.alert(t("pets.documents.errUpload"), t("pets.documents.errUploadMsg"));
    } finally { setUploading(false); }
  };

  const openEdit = (doc: ApiPetDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditCategory((doc.category as CatKey) || "other");
    setEditDate(doc.documentDate);
    setEditNotes(doc.notes);
  };

  const handleEditSave = async () => {
    if (!petId || !editingDoc) return;
    setEditSaving(true);
    try {
      const updated = await apiUpdatePetDocument(petId, editingDoc.id, {
        title: editTitle, category: editCategory, documentDate: editDate, notes: editNotes,
      });
      setDocuments(prev => prev.map(d => d.id === editingDoc.id ? updated : d));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingDoc(null);
    } catch { Alert.alert(t("common.error"), t("pets.documents.errSave")); }
    finally { setEditSaving(false); }
  };

  const handleDelete = (doc: ApiPetDocument) => {
    Alert.alert(t("pets.documents.deleteTitle"), `"${doc.title}" ${t("pets.documents.deleteConfirmSuffix")}`, [
      { text: t("pets.documents.deleteCancel"), style: "cancel" },
      { text: t("pets.documents.deleteConfirm"), style: "destructive", onPress: async () => {
        if (!petId) return;
        try {
          await apiDeletePetDocument(petId, doc.id);
          setDocuments(prev => prev.filter(d => d.id !== doc.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch { Alert.alert(t("common.error"), t("pets.documents.errDelete")); }
      }},
    ]);
  };

  const S = makeStyles(C);
  const filteredDocs = selectedCategory === "all" ? documents : documents.filter(d => d.category === selectedCategory);

  if (loading) {
    return (
      <SafeAreaView style={S.flex} edges={["bottom"]}>
        <Stack.Screen options={{ title: t("pets.documents.title"), headerBackTitle: t("pets.documents.backTitle") }} />
        <View style={S.center}><ActivityIndicator color={C.purple} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.flex} edges={["bottom"]}>
      <Stack.Screen options={{ title: t("pets.documents.title"), headerBackTitle: t("pets.documents.backTitle"),
        headerRight: () => (
          <Pressable hitSlop={12} onPress={handleAdd} style={S.addBtn} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color={C.purple} />
              : <Icon name="add" size={22} color={C.purple} />
            }
          </Pressable>
        ),
      }} />

      {/* Category filter */}
      {documents.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.catRow}>
          <Pressable
            style={[S.catChip, selectedCategory === "all" && S.catChipActive]}
            onPress={() => setSelectedCategory("all")}
          >
            <Text style={[S.catChipTxt, selectedCategory === "all" && S.catChipTxtActive]}>{t("pets.documents.filterAll")}</Text>
          </Pressable>
          {CATEGORY_KEYS.filter(ck => documents.some(d => d.category === ck)).map(ck => {
            const meta = catMeta(ck);
            return (
              <Pressable
                key={ck}
                style={[S.catChip, selectedCategory === ck && { backgroundColor: meta.color, borderColor: meta.color }]}
                onPress={() => setSelectedCategory(ck)}
              >
                <Icon name={meta.icon} size={13} color={selectedCategory === ck ? "#fff" : C.textMuted} />
                <Text style={[S.catChipTxt, selectedCategory === ck && S.catChipTxtActive]}>{categoryLabels[ck]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={documents.length === 0 ? S.emptyContainer : S.gridContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {documents.length === 0 ? (
          <View style={S.empty}>
            <Icon name="document-text-outline" size={42} color={C.purple} />
            <Text style={S.emptyTitle}>{t("pets.documents.emptyTitle")}</Text>
            <Text style={S.emptySub}>{t("pets.documents.emptySub")}</Text>
            <Pressable style={S.uploadBtn} onPress={handleAdd} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={S.uploadBtnTxt}>{t("pets.documents.upload")}</Text>
              }
            </Pressable>
          </View>
        ) : (
          <View style={S.grid}>
            {filteredDocs.map(doc => {
              const meta = catMeta(doc.category);
              return (
                <Pressable
                  key={doc.id}
                  style={S.docCard}
                  onPress={() => openEdit(doc)}
                  onLongPress={() => handleDelete(doc)}
                >
                  <View style={[S.docThumb, { backgroundColor: `${meta.color}10` }]}>
                    {isImage(doc.mimeType) ? (
                      <Image source={{ uri: doc.fileUrl }} style={S.docImage} contentFit="cover" />
                    ) : (
                      <Icon name={meta.icon} size={32} color={meta.color} />
                    )}
                  </View>
                  <View style={S.docInfo}>
                    <View style={[S.catPill, { backgroundColor: `${meta.color}14` }]}>
                      <Text style={[S.catPillTxt, { color: meta.color }]}>{categoryLabels[doc.category] ?? doc.category}</Text>
                    </View>
                    <Text style={S.docTitle} numberOfLines={2}>{doc.title}</Text>
                    <Text style={S.docDate}>{doc.documentDate || t("pets.documents.noDate")}</Text>
                  </View>
                  <Pressable style={S.viewBtn} hitSlop={8} onPress={() => Linking.openURL(doc.fileUrl)}>
                    <Icon name="open-outline" size={16} color={C.purple} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit sheet */}
      {editingDoc && (
        <View style={S.sheet}>
          <View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>{t("pets.documents.editTitle")}</Text>
          <Text style={S.label}>{t("pets.documents.titleLabel")}</Text>
          <TextInput style={S.input} value={editTitle} onChangeText={setEditTitle} placeholder={t("pets.documents.titlePlaceholder")} placeholderTextColor={C.textMuted} />
          <Text style={S.label}>{t("pets.documents.categoryLabel")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
            {CATEGORY_KEYS.map(ck => {
              const meta = catMeta(ck);
              return (
                <Pressable
                  key={ck}
                  style={[S.catChip, editCategory === ck && { backgroundColor: meta.color, borderColor: meta.color }]}
                  onPress={() => setEditCategory(ck)}
                >
                  <Text style={[S.catChipTxt, editCategory === ck && S.catChipTxtActive]}>{categoryLabels[ck]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={S.label}>{t("pets.documents.dateLabel")}</Text>
          <TextInput style={S.input} value={editDate} onChangeText={setEditDate} placeholder="YYYY-AA-GG" placeholderTextColor={C.textMuted} />
          <Text style={S.label}>{t("pets.documents.notesLabel")}</Text>
          <TextInput style={[S.input, { minHeight: 60, textAlignVertical: "top" }]} value={editNotes} onChangeText={setEditNotes} placeholder={t("pets.documents.notesPlaceholder")} placeholderTextColor={C.textMuted} multiline />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable style={S.cancelBtn} onPress={() => setEditingDoc(null)}>
              <Text style={S.cancelTxt}>{t("pets.documents.cancel")}</Text>
            </Pressable>
            <Pressable style={[S.saveBtn, editSaving && { opacity: 0.7 }]} onPress={handleEditSave} disabled={editSaving}>
              {editSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.saveTxt}>{t("pets.documents.save")}</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex:           { flex: 1, backgroundColor: C.bg },
    center:         { flex: 1, alignItems: "center", justifyContent: "center" },
    addBtn:         { width: 34, height: 34, borderRadius: 12, backgroundColor: `${C.purple}14`, alignItems: "center", justifyContent: "center" },
    catRow:         { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: "row" },
    catChip:        { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    catChipActive:  { backgroundColor: C.purple, borderColor: C.purple },
    catChipTxt:     { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textMuted },
    catChipTxtActive:{ color: "#fff" },
    emptyContainer: { flexGrow: 1 },
    empty:          { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32, paddingTop: 40 },
    emptyTitle:     { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
    emptySub:       { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 20 },
    uploadBtn:      { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.purple, borderRadius: 14 },
    uploadBtnTxt:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
    gridContainer:  { padding: 14 },
    grid:           { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    docCard:        { width: "47.5%", backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...SHADOW },
    docThumb:       { width: "100%", height: 120, alignItems: "center", justifyContent: "center" },
    docImage:       { width: "100%", height: "100%" },
    docInfo:        { padding: 10 },
    catPill:        { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
    catPillTxt:     { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    docTitle:       { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text, lineHeight: 17 },
    docDate:        { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 3 },
    viewBtn:        { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: `${C.purple}14`, alignItems: "center", justifyContent: "center" },
    sheet:          { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderColor: C.border },
    sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
    sheetTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12 },
    label:          { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted, marginBottom: 6, marginTop: 12 },
    input:          { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
    cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center" },
    cancelTxt:      { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.textMuted },
    saveBtn:        { flex: 2, paddingVertical: 13, borderRadius: 14, backgroundColor: C.purple, alignItems: "center" },
    saveTxt:        { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  });
}
