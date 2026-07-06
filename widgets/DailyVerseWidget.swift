import WidgetKit
import SwiftUI

struct DailyVerseEntry: TimelineEntry {
  let date: Date
  let text: String
  let ref: String
}

struct DailyVerseProvider: TimelineProvider {
  func placeholder(in context: Context) -> DailyVerseEntry {
    DailyVerseEntry(date: Date(), text: "Her şeyi bana güç veren Mesih aracılığıyla yapabilirim.", ref: "Filipililer 4:13")
  }

  func getSnapshot(in context: Context, completion: @escaping (DailyVerseEntry) -> Void) {
    completion(placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<DailyVerseEntry>) -> Void) {
    let entry = placeholder(in: context)
    let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date().addingTimeInterval(21600)
    completion(Timeline(entries: [entry], policy: .after(next)))
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
