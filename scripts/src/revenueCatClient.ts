import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

type RcResult<T> = { data?: T; error?: unknown };

async function rcReq<T>(path: string, options: { method: string; body?: unknown } = { method: "GET" }): Promise<RcResult<T>> {
  const fetchOpts: RequestInit = { method: options.method };
  if (options.body !== undefined) {
    fetchOpts.body = JSON.stringify(options.body);
    fetchOpts.headers = { "Content-Type": "application/json" };
  }
  const resp = await connectors.proxy("revenuecat", path, fetchOpts);
  const json = await resp.json() as T;
  if (!resp.ok) return { error: json };
  return { data: json };
}

export interface RcList<T> { items: T[]; next_page?: string | null; object: string }
export interface RcProject { id: string; name: string; created_at: number; object: string }
export interface RcApp { id: string; name: string; type: string; created_at: number; object: string }
export interface RcProduct { id: string; store_identifier: string; app_id: string; type: string; display_name: string; object: string }
export interface RcEntitlement { id: string; lookup_key: string; display_name: string; object: string }
export interface RcOffering { id: string; lookup_key: string; display_name: string; is_current: boolean; object: string }
export interface RcPackage { id: string; lookup_key: string; display_name: string; object: string }
export interface RcApiKey { key: string; type: string; name: string }

export const rc = {
  listProjects:   ()                              => rcReq<RcList<RcProject>>("/v2/projects?limit=20"),
  createProject:  (name: string)                  => rcReq<RcProject>("/v2/projects", { method: "POST", body: { name } }),

  listApps:       (pid: string)                   => rcReq<RcList<RcApp>>(`/v2/projects/${pid}/apps?limit=20`),
  createApp:      (pid: string, body: unknown)    => rcReq<RcApp>(`/v2/projects/${pid}/apps`, { method: "POST", body }),

  listProducts:   (pid: string)                   => rcReq<RcList<RcProduct>>(`/v2/projects/${pid}/products?limit=100`),
  createProduct:  (pid: string, body: unknown)    => rcReq<RcProduct>(`/v2/projects/${pid}/products`, { method: "POST", body }),
  setTestPrices:  (pid: string, prodId: string, prices: unknown) =>
    rcReq<unknown>(`/v2/projects/${pid}/products/${prodId}/test_store_prices`, { method: "POST", body: { prices } }),

  listEntitlements:        (pid: string)          => rcReq<RcList<RcEntitlement>>(`/v2/projects/${pid}/entitlements?limit=20`),
  createEntitlement:       (pid: string, b: unknown) => rcReq<RcEntitlement>(`/v2/projects/${pid}/entitlements`, { method: "POST", body: b }),
  attachEntitlementProducts: (pid: string, eid: string, product_ids: string[]) =>
    rcReq<unknown>(`/v2/projects/${pid}/entitlements/${eid}/product_ids/attach`, { method: "POST", body: { product_ids } }),

  listOfferings:    (pid: string)                 => rcReq<RcList<RcOffering>>(`/v2/projects/${pid}/offerings?limit=20`),
  createOffering:   (pid: string, b: unknown)     => rcReq<RcOffering>(`/v2/projects/${pid}/offerings`, { method: "POST", body: b }),
  patchOffering:    (pid: string, oid: string, b: unknown) =>
    rcReq<RcOffering>(`/v2/projects/${pid}/offerings/${oid}`, { method: "PATCH", body: b }),

  listPackages:     (pid: string, oid: string)    => rcReq<RcList<RcPackage>>(`/v2/projects/${pid}/offerings/${oid}/packages?limit=20`),
  createPackage:    (pid: string, oid: string, b: unknown) =>
    rcReq<RcPackage>(`/v2/projects/${pid}/offerings/${oid}/packages`, { method: "POST", body: b }),
  attachPackageProducts: (pid: string, pkgId: string, products: unknown) =>
    rcReq<unknown>(`/v2/projects/${pid}/packages/${pkgId}/products/attach`, { method: "POST", body: { products } }),

  listApiKeys:      (pid: string, appId: string)  => rcReq<RcList<RcApiKey>>(`/v2/projects/${pid}/apps/${appId}/api_keys/public?limit=10`),
};
