# 🔥💧🌪️ Feuer Wasser Sturm - Installationsanleitung

## 📱 PWA Installation (App auf dem Handy installieren)

### Voraussetzungen für PWA-Installation:
1. **HTTPS erforderlich** - Die Seite muss über HTTPS laufen (GitHub Pages macht das automatisch)
2. **Icons müssen vorhanden sein** - `icon-192.png` und `icon-512.png` im selben Ordner wie `index.html`
3. **manifest.json muss erreichbar sein**
4. **Service Worker muss registriert werden**

### Installation auf Android (Chrome/Edge):
1. Öffne die Seite: `https://marcandregoldmann-prog.github.io/Feuer-Wasser-Sturm/`
2. Tippe auf die **3 Punkte** oben rechts
3. Wähle **"Zum Startbildschirm hinzufügen"** oder **"App installieren"**
4. Bestätige mit **"Installieren"**

### Installation auf iOS (Safari):
1. Öffne die Seite in Safari
2. Tippe auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben)
3. Scrolle runter und wähle **"Zum Home-Bildschirm"**
4. Tippe auf **"Hinzufügen"**

## 🐛 Troubleshooting

### Problem: Buttons funktionieren nicht
**Lösung:** 
1. Öffne die Browser-Konsole (F12 auf Desktop)
2. Suche nach JavaScript-Fehlern
3. Stelle sicher, dass `app.js` geladen wird
4. Du solltest diese Logs sehen:
   ```
   🔥💧🌪️ Feuer Wasser Sturm wird geladen...
   ✅ DOM loaded, initializing app...
   📊 Difficulty: medium
   🔊 Sound enabled: true
   🥁 Drum enabled: true
   🎮 App ready!
   ```

### Problem: "App installieren" wird nicht angezeigt
**Mögliche Ursachen:**
1. **Icons fehlen** - Stelle sicher, dass `icon-192.png` und `icon-512.png` im Root-Verzeichnis liegen
2. **manifest.json nicht erreichbar** - Prüfe, ob die Datei unter `https://deine-url/manifest.json` erreichbar ist
3. **Nicht über HTTPS** - PWAs benötigen HTTPS (außer localhost)
4. **Service Worker-Fehler** - Öffne DevTools → Application → Service Workers

### Problem: Service Worker registriert nicht
**Lösung:**
1. Öffne DevTools (F12)
2. Gehe zu **Application** → **Service Workers**
3. Prüfe ob ein Service Worker registriert ist
4. Wenn nicht, lösche den Cache: **Application** → **Clear storage** → **Clear site data**
5. Lade die Seite neu (Strg+Shift+R)

## 📁 Dateistruktur

```
Feuer-Wasser-Sturm/
├── index.html          # Haupt-HTML-Datei
├── style.css           # Alle Styles
├── app.js              # JavaScript-Logik
├── manifest.json       # PWA-Manifest
├── sw.js              # Service Worker
├── icon-192.png       # App-Icon 192x192
└── icon-512.png       # App-Icon 512x512
```

## 🚀 Deployment auf GitHub Pages

1. Lade alle Dateien in dein Repository hoch
2. Gehe zu **Settings** → **Pages**
3. Wähle **Source: Deploy from a branch**
4. Wähle **Branch: main** und **Folder: / (root)**
5. Klicke auf **Save**
6. Warte 1-2 Minuten
7. Deine App ist verfügbar unter: `https://deinname.github.io/Feuer-Wasser-Sturm/`

## ✨ Neue Features in dieser Version

### 🎨 Design-Verbesserungen:
- Dramatischere Befehlsanzeige mit riesigen Emojis
- Lebendiger Countdown mit Puls-Animation
- 3D-Button-Effekte mit besseren Schatten
- Sanftere Übergänge zwischen Screens
- Größere Touch-Targets für bessere Bedienbarkeit

### 🎮 Neue Funktionen:
- **⏸️ Pause-Button** - Pausiere das Spiel jederzeit
- **Schwierigkeitsgrade** - Wähle zwischen:
  - 🐢 **Langsam** - 1.5x längere Reaktionszeiten
  - ⚡ **Mittel** - Standard
  - 🚀 **Schnell** - 0.65x kürzere Reaktionszeiten

## 💡 Tipps

- Die Schwierigkeitsgrade beeinflussen:
  - Wartezeit zwischen Befehlen
  - Reaktionszeit für Befehle
  - Im Kleinkindmodus UND Chaosmodus!
  
- Alle Einstellungen werden automatisch gespeichert

## 🎯 Support

Wenn Probleme auftreten:
1. Prüfe die Browser-Konsole (F12)
2. Lösche den Browser-Cache
3. Versuche es in einem anderen Browser
4. Stelle sicher, dass du die neueste Version von GitHub Pages verwendest
