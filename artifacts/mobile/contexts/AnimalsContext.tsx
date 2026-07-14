import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AnimalType } from "@/utils/animalDefaults";

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
  animalType?: AnimalType;
  animalImage?: string;
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
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAnimal: (
    animal: Omit<StrayAnimal, "id" | "timestamp" | "fedByUsers" | "needsHelpByUsers" | "comments">
  ) => Promise<void>;
  toggleFed: (id: string, userId: string) => Promise<void>;
  toggleNeedsHelp: (id: string, userId: string) => Promise<void>;
  addComment: (id: string, comment: Omit<AnimalComment, "id" | "timestamp">) => Promise<void>;
  deleteAnimal: (id: string, userId: string) => Promise<void>;
  getAnimal: (id: string) => StrayAnimal | undefined;
}

const AnimalsContext = createContext<AnimalsContextType | null>(null);
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

async function safeJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    await res.text().catch(() => "");
    throw new Error(`Beklenmedik sunucu yanıtı (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function mapFromApi(raw: Record<string, unknown>): StrayAnimal {
  const interactions = (raw.interactions as string[] | undefined) ?? [];
  const comments = (raw.comments as Array<Record<string, unknown>> | undefined) ?? [];

  return {
    id:               String(raw.id ?? ""),
    image:            raw.imageUrl ? String(raw.imageUrl) : undefined,
    animalType:       raw.animalType ? (String(raw.animalType) as AnimalType) : undefined,
    locationName:     raw.locationName ? String(raw.locationName) : undefined,
    latitude:         Number(raw.latitude ?? 0),
    longitude:        Number(raw.longitude ?? 0),
    status:           (raw.status as AnimalStatus) ?? "unknown",
    notes:            String(raw.notes ?? ""),
    timestamp:        raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    userId:           String(raw.userId ?? ""),
    userName:         String(raw.userName ?? ""),
    fedByUsers:       interactions.filter((i: string) => i.startsWith("fed:")),
    needsHelpByUsers: interactions.filter((i: string) => i.startsWith("help:")),
    comments:         comments.map((c) => ({
      id:        String(c.id ?? ""),
      userId:    String(c.userId ?? ""),
      userName:  String(c.userName ?? ""),
      text:      String(c.text ?? ""),
      timestamp: c.createdAt ? String(c.createdAt) : new Date().toISOString(),
    })),
  };
}

export function AnimalsProvider({ children }: { children: React.ReactNode }) {
  const [animals, setAnimals]     = useState<StrayAnimal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchAnimals = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch("/animals");
      if (!res.ok) throw new Error("Sunucu hatası");
      const data = await safeJson<Array<Record<string, unknown>>>(res);
      setAnimals(data.map((raw) => {
        const fedSet: string[]  = [];
        const helpSet: string[] = [];
        if (raw.isFedByMe)       fedSet.push("_current_user_");
        if (raw.isNeedsHelpByMe) helpSet.push("_current_user_");
        return {
          id:               String(raw.id ?? ""),
          image:            raw.imageUrl ? String(raw.imageUrl) : undefined,
          animalType:       raw.animalType ? (String(raw.animalType) as AnimalType) : undefined,
          locationName:     raw.locationName ? String(raw.locationName) : undefined,
          latitude:         Number(raw.latitude ?? 0),
          longitude:        Number(raw.longitude ?? 0),
          status:           (raw.status as AnimalStatus) ?? "unknown",
          notes:            String(raw.notes ?? ""),
          timestamp:        raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
          userId:           String(raw.userId ?? ""),
          userName:         String(raw.userName ?? ""),
          fedByUsers:       fedSet,
          needsHelpByUsers: helpSet,
          comments:         [],
        };
      }));
    } catch {
      setError("Hayvan listesi yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

  const addAnimal = useCallback(
    async (
      animal: Omit<StrayAnimal, "id" | "timestamp" | "fedByUsers" | "needsHelpByUsers" | "comments">
    ) => {
      const res = await apiFetch("/animals", {
        method: "POST",
        body: JSON.stringify({
          imageUrl:     animal.image ?? "",
          animalType:   animal.animalType ?? "",
          locationName: animal.locationName ?? "",
          latitude:     animal.latitude,
          longitude:    animal.longitude,
          status:       animal.status,
          notes:        animal.notes,
          userName:     animal.userName,
        }),
        headers: { "x-user-id": animal.userId },
      });
      const data = await safeJson<Record<string, unknown>>(res);
      if (!res.ok) throw new Error(String(data.error ?? "Rapor oluşturulamadı"));

      const newAnimal: StrayAnimal = {
        ...animal,
        id:               String(data.id ?? ""),
        timestamp:        data.createdAt ? String(data.createdAt) : new Date().toISOString(),
        fedByUsers:       [],
        needsHelpByUsers: [],
        comments:         [],
      };
      setAnimals((prev) => [newAnimal, ...prev]);
    },
    []
  );

  const toggleFed = useCallback(async (id: string, userId: string) => {
    const res = await apiFetch(`/animals/${id}/fed`, {
      method: "POST",
      headers: { "x-user-id": userId },
    });
    if (!res.ok) throw new Error("İşlem başarısız");
    const { fed } = await safeJson<{ fed: boolean; fedCount: number }>(res);

    setAnimals((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          fedByUsers: fed
            ? [...a.fedByUsers.filter((u) => u !== userId), userId]
            : a.fedByUsers.filter((u) => u !== userId),
        };
      })
    );
  }, []);

  const toggleNeedsHelp = useCallback(async (id: string, userId: string) => {
    const res = await apiFetch(`/animals/${id}/needs-help`, {
      method: "POST",
      headers: { "x-user-id": userId },
    });
    if (!res.ok) throw new Error("İşlem başarısız");
    const { needsHelp } = await safeJson<{ needsHelp: boolean; needsHelpCount: number }>(res);

    setAnimals((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          needsHelpByUsers: needsHelp
            ? [...a.needsHelpByUsers.filter((u) => u !== userId), userId]
            : a.needsHelpByUsers.filter((u) => u !== userId),
        };
      })
    );
  }, []);

  const addComment = useCallback(
    async (id: string, comment: Omit<AnimalComment, "id" | "timestamp">) => {
      const res = await apiFetch(`/animals/${id}/comments`, {
        method: "POST",
        headers: { "x-user-id": comment.userId },
        body: JSON.stringify({ text: comment.text, userName: comment.userName }),
      });
      const data = await safeJson<Record<string, unknown>>(res);
      if (!res.ok) throw new Error(String(data.error ?? "Yorum eklenemedi"));

      const newComment: AnimalComment = {
        id:        String(data.id ?? ""),
        userId:    comment.userId,
        userName:  comment.userName,
        text:      comment.text,
        timestamp: data.createdAt ? String(data.createdAt) : new Date().toISOString(),
      };

      setAnimals((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, comments: [...a.comments, newComment] } : a
        )
      );
    },
    []
  );

  const deleteAnimal = useCallback(async (id: string, userId: string) => {
    const res = await apiFetch(`/animals/${id}`, {
      method: "DELETE",
      headers: { "x-user-id": userId },
    });
    const data = await safeJson<Record<string, unknown>>(res);
    if (!res.ok) throw new Error(String(data.error ?? "Bildirim silinemedi"));
    setAnimals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getAnimal = useCallback(
    (id: string) => animals.find((a) => a.id === id),
    [animals]
  );

  return (
    <AnimalsContext.Provider
      value={{ animals, isLoading, error, refresh: fetchAnimals, addAnimal, toggleFed, toggleNeedsHelp, addComment, deleteAnimal, getAnimal }}
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

// keep mapFromApi in scope to avoid lint warning
void mapFromApi;
