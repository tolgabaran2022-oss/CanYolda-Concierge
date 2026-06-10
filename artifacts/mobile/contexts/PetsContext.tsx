import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { generateId } from "@/utils/formatters";

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: string;
  image?: string;
  vaccinationInfo: string;
  feedingNotes: string;
  userId: string;
  createdAt: string;
}

interface PetsContextType {
  pets: Pet[];
  addPet: (pet: Omit<Pet, "id" | "createdAt">) => Promise<void>;
  updatePet: (id: string, updates: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  getPet: (id: string) => Pet | undefined;
}

const PetsContext = createContext<PetsContextType | null>(null);
const PETS_KEY = "@canyoldasi:pets";

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(PETS_KEY).then((data) => {
      if (data) setPets(JSON.parse(data));
    });
  }, []);

  const save = useCallback(async (updated: Pet[]) => {
    setPets(updated);
    await AsyncStorage.setItem(PETS_KEY, JSON.stringify(updated));
  }, []);

  const addPet = useCallback(
    async (pet: Omit<Pet, "id" | "createdAt">) => {
      const newPet: Pet = {
        ...pet,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      await save([newPet, ...pets]);
    },
    [pets, save]
  );

  const updatePet = useCallback(
    async (id: string, updates: Partial<Pet>) => {
      await save(pets.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [pets, save]
  );

  const deletePet = useCallback(
    async (id: string) => {
      await save(pets.filter((p) => p.id !== id));
    },
    [pets, save]
  );

  const getPet = useCallback(
    (id: string) => pets.find((p) => p.id === id),
    [pets]
  );

  return (
    <PetsContext.Provider value={{ pets, addPet, updatePet, deletePet, getPet }}>
      {children}
    </PetsContext.Provider>
  );
}

export function usePets() {
  const ctx = useContext(PetsContext);
  if (!ctx) throw new Error("usePets must be used within PetsProvider");
  return ctx;
}
