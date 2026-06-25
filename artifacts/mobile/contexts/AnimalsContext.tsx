import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateId } from "@/utils/formatters";

export type AnimalStatus = "hungry" | "injured" | "healthy" | "unknown";

export interface AnimalComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface StrayAnimal {
  id: string;
  image?: string;
  locationName?: string;
  latitude: number;
  longitude: number;
  status: AnimalStatus;
  notes: string;
  timestamp: string;
  userId: string;
  userName: string;
  fedByUsers: string[];
  needsHelpByUsers: string[];
  comments: AnimalComment[];
}

interface AnimalsContextType {
  animals: StrayAnimal[];
  addAnimal: (
    animal: Omit<
      StrayAnimal,
      "id" | "timestamp" | "fedByUsers" | "needsHelpByUsers" | "comments"
    >
  ) => Promise<void>;
  toggleFed: (id: string, userId: string) => Promise<void>;
  toggleNeedsHelp: (id: string, userId: string) => Promise<void>;
  addComment: (
    id: string,
    comment: Omit<AnimalComment, "id" | "timestamp">
  ) => Promise<void>;
  getAnimal: (id: string) => StrayAnimal | undefined;
}

const AnimalsContext = createContext<AnimalsContextType | null>(null);
const ANIMALS_KEY = "@canyoldasi:animals";

const SEED: StrayAnimal[] = [
  {
    id: "seed-1",
    image: "https://loremflickr.com/600/400/dog,stray?lock=301",
    locationName: "Eyüp, İstanbul",
    latitude: 41.0082,
    longitude: 28.9784,
    status: "hungry",
    notes: "Köprü altında bekliyor, düzenli mama verilmesi gerekiyor",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: "system",
    userName: "Ayşe Y.",
    fedByUsers: ["user2"],
    needsHelpByUsers: [],
    comments: [
      { id: "c-s1-1", userId: "user3", userName: "Zeynep A.", text: "Bu sabah mama bıraktım, iyiydi.", timestamp: new Date(Date.now() - 1800000).toISOString() },
      { id: "c-s1-2", userId: "user4", userName: "Murat K.", text: "Akşam da bakacağım.", timestamp: new Date(Date.now() - 600000).toISOString() },
      { id: "c-s1-3", userId: "user5", userName: "Selin B.", text: "Teşekkürler 🐾", timestamp: new Date(Date.now() - 300000).toISOString() },
    ],
  },
  {
    id: "seed-2",
    image: "https://loremflickr.com/600/400/cat,stray?lock=302",
    locationName: "Kadıköy, İstanbul",
    latitude: 41.014,
    longitude: 28.972,
    status: "healthy",
    notes: "Park girişinde yaşıyor, mahalle sakinleri besliyor",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    userId: "system",
    userName: "Mehmet K.",
    fedByUsers: ["user1", "user3", "user5"],
    needsHelpByUsers: [],
    comments: [
      { id: "c-s2-1", userId: "user1", userName: "Ayşe Y.", text: "Çok tatlı bir kedi!", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: "c-s2-2", userId: "user6", userName: "Hasan D.", text: "Her gün buradayım 😊", timestamp: new Date(Date.now() - 1200000).toISOString() },
      { id: "c-s2-3", userId: "user7", userName: "Leyla S.", text: "Sağlıklı görünüyor, iyi ki var.", timestamp: new Date(Date.now() - 900000).toISOString() },
      { id: "c-s2-4", userId: "user8", userName: "Burak A.", text: "Parkın maskotu olmuş 🐈", timestamp: new Date(Date.now() - 600000).toISOString() },
      { id: "c-s2-5", userId: "user9", userName: "Dilara M.", text: "Dün da gördüm, mutlu.", timestamp: new Date(Date.now() - 300000).toISOString() },
      { id: "c-s2-6", userId: "user10", userName: "Cem Ö.", text: "👍", timestamp: new Date(Date.now() - 120000).toISOString() },
    ],
  },
  {
    id: "seed-3",
    image: "https://loremflickr.com/600/400/dog,injured?lock=303",
    locationName: "Üsküdar, İstanbul",
    latitude: 40.998,
    longitude: 29.018,
    status: "injured",
    notes: "Ön bacağında yara var, veteriner yardımı gerekiyor",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    userId: "system",
    userName: "Fatma D.",
    fedByUsers: [],
    needsHelpByUsers: ["user1", "user2"],
    comments: [
      {
        id: "c-s3-1",
        userId: "user2",
        userName: "Zeynep A.",
        text: "Yarın sabah veteriner götürebilirim.",
        timestamp: new Date(Date.now() - 900000).toISOString(),
      },
      {
        id: "c-s3-2",
        userId: "user4",
        userName: "Murat K.",
        text: "Adres paylaşır mısınız?",
        timestamp: new Date(Date.now() - 450000).toISOString(),
      },
      {
        id: "c-s3-3",
        userId: "user5",
        userName: "Selin B.",
        text: "Geçmiş olsun 💔",
        timestamp: new Date(Date.now() - 200000).toISOString(),
      },
      {
        id: "c-s3-4",
        userId: "user6",
        userName: "Hasan D.",
        text: "Ben de yardım edebilirim.",
        timestamp: new Date(Date.now() - 100000).toISOString(),
      },
    ],
  },
  {
    id: "seed-4",
    image: "https://loremflickr.com/600/400/cat,black?lock=304",
    locationName: "Ataşehir, İstanbul",
    latitude: 41.022,
    longitude: 28.963,
    status: "unknown",
    notes: "İlk kez görüldü, durumu bilinmiyor",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    userId: "system",
    userName: "Ali R.",
    fedByUsers: [],
    needsHelpByUsers: [],
    comments: [],
  },
];

export function AnimalsProvider({ children }: { children: React.ReactNode }) {
  const [animals, setAnimals] = useState<StrayAnimal[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(ANIMALS_KEY).then((data) => {
      if (data) {
        setAnimals(JSON.parse(data));
      } else {
        setAnimals(SEED);
        AsyncStorage.setItem(ANIMALS_KEY, JSON.stringify(SEED));
      }
    });
  }, []);

  const save = useCallback(async (updated: StrayAnimal[]) => {
    setAnimals(updated);
    await AsyncStorage.setItem(ANIMALS_KEY, JSON.stringify(updated));
  }, []);

  const addAnimal = useCallback(
    async (
      animal: Omit<
        StrayAnimal,
        "id" | "timestamp" | "fedByUsers" | "needsHelpByUsers" | "comments"
      >
    ) => {
      const newAnimal: StrayAnimal = {
        ...animal,
        id: generateId(),
        timestamp: new Date().toISOString(),
        fedByUsers: [],
        needsHelpByUsers: [],
        comments: [],
      };
      const updated = [newAnimal, ...animals];
      await save(updated);
    },
    [animals, save]
  );

  const toggleFed = useCallback(
    async (id: string, userId: string) => {
      const updated = animals.map((a) => {
        if (a.id !== id) return a;
        const has = a.fedByUsers.includes(userId);
        return {
          ...a,
          fedByUsers: has
            ? a.fedByUsers.filter((u) => u !== userId)
            : [...a.fedByUsers, userId],
        };
      });
      await save(updated);
    },
    [animals, save]
  );

  const toggleNeedsHelp = useCallback(
    async (id: string, userId: string) => {
      const updated = animals.map((a) => {
        if (a.id !== id) return a;
        const has = a.needsHelpByUsers.includes(userId);
        return {
          ...a,
          needsHelpByUsers: has
            ? a.needsHelpByUsers.filter((u) => u !== userId)
            : [...a.needsHelpByUsers, userId],
        };
      });
      await save(updated);
    },
    [animals, save]
  );

  const addComment = useCallback(
    async (id: string, comment: Omit<AnimalComment, "id" | "timestamp">) => {
      const newComment: AnimalComment = {
        ...comment,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };
      const updated = animals.map((a) =>
        a.id === id ? { ...a, comments: [...a.comments, newComment] } : a
      );
      await save(updated);
    },
    [animals, save]
  );

  const getAnimal = useCallback(
    (id: string) => animals.find((a) => a.id === id),
    [animals]
  );

  return (
    <AnimalsContext.Provider
      value={{ animals, addAnimal, toggleFed, toggleNeedsHelp, addComment, getAnimal }}
    >
      {children}
    </AnimalsContext.Provider>
  );
}

export function useAnimals() {
  const ctx = useContext(AnimalsContext);
  if (!ctx) throw new Error("useAnimals must be used within AnimalsProvider");
  return ctx;
}
