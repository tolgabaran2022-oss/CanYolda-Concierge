import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: string;
  gender?: string;
  birthDate?: string;
  weight?: string;
  image?: string;
  vaccinationInfo: string;
  feedingNotes: string;
  userId: string;
  createdAt: string;
}

interface PetsContextType {
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addPet: (pet: Omit<Pet, "id" | "createdAt">) => Promise<void>;
  updatePet: (id: string, updates: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  getPet: (id: string) => Pet | undefined;
}

const PetsContext = createContext<PetsContextType | null>(null);
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

function mapFromApi(raw: Record<string, unknown>): Pet {
  return {
    id:              String(raw.id ?? ""),
    name:            String(raw.name ?? ""),
    type:            String(raw.type ?? ""),
    breed:           raw.breed    ? String(raw.breed)     : undefined,
    age:             raw.age      ? String(raw.age)       : undefined,
    gender:          raw.gender   ? String(raw.gender)    : undefined,
    birthDate:       raw.birthDate ? String(raw.birthDate) : undefined,
    weight:          raw.weight   ? String(raw.weight)    : undefined,
    image:           raw.avatarUrl ? String(raw.avatarUrl) : undefined,
    vaccinationInfo: String(raw.vaccinationInfo ?? ""),
    feedingNotes:    String(raw.feedingNotes ?? ""),
    userId:          String(raw.ownerId ?? ""),
    createdAt:       raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
  };
}

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets]           = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@canyoldasi:auth").then((data) => {
      if (data) {
        const parsed = JSON.parse(data) as { id: string };
        setUserId(parsed.id ?? null);
      }
    });
  }, []);

  const fetchPets = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }
    try {
      setError(null);
      const res = await apiFetch("/pets");
      if (!res.ok) throw new Error("Sunucu hatası");
      const data = await safeJson<Array<Record<string, unknown>>>(res);
      setPets(data.map(mapFromApi));
    } catch {
      setError("Evcil hayvanlar yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchPets(); }, [fetchPets]);

  const addPet = useCallback(
    async (pet: Omit<Pet, "id" | "createdAt">) => {
      const res = await apiFetch("/pets", {
        method: "POST",
        body: JSON.stringify({
          name:            pet.name,
          type:            pet.type,
          breed:           pet.breed       ?? "",
          age:             pet.age         ?? "",
          gender:          pet.gender      ?? "",
          birthDate:       pet.birthDate   ?? "",
          weight:          pet.weight      ?? "",
          avatarUrl:       pet.image       ?? "",
          vaccinationInfo: pet.vaccinationInfo,
          feedingNotes:    pet.feedingNotes,
        }),
      });
      const data = await safeJson<Record<string, unknown>>(res);
      if (res.status === 402 && data.code === "PET_PREMIUM_REQUIRED") {
        const err = new Error("PET_PREMIUM_REQUIRED") as Error & { code: string };
        err.code = "PET_PREMIUM_REQUIRED";
        throw err;
      }
      if (!res.ok) throw new Error(String(data.error ?? "Evcil hayvan eklenemedi"));
      const newPet = mapFromApi(data);
      setPets((prev) => [newPet, ...prev]);
    },
    []
  );

  const updatePet = useCallback(
    async (id: string, updates: Partial<Pet>) => {
      const uid = updates.userId ?? pets.find((p) => p.id === id)?.userId ?? "";
      const res = await apiFetch(`/pets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name:            updates.name,
          type:            updates.type,
          breed:           updates.breed,
          age:             updates.age,
          gender:          updates.gender,
          birthDate:       updates.birthDate,
          weight:          updates.weight,
          avatarUrl:       updates.image,
          vaccinationInfo: updates.vaccinationInfo,
          feedingNotes:    updates.feedingNotes,
        }),
      });
      const data = await safeJson<Record<string, unknown>>(res);
      if (!res.ok) throw new Error(String(data.error ?? "Evcil hayvan güncellenemedi"));
      setPets((prev) =>
        prev.map((p) => (p.id === id ? mapFromApi(data) : p))
      );
    },
    [pets]
  );

  const deletePet = useCallback(async (id: string) => {
    const uid = pets.find((p) => p.id === id)?.userId ?? "";
    const res = await apiFetch(`/pets/${id}`, {
      method: "DELETE",
    });
    const data = await safeJson<Record<string, unknown>>(res);
    if (!res.ok) throw new Error(String(data.error ?? "Evcil hayvan silinemedi"));
    setPets((prev) => prev.filter((p) => p.id !== id));
  }, [pets]);

  const getPet = useCallback(
    (id: string) => pets.find((p) => p.id === id),
    [pets]
  );

  return (
    <PetsContext.Provider value={{ pets, isLoading, error, refresh: fetchPets, addPet, updatePet, deletePet, getPet }}>
      {children}
    </PetsContext.Provider>
  );
}

export function usePets() {
  const ctx = useContext(PetsContext);
  if (!ctx) throw new Error("usePets must be used within PetsProvider");
  return ctx;
}
