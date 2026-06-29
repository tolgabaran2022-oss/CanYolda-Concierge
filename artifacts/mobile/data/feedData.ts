/* ============================================================================
 * Offline fallback feed data - used only when the API is unreachable.
 * In production, posts are fetched from /api/feed/posts.
 * ============================================================================ */

export type Comment = { id: string; user: string; text: string };
export type PostData = {
  id:           string;
  user:         { name: string; avatar: string };
  image:        string;
  caption:      string;
  location:     string;
  likes:        number;
  liked:        boolean;
  bookmarked:   boolean;
  sharesCount?: number;
  comments:     Comment[];
  timestamp:    string;
};

const USERS = [
  { name: "miyav.house",      avatar: "https://loremflickr.com/100/100/cat?lock=11" },
  { name: "patili.bir.dunya", avatar: "https://loremflickr.com/100/100/dog?lock=22" },
  { name: "pati_dostum",      avatar: "https://loremflickr.com/100/100/kitten?lock=33" },
  { name: "koydeki.patiler",  avatar: "https://loremflickr.com/100/100/puppy?lock=44" },
  { name: "sokak.dostlari",   avatar: "https://loremflickr.com/100/100/golden?lock=55" },
  { name: "kucuk.pawlar",     avatar: "https://loremflickr.com/100/100/tabby?lock=66" },
  { name: "minnoslar.evi",    avatar: "https://loremflickr.com/100/100/cat?lock=77" },
  { name: "patici.sultan",    avatar: "https://loremflickr.com/100/100/dog?lock=88" },
];

const LOCATIONS = [
  "Kadikoy, Istanbul",
  "Besiktas, Istanbul",
  "Uskudar, Istanbul",
  "Sariyer, Istanbul",
  "Eyup, Istanbul",
  "Bakirkoy, Istanbul",
  "Kartal, Istanbul",
  "Maltepe, Istanbul",
];

const CAPTIONS = [
  "Bugun sokakta gordugumuz minik dostumuz - saglik kontrolu yapildi, simdi guvende",
  "Mahallemizin maskotu yine kahvalti istiyor Mama birakmayi unutmayin!",
  "Yeni bir yarali raporu. Veteriner arkadasimiza ulastik, tedavi ediyoruz",
  "Sahiplenmek isteyenler icin harika bir haber! Bu guzel kiz yuva ariyor",
  "Gece gorevimizde rastladigimiz tatlilik - konum: Maltepe sahil yolu",
  "Arkadasimiz bugun cok mutlu! Gonullulerimiz sayesinde islindi",
  "Acil mama destegi gerekli! Bolge: Kartal sahil. Gonulluler yardim edebilir mi?",
  "Dun sahiplendirdigimiz canimiz bugun yeni evinde cok mutlu Tesekkurler topluluk!",
  "Kucuk dostumuzun ayak yarasi iyilesiyor Her gun biraz daha guclu",
  "Yuva arayan golden kardesimiz - 2 yasinda, asilari tam, kopeklerle uyumlu",
  "Sokaklarin prensesi bugun yine goz kirpiyor Onu sevenler konumu isaretlesin!",
  "Yilbasi gecesi yalniz kalan dostlarimizi unutmayalim Mama + battaniye = mutlu kuyruk",
  "Bakirkoy parkinda acil mama ihtiyaci. Gorenler destek olabilir mi?",
  "Veteriner kontrolu tamamlandi, kisirlastirma yapildi - saglikli ve guvende!",
  "Bu guzel kizin adi Kulregi. Her sabah ayni noktada bekliyor, sahiplendirmeye hazir!",
  "Arkadasimizin gozu iyi gormuyor, tedavi icin fon olusturduk - destek icin DM!",
  "Haftalik gonullu turu tamamlandi - 12 canliya mama+su verdik. Harikasiniz!",
  "Yeni rapor: Sariyer sahilinde kucuk bir kopek ailesi yasiyor. Guvenli alanlar isaretleyelim."
];

const TIMES = [
  "Az once",
  "5 dakika once",
  "15 dakika once",
  "30 dakika once",
  "1 saat once",
  "2 saat once",
  "3 saat once",
  "Dun",
  "Dun aksam",
  "2 gun once",
];

const IMAGE_KEYWORDS = [
  "cat", "dog", "kitten", "puppy", "tabby", "golden",
];

const POST_SEEDS = Array.from({ length: 50 }, (_, i) => ({
  imageLock:     i + 1,
  imageKeyword:  IMAGE_KEYWORDS[i % IMAGE_KEYWORDS.length],
  caption:       CAPTIONS[i % CAPTIONS.length],
}));

const COMMENT_POOLS: string[][] = [
  [],
  ["Cok tatli"],
  ["Yardim edebiliriz!", "Konum neresi tam olarak?"],
  ["Sahiplenmek istiyorum", "Allah korusun", "Paylastim!"],
  ["Biz de bolgedeyiz, bakiriz.", "Cok sukur saglikli", "Hemen veterinere!", "Masallah"],
  ["Gecmiste sahiplendim boyle", "Iyi ki paylastiniz!", "Mama biraktim az once", "Veteriner arkadasim yardimci olur.", "Dun de gordum orada."],
];

function pickComments(lock: number): { id: string; user: string; text: string }[] {
  const count = lock % 6;
  const pool  = COMMENT_POOLS[count];
  return pool.map((text, i) => ({
    id:   `${lock}-c${i}`,
    user: USERS[(lock + i + 3) % USERS.length].name,
    text,
  }));
}

export const FEED_POSTS: PostData[] = POST_SEEDS.map((seed, index) => {
  const userIdx   = index % USERS.length;
  const locIdx    = index % LOCATIONS.length;
  const timeIdx   = index % TIMES.length;
  const likes     = ((seed.imageLock * 17 + index * 43) % 1000);

  return {
    id:           `post-${seed.imageLock}`,
    user:         USERS[userIdx],
    image:        `https://loremflickr.com/600/700/${seed.imageKeyword}?lock=${seed.imageLock}`,
    caption:      seed.caption,
    location:     LOCATIONS[locIdx],
    likes,
    liked:        false,
    bookmarked:   false,
    sharesCount:  (seed.imageLock * 3) % 50,
    comments:     pickComments(seed.imageLock),
    timestamp:    TIMES[timeIdx],
  };
});
