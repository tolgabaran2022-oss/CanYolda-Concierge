import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

const RC_BASE = "https://api.revenuecat.com";

async function rcFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Missing Replit environment variables for connector proxy");
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=revenuecat`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) throw new Error(`Failed to fetch RevenueCat credentials: ${resp.status}`);

  const data = await resp.json() as { items?: Array<{ settings?: { api_key?: string } }> };
  const apiKey = data.items?.[0]?.settings?.api_key;
  if (!apiKey) throw new Error("RevenueCat API key not found in connector settings");

  return fetch(`${RC_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  });
}

type RcResult<T> = { data?: T; error?: unknown };

async function rcGet<T>(path: string): Promise<RcResult<T>> {
  const resp = await rcFetch(path, { method: "GET" });
  const json = await resp.json() as T | { type: string; message: string };
  if (!resp.ok) return { error: json };
  return { data: json as T };
}

async function rcPost<T>(path: string, body: unknown): Promise<RcResult<T>> {
  const resp = await rcFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await resp.json() as T | { type: string; message: string };
  if (!resp.ok) return { error: json };
  return { data: json as T };
}

async function rcPatch<T>(path: string, body: unknown): Promise<RcResult<T>> {
  const resp = await rcFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const json = await resp.json() as T | { type: string; message: string };
  if (!resp.ok) return { error: json };
  return { data: json as T };
}

/* ── Types ── */
interface RcList<T> { items: T[]; next_page?: string; object: string }

interface RcProject { id: string; name: string; created_at: number }
interface RcApp { id: string; name: string; type: string; created_at: number }
interface RcProduct { id: string; store_identifier: string; app_id: string; type: string; display_name: string }
interface RcEntitlement { id: string; lookup_key: string; display_name: string }
interface RcOffering { id: string; lookup_key: string; display_name: string; is_current: boolean }
interface RcPackage { id: string; lookup_key: string; display_name: string }
interface RcApiKey { key: string; type: string }

export async function getUncachableRevenueCatClient() {
  return {
    /* Projects */
    listProjects: () => rcGet<RcList<RcProject>>("/v2/projects?limit=20"),
    createProject: (name: string) => rcPost<RcProject>("/v2/projects", { name }),

    /* Apps */
    listApps: (projectId: string) => rcGet<RcList<RcApp>>(`/v2/projects/${projectId}/apps?limit=20`),
    createAppStore: (projectId: string, name: string, bundleId: string) =>
      rcPost<RcApp>(`/v2/projects/${projectId}/apps`, { name, type: "app_store", app_store: { bundle_id: bundleId } }),
    createPlayStore: (projectId: string, name: string, packageName: string) =>
      rcPost<RcApp>(`/v2/projects/${projectId}/apps`, { name, type: "play_store", play_store: { package_name: packageName } }),

    /* Products */
    listProducts: (projectId: string) => rcGet<RcList<RcProduct>>(`/v2/projects/${projectId}/products?limit=100`),
    createProductTestStore: (projectId: string, appId: string, storeId: string, displayName: string, title: string, duration: string) =>
      rcPost<RcProduct>(`/v2/projects/${projectId}/products`, {
        store_identifier: storeId, app_id: appId, type: "subscription",
        display_name: displayName, title, subscription: { duration },
      }),
    createProductStore: (projectId: string, appId: string, storeId: string, displayName: string) =>
      rcPost<RcProduct>(`/v2/projects/${projectId}/products`, {
        store_identifier: storeId, app_id: appId, type: "non_subscription", display_name: displayName,
      }),
    setTestStorePrices: (projectId: string, productId: string, prices: { amount_micros: number; currency: string }[]) =>
      rcPost<unknown>(`/v2/projects/${projectId}/products/${productId}/test_store_prices`, { prices }),

    /* Entitlements */
    listEntitlements: (projectId: string) => rcGet<RcList<RcEntitlement>>(`/v2/projects/${projectId}/entitlements?limit=20`),
    createEntitlement: (projectId: string, lookupKey: string, displayName: string) =>
      rcPost<RcEntitlement>(`/v2/projects/${projectId}/entitlements`, { lookup_key: lookupKey, display_name: displayName }),
    attachProductsToEntitlement: (projectId: string, entitlementId: string, productIds: string[]) =>
      rcPost<unknown>(`/v2/projects/${projectId}/entitlements/${entitlementId}/product_ids/attach`, { product_ids: productIds }),

    /* Offerings */
    listOfferings: (projectId: string) => rcGet<RcList<RcOffering>>(`/v2/projects/${projectId}/offerings?limit=20`),
    createOffering: (projectId: string, lookupKey: string, displayName: string) =>
      rcPost<RcOffering>(`/v2/projects/${projectId}/offerings`, { lookup_key: lookupKey, display_name: displayName }),
    setOfferingCurrent: (projectId: string, offeringId: string) =>
      rcPatch<RcOffering>(`/v2/projects/${projectId}/offerings/${offeringId}`, { is_current: true }),

    /* Packages */
    listPackages: (projectId: string, offeringId: string) =>
      rcGet<RcList<RcPackage>>(`/v2/projects/${projectId}/offerings/${offeringId}/packages?limit=20`),
    createPackage: (projectId: string, offeringId: string, lookupKey: string, displayName: string) =>
      rcPost<RcPackage>(`/v2/projects/${projectId}/offerings/${offeringId}/packages`, { lookup_key: lookupKey, display_name: displayName }),
    attachProductsToPackage: (projectId: string, packageId: string, products: { product_id: string; eligibility_criteria: string }[]) =>
      rcPost<unknown>(`/v2/projects/${projectId}/packages/${packageId}/products/attach`, { products }),

    /* API Keys */
    listPublicApiKeys: (projectId: string, appId: string) =>
      rcGet<RcList<RcApiKey>>(`/v2/projects/${projectId}/apps/${appId}/api_keys/public?limit=10`),
  };
}
