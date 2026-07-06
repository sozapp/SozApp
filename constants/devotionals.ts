/** Günlük devotional içerik — 365 güne döngü (en az 30 gün dolu) */

export type Devotional = {
  day: number;
  title: string;
  verse: string;
  verseRef: string;
  reflection: string;
  question: string;
  prayer: string;
};

export const devotionals: Devotional[] = [
  {
    day: 1,
    title: "Söz'ün Gücü",
    verse: "Başlangıçta Söz vardı. Söz Tanrı'yla birlikteydi ve Söz Tanrı'ydı.",
    verseRef: "Yuhanna 1:1",
    reflection:
      "Her şey bir söz ile başladı. Tanrı'nın sözü yaratıcı bir güçtür; O söyledi ve her şey var oldu. Bugün senin hayatında da O'nun sözü aynı güce sahip. O'na kulak ver.",
    question:
      "Bugün Tanrı'nın sözü hayatının hangi alanında sana konuşuyor?",
    prayer:
      "Tanrım, bugün senin sözünle yürümem için bana güç ver. Sözün kalbimde yaşasın ve davranışlarıma yön versin.",
  },
  {
    day: 2,
    title: "Dinlenme Vaadi",
    verse: "Yorgun ve yüklü olanlar hepiniz bana gelin, size dinlenme vereceğim.",
    verseRef: "Matta 11:28",
    reflection:
      "İsa yüklerimizi taşımamızı istemiyor. O'na gelmek, O'nun önünde yükü bırakmak ve O'nun huzurunda dinlenmektir. Bugün yükünü O'na bırak.",
    question:
      "Şu an omuzunda taşıdığın ve O'na bırakmak istediğin bir yük var mı?",
    prayer:
      "Rab, yorgunluğumu ve yüklerimi sana bırakıyorum. Beni gerçek dinlenmeye kavuştur.",
  },
  {
    day: 3,
    title: "RAB Çobanımdır",
    verse: "RAB çobanımdır, eksiğim olmaz. Beni yemyeşil çayırlarda yatırır, sakin suların kıyısına götürür.",
    verseRef: "Mezmur 23:1-2",
    reflection:
      "Çoban koyunlarını bilir, korur ve götürür. Sen de O'nun koyunusun. Eksiğin olmayacak; O seni besler, sakin sulara götürür.",
    question:
      "Hangi ihtiyaçlarında O'nun çobanlığına güvenmekte zorlanıyorsun?",
    prayer:
      "Çobanım RAB, senin öncülüğünde yürüyorum. Eksiğim olmadığına iman ediyorum.",
  },
  {
    day: 4,
    title: "Umut Dolu Planlar",
    verse: "Biliyorum ki size düşündüğüm planlar var; sizi felakete değil, esenliğe, size umut ve gelecek vaat eden planlara yönelik.",
    verseRef: "Yeremya 29:11",
    reflection:
      "Tanrı'nın senin için düşünceleri iyidir. Zor günlerde bile O'nun planı umut ve gelecektir. Bugün bu vaade tutun.",
    question:
      "Hayatında umut ve geleceğe dair hangi vaadi bugün özellikle hatırlamalısın?",
    prayer:
      "Baba, planlarının bana umut ve gelecek verdiğine inanıyorum. Gözlerimi sana dikiyorum.",
  },
  {
    day: 5,
    title: "Her Şeye Gücüm Yeter",
    verse: "Her şeye gücüm yeter, beni güçlendiren Mesih sayesinde.",
    verseRef: "Filipililer 4:13",
    reflection:
      "Güç Mesih'ten gelir. Zayıf olduğunda O güçlüdür. Bugün yapman gereken her şeyi O'nun gücüyle yapabilirsin.",
    question:
      "Bugün hangi güçlükte O'nun gücüne, kendi çabana değil, güvenmeyi seçebilirsin?",
    prayer:
      "Mesih, senin gücünle bugünkü adımlarımı atıyorum. Bana yetecek kuvveti ver.",
  },
  {
    day: 6,
    title: "Sevgi Sabırlıdır",
    verse: "Sevgi sabırlıdır, sevgi şefkatlidir. Sevgi kıskanmaz, övünmez, böbürlenmez.",
    verseRef: "1. Korintliler 13:4",
    reflection:
      "Tanrı'nın sevgisi böyledir; sabırlı ve şefkatli. Bugün çevrendekilere bu sevgiyi yansıt.",
    question:
      "Sabır ve şefkat gerektiren bir ilişkimde bugün küçük bir adım atabilir misin?",
    prayer:
      "Rab, sevginle doldur. Sabırlı ve şefkatli olmamı sağla.",
  },
  {
    day: 7,
    title: "Yol, Gerçek ve Yaşam",
    verse: "İsa ona, Ben yol, gerçek ve yaşamım dedi. Bana Baba'dan başka kimse gelmez.",
    verseRef: "Yuhanna 14:6",
    reflection:
      "İsa tek yol, tek gerçek ve gerçek yaşamdır. Kararsızlıkta O'na bak; O seni doğru yola götürür.",
    question:
      "Hangi kararda veya yanlış yolda O'ya dönmek için durup dinlemeye ihtiyacın var?",
    prayer:
      "İsa, sen benim yolum, gerçeğim ve yaşamımsın. Sadece sana güveniyorum.",
  },
  {
    day: 8,
    title: "Ruh'un Meyvesi",
    verse: "Ruh'un meyvesi sevgi, sevinç, esenlik, sabır, şefkat, iyilik, bağlılık, yumuşaklık ve özdenetimdir.",
    verseRef: "Galatyalılar 5:22",
    reflection:
      "Kendi çabamızla bu meyveyi üretemeyiz; Ruh'ta yürüdükçe doğal olarak büyür. Bugün Ruh'a alan aç.",
    question:
      "Ruh'un meyvesinin hangi yönü bugün hayatında daha çok görünür olsun?",
    prayer:
      "Kutsal Ruh, bende sevgi, sevinç ve esenlik meyvesini yeşert.",
  },
  {
    day: 9,
    title: "Sığınağımız ve Gücümüz",
    verse: "Tanrı sığınağımız ve gücümüzdür, sıkıntıda her zaman yardım edendir.",
    verseRef: "Mezmur 46:1",
    reflection:
      "Sıkıntıda ilk sığınağımız O'dur. O güç verir ve yardım eder. Bugün sıkıntın varsa O'na sığın.",
    question:
      "Şu an içinde taşıdığın bir sıkıntıyı O'na sığınarak teslim etmeye hazır mısın?",
    prayer:
      "Tanrım, sığınağım ve gücüm sensin. Sıkıntıda bana yardım et.",
  },
  {
    day: 10,
    title: "İmanın Özü",
    verse: "İman, umduklarımızın özü, görmediğimiz gerçeklerin kanıtıdır.",
    verseRef: "İbraniler 11:1",
    reflection:
      "İman görünmeyene güvenmektir. Umutların ve beklentilerin O'nun vaatlerine dayansın.",
    question:
      "Görmediğin bir geleceğe O'na güvenmek bugün seni ne kadar zorluyor?",
    prayer:
      "Rab, imanımı güçlendir. Görmeden sana güvenmemi sağla.",
  },
  {
    day: 11,
    title: "Tanrı'yı Sevenlere",
    verse: "Tanrı'yı sevenlere, O'nun amacı doğrultusunda çağrılmış olanlara her şeyin yararlı olduğunu biliriz.",
    verseRef: "Romalılar 8:28",
    reflection:
      "Her şey — zorluklar dahil — O'nun amacına hizmet eder. Bugün bu gerçeğe tutun.",
    question:
      "Şu an anlamını tam çıkaramadığın bir zorlukta O'nun amacına güvenebilir misin?",
    prayer:
      "Baba, her şeyin senin elinde iyiliğe dönüştüğüne inanıyorum. Bana gözümle görmesem de güven ver.",
  },
  {
    day: 12,
    title: "Barışı Sağlayanlar",
    verse: "Barışı sağlayanlar ne mutlu! Onlar Tanrı'nın oğulları olarak anılacak.",
    verseRef: "Matta 5:9",
    reflection:
      "Barış getirmek Tanrı'ya benzemektir. Bugün çevrende barışı yaymaya çalış.",
    question:
      "Bugün kime veya hangi ortama küçük bir barış jesti götürebilirsin?",
    prayer:
      "Rab, beni barış elçisi yap. Evimde ve çevremde barışı sağlamama yardım et.",
  },
  {
    day: 13,
    title: "Sözün Kandil",
    verse: "Sözün ayağıma kandil, yoluma ışıktır.",
    verseRef: "Mezmur 119:105",
    reflection:
      "Karanlıkta adım atmak zor. O'nun sözü ayaklarına ışık, yola rehberdir. Bugün sözüne kulak ver.",
    question:
      "Hangi kararda sözünü okumak ve dinlemek sana bugün en çok ışık verir?",
    prayer:
      "Tanrım, sözün yoluma ışık olsun. Adımlarımı aydınlat.",
  },
  {
    day: 14,
    title: "Merhamet Tazedir",
    verse: "RAB'bin sevgisi hiç tükenmez, merhameti asla bitmez. Her sabah tazedir.",
    verseRef: "Ağıtlar 3:22-23",
    reflection:
      "Her yeni gün O'nun taze merhametiyle başlar. Dünkü hatalar bugünü kirletmez; O affeder.",
    question:
      "Dünkü bir hatayı bugün O'nun merhametiyle nasıl yeniden başlamak istersin?",
    prayer:
      "Rab, bu sabah taze merhametinle karşıla. Minnettarım.",
  },
  {
    day: 15,
    title: "Korkma",
    verse: "Korkma, çünkü seninleyim. Ürkmek yok, çünkü ben Tanrı'yım.",
    verseRef: "Yeşaya 41:10",
    reflection:
      "Korku insandandır; güven Tanrı'dandır. O seninle. Bugün korkularını O'na bırak.",
    question:
      "Şu an en çok hangi korkunu O'na itiraf etmek istiyorsun?",
    prayer:
      "Tanrım, korkularımı sana bırakıyorum. Seninleyim diyorsun; buna güveniyorum.",
  },
  {
    day: 16,
    title: "Dua Edin",
    verse: "Dua edin, sınanmaya girmeyin. Ruh isteklidir, beden ise zayıftır.",
    verseRef: "Matta 26:41",
    reflection:
      "İsa bizi uyarıyor: dua etmek, sınanmaya düşmemek için en güçlü silahtır. Bugün dua et.",
    question:
      "Bugün hangi konuda bilinçli olarak biraz daha durup dua etmeyi seçebilirsin?",
    prayer:
      "Rab, beni dua etmeye yönlendir. Zayıf olduğumda Ruh'umla dua etmemi sağla.",
  },
  {
    day: 17,
    title: "Önce O'nun Egemenliği",
    verse: "Siz önce O'nun egemenliğini ve doğruluğunu arayın; bütün bunlar da size verilecektir.",
    verseRef: "Matta 6:33",
    reflection:
      "Önceliklerimiz doğru olunca gerisi eklenir. Bugün önce O'nun egemenliğini ara.",
    question:
      "Hayatında O'nun egemenliğini öne almanı engelleyen bir öncelik var mı?",
    prayer:
      "Baba, önceliğim senin egemenliğin olsun. Gerisini sen ekle.",
  },
  {
    day: 18,
    title: "İyi Çoban",
    verse: "Ben iyi çobanım. İyi çoban koyunları uğruna canını verir.",
    verseRef: "Yuhanna 10:11",
    reflection:
      "İsa senin uğruna canını verdi. O iyi çobandır; O'na güven.",
    question:
      "İyi Çoban'a bugün hangi alanda daha çok teslim olmak istiyorsun?",
    prayer:
      "İyi Çoban, senin korumanda olduğumu biliyorum. Sana güveniyorum.",
  },
  {
    day: 19,
    title: "Sevinç ve Esenlik",
    verse: "Sizi bırakıyorum, size kendi esenliğimi veriyorum. Dünyanın verdiği gibi vermiyorum. Yüreğiniz sıkılmasın, korkmasın.",
    verseRef: "Yuhanna 14:27",
    reflection:
      "Dünyanın esenliği geçicidir; O'nun esenliği kalıcıdır. Bugün O'nun esenliğinde yaşa.",
    question:
      "Hangi gerginlikte O'nun verdiği esenliği içine davet etmek istersin?",
    prayer:
      "İsa, yüreğim sıkılmasın, korkmasın. Esenliğinle doldur.",
  },
  {
    day: 20,
    title: "Şükür İle",
    verse: "Her durumda şükredin. Çünkü Tanrı'nın Mesih İsa'da sizin için istediği budur.",
    verseRef: "1. Selanikliler 5:18",
    reflection:
      "Her durumda şükretmek imanla yürümektir. Bugün minnettar bir yürekle başla.",
    question:
      "Bugün için şükredebileceğin küçük ama samimi bir şey ne?",
    prayer:
      "Rab, her durumda şükretmemi sağla. Gözlerimi nimetlere aç.",
  },
  {
    day: 21,
    title: "Güç Zayıflıkta",
    verse: "Gücüm zayıflıkta tamamlanır. Zayıf olduğumda güçlüyüm.",
    verseRef: "2. Korintliler 12:9",
    reflection:
      "Zayıf hissettiğinde O'nun gücü seninle daha görünür olur. Zayıflığını O'na sun.",
    question:
      "Zayıf hissettiğin bir alanda O'nun gücüne güvenmek senin için ne anlama geliyor?",
    prayer:
      "Rab, zayıf olduğumda gücün bende görünsün. Yeterliğin bana yetiyor.",
  },
  {
    day: 22,
    title: "Sevgi Birbirimize",
    verse: "Birbirinizi sevin. Çünkü sevgi Tanrı'dandır. Seven herkes Tanrı'dan doğmuştur.",
    verseRef: "1. Yuhanna 4:7",
    reflection:
      "Sevgi Tanrı'dan gelir. Birbirimizi sevmek O'nu yansıtmaktır. Bugün birini gerçekten sev.",
    question:
      "Koşulsuz sevgi gösterebileceğin bir kişi kim ve bugün bunu nasıl ifade edebilirsin?",
    prayer:
      "Tanrım, sevginle doldur. Birbirimizi senin gibi sevelim.",
  },
  {
    day: 23,
    title: "Doğru Yol",
    verse: "Tüm yolların doğru olduğunu düşünen var; ama sonu ölüme çıkar.",
    verseRef: "Özdeyişler 14:12",
    reflection:
      "Kendi yolumuza güvenmek tehlikelidir. O'nun sözü ve yolu doğru yoldur. Bugün O'nun yolunda yürü.",
    question:
      "Kendi akıl yürütmenle Tanrı'nın sözü çeliştiğinde bugün hangisine güveneceksin?",
    prayer:
      "Rab, yollarımı senin sözüne göre düzelt. Senin yolunda yürümemi sağla.",
  },
  {
    day: 24,
    title: "İlk Sevgini Hatırla",
    verse: "Nereden düştüğünü hatırla. Tövbe et ve önceki işleri yap.",
    verseRef: "Vahiy 2:5",
    reflection:
      "İlk sevgi, İsa'ya ilk koştuğumuz günkü heyecandır. Bugün O'na yeniden koş.",
    question:
      "İlk günlerindeki sevgini canlandırmak için bugün neyi bırakıp neye sarılabilirsin?",
    prayer:
      "Rab, ilk sevgimi hatırlat. Sana yeniden tutkuyla bağlanayım.",
  },
  {
    day: 25,
    title: "Sabır ve Umut",
    verse: "RAB'bi bekleyin. Güçlü olun, yüreğiniz güçlü olsun. Evet, RAB'bi bekleyin.",
    verseRef: "Mezmur 27:14",
    reflection:
      "Beklemek zor; ama O'nun zamanı mükemmeldir. Bugün sabırla bekle.",
    question:
      "Beklediğin bir şeyde bugün O'nun zamanına güvenmek seni nasıl özgürleştirir?",
    prayer:
      "Rab, beklerken yüreğimi güçlendir. Senin zamanına güveniyorum.",
  },
  {
    day: 26,
    title: "Tövbe ve Bağışlanma",
    verse: "Günahlarımızı itiraf edersek, güvenilir ve adil olan O, günahlarımızı bağışlar ve bizi her kötülükten arındırır.",
    verseRef: "1. Yuhanna 1:9",
    reflection:
      "İtiraf ve tövbe O'na yaklaştırır. O bağışlar ve arındırır. Bugün O'na açıl.",
    question:
      "O'na itiraf etmek istediğin ama ertelediğin bir şey var mı?",
    prayer:
      "Tanrım, günahımı itiraf ediyorum. Beni bağışla ve arındır.",
  },
  {
    day: 27,
    title: "İsa'nın Yükü",
    verse: "Boyunduruğumu takın ve benden öğrenin. Yüküm hafif, boyunduruğum kolaydır.",
    verseRef: "Matta 11:29",
    reflection:
      "O'nun boyunduruğu baskı değil, birlikte yürümektir. O'ndan öğrenmek huzurdur.",
    question:
      "İsa'dan bugün özellikle ne öğrenmek ve onun yürüyüşünü taşımak istersin?",
    prayer:
      "İsa, boyunduruğunu takıyorum. Senden öğrenmek istiyorum.",
  },
  {
    day: 28,
    title: "Ruh ile Yürü",
    verse: "Ruh'un yönettiğine göre yaşayın. O zaman benliğin tutkularını yerine getirmezsiniz.",
    verseRef: "Galatyalılar 5:16",
    reflection:
      "Ruh'un yönettiği yaşam, benliğin tutkularına yenik düşmez. Bugün Ruh'a kulak ver.",
    question:
      "Bugün Ruh'un sesi ile benliğin sesi çeliştiğinde hangisini seçmek istiyorsun?",
    prayer:
      "Kutsal Ruh, bugün bana yön ver. Benliğe değil, sana uyayım.",
  },
  {
    day: 29,
    title: "Işık Olun",
    verse: "Siz dünyanın ışığısınız. Tepede duran kent gizlenemez.",
    verseRef: "Matta 5:14",
    reflection:
      "İsa seni ışık yaptı. Saklanma; parla. Bugün birinin karanlığına ışık ol.",
    question:
      "Bugün küçük bir nezaket veya doğrulukla kimin yolunu aydınlatabilirsin?",
    prayer:
      "Rab, beni ışık yap. Çevremde senin ışığınla parlayayım.",
  },
  {
    day: 30,
    title: "Sonuç Güven",
    verse: "RAB'be güven bütün yüreğinle; kendi aklına dayanma. Her yolda O'nu tanı; O yollarını düze çıkaracaktır.",
    verseRef: "Özdeyişler 3:5-6",
    reflection:
      "Kendi aklımıza değil, O'na güvenmek; her yolda O'nu tanımak. O yolları düze çıkarır.",
    question:
      "Kendi anlayışına güvenmek yerine bugün hangi konuda O'nu tanımayı seçebilirsin?",
    prayer:
      "RAB, bütün yüreğimle sana güveniyorum. Yollarımı sen düzelt.",
  },
];

/** Gün numarası (1–365) ile devotional döndürür; yoksa 1. günü verir. */
export function getDevotionalByDay(day: number): Devotional {
  const d = devotionals.find((x) => x.day === day);
  if (d) return d;
  const fallback = day % devotionals.length;
  return devotionals[fallback] ?? devotionals[0];
}

/** Yılın günü (1–365) hesaplar. */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000) || 1;
}

/** Bugünün devotional'ı (yılın günü 1–365, 30 günlük döngüye map edilir). */
export function getTodaysDevotional(date: Date): Devotional {
  const dayOfYear = getDayOfYear(date);
  const day = ((dayOfYear - 1) % devotionals.length) + 1;
  return getDevotionalByDay(day);
}
