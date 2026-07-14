import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

const PROJECT_NAME   = "CanYoldaşı";
const BUNDLE_ID      = "com.canyoldasi.app";
const PACKAGE_NAME   = "com.canyoldasi.app";

const BOOST_PRODUCTS = [
  {
    identifier:   "canyoldasi_boost_1_day",
    displayName:  "1 Günlük Öne Çıkarma",
    title:        "1 Günlük Boost",
    durationDays: 1,
    duration:     "P1D",
    prices:       [{ amount_micros: 29990000, currency: "TRY" }],
    packageKey:   "boost_1_day",
    packageLabel: "1 Gün",
    isPopular:    false,
  },
  {
    identifier:   "canyoldasi_boost_3_days",
    displayName:  "3 Günlük Öne Çıkarma",
    title:        "3 Günlük Boost",
    durationDays: 3,
    duration:     "P1W",
    prices:       [{ amount_micros: 59990000, currency: "TRY" }],
    packageKey:   "boost_3_days",
    packageLabel: "3 Gün",
    isPopular:    true,
  },
  {
    identifier:   "canyoldasi_boost_7_days",
    displayName:  "7 Günlük Öne Çıkarma",
    title:        "7 Günlük Boost",
    durationDays: 7,
    duration:     "P1M",
    prices:       [{ amount_micros: 99990000, currency: "TRY" }],
    packageKey:   "boost_7_days",
    packageLabel: "7 Gün",
    isPopular:    false,
  },
];

const ENTITLEMENT_ID    = "listing_boost";
const ENTITLEMENT_LABEL = "İlan Öne Çıkarma";
const OFFERING_ID       = "listing_boost_offering";
const OFFERING_LABEL    = "İlan Öne Çıkarma Paketleri";

async function seedRevenueCat() {
  const rc = await getUncachableRevenueCatClient();

  /* ── Project ── */
  const { data: projectsList, error: pErr } = await rc.listProjects();
  if (pErr || !projectsList) throw new Error("Failed to list projects: " + JSON.stringify(pErr));

  let project = projectsList.items.find((p) => p.name === PROJECT_NAME);
  if (project) {
    console.log("Project exists:", project.id);
  } else {
    const { data: np, error: cpErr } = await rc.createProject(PROJECT_NAME);
    if (cpErr || !np) throw new Error("Failed to create project: " + JSON.stringify(cpErr));
    console.log("Created project:", np.id);
    project = np;
  }
  const pid = project.id;

  /* ── Apps ── */
  const { data: appsList, error: appsErr } = await rc.listApps(pid);
  if (appsErr || !appsList) throw new Error("Failed to list apps: " + JSON.stringify(appsErr));

  let testApp  = appsList.items.find((a) => a.type === "test_store");
  let iosApp   = appsList.items.find((a) => a.type === "app_store");
  let droidApp = appsList.items.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test_store app found in RevenueCat project");
  console.log("Test store app:", testApp.id);

  if (!iosApp) {
    const { data: a, error } = await rc.createAppStore(pid, "CanYoldaşı iOS", BUNDLE_ID);
    if (error || !a) throw new Error("Failed to create App Store app: " + JSON.stringify(error));
    iosApp = a;
    console.log("Created App Store app:", iosApp.id);
  } else {
    console.log("App Store app:", iosApp.id);
  }

  if (!droidApp) {
    const { data: a, error } = await rc.createPlayStore(pid, "CanYoldaşı Android", PACKAGE_NAME);
    if (error || !a) throw new Error("Failed to create Play Store app: " + JSON.stringify(error));
    droidApp = a;
    console.log("Created Play Store app:", droidApp.id);
  } else {
    console.log("Play Store app:", droidApp.id);
  }

  /* ── Products ── */
  const { data: prodList, error: prodErr } = await rc.listProducts(pid);
  if (prodErr || !prodList) throw new Error("Failed to list products: " + JSON.stringify(prodErr));

  const allProductIds: string[] = [];
  const packageProductMap: Record<string, string[]> = {};

  for (const bp of BOOST_PRODUCTS) {
    const getExisting = (appId: string, storeId: string) =>
      prodList.items.find((p) => p.store_identifier === storeId && p.app_id === appId);

    /* Test Store */
    let testProd = getExisting(testApp.id, bp.identifier);
    if (!testProd) {
      const { data: p, error } = await rc.createProductTestStore(pid, testApp.id, bp.identifier, bp.displayName, bp.title, bp.duration);
      if (error || !p) throw new Error(`Failed to create test product ${bp.identifier}: ` + JSON.stringify(error));
      testProd = p;
      console.log(`Created test product ${bp.identifier}:`, testProd.id);

      /* Prices */
      const { error: priceErr } = await rc.setTestStorePrices(pid, testProd.id, bp.prices);
      if (priceErr && (priceErr as any)?.type !== "resource_already_exists") {
        console.warn(`Price warning for ${bp.identifier}:`, JSON.stringify(priceErr));
      } else {
        console.log(`Prices set for ${bp.identifier}`);
      }
    } else {
      console.log(`Test product ${bp.identifier} exists:`, testProd.id);
    }

    /* App Store */
    let iosProd = getExisting(iosApp.id, bp.identifier);
    if (!iosProd) {
      const { data: p, error } = await rc.createProductStore(pid, iosApp.id, bp.identifier, bp.displayName);
      if (error || !p) throw new Error(`Failed to create iOS product ${bp.identifier}: ` + JSON.stringify(error));
      iosProd = p;
      console.log(`Created iOS product ${bp.identifier}:`, iosProd.id);
    }

    /* Play Store */
    let droidProd = getExisting(droidApp.id, bp.identifier);
    if (!droidProd) {
      const { data: p, error } = await rc.createProductStore(pid, droidApp.id, bp.identifier, bp.displayName);
      if (error || !p) throw new Error(`Failed to create Android product ${bp.identifier}: ` + JSON.stringify(error));
      droidProd = p;
      console.log(`Created Android product ${bp.identifier}:`, droidProd.id);
    }

    allProductIds.push(testProd.id, iosProd.id, droidProd.id);
    packageProductMap[bp.packageKey] = [testProd.id, iosProd.id, droidProd.id];
  }

  /* ── Entitlement ── */
  const { data: entList, error: entErr } = await rc.listEntitlements(pid);
  if (entErr || !entList) throw new Error("Failed to list entitlements: " + JSON.stringify(entErr));

  let entitlement = entList.items.find((e) => e.lookup_key === ENTITLEMENT_ID);
  if (!entitlement) {
    const { data: ent, error } = await rc.createEntitlement(pid, ENTITLEMENT_ID, ENTITLEMENT_LABEL);
    if (error || !ent) throw new Error("Failed to create entitlement: " + JSON.stringify(error));
    entitlement = ent;
    console.log("Created entitlement:", entitlement.id);
  } else {
    console.log("Entitlement exists:", entitlement.id);
  }

  const { error: attachEntErr } = await rc.attachProductsToEntitlement(pid, entitlement.id, allProductIds);
  if (attachEntErr && (attachEntErr as any)?.type !== "unprocessable_entity_error") {
    console.warn("Entitlement attach warning:", JSON.stringify(attachEntErr));
  } else {
    console.log("Products attached to entitlement");
  }

  /* ── Offering ── */
  const { data: offList, error: offErr } = await rc.listOfferings(pid);
  if (offErr || !offList) throw new Error("Failed to list offerings: " + JSON.stringify(offErr));

  let offering = offList.items.find((o) => o.lookup_key === OFFERING_ID);
  if (!offering) {
    const { data: off, error } = await rc.createOffering(pid, OFFERING_ID, OFFERING_LABEL);
    if (error || !off) throw new Error("Failed to create offering: " + JSON.stringify(error));
    offering = off;
    console.log("Created offering:", offering.id);
  } else {
    console.log("Offering exists:", offering.id);
  }

  if (!offering.is_current) {
    const { error } = await rc.setOfferingCurrent(pid, offering.id);
    if (error) console.warn("Failed to set offering current:", JSON.stringify(error));
    else console.log("Set offering as current");
  }

  /* ── Packages ── */
  const { data: pkgList, error: pkgErr } = await rc.listPackages(pid, offering.id);
  if (pkgErr || !pkgList) throw new Error("Failed to list packages: " + JSON.stringify(pkgErr));

  for (const bp of BOOST_PRODUCTS) {
    let pkg = pkgList.items.find((p) => p.lookup_key === bp.packageKey);
    if (!pkg) {
      const { data: p, error } = await rc.createPackage(pid, offering.id, bp.packageKey, bp.packageLabel);
      if (error || !p) throw new Error(`Failed to create package ${bp.packageKey}: ` + JSON.stringify(error));
      pkg = p;
      console.log(`Created package ${bp.packageKey}:`, pkg.id);
    } else {
      console.log(`Package ${bp.packageKey} exists:`, pkg.id);
    }

    const products = (packageProductMap[bp.packageKey] ?? []).map((id) => ({ product_id: id, eligibility_criteria: "all" }));
    const { error: attachPkgErr } = await rc.attachProductsToPackage(pid, pkg.id, products);
    if (attachPkgErr && !(typeof attachPkgErr === "object" && (attachPkgErr as any)?.message?.includes("Cannot attach"))) {
      console.warn(`Package attach warning ${bp.packageKey}:`, JSON.stringify(attachPkgErr));
    } else {
      console.log(`Products attached to package ${bp.packageKey}`);
    }
  }

  /* ── API Keys ── */
  const { data: testKeys }  = await rc.listPublicApiKeys(pid, testApp.id);
  const { data: iosKeys }   = await rc.listPublicApiKeys(pid, iosApp.id);
  const { data: droidKeys } = await rc.listPublicApiKeys(pid, droidApp.id);

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", pid);
  console.log("\nSet these env vars:");
  console.log("REVENUECAT_PROJECT_ID=" + pid);
  console.log("REVENUECAT_TEST_STORE_APP_ID=" + testApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID=" + iosApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + droidApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=" + (testKeys?.items?.[0]?.key ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY="  + (iosKeys?.items?.[0]?.key  ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=" + (droidKeys?.items?.[0]?.key ?? "N/A"));
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
