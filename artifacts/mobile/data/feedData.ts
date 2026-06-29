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
  { name: "miyav.house",      avatar: "https://loremflickr.com/100/100/kitten?lock=11" },
  { name: "patili.bir.dunya", avatar: "https://loremflickr.com/100/100/puppy?lock=22" },
  { name: "pati_dostum",      avatar: "https://loremflickr.com/100/100/tabby?lock=33" },
  { name: "koydeki.patiler",  avatar: "https://loremflickr.com/100/100/dog?lock=44" },
  { name: "sokak.dostlari",   avatar: "https://loremflickr.com/100/100/puppy?lock=66" },
  { name: "kucuk.pawlar",     avatar: "https://loremflickr.com/100/100/cat?lock=55" },
  { name: "minnoslar.evi",    avatar: "https://loremflickr.com/100/100/kitten?lock=77" },
  { name: "patici.sultan",    avatar: "https://loremflickr.com/100/100/dog?lock=88" },
];

const LOCATIONS = [
  "Kadikoy, Istanbul", "Besiktas, Istanbul", "Uskudar, Istanbul",
  "Sariyer, Istanbul", "Eyup, Istanbul", "Bakirkoy, Istanbul",
  "Kartal, Istanbul", "Maltepe, Istanbul",
];

const CAPTIONS = [
  "Kucuk prensesimiz bugun cok mutlu Sahiplenmek isteyenler DM",
  "Yeni dostumuz Max, artik guvende",
  "Yagmurdan sonra biraz mama zamani",
  "Dun sokakta buldugumuz minik can. Sahip ariyoruz!",
  "Mahallemizin kopegi bugun veterinere gitti. Tesekkurler herkese",
  "Bakirkoy'de bu tatli kiz 3 gun once gozumuze carpti. Mama veriyoruz ama yuva lazim",
  "Kartal sahilinde yarali bir golden bulduk. Acil veteriner destegi gerekli",
  "Maltepe'de 5 yavru kedi anneleriyle birlikte. Kisirlastirma kampanyasina katilabilir miyiz?",
  "Uskudar'da kaybolan tekir kedi! Son goruldugu yer Iskele sokak. Bilgi icin DM",
  "Besiktas'ta her gun ayni saatte gelen dostumuz. Artik ismi 'Cesur' oldu",
  "Eyup'te gece nobeti tutan gonullulerimiz 8 kediye mama verdi. Harikasiniz!",
  "Sariyer'de bahcemize gelen bu guzel kiz 2 haftadir bizimle. Yuva ariyoruz",
  "Kadikoy Moda'da bu sabah bir ailemiz daha sahiplendi. Mutlu son!",
  "Bakirkoy pazar alaninda acik bir yara gorduk. Veteriner arkadasimiz mudahale etti",
  "Kartal'da mama istasyonu kurduk! Bolge halki destek olursa harika olur",
  "Maltepe'de bu sabah 3 yavru kopek bulundu. Anneleri etrafta gorunmuyor, acil destek!",
  "Uskudar Cami onunde her gun bekleyen bu dostumuz. Yoldan gecenler mama birakiyor",
  "Besiktas'ta yasli bir retriever goruldu. Zayif ve yorgun, veteriner kontrolu gerekli",
  "Eyup'te yeni bir gonullu ekibimiz olustu! Haftada 2 gun mama turu yapacaklar",
  "Sariyer'de deniz kenarinda bulunan bu guzel. Biraz urkek ama mama yiyor",
  "Kadikoy'de dun gece dogum yapan kopek ve 6 yavrusu. Hepsi saglikli",
  "Bakirkoy'de kis aylari icin kulube kampanyasi baslattik. Gonullu destegi ariyoruz",
  "Kartal'da kopekleri severken isirik riskine karsi dikkatli olalim! Bilgilendirme postu",
  "Maltepe'de guzel bir haber! 2 haftadir tedavi goren dostumuz taburcu oldu",
  "Uskudar'da kafenin kedisi 'Kahve' artik oranin gercek sahibi",
  "Besiktas'ta otobus duraginda duzenli beslenen kopek ailesi. Esnaf cok ilgili",
  "Eyup'te bu hafta 15 kediye kisirlastirma yapildi. Harika bir basari!",
  "Sariyer ormanlik alanda yarali bir tilki bulduk. Yarasi dezenfekte edildi",
  "Kadikoy'de kisirlastirma kampanyamiz basliyor! 20 kediye ucretsiz kisirlastirma",
  "Bakirkoy'de okul bahcesine giren bu kiz artik oranin maskotu. Ogrenciler seviyor",
  "Kartal'da bu sabah bir arabanin altindan kopek yavrusu cikti. Guvende simdi",
  "Maltepe'de parkta yalniz basina gezen bu kiz. 1 yasinda, cok oyuncu",
  "Uskudar'da bahcemizin yeni sakinleri: 4 tavsan yavrusu! Anne tavsan etrafta",
  "Besiktas'ta veteriner klinigimizden harika haber: 3 tedavi tamamlandi!",
  "Eyup'te market onunde sabah aksam bekleyen dostumuz. Musterek besleniyor",
];

const TIMES = [
  "Az once", "5 dakika once", "15 dakika once", "30 dakika once",
  "1 saat once", "2 saat once", "3 saat once", "5 saat once",
  "7 saat once", "10 saat once", "12 saat once", "15 saat once",
  "18 saat once", "21 saat once", "1 gun once", "2 gun once",
];

const IMAGE_KEYWORDS = [
  "cat", "dog", "kitten", "puppy", "tabby", "golden", "stray", "black",
];

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

export const FEED_POSTS: PostData[] = Array.from({ length: 35 }, (_, i) => {
  const userIdx     = i % USERS.length;
  const locIdx      = i % LOCATIONS.length;
  const timeIdx     = i % TIMES.length;
  const keywordIdx  = i % IMAGE_KEYWORDS.length;
  const caption     = CAPTIONS[i % CAPTIONS.length];
  const lock        = i + 1;
  const likes       = ((lock * 17 + i * 43) % 600);

  return {
    id:           `post-${lock}`,
    user:         USERS[userIdx],
    image:        `https://loremflickr.com/600/700/${IMAGE_KEYWORDS[keywordIdx]}?lock=${lock + 300}`,
    caption,
    location:     LOCATIONS[locIdx],
    likes,
    liked:        false,
    bookmarked:   false,
    sharesCount:  (lock * 3) % 50,
    comments:     pickComments(lock),
    timestamp:    TIMES[timeIdx],
  };
});
