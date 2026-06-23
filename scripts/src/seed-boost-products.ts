import { getUncachableStripeClient } from "./stripeClient.js";

async function seedBoostProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Checking existing boost products...");

  const existing = await stripe.products.search({
    query: "metadata['boost_type']:'featured_listing' AND active:'true'",
  });

  const existingHours = existing.data.map(
    (p) => p.metadata?.package_hours
  );

  const packages = [
    {
      name: "İlanı Öne Çıkar - 24 Saat",
      description: "Sahiplendirme ilanınızı 24 saat boyunca üst sıralarda gösterin.",
      hours: "24",
      amount: 5000,
    },
    {
      name: "İlanı Öne Çıkar - 72 Saat",
      description: "Sahiplendirme ilanınızı 72 saat boyunca üst sıralarda gösterin.",
      hours: "72",
      amount: 10000,
    },
  ];

  for (const pkg of packages) {
    if (existingHours.includes(pkg.hours)) {
      console.log(`✓ ${pkg.name} already exists, skipping.`);
      continue;
    }

    const product = await stripe.products.create({
      name: pkg.name,
      description: pkg.description,
      metadata: {
        boost_type: "featured_listing",
        package_hours: pkg.hours,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pkg.amount,
      currency: "try",
    });

    console.log(`✓ Created: ${product.name} (${product.id}) — Price: ${price.id} — ${pkg.amount / 100} TRY`);
  }

  console.log("\n✅ Boost products seeded successfully!");
  console.log("Webhooks will sync data to your local database automatically.");
}

seedBoostProducts().catch((err) => {
  console.error("Error seeding boost products:", err.message);
  process.exit(1);
});
