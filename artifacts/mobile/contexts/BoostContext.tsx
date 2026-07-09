import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

export interface BoostPackage {
  id: string;
  packageHours: number;
  priceId: string;
  unitAmount: number;
  currency: string;
  label: string;
  description: string;
}

export interface BoostStatus {
  isFeatured: boolean;
  expiresAt: string | null;
  packageHours: number | null;
}

interface BoostContextType {
  packages: BoostPackage[];
  packagesLoading: boolean;
  boostStatuses: Record<string, BoostStatus>;
  myBoosts: any[];
  fetchPackages: () => Promise<void>;
  fetchBoostStatus: (listingIds: string[]) => Promise<void>;
  fetchMyBoosts: (userEmail: string) => Promise<void>;
  createCheckout: (params: {
    listingId: string;
    userEmail: string;
    priceId: string;
    packageHours: number;
    petName?: string;
  }) => Promise<string>;
  activateBoost: (params: {
    listingId: string;
    userEmail: string;
    packageId: string;
  }) => Promise<{ expiresAt: string; packageHours: number }>;
  isStripeReady: boolean;
}

const BoostContext = createContext<BoostContextType | null>(null);

const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}/api`;

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function BoostProvider({ children }: { children: React.ReactNode }) {
  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [boostStatuses, setBoostStatuses] = useState<Record<string, BoostStatus>>({});
  const [myBoosts, setMyBoosts] = useState<any[]>([]);
  const [isStripeReady, setIsStripeReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const data = await apiFetch("/boost/packages");
      const pkgs: BoostPackage[] = data.data ?? [];
      setPackages(pkgs);
      setIsStripeReady(pkgs.length > 0);
    } catch {
      setPackages([]);
      setIsStripeReady(false);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const fetchBoostStatus = useCallback(async (listingIds: string[]) => {
    if (!listingIds.length) return;
    try {
      const data = await apiFetch("/boost/status", {
        method: "POST",
        body: JSON.stringify({ listingIds }),
      });
      setBoostStatuses((prev) => ({ ...prev, ...(data.data ?? {}) }));
    } catch {
    }
  }, []);

  const fetchMyBoosts = useCallback(async (userEmail: string) => {
    try {
      const data = await apiFetch(
        `/boost/my-boosts?email=${encodeURIComponent(userEmail)}`
      );
      setMyBoosts(data.data ?? []);
    } catch {
      setMyBoosts([]);
    }
  }, []);

  const createCheckout = useCallback(
    async (params: {
      listingId: string;
      userEmail: string;
      priceId: string;
      packageHours: number;
      petName?: string;
    }): Promise<string> => {
      const data = await apiFetch("/boost/checkout", {
        method: "POST",
        body: JSON.stringify(params),
      });
      return data.checkoutUrl as string;
    },
    []
  );

  const activateBoost = useCallback(
    async (params: {
      listingId: string;
      userEmail: string;
      packageId: string;
    }): Promise<{ expiresAt: string; packageHours: number }> => {
      const data = await apiFetch("/boost/activate", {
        method: "POST",
        body: JSON.stringify(params),
      });
      await fetchBoostStatus([params.listingId]);
      return data.data as { expiresAt: string; packageHours: number };
    },
    [fetchBoostStatus]
  );

  useEffect(() => {
    fetchPackages();
    pollRef.current = setInterval(fetchPackages, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPackages]);

  return (
    <BoostContext.Provider
      value={{
        packages,
        packagesLoading,
        boostStatuses,
        myBoosts,
        fetchPackages,
        fetchBoostStatus,
        fetchMyBoosts,
        createCheckout,
        activateBoost,
        isStripeReady,
      }}
    >
      {children}
    </BoostContext.Provider>
  );
}

export function useBoost() {
  const ctx = useContext(BoostContext);
  if (!ctx) throw new Error("useBoost must be used within BoostProvider");
  return ctx;
}
