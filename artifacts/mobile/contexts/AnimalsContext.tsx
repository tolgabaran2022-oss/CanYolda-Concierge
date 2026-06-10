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
    latitude: 41.0082,
    longitude: 28.9784,
    status: "hungry",
    notes: "Köprü altında bekliyor, düzenli mama verilmesi gerekiyor",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: "system",
    userName: "Ayşe Y.",
    fedByUsers: [],
    needsHelpByUsers: [],
    comments: [],
  },
  {
    id: "seed-2",
    latitude: 41.014,
    longitude: 28.972,
    status: "healthy",
    notes: "Park girişinde yaşıyor, mahalle sakinleri besliyor",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    userId: "system",
    userName: "Mehmet K.",
    fedByUsers: ["user1"],
    needsHelpByUsers: [],
    comments: [],
  },
  {
    id: "seed-3",
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
        id: "c1",
        userId: "user2",
        userName: "Zeynep A.",
        text: "Yarın sabah veteriner götürebilirim.",
        timestamp: new Date(Date.now() - 900000).toISOString(),
      },
    ],
  },
  {
    id: "seed-4",
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
