import {
  db,
  localUsers,
  adoptionListings,
  conversations,
  messages,
  strayAnimals,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = process.env.DEMO_EMAIL?.trim().toLowerCase();

if (!DEMO_EMAIL) {
  console.error("DEMO_EMAIL env var is required.");
  process.exit(1);
}

const RESPONDER_EMAIL = "seed-responder@canyoldasi.internal";

const PET_PHOTOS = {
  cat1: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800&q=80",
  cat2: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&q=80",
  dog1: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80",
};

async function main() {
  console.log("Looking up demo user: " + DEMO_EMAIL);
  const [demoUser] = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.email, DEMO_EMAIL))
    .limit(1);

  if (!demoUser) {
    console.error("No user found with email " + DEMO_EMAIL);
    process.exit(1);
  }
  console.log(
    "Found demo user: " +
      (demoUser.name || demoUser.email) +
      " (" +
      demoUser.id +
      ")",
  );

  let responderRows = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.email, RESPONDER_EMAIL))
    .limit(1);
  let responder = responderRows[0];

  if (!responder) {
    const inserted = await db
      .insert(localUsers)
      .values({
        email: RESPONDER_EMAIL,
        name: "Ayse Yilmaz",
        passwordHash: "seed-account-no-login",
        avatarUrl: "",
      })
      .returning();
    responder = inserted[0];
    console.log("Created internal responder user: " + responder.id);
  } else {
    console.log("Responder user already exists: " + responder.id);
  }

  const listingsData = [
    {
      petName: "Boncuk",
      petType: "Kedi",
      petAge: "2 yas",
      breed: "Tekir",
      gender: "Disi",
      vaccinated: true,
      photoUrl: PET_PHOTOS.cat1,
      images: [PET_PHOTOS.cat1],
      location: "Kadikoy, Istanbul",
      description:
        "Boncuk cok sevecen ve insanlarla arasi iyi bir kedi. Kisirlastirildi, asilari tam. Yeni bir yuva ariyor.",
      userId: demoUser.id,
      userName: demoUser.name || "Demo Kullanici",
      contactInfo: "Uygulama uzerinden mesaj gonderebilirsiniz.",
      allowMessages: true,
      status: "Aktif",
      healthStatus: "Saglikli",
      vaccinationStatus: "Asili",
    },
    {
      petName: "Duman",
      petType: "Kopek",
      petAge: "1 yas",
      breed: "Melez",
      gender: "Erkek",
      vaccinated: true,
      photoUrl: PET_PHOTOS.dog1,
      images: [PET_PHOTOS.dog1],
      location: "Besiktas, Istanbul",
      description:
        "Duman enerjik ve oyuncu bir kopek. Cocuklarla ve diger kopeklerle uyumlu. Bahceli ev tercih edilir.",
      userId: demoUser.id,
      userName: demoUser.name || "Demo Kullanici",
      contactInfo: "Uygulama uzerinden mesaj gonderebilirsiniz.",
      allowMessages: true,
      status: "Aktif",
      healthStatus: "Saglikli",
      vaccinationStatus: "Asili",
    },
    {
      petName: "Minnos",
      petType: "Kedi",
      petAge: "6 ay",
      breed: "Van Kedisi",
      gender: "Disi",
      vaccinated: false,
      photoUrl: PET_PHOTOS.cat2,
      images: [PET_PHOTOS.cat2],
      location: "Uskudar, Istanbul",
      description:
        "Minnos sokakta bulundu, su an bakimi yapiliyor. Sevgi dolu bir yuva ariyor.",
      userId: demoUser.id,
      userName: demoUser.name || "Demo Kullanici",
      contactInfo: "Uygulama uzerinden mesaj gonderebilirsiniz.",
      allowMessages: true,
      status: "Aktif",
      healthStatus: "Tedavi altinda",
      vaccinationStatus: "Asisiz",
    },
  ];

  const insertedListings = [];
  for (const listing of listingsData) {
    const rows = await db.insert(adoptionListings).values(listing).returning();
    const row = rows[0];
    insertedListings.push(row);
    console.log("Created listing: " + row.petName + " (" + row.id + ")");
  }

  const firstListing = insertedListings[0];
  const userOne = demoUser.id < responder.id ? demoUser.id : responder.id;
  const userTwo = demoUser.id < responder.id ? responder.id : demoUser.id;

  const convRows = await db
    .insert(conversations)
    .values({
      userOne: userOne,
      userTwo: userTwo,
      listingId: firstListing.id,
      listingTitle: firstListing.petName,
      listingImage: firstListing.photoUrl,
      lastMessage: "Harika, yarin bulusabiliriz o zaman!",
    })
    .returning();
  const conv = convRows[0];
  console.log("Created conversation: " + conv.id);

  const conversationMessages = [
    {
      senderId: responder.id,
      message:
        "Merhaba, " + firstListing.petName + " hala sahiplendirilebilir mi?",
    },
    {
      senderId: demoUser.id,
      message:
        "Merhaba! Evet, hala yuva ariyor. Ilgilendiginiz icin tesekkurler.",
    },
    { senderId: responder.id, message: "Harika, yarin bulusabiliriz o zaman!" },
  ];

  for (const m of conversationMessages) {
    await db.insert(messages).values({
      conversationId: conv.id,
      senderId: m.senderId,
      message: m.message,
      isRead: true,
    });
  }
  console.log(
    "Added " + conversationMessages.length + " messages to the conversation",
  );

  const strayReportsData = [
    {
      imageUrl: PET_PHOTOS.dog1,
      animalType: "Kopek",
      locationName: "Moda Sahili, Kadikoy",
      latitude: 40.9822,
      longitude: 29.0269,
      status: "healthy",
      notes: "Sahilde dolasan saglikli gorunumlu bir kopek. Mama verildi.",
      userId: demoUser.id,
      userName: demoUser.name || "Demo Kullanici",
    },
    {
      imageUrl: PET_PHOTOS.cat2,
      animalType: "Kedi",
      locationName: "Bagdat Caddesi, Kadikoy",
      latitude: 40.9679,
      longitude: 29.0654,
      status: "unknown",
      notes: "Bolgede sik gorulen bir kedi, yardima ihtiyaci olabilir.",
      userId: demoUser.id,
      userName: demoUser.name || "Demo Kullanici",
    },
  ];

  for (const report of strayReportsData) {
    const rows = await db.insert(strayAnimals).values(report).returning();
    const row = rows[0];
    console.log(
      "Created stray animal report: " + row.locationName + " (" + row.id + ")",
    );
  }

  console.log("");
  console.log("Demo account seeded successfully!");
  console.log(
    "Sign in with: " +
      DEMO_EMAIL +
      " (use the password you set when registering)",
  );
}

main()
  .then(function () {
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Error seeding demo account:", err);
    process.exit(1);
  });
