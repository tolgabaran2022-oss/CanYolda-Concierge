import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  followedAt?: string;
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
  /* Follow / Takip */
  followedIds: Set<string>;
  followListing: (id: string) => Promise<void>;
  unfollowListing: (id: string) => Promise<void>;
  isFollowed: (id: string) => boolean;
  followedListings: AdoptionListing[];
  loadFollowed: () => Promise<void>;
  followedLoading: boolean;
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
    followedAt:         raw.followedAt ? String(raw.followedAt) : undefined,
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
  const [listings, setListings]         = useState<AdoptionListing[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [followedIds, setFollowedIds]   = useState<Set<string>>(new Set());
  const [followedListings, setFollowedListings] = useState<AdoptionListing[]>([]);
  const [followedLoading, setFollowedLoading]   = useState(false);

  /* mutation lock — prevents double-tap duplicates */
  const followInFlight = useRef<Set<string>>(new Set());

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

  const loadFollowed = useCallback(async () => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;                    /* not logged in */
    setFollowedLoading(true);
    try {
      const res = await apiFetch("/adoption/followed");
      if (!res.ok) return;
      const data = await res.json() as Array<Record<string, unknown>>;
      const mapped = data.map(mapFromApi);
      setFollowedListings(mapped);
      setFollowedIds(new Set(mapped.map((l) => l.id)));
    } catch {
      /* silently ignore — heart states simply won't pre-populate */
    } finally {
      setFollowedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    loadFollowed();
  }, [fetchListings, loadFollowed]);

  const followListing = useCallback(async (id: string) => {
    if (followInFlight.current.has(id)) return;
    followInFlight.current.add(id);

    /* Optimistic update */
    setFollowedIds((prev) => new Set([...prev, id]));
    const listing = listings.find((l) => l.id === id);
    if (listing) {
      setFollowedListings((prev) => [
        { ...listing, followedAt: new Date().toISOString() },
        ...prev.filter((l) => l.id !== id),
      ]);
    }

    try {
      const res = await apiFetch(`/adoption/${id}/follow`, { method: "POST" });
      if (!res.ok) {
        /* rollback */
        setFollowedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        setFollowedListings((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      /* rollback */
      setFollowedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setFollowedListings((prev) => prev.filter((l) => l.id !== id));
    } finally {
      followInFlight.current.delete(id);
    }
  }, [listings]);

  const unfollowListing = useCallback(async (id: string) => {
    if (followInFlight.current.has(id)) return;
    followInFlight.current.add(id);

    /* Optimistic update */
    const prevFollowedIds = new Set(followedIds);
    const prevFollowedListings = [...followedListings];
    setFollowedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setFollowedListings((prev) => prev.filter((l) => l.id !== id));

    try {
      const res = await apiFetch(`/adoption/${id}/follow`, { method: "DELETE" });
      if (!res.ok) {
        /* rollback */
        setFollowedIds(prevFollowedIds);
        setFollowedListings(prevFollowedListings);
      }
    } catch {
      /* rollback */
      setFollowedIds(prevFollowedIds);
      setFollowedListings(prevFollowedListings);
    } finally {
      followInFlight.current.delete(id);
    }
  }, [followedIds, followedListings]);

  const isFollowed = useCallback((id: string) => followedIds.has(id), [followedIds]);

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
    /* Also remove from followed */
    setFollowedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setFollowedListings((prev) => prev.filter((l) => l.id !== id));
  }, [listings]);

  const getListing = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings]
  );

  return (
    <AdoptionContext.Provider value={{
      listings, isLoading, error,
      refresh: fetchListings,
      addListing, updateListing, deleteListing, getListing,
      followedIds, followListing, unfollowListing, isFollowed,
      followedListings, loadFollowed, followedLoading,
    }}>
      {children}
    </AdoptionContext.Provider>
  );
}

export function useAdoption() {
  const ctx = useContext(AdoptionContext);
  if (!ctx) throw new Error("useAdoption must be used within AdoptionProvider");
  return ctx;
}
