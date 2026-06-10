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
  photo?: string;
  location: string;
  description: string;
  userId: string;
  userName: string;
  contactInfo: string;
  createdAt: string;
}

interface AdoptionContextType {
  listings: AdoptionListing[];
  addListing: (listing: Omit<AdoptionListing, "id" | "createdAt">) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  getListing: (id: string) => AdoptionListing | undefined;
}

const AdoptionContext = createContext<AdoptionContextType | null>(null);
const ADOPTION_KEY = "@canyoldasi:adoption";

const SEED: AdoptionListing[] = [
  {
    id: "seed-adopt-1",
    petName: "Pamuk",
    petType: "Kedi",
    petAge: "2 yaş",
    location: "Kadıköy, İstanbul",
    description:
      "Çok sevecen ve oyuncu bir dişi kedi. Kısırlaştırılmış, tüm aşıları tamamlanmış. Sakin bir ev ortamı arıyor.",
    userId: "system",
    userName: "Zeynep K.",
    contactInfo: "zeynep@example.com",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "seed-adopt-2",
    petName: "Karamel",
    petType: "Köpek",
    petAge: "1 yaş",
    location: "Beşiktaş, İstanbul",
    description:
      "Golden retriever melezi, çok enerjik ve sevecen. Çocuklarla arası çok iyi. Bahçeli ev tercih edilir.",
    userId: "system",
    userName: "Ahmet M.",
    contactInfo: "0532 XXX XX XX",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
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
    async (listing: Omit<AdoptionListing, "id" | "createdAt">) => {
      const newListing: AdoptionListing = {
        ...listing,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      await save([newListing, ...listings]);
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
    <AdoptionContext.Provider value={{ listings, addListing, deleteListing, getListing }}>
      {children}
    </AdoptionContext.Provider>
  );
}

export function useAdoption() {
  const ctx = useContext(AdoptionContext);
  if (!ctx) throw new Error("useAdoption must be used within AdoptionProvider");
  return ctx;
}
