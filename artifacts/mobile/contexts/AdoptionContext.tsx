import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateId } from "@/utils/formatters";

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
}

interface AdoptionContextType {
  listings: AdoptionListing[];
  addListing: (listing: Omit<AdoptionListing, "id" | "createdAt">) => Promise<string>;
  updateListing: (id: string, updates: Partial<Omit<AdoptionListing, "id" | "createdAt">>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  getListing: (id: string) => AdoptionListing | undefined;
}

const AdoptionContext = createContext<AdoptionContextType | null>(null);
const ADOPTION_KEY = "@canyoldasi:adoption:v3";

const SEED: AdoptionListing[] = [
  {
    id: "seed-adopt-1",
    petName: "Pamuk",
    petType: "Kedi",
    petAge: "British Shorthair • 2 yaş",
    photo: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&q=80",
    location: "Kadıköy, İstanbul",
    description: "Sakin, oyuncu ve sevgi dolu bir patili dost. Aşıları tamam.",
    userId: "system",
    userName: "Zeynep K.",
    contactInfo: "zeynep@example.com",
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: "seed-adopt-2",
    petName: "Badem",
    petType: "Köpek",
    petAge: "Golden Retriever • 1.5 yaş",
    photo: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&q=80",
    location: "Üsküdar, İstanbul",
    description: "Enerjik, arkadaş canlısı ve çocuklarla çok iyi anlaşır.",
    userId: "system",
    userName: "Ahmet M.",
    contactInfo: "0532 XXX XX XX",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "seed-adopt-3",
    petName: "Misket",
    petType: "Kedi",
    petAge: "Tekir • 3 ay",
    photo: "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400&q=80",
    location: "Beşiktaş, İstanbul",
    description: "Oyuncu, meraklı ve çok tatlı bir yavru kedi.",
    userId: "system",
    userName: "Selin A.",
    contactInfo: "selin@example.com",
    createdAt: new Date(Date.now() - 172_800_000).toISOString(),
  },
  {
    id: "seed-adopt-4",
    petName: "Limon",
    petType: "Tavşan",
    petAge: "Hollanda Lop • 6 ay",
    photo: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&q=80",
    location: "Bakırköy, İstanbul",
    description: "Sevecen, tuvalet eğitimi var ve sağlıklıdır.",
    userId: "system",
    userName: "Merve T.",
    contactInfo: "merve@example.com",
    createdAt: new Date(Date.now() - 259_200_000).toISOString(),
  },
  {
    id: "seed-adopt-5",
    petName: "Atlas",
    petType: "Köpek",
    petAge: "Husky • 2 yaş",
    photo: "https://images.unsplash.com/photo-1547407139-3c921a66005c?w=400&q=80",
    location: "Şişli, İstanbul",
    description: "Aktif, zeki ve geniş alana ihtiyaç duyan bir Husky.",
    userId: "system",
    userName: "Can B.",
    contactInfo: "can@example.com",
    createdAt: new Date(Date.now() - 345_600_000).toISOString(),
  },
];

export function AdoptionProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<AdoptionListing[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(ADOPTION_KEY).then((data) => {
      if (data) {
        setListings(JSON.parse(data));
      } else {
        setListings(SEED);
        AsyncStorage.setItem(ADOPTION_KEY, JSON.stringify(SEED));
      }
    });
  }, []);

  const save = useCallback(async (updated: AdoptionListing[]) => {
    setListings(updated);
    await AsyncStorage.setItem(ADOPTION_KEY, JSON.stringify(updated));
  }, []);

  const addListing = useCallback(
    async (listing: Omit<AdoptionListing, "id" | "createdAt">): Promise<string> => {
      const newListing: AdoptionListing = {
        ...listing,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      await save([newListing, ...listings]);
      return newListing.id;
    },
    [listings, save]
  );

  const updateListing = useCallback(
    async (id: string, updates: Partial<Omit<AdoptionListing, "id" | "createdAt">>) => {
      await save(
        listings.map((l) =>
          l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
        )
      );
    },
    [listings, save]
  );

  const deleteListing = useCallback(
    async (id: string) => {
      await save(listings.filter((l) => l.id !== id));
    },
    [listings, save]
  );

  const getListing = useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings]
  );

  return (
    <AdoptionContext.Provider value={{ listings, addListing, updateListing, deleteListing, getListing }}>
      {children}
    </AdoptionContext.Provider>
  );
}

export function useAdoption() {
  const ctx = useContext(AdoptionContext);
  if (!ctx) throw new Error("useAdoption must be used within AdoptionProvider");
  return ctx;
}
