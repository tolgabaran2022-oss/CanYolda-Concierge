import type { PostData } from "@/components/PostCard";

const USERS = [
  { name: "Pamuk",    avatar: "https://loremflickr.com/100/100/kitten?lock=11"  },
  { name: "Karamel",  avatar: "https://loremflickr.com/100/100/puppy?lock=22"   },
  { name: "Tekir",    avatar: "https://loremflickr.com/100/100/tabby?lock=33"   },
  { name: "Şero",     avatar: "https://loremflickr.com/100/100/dog?lock=44"     },
  { name: "Boncuk",   avatar: "https://loremflickr.com/100/100/kitten?lock=55"  },
  { name: "Tarçın",   avatar: "https://loremflickr.com/100/100/puppy?lock=66"   },
  { name: "Minnoş",   avatar: "https://loremflickr.com/100/100/cat?lock=77"     },
  { name: "Duman",    avatar: "https://loremflickr.com/100/100/dog?lock=88"     },
  { name: "Zeytin",   avatar: "https://loremflickr.com/100/100/cat?lock=99"     },
  { name: "Kurt",     avatar: "https://loremflickr.com/100/100/puppy?lock=110"  },
  { name: "Portakal", avatar: "https://loremflickr.com/100/100/kitten?lock=121" },
  { name: "Pamukcuk", avatar: "https://loremflickr.com/100/100/dog?lock=132"    },
  { name: "Kartopu",  avatar: "https://loremflickr.com/100/100/cat?lock=143"    },
  { name: "Aslan",    avatar: "https://loremflickr.com/100/100/dog?lock=154"    },
  { name: "Süt",      avatar: "https://loremflickr.com/100/100/kitten?lock=165" },
];

const LOCATIONS = [
  "Kadıköy, İstanbul",
  "Üsküdar, İstanbul",
  "Beşiktaş, İstanbul",
  "Eyüp, İstanbul",
  "Ataşehir, İstanbul",
  "Ümraniye, İstanbul",
  "Şişli, İstanbul",
  "Bakırköy, İstanbul",
  "Sarıyer, İstanbul",
  "Maltepe, İstanbul",
  "Pendik, İstanbul",
  "Bağcılar, İstanbul",
  "Fatih, İstanbul",
  "Beyoğlu, İstanbul",
  "Tuzla, İstanbul",
];

const TIMES = [
  "1 dk önce", "3 dk önce", "5 dk önce", "8 dk önce", "10 dk önce",
  "15 dk önce", "22 dk önce", "30 dk önce", "45 dk önce", "52 dk önce",
  "1 saat önce", "2 saat önce", "3 saat önce", "5 saat önce", "7 saat önce",
  "1 gün önce", "2 gün önce", "3 gün önce", "4 gün önce", "1 hafta önce",
];

const COMMENT_TEXTS = [
  "Çok tatlı 😍",
  "Yardım edebiliriz!",
  "Konum neresi tam olarak?",
  "Sahiplenmek istiyorum ❤️",
  "Allah korusun yavrucuğu 🙏",
  "Hemen veterinere götürün!",
  "Biz de bölgedeyiz, bakarız.",
  "Bu sokağı biliyorum, sık sık görüyorum.",
  "Çok şükür sağlıklı görünüyor 🌿",
  "Arkadaşıma da söyledim, ilgileniyor.",
  "Geçmişte sahiplendim böyle bir cana 🐾",
  "Paylaştım, umarım sahip bulur.",
  "İyi ki bildiriniz ❤️",
  "Onu besleyenlere Allah razı olsun.",
  "Maşallah ne kadar güzel 😻",
  "Aman dikkatli olun, trafik var orada.",
  "Veteriner arkadaşıma sordum, yardımcı olabilir.",
  "Dün de gördüm orada, üşümüş gibiydi.",
  "Mama bıraktım az önce 🍜",
  "Harika bir haber, tebrikler!",
];

type PostSeed = {
  caption: string;
  imageKeyword: string;
  imageLock: number;
};

const POST_SEEDS: PostSeed[] = [
  { caption: "Parkta bulduk, çok açtı 😢 Lütfen paylaşın, mama desteği lazım.",            imageKeyword: "puppy",  imageLock: 201 },
  { caption: "Bugün ilk kez mama verdim 🐶 Sanki yıllardır tanıyormuşuz gibi baktı.",      imageKeyword: "dog",    imageLock: 202 },
  { caption: "Sahip arıyoruz ❤️ Çok uysal, çocuklarla harika anlaşıyor.",                  imageKeyword: "kitten", imageLock: 203 },
  { caption: "Çok uysal bir kedi 🐱 Her gün kapımın önünde bekliyor.",                      imageKeyword: "tabby",  imageLock: 204 },
  { caption: "Veterinere götürülecek, yardımcı olabilir misiniz?",                          imageKeyword: "dog",    imageLock: 205 },
  { caption: "Sokak kedisi ama sanki evcil 😻 Ellerimde uyuyor.",                           imageKeyword: "cat",    imageLock: 206 },
  { caption: "Yağmurda ıslanmış buldum, evde kurutuyorum şimdi 🏠",                         imageKeyword: "kitten", imageLock: 207 },
  { caption: "Mahallemizin köpeği bugün yavruladı! 5 tane yavru ❤️",                       imageKeyword: "puppy",  imageLock: 208 },
  { caption: "Bu güzeli sahiplenmek isteyen var mı? Kısırlaştırıldı, aşıları tam 🐾",      imageKeyword: "cat",    imageLock: 209 },
  { caption: "Köprü altında 3 gündür bekliyordu, artık evdeyiz 🥹",                        imageKeyword: "dog",    imageLock: 210 },
  { caption: "Minik kedi ailesine baktım bu kış ❄️ Hepsi sağlıklı!",                       imageKeyword: "kitten", imageLock: 211 },
  { caption: "Sokak köpeği ama kalbi saf altın 💛 Her sabah selam verir.",                  imageKeyword: "golden", imageLock: 212 },
  { caption: "Bacağı yaralı buldum, veteriner ameliyat yapacak 🩺",                         imageKeyword: "cat",    imageLock: 213 },
  { caption: "3 yıldır bu sokağın bekçisi 🐕 Artık herkesi tanıyor.",                       imageKeyword: "dog",    imageLock: 214 },
  { caption: "İlk kez insana yaklaştı bugün 🥺 Yavaş yavaş güven kazanıyor.",              imageKeyword: "tabby",  imageLock: 215 },
  { caption: "Sahiplenme hikayemiz! 6 ay önce sokakta bulmuştuk 🎉",                        imageKeyword: "golden", imageLock: 216 },
  { caption: "Gözleri konuşuyor 👀 Sahip arıyor bu yürek.",                                 imageKeyword: "cat",    imageLock: 217 },
  { caption: "Kış geliyor, mama istasyonu kuruyoruz 🍜 Katılmak isteyen?",                  imageKeyword: "kitten", imageLock: 218 },
  { caption: "Acil! Üsküdar'da yaralı köpek görüldü, yardım lazım 🚨",                      imageKeyword: "dog",    imageLock: 219 },
  { caption: "Bugün klinikte iyileştikten sonra ilk dışarı çıkışı 🌤️",                     imageKeyword: "puppy",  imageLock: 220 },
  { caption: "Komşunun kedisi sahiplendirildi, çok mutluyuz 🎊",                            imageKeyword: "cat",    imageLock: 221 },
  { caption: "Mahalle kedisi artık belediyede kayıtlı 🏷️ İyi haber!",                      imageKeyword: "tabby",  imageLock: 222 },
  { caption: "Siyah beyaz bu güzeli tanıyan var mı? Kaybolmuş olabilir 🔍",                 imageKeyword: "cat",    imageLock: 223 },
  { caption: "Her gün park çıkışında bekliyor, sevgiyi hak ediyor 💜",                      imageKeyword: "dog",    imageLock: 224 },
  { caption: "Çok yorgun görünüyordu, su verdim, içti içti içti 💧",                        imageKeyword: "puppy",  imageLock: 225 },
  { caption: "Annesiyle birlikte bulduğumuz yavrular büyüdü 🐾",                            imageKeyword: "kitten", imageLock: 226 },
  { caption: "Bu kedi her gün kapıma gelir, artık aile olduk 🏡",                           imageKeyword: "cat",    imageLock: 227 },
  { caption: "Kısırlaştırma kampanyasına 12 kedi götürdük bugün 💙",                        imageKeyword: "tabby",  imageLock: 228 },
  { caption: "Titreme durumu varmış, veteriner ilaç verdi 🌡️",                              imageKeyword: "dog",    imageLock: 229 },
  { caption: "Bölgedeki tüm mama istasyonlarını doldurun lütfen ❤️",                        imageKeyword: "cat",    imageLock: 230 },
  { caption: "Sabah 6'da kapımın önüne bırakılmıştı, ne yapayım bilmiyorum 😔",             imageKeyword: "kitten", imageLock: 231 },
  { caption: "Yaşlı köpeğimizi kliniğe götürdük, iyileşiyor! 🙏",                          imageKeyword: "dog",    imageLock: 232 },
  { caption: "Köy köpeği İstanbul'a geldi, adaptasyon süreci başladı 🌆",                   imageKeyword: "golden", imageLock: 233 },
  { caption: "Bu küçük can için yuva arıyoruz! DM atın 📩",                                 imageKeyword: "puppy",  imageLock: 234 },
  { caption: "Kulağına kene yapışmış, temizledik 🩹 Artık rahat.",                          imageKeyword: "dog",    imageLock: 235 },
  { caption: "Kara kışta dışarıda bırakılamaz! Sokak hayvanlarını koruyalım 🧣",            imageKeyword: "cat",    imageLock: 236 },
  { caption: "Yavru köpek sürüsüne kamp alanında rastladık 🏕️ Hepsi sağlıklı.",            imageKeyword: "puppy",  imageLock: 237 },
  { caption: "Gönüllü veteriner grubuna katıldım, birlikte daha güçlüyüz 💪",              imageKeyword: "golden", imageLock: 238 },
  { caption: "Bu hafta 3 kediye yuva bulduk! Rekor 🏆",                                     imageKeyword: "kitten", imageLock: 239 },
  { caption: "Sahiplendiğimiz günün yıldönümü 🎂 1 yılda ne kadar değişti!",               imageKeyword: "dog",    imageLock: 240 },
  { caption: "Caminin önündeki kedi kolonyaya alıştı, artık gelmiyor 😂",                   imageKeyword: "tabby",  imageLock: 241 },
  { caption: "Belediye mama kabı koymuş, mahallemiz güzel oluyor 🌸",                       imageKeyword: "cat",    imageLock: 242 },
  { caption: "Terk edilmiş bir köpek bulduk, çok korkmuş durumda 😢",                      imageKeyword: "dog",    imageLock: 243 },
  { caption: "Kahve içerken yanıma geldi, sanki sipariş verdi 😄",                          imageKeyword: "kitten", imageLock: 244 },
  { caption: "Uyurken fotoğraf çektim, günahı yok mu böyle tatlılığın 😇",                 imageKeyword: "tabby",  imageLock: 245 },
  { caption: "Tüm mahalle bu köpeği seviyor, adını da koyduk: Kahraman 🦸",                imageKeyword: "golden", imageLock: 246 },
  { caption: "Kedim ilk kez dışarıya çıktı ve çok korktu 😆 Geri döndü hemen.",           imageKeyword: "cat",    imageLock: 247 },
  { caption: "4 bacaklı dostumuz bugün tamamen iyileşti! Teşekkürler herkese 🎊",          imageKeyword: "puppy",  imageLock: 248 },
  { caption: "Köprünün altındaki kedi ailesine battaniye götürdük ❄️🧡",                    imageKeyword: "kitten", imageLock: 249 },
  { caption: "Son 1 ayda 8 hayvanı sahiplendirdik. Devam edin arkadaşlar! 💪🐾",           imageKeyword: "dog",    imageLock: 250 },
];

const COMMENT_POOLS: string[][] = [
  [],
  ["Çok tatlı 😍"],
  ["Yardım edebiliriz!", "Konum neresi tam olarak?"],
  ["Sahiplenmek istiyorum ❤️", "Allah korusun 🙏", "Paylaştım!"],
  ["Biz de bölgedeyiz, bakarız.", "Çok şükür sağlıklı 🌿", "Hemen veterinere!", "Maşallah 😻"],
  ["Geçmişte sahiplendim böyle 🐾", "İyi ki paylaştınız!", "Mama bıraktım az önce 🍜", "Veteriner arkadaşım yardımcı olur.", "Dün de gördüm orada."],
];

function pickComments(lock: number): { id: string; user: string; text: string }[] {
  const count = lock % 6; // 0–5 comments
  const pool  = COMMENT_POOLS[count];
  return pool.map((text, i) => ({
    id:   `${lock}-c${i}`,
    user: USERS[(lock + i + 3) % USERS.length].name,
    text: COMMENT_TEXTS[(lock + i * 7) % COMMENT_TEXTS.length],
  }));
}

export const FEED_POSTS: PostData[] = POST_SEEDS.map((seed, index) => {
  const userIdx   = index % USERS.length;
  const locIdx    = index % LOCATIONS.length;
  const timeIdx   = index % TIMES.length;
  const likes     = ((seed.imageLock * 17 + index * 43) % 1000);

  return {
    id:        `post-${seed.imageLock}`,
    user:      USERS[userIdx],
    image:     `https://loremflickr.com/600/700/${seed.imageKeyword}?lock=${seed.imageLock}`,
    caption:   seed.caption,
    location:  LOCATIONS[locIdx],
    likes,
    liked:     false,
    comments:  pickComments(seed.imageLock),
    timestamp: TIMES[timeIdx],
  };
});
