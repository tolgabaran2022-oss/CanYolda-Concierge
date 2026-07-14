import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AdoptionListing {
  id: string;
  petName: string;
  petType: string;
  petAge?: string;
  breed?: string;
  gender?: string;
  vaccinated?: boolean;
  photo?: string;
  images?: string[];
  location: string;
  description: string;
  userId: string;
  userName: string;
  contactInfo: string;
  allowPhoneContact?: boolean;
  allowMessages?: boolean;
  status?: "Aktif" | "Onay Bekliyor" | "Pasif" | "Sahiplendirildi" | "Süresi Doldu";
  viewsCount?: number;
  favoriteCount?: number;
  messageCount?: number;
  createdAt: string;
  updatedAt?: string;
  healthStatus?: string;
  vaccinationStatus?: string;
  environmentType?: string;
  childCompatibility?: string;
  catCompatibility?: string;
  dogCompatibility?: string;
  toiletTraining?: string;
}

interface AdoptionContextType {
  listings: AdoptionListing[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addListing: (listing: Omit<AdoptionListing, "id" | "createdAt">) => Promise<string>;
  updateListing: (id: string, updates: Partial<Omit<AdoptionListing, "id" | "createdAt">>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  getListing: (id: string) => AdoptionListing | undefined;
}

const AdoptionContext = createContext<AdoptionContextType | null>(null);
const TOKEN_KEY = "@canyoldasi:jwt";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

function mapFromApi(raw: Record<string, unknown>): AdoptionListing {
  return {
    id:                 String(raw.id ?? ""),
    petName:            String(raw.petName ?? ""),
    petType:            String(raw.petType ?? ""),
    petAge:             raw.petAge ? String(raw.petAge) : undefined,
    breed:              raw.breed ? String(raw.breed) : undefined,
    gender:             raw.gender ? String(raw.gender) : undefined,
    vaccinated:         Boolean(raw.vaccinated),
    photo:              raw.photoUrl ? String(raw.photoUrl) : undefined,
    location:           String(raw.location ?? ""),
    description:        String(raw.description ?? ""),
    userId:             String(raw.userId ?? ""),
    userName:           String(raw.userName ?? ""),
    contactInfo:        String(raw.contactInfo ?? ""),
    allowPhoneContact:  Boolean(raw.allowPhoneContact),
    allowMessages:      raw.allowMessages !== false,
    status:             (raw.status as AdoptionListing["status"]) ?? "Aktif",
    viewsCount:         Number(raw.viewsCount ?? 0),
    favoriteCount:      Number(raw.favoriteCount ?? 0),
    createdAt:          raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    updatedAt:          raw.updatedAt ? String(raw.updatedAt) : undefined,
    healthStatus:       raw.healthStatus ? String(raw.healthStatus) : undefined,
    vaccinationStatus:  raw.vaccinationStatus ? String(raw.vaccinationStatus) : undefined,
    environmentType:    raw.environmentType ? String(raw.environmentType) : undefined,
    childCompatibility: raw.childCompatibility ? String(raw.childCompatibility) : undefined,
    catCompatibility:   raw.catCompatibility ? String(raw.catCompatibility) : undefined,
    dogCompatibility:   raw.dogCompatibility ? String(raw.dogCompatibility) : undefined,
    toiletTraining:     raw.toiletTraining ? String(raw.toiletTraining) : undefined,
  };
}

export function AdoptionProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings]   = useState<AdoptionListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch("/adoption");
      if (!res.ok) throw new Error("Sunucu hatası");
      const data = await res.json() as Array<Record<string, unknown>>;
      setListings(data.map(mapFromApi));
    } catch {
      setError("İlanlar yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const addListing = useCallback(
    async (listing: Omit<AdoptionListing, "id" | "createdAt">): Promise<string> => {
      const res = await apiFetch("/adoption", {
        method: "POST",
        headers: { "x-user-id": listing.userId },
        body: JSON.stringify({
          petName:            listing.petName,
          petType:            listing.petType,
          petAge:             listing.petAge ?? "",
          breed:              listing.breed ?? "",
          gender:             listing.gender ?? "",
          vaccinated:         listing.vaccinated ?? false,
          photoUrl:           listing.photo ?? "",
          location:           listing.location,
          description:        listing.description,
          userName:           listing.userName,
          contactInfo:        listing.contactInfo,
          allowPhoneContact:  listing.allowPhoneContact ?? false,
          allowMessages:      listing.allowMessages ?? true,
          status:             listing.status ?? "Aktif",
          healthStatus:       listing.healthStatus,
          vaccinationStatus:  listing.vaccinationStatus,
          environmentType:    listing.environmentType,
          childCompatibility: listing.childCompatibility,
          catCompatibility:   listing.catCompatibility,
          dogCompatibility:   listing.dogCompatibility,
          toiletTraining:     listing.toiletTraining,
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data.error ?? "İlan oluşturulamadı"));

      const newListing = mapFromApi(data);
      setListings((prev) => [newListing, ...prev]);
      return newListing.id;
    },
    []
  );

  const updateListing = useCallback(
    async (id: string, updates: Partial<Omit<AdoptionListing, "id" | "createdAt">>) => {
      const userId = updates.userId ?? listings.find((l) => l.id === id)?.userId ?? "";
      const res = await apiFetch(`/adoption/${id}`, {
        method: "PATCH",
        headers: { "x-user-id": userId },
        body: JSON.stringify({
          petName:            updates.petName,
          petType:            updates.petType,
          petAge:             updates.petAge,
          breed:              updates.breed,
          gender:             updates.gender,
          vaccinated:         updates.vaccinated,
          photoUrl:           updates.photo,
          location:           updates.location,
          description:        updates.description,
          contactInfo:        updates.contactInfo,
          allowPhoneContact:  updates.allowPhoneContact,
          allowMessages:      updates.allowMessages,
          status:             updates.status,
          healthStatus:       updates.healthStatus,
          vaccinationStatus:  updates.vaccinationStatus,
          environmentType:    updates.environmentType,
          childCompatibility: updates.childCompatibility,
          catCompatibility:   updates.catCompatibility,
          dogCompatibility:   updates.dogCompatibility,
          toiletTraining:     updates.toiletTraining,
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data.error ?? "İlan güncellenemedi"));

      setListings((prev) =>
        prev.map((l) => (l.id === id ? mapFromApi(data) : l))
      );
    },
    [listings]
  );

  const deleteListing = useCallback(async (id: string) => {
    const userId = listings.find((l) => l.id === id)?.userId ?? "";
    const res = await apiFetch(`/adoption/${id}`, {
      method: "DELETE",
      headers: { "x-user-id": userId },
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new Error(String(data.error ?? "İlan silinemedi"));
    setListings((prev) => prev.filter((l) => l.id !== id));
  }, [listings]);

  const getListing = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings]
  );

  return (
    <AdoptionContext.Provider value={{ listings, isLoading, error, refresh: fetchListings, addListing, updateListing, deleteListing, getListing }}>
      {children}
    </AdoptionContext.Provider>
  );
}

export function useAdoption() {
  const ctx = useContext(AdoptionContext);
  if (!ctx) throw new Error("useAdoption must be used within AdoptionProvider");
  return ctx;
}
