import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetPetPremiumStatus, apiRefreshPetPremium, type ApiPetPremiumStatus } from "@/lib/petManagementApi";

type PetPremiumContextValue = {
  status: ApiPetPremiumStatus | null;
  isPremium: boolean;
  isLoading: boolean;
  refresh: (verifyStore?: boolean) => Promise<ApiPetPremiumStatus | null>;
};

const PetPremiumContext = createContext<PetPremiumContextValue | null>(null);

export function PetPremiumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ApiPetPremiumStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (verifyStore = false): Promise<ApiPetPremiumStatus | null> => {
    if (!user?.id) { setStatus(null); setIsLoading(false); return null; }
    setIsLoading(true);
    try {
      const next = verifyStore ? await apiRefreshPetPremium() : await apiGetPetPremiumStatus();
      setStatus(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(false).catch(() => setIsLoading(false)); }, [refresh]);

  const value = useMemo(() => ({
    status,
    isPremium: status?.isPremium === true,
    isLoading,
    refresh,
  }), [status, isLoading, refresh]);

  return <PetPremiumContext.Provider value={value}>{children}</PetPremiumContext.Provider>;
}

export function usePetPremium() {
  const value = useContext(PetPremiumContext);
  if (!value) throw new Error("usePetPremium must be used within PetPremiumProvider");
  return value;
}
