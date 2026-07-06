# Ortam müziği (CC0)

`rain.mp3`, `wind.mp3`, `fire.mp3`, `stream.mp3`, `birds.mp3`, `piano.mp3`, `strings.mp3` dosyalarını buraya ekleyin (Pixabay, Freesound CC0, Mixkit).

Ardından `hooks/useAmbientMusic.ts` içinde ilgili `source: null` satırını şu şekilde değiştirin (dosya `hooks/` altında olduğu için):

```ts
source: require('../assets/sounds/rain.mp3'),
```
