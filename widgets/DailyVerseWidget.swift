import WidgetKit
import SwiftUI

// MARK: - Gömülü günlük ayetler (RN constants/daily-verse.ts ile aynı fikir)
// Widget ayrı process — JS state yok; App Group olmadan sabit liste yeterli.

private struct DailyVerseItem {
  let text: String
  let ref: String
}

private let dailyVerses: [DailyVerseItem] = [
  DailyVerseItem(text: "Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu'nu verdi; Öyle ki, O'na iman edenlerin hiçbiri mahvolmasın, hepsi sonsuz yaşama kavuşsun.", ref: "Yuhanna 3:16"),
  DailyVerseItem(text: "RAB çobanımdır, eksiğim olmaz.", ref: "Mezmur 23:1"),
  DailyVerseItem(text: "Her şeye gücüm yeter, beni güçlendiren Mesih sayesinde.", ref: "Filipililer 4:13"),
  DailyVerseItem(text: "Size verdiğim gelecek ve umut dolu planlardan vazgeçmeyeceğim.", ref: "Yeremya 29:11"),
  DailyVerseItem(text: "Yorgun ve yüklü olanlar hepiniz bana gelin, size dinlenme vereceğim.", ref: "Matta 11:28"),
  DailyVerseItem(text: "Tanrı'yı sevenlere, O'nun amacı doğrultusunda çağrılmış olanlara her şeyin yararlı olduğunu biliriz.", ref: "Romalılar 8:28"),
  DailyVerseItem(text: "Barışı sağlayanlar ne mutlu! Onlar Tanrı'nın oğulları olarak anılacak.", ref: "Matta 5:9"),
  DailyVerseItem(text: "İsa ona, «Ben yol, gerçek ve yaşamım» dedi. «Benim aracılığım olmadan Baba'ya kimse gelemez.»", ref: "Yuhanna 14:6"),
  DailyVerseItem(text: "Ruh'un meyvesi sevgi, sevinç, esenlik, sabır, şefkat, iyilik, bağlılık, yumuşaklık ve özdenetimdir.", ref: "Galatyalılar 5:22-23"),
  DailyVerseItem(text: "Tanrı sığınağımız ve gücümüzdür, sıkıntıda her zaman yardım edendir.", ref: "Mezmur 46:1"),
  DailyVerseItem(text: "İman, umduklarımızın özü, görmediğimiz gerçeklerin kanıtıdır.", ref: "İbraniler 11:1"),
  DailyVerseItem(text: "Başlangıçta Söz vardı. Söz Tanrı'yla birlikteydi ve Söz Tanrı'ydı.", ref: "Yuhanna 1:1"),
  DailyVerseItem(text: "Sevgi sabırlıdır, sevgi şefkatlidir. Sevgi kıskanmaz, övünmez, böbürlenmez.", ref: "1. Korintliler 13:4"),
  DailyVerseItem(text: "Sözün ayağıma kandil, yoluma ışıktır.", ref: "Mezmur 119:105"),
  DailyVerseItem(text: "Rabbinizi bütün yüreğinizle, bütün canınızla ve bütün aklınızla sevin.", ref: "Matta 22:37"),
  DailyVerseItem(text: "Korkma, çünkü ben seninleyim; yılma, çünkü ben senin Tanrın'ım.", ref: "Yeşaya 41:10"),
  DailyVerseItem(text: "Her şeyi dua ve yalvarışla, şükranla birlikte Tanrı'ya bildirin.", ref: "Filipililer 4:6"),
  DailyVerseItem(text: "Rab yakın. Hiçbir şey için kaygılanmayın.", ref: "Filipililer 4:5-6"),
  DailyVerseItem(text: "Yeni bir yürek vereceğim size, içinize yeni bir ruh koyacağım.", ref: "Hezekiel 36:26"),
  DailyVerseItem(text: "Rab'bin iyiliğini görmeden ölmeyeceğime inanıyorum.", ref: "Mezmur 27:13"),
  DailyVerseItem(text: "İsa, «Diriliş ve yaşam Ben'im» dedi. «Bana iman eden kişi ölse de yaşayacaktır.»", ref: "Yuhanna 11:25"),
  DailyVerseItem(text: "Güçlü ve yürekli ol. Korkma ve yılma, çünkü Tanrın RAB seninle birlikte olacak.", ref: "Yeşu 1:9"),
  DailyVerseItem(text: "Rab'be güven, iyilik yap; ülkede otur, güvenlikte ol.", ref: "Mezmur 37:3"),
  DailyVerseItem(text: "Mesih'te kutsanmış her ruhsal kutsamayla göksel yerlerde kutsandık.", ref: "Efesliler 1:3"),
  DailyVerseItem(text: "Birbirinizi sevgiyle kabul edin; tıpkı Mesih'in sizi kabul ettiği gibi.", ref: "Romalılar 15:7"),
  DailyVerseItem(text: "Gözlerinizi Mesih'e çevirin, O'nun izinden gidin.", ref: "İbraniler 12:2"),
  DailyVerseItem(text: "Rab iyidir; sıkıntı gününde sığınaktır. O'nu tanıyanları korur.", ref: "Nahum 1:7"),
  DailyVerseItem(text: "Size esenlik bırakıyorum; size kendi esenliğimi veriyorum.", ref: "Yuhanna 14:27"),
  DailyVerseItem(text: "Her şeyden önce Tanrı'nın Egemenliği'ni ve O'nun doğruluğunu arayın.", ref: "Matta 6:33"),
  DailyVerseItem(text: "Rab'bin adı güçlü bir kuledir; doğru kişi oraya koşup güvenlik bulur.", ref: "Süleyman'ın Özdeyişleri 18:10"),
  DailyVerseItem(text: "Sizi seçtim ki gidip meyve veresiniz ve meyveniz kalıcı olsun.", ref: "Yuhanna 15:16"),
  DailyVerseItem(text: "Tanrı sevgidir. Sevgide yaşayan Tanrı'da yaşar, Tanrı da onda yaşar.", ref: "1. Yuhanna 4:16"),
  DailyVerseItem(text: "Yorgun düşmeyelim; çünkü zamanı gelince ekeceğimiz ürünü biçeceğiz.", ref: "Galatyalılar 6:9"),
  DailyVerseItem(text: "Rab'bin lütfu yeterlidir; çünkü gücüm zayıflıkta tamamlanır.", ref: "2. Korintliler 12:9"),
  DailyVerseItem(text: "Her sabah yeni olan sevgini anımsa; sadakatin büyüktür.", ref: "Ağıtlar 3:22-23"),
  DailyVerseItem(text: "İsa onlara bakıp, «İnsanlar için bu imkânsız, ama Tanrı için her şey mümkün» dedi.", ref: "Matta 19:26"),
]

private enum DailyVerseCatalog {
  static func dayOfYear(for date: Date) -> Int {
    Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
  }

  static func verse(for date: Date) -> DailyVerseItem {
    let index = (dayOfYear(for: date) - 1) % dailyVerses.count
    let safe = index >= 0 ? index : 0
    return dailyVerses[safe]
  }

  static func entry(for date: Date) -> DailyVerseEntry {
    let v = verse(for: date)
    return DailyVerseEntry(date: date, text: v.text, ref: v.ref)
  }
}

struct DailyVerseEntry: TimelineEntry {
  let date: Date
  let text: String
  let ref: String
}

struct DailyVerseProvider: TimelineProvider {
  func placeholder(in context: Context) -> DailyVerseEntry {
    DailyVerseCatalog.entry(for: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (DailyVerseEntry) -> Void) {
    completion(DailyVerseCatalog.entry(for: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<DailyVerseEntry>) -> Void) {
    let calendar = Calendar.current
    let startOfToday = calendar.startOfDay(for: Date())
    var entries: [DailyVerseEntry] = []

    // Önümüzdeki günler için ayrı entry — WidgetKit gece yarısı doğru ayete geçer
    let daysAhead = 14
    for offset in 0..<daysAhead {
      guard let day = calendar.date(byAdding: .day, value: offset, to: startOfToday) else { continue }
      entries.append(DailyVerseCatalog.entry(for: day))
    }

    let refreshDate =
      calendar.date(byAdding: .day, value: daysAhead, to: startOfToday)
      ?? Date().addingTimeInterval(TimeInterval(daysAhead * 86_400))

    completion(Timeline(entries: entries, policy: .after(refreshDate)))
  }
}

struct DailyVerseWidgetEntryView: View {
  var entry: DailyVerseProvider.Entry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    ZStack {
      Color.black.opacity(0.95)
      VStack(alignment: .leading, spacing: 6) {
        Text("Söz")
          .font(.caption2)
          .foregroundColor(Color(red: 0.77, green: 0.58, blue: 0.42))

        Text(entry.text)
          .font(family == .systemSmall ? .caption : .body)
          .foregroundColor(.white)
          .lineLimit(family == .systemLarge ? 5 : 3)

        Text(entry.ref)
          .font(.caption2)
          .foregroundColor(Color(red: 0.77, green: 0.58, blue: 0.42))

        if family == .systemLarge {
          Divider().overlay(Color.white.opacity(0.15))
          Text("Bugün bu ayet hayatına nasıl dokunuyor?")
            .font(.caption2)
            .foregroundColor(.white.opacity(0.75))
        }
      }
      .padding()
    }
    .widgetURL(URL(string: "soz://read"))
  }
}

@main
struct DailyVerseWidget: Widget {
  let kind: String = "DailyVerseWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DailyVerseProvider()) { entry in
      DailyVerseWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Günün Ayeti")
    .description("Söz uygulamasından günlük ayet.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
