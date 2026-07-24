/** Çocuklar için basitleştirilmiş İncil hikayeleri — gerçek olayı korur, dili sadeleştirir.
 * SADECE Yeni Ahit'ten seçildi: Eski Ahit içeriğinin büyük kısmı henüz uygulamada yok
 * (bkz. constants/bible-index.ts oldTestamentBooks — sadece Mezmurlar var).
 */

export type KidsStory = {
  id: string;
  title: string;
  icon: string;
  verseRef: string;
  bookName: string;
  chapter: number;
  verse: number;
  summary: string;
};

export const kidsStories: KidsStory[] = [
  {
    id: 'jesus-birth',
    title: "İsa'nın Doğuşu",
    icon: 'star-outline',
    verseRef: 'Luka 2:11',
    bookName: 'Luka',
    chapter: 2,
    verse: 11,
    summary:
      'Meryem ve Yusuf, Beytlehem\'e gittiler. Handa yer olmadığı için İsa bir ahırda doğdu ve bir yemliğe yatırıldı. Melekler çobanlara müjdeyi verdi, gökte parlak bir yıldız doğdu.',
  },
  {
    id: 'jesus-calms-storm',
    title: 'İsa Fırtınayı Durduruyor',
    icon: 'thunderstorm-outline',
    verseRef: 'Markos 4:36',
    bookName: 'Markos',
    chapter: 4,
    verse: 36,
    summary:
      'İsa ve öğrencileri tekneyle gölü geçerken büyük bir fırtına çıktı. Öğrenciler çok korktu. İsa uyandı, rüzgara "Sus, sakin ol" dedi ve deniz hemen durgunlaştı.',
  },
  {
    id: 'feeding-5000',
    title: 'Beş Ekmek İki Balık',
    icon: 'restaurant-outline',
    verseRef: 'Yuhanna 6:11',
    bookName: 'Yuhanna',
    chapter: 6,
    verse: 11,
    summary:
      'Binlerce kişi İsa\'yı dinlemeye gelmişti ama yiyecek yoktu. Küçük bir çocuk beş ekmek ve iki balığını verdi. İsa şükretti ve herkese yetecek kadar yemek çoğaldı.',
  },
  {
    id: 'good-samaritan',
    title: 'İyi Samiriyeli',
    icon: 'heart-outline',
    verseRef: 'Luka 10:33',
    bookName: 'Luka',
    chapter: 10,
    verse: 33,
    summary:
      'Yolda yaralı bir adam yatıyordu, ikisi onu görüp geçti. Ama bir Samiriyeli durdu, yaralarını sardı ve ona baktı. İsa bize her zaman komşumuza iyi davranmayı öğretiyor.',
  },
  {
    id: 'prodigal-son',
    title: 'Kaybolan Oğul',
    icon: 'home-outline',
    verseRef: 'Luka 15:20',
    bookName: 'Luka',
    chapter: 15,
    verse: 20,
    summary:
      'Bir oğul evden ayrılıp her şeyini kaybetti. Pişman olup eve döndüğünde, babası onu uzaktan gördü, koşarak kucakladı ve onun için büyük bir şölen yaptı.',
  },
  {
    id: 'jesus-resurrection',
    title: 'İsa Yeniden Diriliyor',
    icon: 'sunny-outline',
    verseRef: 'Matta 28:6',
    bookName: 'Matta',
    chapter: 28,
    verse: 6,
    summary:
      'İsa çarmıhta öldü ve mezara konuldu. Üçüncü gün, kadınlar mezara gittiğinde mezar boştu. Bir melek "O burada değil, O dirildi" dedi. Bu en büyük müjdeydi.',
  },
  {
    id: 'zacchaeus',
    title: 'Zakkay Ağaca Çıkıyor',
    icon: 'leaf-outline',
    verseRef: 'Luka 19:9',
    bookName: 'Luka',
    chapter: 19,
    verse: 9,
    summary:
      'Zakkay çok kısaydı ve İsa\'yı görmek için bir ağaca tırmandı. İsa onu gördü ve evine gitmek istedi. Zakkay o gün değişti, aldığı haksız parayı geri vermeye karar verdi.',
  },
  {
    id: 'lazarus',
    title: "Lazar'ın Dirilişi",
    icon: 'bulb-outline',
    verseRef: 'Yuhanna 11:43',
    bookName: 'Yuhanna',
    chapter: 11,
    verse: 43,
    summary:
      'İsa\'nın arkadaşı Lazar hastalanıp öldü. Herkes çok üzgündü. İsa mezara gitti, yüksek sesle "Lazar, dışarı çık!" dedi ve Lazar yeniden hayata döndü.',
  },
  {
    id: 'walking-on-water',
    title: 'İsa Su Üzerinde Yürüyor',
    icon: 'water-outline',
    verseRef: 'Matta 14:29',
    bookName: 'Matta',
    chapter: 14,
    verse: 29,
    summary:
      'Öğrenciler geceleyin gölde tekneyle giderken İsa\'nın su üzerinde yürüdüğünü gördüler. Petrus da denemek istedi, İsa\'ya bakarken yürüdü ama korkunca batmaya başladı; İsa onu tuttu.',
  },
  {
    id: 'lost-sheep',
    title: 'Kaybolan Koyun',
    icon: 'paw-outline',
    verseRef: 'Luka 15:6',
    bookName: 'Luka',
    chapter: 15,
    verse: 6,
    summary:
      'Bir çobanın yüz koyunu vardı, biri kayboldu. Çoban doksan dokuz koyunu bırakıp kaybolanı aramaya gitti. Onu bulunca çok sevindi ve komşularını da sevincine ortak etti.',
  },
  {
    id: 'jesus-blesses-children',
    title: 'İsa Çocukları Kutsuyor',
    icon: 'happy-outline',
    verseRef: 'Markos 10:14',
    bookName: 'Markos',
    chapter: 10,
    verse: 14,
    summary:
      'Anneler çocuklarını İsa\'ya getirdi ama öğrenciler onları engellemeye çalıştı. İsa buna üzüldü ve "Çocukların bana gelmesine izin verin" dedi. Onları kucağına alıp kutsadı.',
  },
  {
    id: 'doubting-thomas',
    title: "Tomas İnanıyor",
    icon: 'hand-left-outline',
    verseRef: 'Yuhanna 20:29',
    bookName: 'Yuhanna',
    chapter: 20,
    verse: 29,
    summary:
      'Tomas, İsa\'nın dirildiğine önce inanmadı, görmek istedi. İsa ona göründü. Tomas hemen inandı. İsa ona "Görmeden inananlara ne mutlu" dedi.',
  },
];
