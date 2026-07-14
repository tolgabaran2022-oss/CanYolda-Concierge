import { rc } from "./revenueCatClient.js";

const PROJECT_NAME  = "CanYoldaşı";
const BUNDLE_ID     = "com.canyoldasi.app";
const PACKAGE_NAME  = "com.canyoldasi.app";

const PRODUCTS = [
  { id: "canyoldasi_boost_1_day",  label: "1 Günlük Öne Çıkarma",  title: "1 Günlük Boost",  dur: "P1W", days: 1,  prices: [{ amount_micros: 1990000, currency: "USD" }], pkgKey: "boost_1_day",  pkgLabel: "1 Gün" },
  { id: "canyoldasi_boost_3_days", label: "3 Günlük Öne Çıkarma",  title: "3 Günlük Boost",  dur: "P1W", days: 3,  prices: [{ amount_micros: 3990000, currency: "USD" }], pkgKey: "boost_3_days", pkgLabel: "3 Gün" },
  { id: "canyoldasi_boost_7_days", label: "7 Günlük Öne Çıkarma",  title: "7 Günlük Boost",  dur: "P1M", days: 7,  prices: [{ amount_micros: 6990000, currency: "USD" }], pkgKey: "boost_7_days", pkgLabel: "7 Gün" },
];

const ENT_KEY   = "listing_boost";
const ENT_LABEL = "İlan Öne Çıkarma";
const OFF_KEY   = "listing_boost_offering";
const OFF_LABEL = "İlan Öne Çıkarma Paketleri";

function ok<T>(result: { data?: T; error?: unknown }, label: string): T {
  if (result.error || !result.data) throw new Error(`${label}: ${JSON.stringify(result.error)}`);
  return result.data;
}

async function seed() {
  /* Project */
  const projects = ok(await rc.listProjects(), "listProjects");
  let project = projects.items.find((p) => p.name === PROJECT_NAME);
  if (!project) {
    project = ok(await rc.createProject(PROJECT_NAME), "createProject");
    console.log("Created project:", project.id);
  } else {
    console.log("Project exists:", project.id);
  }
  const pid = project.id;

  /* Apps */
  const apps = ok(await rc.listApps(pid), "listApps");
  const testApp  = apps.items.find((a) => a.type === "test_store");
  if (!testApp) throw new Error("No test_store app in RevenueCat project");
  console.log("Test store app:", testApp.id);

  let iosApp = apps.items.find((a) => a.type === "app_store");
  if (!iosApp) {
    iosApp = ok(await rc.createApp(pid, { name: "CanYoldaşı iOS", type: "app_store", app_store: { bundle_id: BUNDLE_ID } }), "createApp iOS");
    console.log("Created iOS app:", iosApp.id);
  } else console.log("iOS app exists:", iosApp.id);

  let droidApp = apps.items.find((a) => a.type === "play_store");
  if (!droidApp) {
    droidApp = ok(await rc.createApp(pid, { name: "CanYoldaşı Android", type: "play_store", play_store: { package_name: PACKAGE_NAME } }), "createApp Android");
    console.log("Created Android app:", droidApp.id);
  } else console.log("Android app exists:", droidApp.id);

  /* Products */
  const prodList = ok(await rc.listProducts(pid), "listProducts");
  const existing = prodList.items;

  const allProductIds: string[] = [];
  const pkgProdMap: Record<string, string[]> = {};

  for (const bp of PRODUCTS) {
    const getEx = (appId: string) => existing.find((p) => p.store_identifier === bp.id && p.app_id === appId);

    /* Test Store */
    let tp = getEx(testApp.id);
    if (!tp) {
      tp = ok(await rc.createProduct(pid, {
        store_identifier: bp.id, app_id: testApp.id, type: "subscription",
        display_name: bp.label, title: bp.title, subscription: { duration: bp.dur },
      }), `createProduct test ${bp.id}`);
      console.log(`Created test product ${bp.id}:`, tp.id);
      const pr = await rc.setTestPrices(pid, tp.id, bp.prices);
      if (pr.error && (pr.error as any)?.type !== "resource_already_exists") console.warn("Price warn:", JSON.stringify(pr.error));
      else console.log(`Prices set for ${bp.id}`);
    } else console.log(`Test product ${bp.id} exists:`, tp.id);

    /* iOS */
    let ip = getEx(iosApp.id);
    if (!ip) {
      ip = ok(await rc.createProduct(pid, { store_identifier: bp.id, app_id: iosApp.id, type: "consumable", display_name: bp.label }), `createProduct iOS ${bp.id}`);
      console.log(`Created iOS product ${bp.id}:`, ip.id);
    } else console.log(`iOS product ${bp.id} exists:`, ip.id);

    /* Android */
    let dp = getEx(droidApp.id);
    if (!dp) {
      dp = ok(await rc.createProduct(pid, { store_identifier: bp.id, app_id: droidApp.id, type: "consumable", display_name: bp.label }), `createProduct Android ${bp.id}`);
      console.log(`Created Android product ${bp.id}:`, dp.id);
    } else console.log(`Android product ${bp.id} exists:`, dp.id);

    allProductIds.push(tp.id, ip.id, dp.id);
    pkgProdMap[bp.pkgKey] = [tp.id, ip.id, dp.id];
  }

  /* Entitlement */
  const entList = ok(await rc.listEntitlements(pid), "listEntitlements");
  let ent = entList.items.find((e) => e.lookup_key === ENT_KEY);
  if (!ent) {
    ent = ok(await rc.createEntitlement(pid, { lookup_key: ENT_KEY, display_name: ENT_LABEL }), "createEntitlement");
    console.log("Created entitlement:", ent.id);
  } else console.log("Entitlement exists:", ent.id);

  const ae = await rc.attachEntitlementProducts(pid, ent.id, allProductIds);
  if (ae.error && (ae.error as any)?.type !== "unprocessable_entity_error") console.warn("Entitlement attach warn:", JSON.stringify(ae.error));
  else console.log("Products attached to entitlement");

  /* Offering */
  const offList = ok(await rc.listOfferings(pid), "listOfferings");
  let off = offList.items.find((o) => o.lookup_key === OFF_KEY);
  if (!off) {
    off = ok(await rc.createOffering(pid, { lookup_key: OFF_KEY, display_name: OFF_LABEL }), "createOffering");
    console.log("Created offering:", off.id);
  } else console.log("Offering exists:", off.id);

  if (!off.is_current) {
    const pr = await rc.patchOffering(pid, off.id, { is_current: true });
    if (pr.error) console.warn("setOfferingCurrent warn:", JSON.stringify(pr.error));
    else console.log("Set offering as current");
  }

  /* Packages */
  const pkgList = ok(await rc.listPackages(pid, off.id), "listPackages");
  for (const bp of PRODUCTS) {
    let pkg = pkgList.items.find((p) => p.lookup_key === bp.pkgKey);
    if (!pkg) {
      pkg = ok(await rc.createPackage(pid, off.id, { lookup_key: bp.pkgKey, display_name: bp.pkgLabel }), `createPackage ${bp.pkgKey}`);
      console.log(`Created package ${bp.pkgKey}:`, pkg.id);
    } else console.log(`Package ${bp.pkgKey} exists:`, pkg.id);

    const products = (pkgProdMap[bp.pkgKey] ?? []).map((product_id) => ({ product_id, eligibility_criteria: "all" }));
    const ap = await rc.attachPackageProducts(pid, pkg.id, products);
    if (ap.error && !(typeof ap.error === "object" && (ap.error as any)?.message?.includes("Cannot attach")))
      console.warn(`Package attach warn ${bp.pkgKey}:`, JSON.stringify(ap.error));
    else console.log(`Products attached to package ${bp.pkgKey}`);
  }

  /* API Keys */
  const testKeys  = await rc.listApiKeys(pid, testApp.id);
  const iosKeys   = await rc.listApiKeys(pid, iosApp.id);
  const droidKeys = await rc.listApiKeys(pid, droidApp.id);

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("REVENUECAT_PROJECT_ID=" + pid);
  console.log("REVENUECAT_TEST_STORE_APP_ID=" + testApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID=" + iosApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + droidApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY="       + (testKeys.data?.items?.[0]?.key  ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY="        + (iosKeys.data?.items?.[0]?.key   ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY="    + (droidKeys.data?.items?.[0]?.key ?? "N/A"));
  console.log("====================\n");
}

seed().catch(console.error);
