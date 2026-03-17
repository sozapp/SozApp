export type Verse = {
  number: number;
  text: string;
};

export type Chapter = {
  book: string;
  chapterNumber: number;
  verses: Verse[];
};

export const sampleChapter: Chapter = {
  book: 'Yuhanna',
  chapterNumber: 3,
  verses: [
    { number: 1, text: 'Yahudiler\'in Nikodim adlı bir önderi vardı. Ferisiler\'den olan bu adam.' },
    { number: 2, text: 'Bir gece İsa\'ya gelerek, «Rabbî, senin Tanrı\'dan gelmiş bir öğretmen olduğunu biliyoruz. Çünkü Tanrı kendisiyle olmadıkça kimse senin yaptığın bu mucizeleri yapamaz» dedi.' },
    { number: 3, text: 'İsa ona şu karşılığı verdi: «Sana doğrusunu söyleyeyim, bir kimse yeniden doğmadıkça Tanrı\'nın Egemenliği\'ni göremez.»' },
    { number: 4, text: 'Nikodim, «Yaşlanmış bir adam nasıl doğabilir? Annesinin rahmine ikinci kez girip doğabilir mi?» diye sordu.' },
    { number: 5, text: 'İsa şöyle yanıt verdi: «Sana doğrusunu söyleyeyim, bir kimse sudan ve Ruh\'tan doğmadıkça Tanrı\'nın Egemenliği\'ne giremez.' },
    { number: 6, text: 'Bedenden doğan bedendir, Ruh\'tan doğan ruhtur.' },
    { number: 7, text: 'Sana, ‹Yeniden doğmalısınız› dediğime şaşma.' },
    { number: 8, text: 'Yel dilediği yerde eser; sesini işitirsin, ama nereden gelip nereye gittiğini bilemezsin. Ruh\'tan doğan herkes böyledir.»' },
    { number: 9, text: 'Nikodim İsa\'ya, «Bunlar nasıl olabilir?» diye sordu.' },
    { number: 10, text: 'İsa ona şöyle yanıt verdi: «Sen İsrail\'in öğretmeni olduğun halde bunları anlamıyor musun?' },
    { number: 11, text: 'Sana doğrusunu söyleyeyim, biz bildiğimizi söylüyoruz, gördüğümüze tanıklık ediyoruz. Sizler ise bizim tanıklığımızı kabul etmiyorsunuz.' },
    { number: 12, text: 'Sizlere yeryüzüyle ilgili şeyleri söylediğim zaman inanmazsanız, gökle ilgili şeyleri söylediğimde nasıl inanacaksınız?' },
    { number: 13, text: 'Gökten inmiş olan İnsanoğlu\'ndan başka hiç kimse göğe çıkmamıştır.' },
    { number: 14, text: 'Musa çölde yılanı nasıl yukarı kaldırdıysa, İnsanoğlu\'nun da öylece yukarı kaldırılması gerekir.' },
    { number: 15, text: 'Öyle ki, O\'na iman eden herkes sonsuz yaşama kavuşsun.' },
    { number: 16, text: 'Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu\'nu verdi. Öyle ki, O\'na iman edenlerin hiçbiri mahvolmasın, hepsi sonsuz yaşama kavuşsun.' },
    { number: 17, text: 'Tanrı, Oğlu\'nu dünyayı yargılamak için göndermedi, dünya O\'nun aracılığıyla kurtulsun diye gönderdi.' },
    { number: 18, text: 'O\'na iman eden yargılanmaz, iman etmeyen ise zaten yargılanmıştır. Çünkü Tanrı\'nın biricik Oğlu\'nun adına iman etmemiştir.' },
    { number: 19, text: 'Yargı da şudur: Dünyaya ışık geldi, ama insanlar ışık yerine karanlığı sevdiler. Çünkü yaptıkları işler kötüydü.' },
    { number: 20, text: 'Kötülük yapan herkes ışıktan nefret eder ve yaptıkları açığa çıkmasın diye ışığa yaklaşmaz.' },
    { number: 21, text: 'Ama gerçeği uygulayan kişi yaptıklarını, Tanrı\'ya dayanarak yaptığını göstermek için ışığa gelir.»' },
  ],
};

/** verseId format: "Book-Chapter-Verse" e.g. "Yuhanna-3-16" */
export function getVerseTextByVerseId(verseId: string): string | null {
  const parts = verseId.split('-');
  if (parts.length < 3) return null;
  const verseNum = parseInt(parts[parts.length - 1], 10);
  const chapterNum = parseInt(parts[parts.length - 2], 10);
  const book = parts.slice(0, -2).join('-');
  if (
    book !== sampleChapter.book ||
    chapterNum !== sampleChapter.chapterNumber ||
    Number.isNaN(verseNum)
  ) {
    return null;
  }
  const verse = sampleChapter.verses.find((v) => v.number === verseNum);
  return verse?.text ?? null;
}

/** verseId → "Book Chapter:Verse" e.g. "Yuhanna 3:16" */
export function getVerseRefFromVerseId(verseId: string): string {
  const parts = verseId.split('-');
  if (parts.length < 3) return verseId;
  const verseNum = parts[parts.length - 1];
  const chapterNum = parts[parts.length - 2];
  const book = parts.slice(0, -2).join('-');
  return `${book} ${chapterNum}:${verseNum}`;
}
