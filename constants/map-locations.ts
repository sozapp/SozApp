export type MapLocation = {
  id: string;
  name: string;
  modernName: string;
  region: string;
  /** Harita SVG viewBox 0 0 400 200 içindeki nokta */
  svgPoint: { cx: number; cy: number };
  coordinates: { lat: number; lng: number };
  category: 'kilise' | 'sehir' | 'ada' | 'bolge';
  bibleRef: string;
  bibleRefs: string[];
  description: string;
  historicalNote: string;
  paulVisited: boolean;
  revelationChurch: boolean;
  keyVerses: { ref: string; text: string }[];
  image?: string;
};

export const locations: MapLocation[] = [
  {
    id: 'efes',
    name: 'Efes',
    modernName: 'Selçuk, İzmir',
    region: 'Ege',
    svgPoint: { cx: 68, cy: 108 },
    coordinates: { lat: 37.9395, lng: 27.3417 },
    category: 'sehir',
    bibleRef: 'Vahiy 2:1',
    bibleRefs: ['Vahiy 2:1-7', 'Efesliler 1:1', 'Elç. İşl. 19:1-41'],
    description:
      "Pavlus'un 3 yıl kaldığı ve kilise kurduğu şehir. Yeni Ahit'in en önemli merkezlerinden biri. Yuhanna'nın da burada yaşadığı rivayet edilir.",
    historicalNote:
      "Roma İmparatorluğu'nun Asya eyaletinin başkenti. Artemis tapınağı dünyanın yedi harikasından biriydi. Bugün Selçuk yakınlarında görülebilen muhteşem harabeleri UNESCO tarafından korunmaktadır.",
    paulVisited: true,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 2:4', text: 'Ama sana karşı şikayetim var: İlk sevginden uzaklaştın.' },
      { ref: 'Efesliler 2:8', text: 'Çünkü iman yoluyla lütufla kurtuldunuz.' },
    ],
  },
  {
    id: 'izmir',
    name: 'İzmir (Smyrna)',
    modernName: 'İzmir',
    region: 'Ege',
    svgPoint: { cx: 60, cy: 95 },
    coordinates: { lat: 38.4192, lng: 27.1287 },
    category: 'sehir',
    bibleRef: 'Vahiy 2:8',
    bibleRefs: ['Vahiy 2:8-11'],
    description:
      'Yedi kiliseden biri. Ölüme dek sadık kal mesajıyla tanınan kilise. Polikarp\'ın şehit edildiği yer.',
    historicalNote:
      "Antik çağın en güzel şehirlerinden biri. Bugün Türkiye'nin üçüncü büyük şehri olan İzmir, o dönem Roma'nın önemli bir ticaret merkeziydi.",
    paulVisited: false,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 2:10', text: 'Ölüme dek sadık kal, sana yaşam tacını vereceğim.' },
    ],
  },
  {
    id: 'bergama',
    name: 'Bergama (Pergamon)',
    modernName: 'Bergama, İzmir',
    region: 'Ege',
    svgPoint: { cx: 62, cy: 78 },
    coordinates: { lat: 39.1207, lng: 27.1842 },
    category: 'sehir',
    bibleRef: 'Vahiy 2:12',
    bibleRefs: ['Vahiy 2:12-17'],
    description:
      "Şeytan'ın tahtının bulunduğu yer olarak anılan şehir. Zeus sunağı ve Roma imparator kültü buradaydı.",
    historicalNote:
      "Antik dünyanın en büyük kütüphanelerinden birine ev sahipliği yaptı. Bergama'da icat edilen parşömen bugün hâlâ adını taşıyor (pergament). Zeus Sunağı bugün Berlin müzesinde sergileniyor.",
    paulVisited: false,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 2:13', text: "Şeytan'ın tahtının bulunduğu yerde yaşadığını biliyorum." },
    ],
  },
  {
    id: 'tiyatira',
    name: 'Tiyatira',
    modernName: 'Akhisar, Manisa',
    region: 'Ege',
    svgPoint: { cx: 85, cy: 90 },
    coordinates: { lat: 38.9167, lng: 27.8333 },
    category: 'sehir',
    bibleRef: 'Vahiy 2:18',
    bibleRefs: ['Vahiy 2:18-29', 'Elç. İşl. 16:14'],
    description:
      "Yedi kiliseden biri. Mor boya tüccarı Lidya'nın memleketi. Pavlus'un ilk Avrupalı mühtedisi Lidya buradan geliyordu.",
    historicalNote: 'Ticaret loncalarıyla tanınan bir şehirdi. Mor boya üretimi ve bronz işçiliği ile ünlüydü.',
    paulVisited: false,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 2:19', text: 'Yaptıklarını biliyorum: sevgini, imanını, hizmetini, sabrını.' },
    ],
  },
  {
    id: 'sart',
    name: 'Sart (Sardis)',
    modernName: 'Salihli, Manisa',
    region: 'Ege',
    svgPoint: { cx: 95, cy: 95 },
    coordinates: { lat: 38.4881, lng: 28.0453 },
    category: 'sehir',
    bibleRef: 'Vahiy 3:1',
    bibleRefs: ['Vahiy 3:1-6'],
    description:
      'Ölü görünen ama içinde küçük bir iman kıvılcımı olan kilise. Tarihin ilk paralarının basıldığı şehir.',
    historicalNote:
      "Lidya Krallığı'nın başkentiydi. Kral Karun'un (Croesus) hazinesiyle ünlüydü. Tarihteki ilk altın paraların burada basıldığı bilinmektedir.",
    paulVisited: false,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 3:2', text: 'Uyan! Ölmek üzere olan geri kalanları güçlendir.' },
    ],
  },
  {
    id: 'alasehir',
    name: 'Alaşehir (Philadelphia)',
    modernName: 'Alaşehir, Manisa',
    region: 'Ege',
    svgPoint: { cx: 105, cy: 100 },
    coordinates: { lat: 38.3486, lng: 28.5194 },
    category: 'sehir',
    bibleRef: 'Vahiy 3:7',
    bibleRefs: ['Vahiy 3:7-13'],
    description: 'Yedi kiliseden en çok övülen. Açık kapı vaat edilen sadık kilise.',
    historicalNote:
      'Kardeş sevgisi şehri anlamına gelir. Pergamon Kralı II. Attalos tarafından kuruldu. Bugün Alaşehir adıyla yaşamaya devam ediyor.',
    paulVisited: false,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 3:8', text: 'İşte önüne açık bir kapı koydum, onu kimse kapayamaz.' },
    ],
  },
  {
    id: 'laodikya',
    name: 'Laodikya',
    modernName: 'Denizli yakınları',
    region: 'Ege',
    svgPoint: { cx: 118, cy: 108 },
    coordinates: { lat: 37.8333, lng: 29.1167 },
    category: 'sehir',
    bibleRef: 'Vahiy 3:14',
    bibleRefs: ['Vahiy 3:14-22', 'Koloseliler 4:16'],
    description:
      'Ilık imanıyla uyarılan kilise. Ne sıcak ne soğuk — ılık olduğun için seni ağzımdan tüküreceğim.',
    historicalNote:
      "Zengin bir ticaret şehri. Göz merhemi ve siyah yün kumaşıyla ünlüydü. Yakınındaki Hierapolis'ten gelen sıcak su borularla şehre ulaştığında ılınıyordu — bu mecazi anlamda mektuba yansıdı.",
    paulVisited: false,
    revelationChurch: true,
    keyVerses: [
      { ref: 'Vahiy 3:20', text: 'İşte kapıda durmuş kapıyı çalıyorum.' },
    ],
  },
  {
    id: 'antakya',
    name: 'Antakya',
    modernName: 'Hatay',
    region: 'Akdeniz',
    svgPoint: { cx: 255, cy: 140 },
    coordinates: { lat: 36.2021, lng: 36.1603 },
    category: 'sehir',
    bibleRef: 'Elç. İşl. 11:26',
    bibleRefs: ['Elç. İşl. 11:19-30', 'Galatyalılar 2:11'],
    description:
      "Hristiyan adının ilk kullanıldığı şehir. Pavlus'un misyoner yolculuklarının üssü.",
    historicalNote:
      "Roma İmparatorluğu'nun üçüncü büyük şehriydi. Erken kilisenin en önemli merkezlerinden biri oldu. Bugün Hatay'ın Antakya ilçesi olarak yaşıyor.",
    paulVisited: true,
    revelationChurch: false,
    keyVerses: [
      { ref: 'Elç. İşl. 11:26', text: "Öğrencilere ilk kez Antakya'da Hristiyan denildi." },
    ],
  },
  {
    id: 'tarsus',
    name: 'Tarsus',
    modernName: 'Tarsus, Mersin',
    region: 'Akdeniz',
    svgPoint: { cx: 220, cy: 132 },
    coordinates: { lat: 36.9163, lng: 34.8953 },
    category: 'sehir',
    bibleRef: 'Elç. İşl. 9:11',
    bibleRefs: ['Elç. İşl. 9:11', '21:39', '22:3'],
    description:
      "Pavlus'un doğduğu şehir. Roma vatandaşı olarak burada hem Yahudi geleneğini hem Yunan felsefesini öğrendi.",
    historicalNote:
      "Kilikya'nın başkentiydi. Kleopatra ve Marcus Antonius'un buluştuğu yer. Pavlus burada doğdu ve ilk eğitimini aldı.",
    paulVisited: true,
    revelationChurch: false,
    keyVerses: [
      { ref: 'Elç. İşl. 22:3', text: "Ben Kilikya'nın Tarsus kentinde doğmuş bir Yahudiyim." },
    ],
  },
  {
    id: 'konya',
    name: 'Konya (İkonium)',
    modernName: 'Konya',
    region: 'İç Anadolu',
    svgPoint: { cx: 175, cy: 112 },
    coordinates: { lat: 37.8667, lng: 32.4833 },
    category: 'sehir',
    bibleRef: 'Elç. İşl. 13:51',
    bibleRefs: ['Elç. İşl. 13:51', '14:1-6'],
    description: "Pavlus ve Barnaba'nın ilk yolculuklarında ziyaret ettiği şehir.",
    historicalNote:
      "Frigya'nın önemli bir şehriydi. Pavlus burada büyük etki bıraktı ama zulüm görünce ayrılmak zorunda kaldı.",
    paulVisited: true,
    revelationChurch: false,
    keyVerses: [
      { ref: 'Elç. İşl. 14:1', text: "İkonium'da Pavlus ile Barnaba Yahudi havrasına gittiler." },
    ],
  },
  {
    id: 'ankara',
    name: 'Ankara (Ankyra)',
    modernName: 'Ankara',
    region: 'İç Anadolu',
    svgPoint: { cx: 158, cy: 78 },
    coordinates: { lat: 39.9334, lng: 32.8597 },
    category: 'sehir',
    bibleRef: 'Galatyalılar 1:2',
    bibleRefs: ['Galatyalılar 1:2', '3:1'],
    description: "Pavlus'un ey akılsız Galatlar! diye hitap ettiği bölgenin merkezi.",
    historicalNote:
      "Galatya eyaletinin önemli şehirlerindendi. Bugün Türkiye'nin başkenti. Galatyalılara Mektup bu bölgedeki kiliselere yazıldı.",
    paulVisited: true,
    revelationChurch: false,
    keyVerses: [
      { ref: 'Galatyalılar 3:1', text: 'Ey akılsız Galatlar! Sizi kim büyüledi?' },
    ],
  },
  {
    id: 'patmos',
    name: 'Patmos Adası',
    modernName: 'Patmos, Yunanistan',
    region: 'Ege Adaları',
    svgPoint: { cx: 42, cy: 118 },
    coordinates: { lat: 37.3211, lng: 26.5472 },
    category: 'ada',
    bibleRef: 'Vahiy 1:9',
    bibleRefs: ['Vahiy 1:9'],
    description: "Yuhanna'nın sürgün edildiği ve Vahiy kitabını yazdığı ada.",
    historicalNote:
      "Roma döneminde sürgün yeri olarak kullanılırdı. Yuhanna burada Tanrı'dan görümler aldı ve Vahiy kitabını yazdı. Bugün hâlâ Hristiyan hac noktası.",
    paulVisited: false,
    revelationChurch: false,
    keyVerses: [
      { ref: 'Vahiy 1:9', text: "Tanrı'nın sözü uğruna Patmos adasında bulunuyordum." },
    ],
  },
];
