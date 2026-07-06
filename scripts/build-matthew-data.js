/**
 * Builds constants/matthew-data.ts from chapter paragraph text.
 * Run: node scripts/build-matthew-data.js
 * Optional: constants/matthew-raw-chapters.json with keys "5".."28" for full text.
 */
const fs = require('fs');
const path = require('path');
const MATTHEW_VERSES = [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20];

function parseChapterToVerses(paragraph, chapterNum) {
  if (!paragraph || typeof paragraph !== 'string') return [];
  const count = MATTHEW_VERSES[chapterNum - 1];
  const verses = [];
  let rest = paragraph.replace(/^\s*\d+\s+/, ''); // drop leading "1 "
  for (let v = 1; v <= count; v++) {
    const nextV = v + 1;
    const nextMarker = new RegExp(`\\s${nextV}\\s+(?=\\S)`);
    const match = rest.match(nextMarker);
    let text;
    if (match && match.index !== undefined) {
      text = rest.slice(0, match.index).trim();
      rest = rest.slice(match.index + match[0].length);
    } else {
      text = rest.trim();
      rest = '';
    }
    if (/^\(SEE\s+\d+:\d+\)/i.test(text) || /^\(TEXT OMITTED\)/i.test(text)) {
      text = verses[v - 2] || text;
    }
    text = text.replace(/\s*\d+:\d+\s*/g, ' ').trim();
    verses.push(text || (verses[verses.length - 1] ?? ''));
  }
  return verses;
}

// Chapter 1 full verses (Kutsal Kitap 2001 style)
const ch1 = `1 İbrahim oğlu, Davut oğlu İsa Mesih'in soy kaydı şöyledir: İbrahim İshak'ın babasıydı, İshak Yakup'un babasıydı, Yakup Yahuda ve kardeşlerinin babasıydı, 2 Yahuda, Tamar'dan doğan Peres'le Zerah'ın babasıydı, Peres Hesron'un babasıydı, Hesron Ram'ın babasıydı, 3 Ram Amminadav'ın babasıydı, Amminadav Nahşon'un babasıydı, Nahşon Salmon'un babasıydı, 4 Salmon, Rahav'dan doğan Boaz'ın babasıydı, Boaz, Rut'tan doğan Ovet'in babasıydı, Ovet İşay'ın babasıydı, 5 İşay Kral Davut'un babasıydı, Davut, Uriya'nın karısından doğan Süleyman'ın babasıydı, 6 Süleyman Rehavam'ın babasıydı, Rehavam Aviya'nın babasıydı, Aviya Asa'nın babasıydı, 7 Asa Yehoşafat'ın babasıydı, Yehoşafat Yoram'ın babasıydı, Yoram Uzziya'nın babasıydı, 8 Uzziya Yotam'ın babasıydı, Yotam Ahaz'ın babasıydı, Ahaz Hizkiya'nın babasıydı, 9 Hizkiya Manaşşe'nin babasıydı, Manaşşe Amon'un babasıydı, Amon Yoşiya'nın babasıydı, 10 Yoşiya, Babil sürgünü sırasında doğan Yehoyakin'le kardeşlerinin babasıydı, 11 Yehoyakin, Babil sürgününden sonra doğan Şealtiel'in babasıydı, Şealtiel Zerubbabil'in babasıydı, 12 Zerubbabil Avihut'un babasıydı, Avihut Elyakim'in babasıydı, Elyakim Azor'un babasıydı, 13 Azor Sadok'un babasıydı, Sadok Ahim'in babasıydı, Ahim Elihut'un babasıydı, 14 Elihut Elazar'ın babasıydı, Elazar Mattan'ın babasıydı, Mattan Yakup'un babasıydı, 15 Yakup Meryem'in kocası Yusuf'un babasıydı. Meryem'den Mesih diye tanınan İsa doğdu. 16 Buna göre, İbrahim'den Davut'a kadar toplam on dört kuşak, Davut'tan Babil sürgününe kadar on dört kuşak, Babil sürgününden Mesih'e kadar on dört kuşak vardır. 17 İsa Mesih'in doğumu şöyle oldu: Annesi Meryem, Yusuf'la nişanlıydı. Ama birlikte olmalarından önce Meryem'in Kutsal Ruh'tan gebe olduğu anlaşıldı. 18 Nişanlısı Yusuf, doğru bir adam olduğu ve onu herkesin önünde utandırmak istemediği için ondan sessizce ayrılmak niyetindeydi. 19 Ama böyle düşünmesi üzerine Rab'bin bir meleği rüyada ona görünerek şöyle dedi: "Davut oğlu Yusuf, Meryem'i kendine eş olarak almaktan korkma. Çünkü onun rahminde oluşan, Kutsal Ruh'tandır. 20 Meryem bir oğul doğuracak. Adını İsa koyacaksın. Çünkü halkını günahlarından O kurtaracak." 21 Bütün bunlar, Rab'bin peygamber aracılığıyla bildirdiği şu söz yerine gelsin diye oldu: 22 "İşte, kız gebe kalıp bir oğul doğuracak; adını İmmanuel koyacaklar." İmmanuel, Tanrı bizimle demektir. 23 Yusuf uyanınca Rab'bin meleğinin buyruğuna uydu ve Meryem'i eş olarak yanına aldı. 24 Ama oğlunu doğuruncaya dek Yusuf ona dokunmadı. 25 Doğan çocuğun adını İsa koydu.`;

// Ch2–Ch28 raw paragraph text (Wordplanet / Kutsal Kitap 2001 style)
const ch2 = `1 İsa'nın Kral Hirodes devrinde Yahudiye'nin Beytlehem Kenti'nde doğmasından sonra bazı yıldızbilimciler doğudan Yeruşalim'e gelip şöyle dediler: "Yahudiler'in Kralı olarak doğan çocuk nerede? Doğuda O'nun yıldızını gördük ve O'na tapınmaya geldik." 2 (SEE 2:1) 3 Kral Hirodes bunu duyunca kendisi de bütün Yeruşalim halkı da tedirgin oldu. 4 Bütün başkâhinleri ve halkın din bilginlerini toplayarak onlara Mesih'in nerede doğacağını sordu. 5 "Yahudiye'nin Beytlehem Kenti'nde" dediler. "Çünkü peygamber aracılığıyla şöyle yazılmıştır: 6 'Ey sen, Yahuda'daki Beytlehem, Yahuda önderleri arasında hiç de en önemsizi değilsin! Çünkü halkım İsrail'i güdecek önder Senden çıkacak.'" 7 Bunun üzerine Hirodes yıldızbilimcileri gizlice çağırıp onlardan yıldızın göründüğü anı tam olarak öğrendi. 8 "Gidin, çocuğu dikkatle arayın, bulunca bana haber verin, ben de gelip O'na tapınayım" diyerek onları Beytlehem'e gönderdi. 9 Yıldızbilimciler, kralı dinledikten sonra yola çıktılar. Doğuda görmüş oldukları yıldız onlara yol gösteriyordu, çocuğun bulunduğu yerin üzerine varınca durdu. 10 Yıldızı gördüklerinde olağanüstü bir sevinç duydular. 11 Eve girip çocuğu annesi Meryem'le birlikte görünce yere kapanarak O'na tapındılar. Hazinelerini açıp O'na armağan olarak altın, günnük ve mür sundular. 12 Sonra gördükleri bir düşte Hirodes'in yanına dönmemeleri için uyarılınca ülkelerine başka yoldan döndüler. 13 Yıldızbilimciler gittikten sonra Rab'bin bir meleği Yusuf'a rüyada görünerek, "Kalk!" dedi, "Çocukla annesini al, Mısır'a kaç. Ben sana haber verinceye dek orada kal. Çünkü Hirodes öldürmek için çocuğu aratacak." 14 Böylece Yusuf kalktı, aynı gece çocukla annesini alıp Mısır'a doğru yola çıktı. 15 Hirodes'in ölümüne dek orada kaldı. Bu, Rab'bin peygamber aracılığıyla bildirdiği şu söz yerine gelsin diye oldu: "Oğlumu Mısır'dan çağırdım." 16 Hirodes, yıldızbilimciler tarafından aldatıldığını anlayınca çok öfkelendi. Onlardan öğrendiği vakti göz önüne alarak Beytlehem ve bütün yöresinde bulunan iki ve iki yaşından küçük erkek çocukların hepsini öldürttü. 17 Böylelikle Peygamber Yeremya aracılığıyla bildirilen şu söz yerine gelmiş oldu: 18 "Rama'da bir ses duyuldu, Ağlayış ve acı feryat sesleri! Çocukları için ağlayan Rahel Avutulmak istemiyor. Çünkü onlar yok artık!" 19 Hirodes öldükten sonra, Rab'bin bir meleği Mısır'da Yusuf'a rüyada görünerek, "Kalk!" dedi, "Çocukla annesini al, İsrail'e dön. Çünkü çocuğun canına kıymak isteyenler öldü." 20 (SEE 2:19) 21 Bunun üzerine Yusuf kalktı, çocukla annesini alıp İsrail'e döndü. 22 Ama Yahudiye'de Hirodes'in yerine oğlu Arhelas'ın kral olduğunu duyunca oraya gitmekten korktu. Rüyada uyarılınca Celile bölgesine gitti. 23 Oraya varınca Nasıra denen kente yerleşti. Bu, peygamberler aracılığıyla bildirilen, "O'na Nasıralı denecektir" sözü yerine gelsin diye oldu.`;

const ch3 = `1 O günlerde Vaftizci Yahya Yahudiye Çölü'nde ortaya çıktı. Şu çağrıyı yapıyordu: "Tövbe edin! Göklerin Egemenliği yaklaşmıştır." 2 (SEE 3:1) 3 Nitekim Peygamber Yeşaya aracılığıyla sözü edilen kişi Yahya'dır. Yeşaya şöyle demişti: "Çölde haykıran, 'Rab'bin yolunu hazırlayın, Geçeceği patikaları düzleyin' diye sesleniyor." 4 Yahya'nın deve tüyünden giysisi, belinde deri kuşağı vardı. Yediği, çekirge ve yaban balıydı. 5 Yeruşalim, bütün Yahudiye ve Şeria yöresinin halkı ona geliyor, günahlarını itiraf ediyor, onun tarafından Şeria Irmağı'nda vaftiz ediliyordu. 6 (SEE 3:5) 7 Ne var ki, birçok Ferisi'yle Saduki'nin vaftiz olmak için kendisine geldiğini gören Yahya onlara şöyle seslendi: "Ey engerekler soyu! Gelecek gazaptan kaçmak için sizi kim uyardı? 8 Bundan böyle tövbeye yaraşır meyveler verin. 9 Kendi kendinize, 'Biz İbrahim'in soyundanız' diye düşünmeyin. Ben size şunu söyleyeyim: Tanrı, İbrahim'e şu taşlardan da çocuk yaratabilir. 10 Balta ağaçların köküne dayanmış bile. İyi meyve vermeyen her ağaç kesilip ateşe atılır. 11 Gerçi ben sizi tövbe için suyla vaftiz ediyorum, ama benden sonra gelen benden daha güçlüdür. Ben O'nun çarıklarını çıkarmaya bile layık değilim. O sizi Kutsal Ruh'la ve ateşle vaftiz edecek. 12 Yabası elindedir. Harman yerini temizleyecek, buğdayını toplayıp ambara yığacak, samanı ise sönmeyen ateşte yakacak." 13 Bu sırada İsa, Yahya tarafından vaftiz edilmek üzere Celile'den Şeria Irmağı'na, Yahya'nın yanına geldi. 14 Ne var ki Yahya, "Benim senin tarafından vaftiz edilmem gerekirken sen mi bana geliyorsun?" diyerek O'na engel olmak istedi. 15 İsa ona şu karşılığı verdi: "Şimdilik buna razı ol! Çünkü doğru olan her şeyi bu şekilde yerine getirmemiz gerekir." O zaman Yahya O'nun dediğine razı oldu. 16 İsa vaftiz olur olmaz sudan çıktı. O anda gökler açıldı ve İsa, Tanrı'nın Ruhu'nun güvercin gibi inip üzerine konduğunu gördü. 17 Göklerden gelen bir ses, "Sevgili Oğlum budur, O'ndan hoşnudum" dedi.`;

const ch4 = `1 Bundan sonra İsa, İblis tarafından denenmek üzere Ruh aracılığıyla çöle götürüldü. 2 İsa kırk gün kırk gece oruç tuttuktan sonra acıktı. 3 O zaman Ayartıcı yaklaşıp, "Tanrı'nın Oğlu'ysan, söyle şu taşlar ekmek olsun" dedi. 4 İsa ona şu karşılığı verdi: "'İnsan yalnız ekmekle yaşamaz, Tanrı'nın ağzından çıkan her sözle yaşar' diye yazılmıştır." 5 Sonra İblis O'nu kutsal kente götürdü. Tapınağın tepesine çıkarıp, "Tanrı'nın Oğlu'ysan, kendini aşağı at" dedi, "Çünkü şöyle yazılmıştır: 'Tanrı, senin için meleklerine buyruk verecek.' 'Ayağın bir taşa çarpmasın diye Seni elleri üzerinde taşıyacaklar.'" 6 (SEE 4:5) 7 İsa İblis'e şu karşılığı verdi: "'Tanrın Rab'bi denemeyeceksin' diye de yazılmıştır." 8 İblis bu kez İsa'yı çok yüksek bir dağa çıkardı. O'na bütün görkemiyle dünya ülkelerini göstererek, 9 "Yere kapanıp bana taparsan, bütün bunları sana vereceğim" dedi. 10 İsa ona şöyle karşılık verdi: "Çekil git, Şeytan! 'Tanrın Rab'be tapacak, yalnız O'na kulluk edeceksin' diye yazılmıştır." 11 Bunun üzerine İblis İsa'yı bırakıp gitti. Melekler gelip İsa'ya hizmet ettiler. 12 İsa, Yahya'nın tutuklandığını duyunca Celile'ye döndü. 13 Nasıra'dan ayrılarak Zevulun ve Naftali yöresinde, Celile Gölü kıyısında bulunan Kefarnahum'a yerleşti. 14 Bu, Peygamber Yeşaya aracılığıyla bildirilen şu söz yerine gelsin diye oldu: "Zevulun ve Naftali bölgeleri, Şeria Irmağı'nın ötesinde, Deniz Yolu'nda, Ulusların yaşadığı Celile! 15 (SEE 4:14) 16 Karanlıkta yaşayan halk, Büyük bir ışık gördü. Ölümün gölgelediği diyarda Yaşayanlara ışık doğdu." 17 O günden sonra İsa şu çağrıda bulunmaya başladı: "Tövbe edin! Çünkü Göklerin Egemenliği yaklaştı." 18 İsa, Celile Gölü'nün kıyısında yürürken Petrus diye de anılan Simun'la kardeşi Andreas'ı gördü. Balıkçı olan bu iki kardeş göle ağ atıyorlardı. 19 Onlara, "Ardımdan gelin" dedi, "Sizleri insan tutan balıkçılar yapacağım." 20 Onlar da hemen ağlarını bırakıp O'nun ardından gittiler. 21 İsa daha ileri gidince başka iki kardeşi, Zebedi'nin oğulları Yakup'la Yuhanna'yı gördü. Babaları Zebedi'yle birlikte teknede ağlarını onarıyorlardı. Onları da çağırdı. 22 Hemen tekneyi ve babalarını bırakıp İsa'nın ardından gittiler. 23 İsa, Celile bölgesinin her tarafını dolaştı. Buralardaki havralarda öğretiyor, göksel egemenliğin Müjdesi'ni duyuruyor, halk arasında rastlanan her hastalığı, her illeti iyileştiriyordu. 24 Ünü bütün Suriye'ye yayılmıştı. Türlü hastalıklara yakalanmış bütün hastaları, acı çekenleri, cinlileri, saralıları, felçlileri O'na getirdiler; hepsini iyileştirdi. 25 Celile, Dekapolis, Yeruşalim, Yahudiye ve Şeria Irmağı'nın karşı yakasından gelen büyük kalabalıklar O'nun ardından gidiyordu.`;

// Ch5–Ch28: load from matthew-raw-chapters.json if present
let ch5_28 = [];
const rawPath = path.join(__dirname, '..', 'constants', 'matthew-raw-chapters.json');
if (fs.existsSync(rawPath)) {
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  for (let c = 5; c <= 28; c++) ch5_28.push(raw[String(c)] || null);
}

const chapters = [ch1, ch2, ch3, ch4];
for (let c = 5; c <= 28; c++) chapters.push(ch5_28[c - 5] || null);

const outDir = path.join(__dirname, '..', 'constants');
const allParsed = [];
for (let i = 0; i < 28; i++) {
  const chNum = i + 1;
  if (chapters[i]) {
    const verses = parseChapterToVerses(chapters[i], chNum);
    allParsed.push(verses);
    console.log(`Ch${chNum} verse count:`, verses.length);
  } else {
    const count = MATTHEW_VERSES[i];
    allParsed.push(Array(count).fill(`[Matta ${chNum}:?]`));
  }
}

const lines = [
  "/** Matta — Türkçe Kutsal Kitap 2001 (ayet metinleri) */",
  "export const MATTHEW_CHAPTER_VERSES: string[][] = [",
];
for (const verses of allParsed) {
  lines.push("  [");
  for (const t of verses) {
    lines.push("    " + JSON.stringify(t) + ",");
  }
  lines.push("  ],");
}
lines.push("];");
fs.writeFileSync(path.join(outDir, 'matthew-data.ts'), lines.join('\n'), 'utf8');
console.log('Wrote constants/matthew-data.ts');
