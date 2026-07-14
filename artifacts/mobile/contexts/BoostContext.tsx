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
  code: string;
  name: string;
  durationDays: number;
  priceAmount: number;
  currency: string;
  badgeText: string | null;
  shortDescription: string;
  isPopular: boolean;
  displayOrder: number;
  rcPackageIdentifier: string;
}

export interface BoostStatus {
  isFeatured: boolean;
  expiresAt: string | null;
  packageHours: number | null;
  packageName: string | null;
}

interface BoostContextType {
  packages: BoostPackage[];
  packagesLoading: boolean;
  boostStatuses: Record<string, BoostStatus>;
  fetchBoostStatus: (listingIds: string[]) => Promise<void>;
  purchaseBoost: (params: {
    listingId: string;
    rcPackageIdentifier: string;
    durationDays: number;
    packageName: string;
    token: string;
  }) => Promise<{ expiresAt: string }>;
  isIapReady: boolean;
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
    throw new Error((body as any).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

const RC_PACKAGES: BoostPackage[] = [
  {
    id: "boost_1_day",
    code: "boost_1_day",
    name: "1 Günlük Boost",
    durationDays: 1,
    priceAmount: 2999,
    currency: "try",
    badgeText: null,
    shortDescription: "1 gün daha fazla kişiye ulaş.",
    isPopular: false,
    displayOrder: 1,
    rcPackageIdentifier: "$rc_weekly",
  },
  {
    id: "boost_3_days",
    code: "boost_3_days",
    name: "3 Günlük Boost",
    durationDays: 3,
    priceAmount: 5999,
    currency: "try",
    badgeText: "EN ÇOK TERCİH EDİLEN",
    shortDescription: "3 gün güçlü görünürlük kazan.",
    isPopular: true,
    displayOrder: 2,
    rcPackageIdentifier: "$rc_weekly",
  },
  {
    id: "boost_7_days",
    code: "boost_7_days",
    name: "7 Günlük Boost",
    durationDays: 7,
    priceAmount: 9999,
    currency: "try",
    badgeText: null,
    shortDescription: "7 gün boyunca ilanını öne taşı.",
    isPopular: false,
    displayOrder: 3,
    rcPackageIdentifier: "$rc_monthly",
  },
];

export function BoostProvider({ children }: { children: React.ReactNode }) {
  const [packages] = useState<BoostPackage[]>(RC_PACKAGES);
  const [packagesLoading] = useState(false);
  const [boostStatuses, setBoostStatuses] = useState<Record<string, BoostStatus>>({});
  const [isIapReady, setIsIapReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setIsIapReady(true);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchBoostStatus = useCallback(async (listingIds: string[]) => {
    if (!listingIds.length) return;
    try {
      const data = await apiFetch("/boost/status", {
        method: "POST",
        body: JSON.stringify({ listingIds }),
      });
      setBoostStatuses((prev) => ({ ...prev, ...((data as any).data ?? {}) }));
    } catch {
    }
  }, []);

  const purchaseBoost = useCallback(
    async (params: {
      listingId: string;
      rcPackageIdentifier: string;
      durationDays: number;
      packageName: string;
      token: string;
    }): Promise<{ expiresAt: string }> => {
      const data = await apiFetch("/boost/verify-iap", {
        method: "POST",
        headers: { Authorization: `Bearer ${params.token}` },
        body: JSON.stringify({
          listingId: params.listingId,
          rcPackageIdentifier: params.rcPackageIdentifier,
          durationDays: params.durationDays,
          packageName: params.packageName,
        }),
      });
      await fetchBoostStatus([params.listingId]);
      return { expiresAt: (data as any).expiresAt };
    },
    [fetchBoostStatus]
  );

  return (
    <BoostContext.Provider
      value={{
        packages,
        packagesLoading,
        boostStatuses,
        fetchBoostStatus,
        purchaseBoost,
        isIapReady,
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
