import { Icon } from "@/components/Icon";
import { usePetPremium } from "@/contexts/PetPremiumContext";
import { apiCreatePetDocument, apiDeletePetDocument, apiGetPetDocuments, type ApiPetDocument } from "@/lib/petManagementApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const P="#7C45D9",BG="#F6F1FF",DARK="#211733",MUTED="#8C8699";
const API_BASE=process.env.EXPO_PUBLIC_DOMAIN?`https://${process.env.EXPO_PUBLIC_DOMAIN}/api`:"http://localhost:8080/api";

async function upload(uri:string,name:string,mime:string){
  const token=await AsyncStorage.getItem("@canyoldasi:jwt");
  const body=new FormData();
  if (typeof File!=="undefined"&&uri.startsWith("blob:")){const blob=await fetch(uri).then(r=>r.blob());body.append("file",new File([blob],name,{type:mime}));}
  else body.append("file",{uri,name,type:mime} as unknown as Blob);
  const res=await fetch(`${API_BASE}/upload`,{method:"POST",body,headers:token?{Authorization:`Bearer ${token}`}:{}});
  if(!res.ok)throw new Error("upload_failed");
  const data=await res.json() as {url?:string};
  if(!data.url)throw new Error("upload_failed");
  return data.url;
}

export default function DocumentsScreen(){
  const {petId}=useLocalSearchParams<{petId:string}>(),router=useRouter(),insets=useSafeAreaInsets();
  const {isPremium}=usePetPremium();
  const [items,setItems]=useState<ApiPetDocument[]>([]),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false);
  const load=useCallback(async()=>{if(!petId)return;setLoading(true);try{setItems(await apiGetPetDocuments(petId));}finally{setLoading(false)}},[petId]);
  useEffect(()=>{load()},[load]);
  const add=async()=>{
    if(!isPremium){router.push("/evcilim-premium");return}
    const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!perm.granted){Alert.alert("İzin Gerekli","Belge fotoğrafı seçmek için fotoğraf izni vermelisin.");return}
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:.85});if(result.canceled||!result.assets[0]||!petId)return;
    const a=result.assets[0],name=a.fileName||`pet-document-${Date.now()}.jpg`,mime=a.mimeType||"image/jpeg";
    setUploading(true);try{const url=await upload(a.uri,name,mime);const row=await apiCreatePetDocument(petId,{title:name.replace(/\.[^.]+$/,"")||"Evcil Hayvan Belgesi",category:"other",fileUrl:url,fileName:name,mimeType:mime,fileSize:a.fileSize||0,documentDate:new Date().toISOString().slice(0,10),notes:""});setItems(v=>[row,...v]);}catch{Alert.alert("Yüklenemedi","Belge yüklenemedi. Lütfen tekrar deneyin.")}finally{setUploading(false)}
  };
  return <View style={s.root}><View style={[s.header,{paddingTop:insets.top+12}]}><Pressable style={s.circle} onPress={()=>router.back()}><Icon name="chevron-back" size={22} color={DARK}/></Pressable><View style={{flex:1}}><Text style={s.title}>Belge Kasası</Text><Text style={s.sub}>Aşı karnesi, reçete ve sonuçlar</Text></View><Pressable style={s.add} onPress={add} disabled={uploading}>{uploading?<ActivityIndicator color="#FFF"/>:<Icon name={isPremium?"add":"lock-closed"} size={21} color="#FFF"/>}</Pressable></View>
    {!isPremium&&<Pressable style={s.premium} onPress={()=>router.push("/evcilim-premium")}><Icon name="diamond-outline" size={20} color={P}/><View style={{flex:1}}><Text style={s.premiumTitle}>Premium belge kasası</Text><Text style={s.premiumSub}>Mevcut belgelerin görünür kalır. Yeni belge yüklemek için Premium’a geç.</Text></View><Icon name="chevron-forward" size={18} color={P}/></Pressable>}
    {loading?<ActivityIndicator style={{flex:1}} color={P}/>:<FlatList data={items} keyExtractor={x=>x.id} numColumns={2} columnWrapperStyle={items.length?{gap:12}:undefined} contentContainerStyle={items.length?s.list:s.empty} ListEmptyComponent={<><Icon name="document-text-outline" size={50} color={P}/><Text style={s.emptyTitle}>Henüz belge yok</Text><Text style={s.emptySub}>Aşı karnesi, reçete ve veteriner belgelerini güvenle sakla.</Text></>} renderItem={({item})=><Pressable style={s.card} onLongPress={()=>Alert.alert("Belgeyi Sil",`${item.title} silinsin mi?`,[{text:"Vazgeç",style:"cancel"},{text:"Sil",style:"destructive",onPress:async()=>{if(!petId)return;await apiDeletePetDocument(petId,item.id);setItems(v=>v.filter(x=>x.id!==item.id))}}])}><Image source={{uri:item.fileUrl}} style={s.image} contentFit="cover"/><View style={s.cardBody}><Text style={s.docTitle} numberOfLines={1}>{item.title}</Text><Text style={s.docDate}>{item.documentDate||"Tarih yok"}</Text></View></Pressable>}/>} 
  </View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:BG},header:{flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:20,paddingBottom:14},circle:{width:40,height:40,borderRadius:20,backgroundColor:"#FFF",alignItems:"center",justifyContent:"center"},title:{fontSize:19,fontFamily:"Inter_700Bold",color:DARK},sub:{fontSize:12,fontFamily:"Inter_400Regular",color:MUTED},add:{width:40,height:40,borderRadius:20,backgroundColor:P,alignItems:"center",justifyContent:"center"},premium:{marginHorizontal:20,marginBottom:12,padding:14,borderRadius:18,backgroundColor:"#F0E6FF",flexDirection:"row",alignItems:"center",gap:10},premiumTitle:{fontSize:14,fontFamily:"Inter_700Bold",color:DARK},premiumSub:{fontSize:11,fontFamily:"Inter_400Regular",color:MUTED,lineHeight:16,marginTop:2},list:{padding:20,paddingBottom:30,gap:12},empty:{flexGrow:1,alignItems:"center",justifyContent:"center",padding:40},emptyTitle:{fontSize:18,fontFamily:"Inter_700Bold",color:DARK,marginTop:12},emptySub:{fontSize:13,fontFamily:"Inter_400Regular",color:MUTED,textAlign:"center",marginTop:6},card:{flex:1,maxWidth:"48.5%",backgroundColor:"#FFF",borderRadius:18,overflow:"hidden",marginBottom:12},image:{width:"100%",height:130,backgroundColor:"#EDE5F7"},cardBody:{padding:11},docTitle:{fontSize:13,fontFamily:"Inter_700Bold",color:DARK},docDate:{fontSize:11,fontFamily:"Inter_400Regular",color:MUTED,marginTop:4}});
