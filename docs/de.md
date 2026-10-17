# Lichess & Chess.com

Verfolge in Gladys Schachspieler von [Lichess](https://lichess.org) und
[Chess.com](https://www.chess.com): dich selbst, deine Kinder, deinen Verein
oder einen Champion.

Diese Integration ist nicht mit Lichess oder Chess.com verbunden.

## Was die Integration macht

- Liest die **öffentlichen Profile** der eingegebenen Spieler, ohne Konto und
  ohne Passwort: auf den Seiten wird nie etwas geschrieben.
- Legt **ein Gerät pro Spieler** an, mit:
  - einer **Wertung** pro Bedenkzeit: Bullet, Blitz, Schnellschach, klassisch,
    Fernschach und Puzzles auf Lichess; Bullet, Blitz, Schnellschach und Daily
    auf Chess.com;
  - **Online** und **In einer Partie** (nur Lichess: Chess.com veröffentlicht
    das nicht mehr);
  - der **Letzten Partie** als Satz: „Sieg gegen Gegner (Blitz, 1756 +6)“;
  - **Partien heute** und **Siege heute**, um Mitternacht auf null.
- Fügt ein Dashboard-Widget **Schachspieler**, zwei Szenen-Auslöser **Partie
  beendet** und **Neuer Wertungsrekord** sowie zwei Szenen-Aktionen
  **Schachspieler lesen** und **Puzzle des Tages lesen** hinzu.

## Voraussetzungen

- Gladys Assistant **5.2.0** oder neuer.
- Internetzugang (öffentliche APIs von Lichess und Chess.com).
- Die Benutzernamen der Spieler. Zum Ausprobieren: `thibault` (der Gründer von
  Lichess) oder `DrNykterstein` auf Lichess, `hikaru` oder `erik` auf
  Chess.com.

## Konfiguration

### Spieler

- **Lichess-Spieler** und **Chess.com-Spieler**: Benutzernamen, durch Kommas
  getrennt, höchstens 10 pro Seite. Ein Profillink geht auch
  (`https://lichess.org/@/thibault`, `https://www.chess.com/member/hikaru`).
- Öffne dann den Tab **Entdecken** der Integration und füge die Spieler zu
  Gladys hinzu. Nur hinzugefügte Spieler werden verfolgt.
- Der Button **Spieler prüfen** liest alle Spieler sofort und zeigt, was jede
  Seite geantwortet hat: so prüfst du einen Benutzernamen am besten.

### Weitere Einstellungen

- **Abruf**: wie oft jeder Spieler gelesen wird, von 2 bis 30 Minuten
  (standardmäßig 5). Eine beendete Partie, eine neue Wertung oder ein
  Online-Spieler erscheint beim nächsten Abruf.
- **Sprache**: die Sprache der Funktionsnamen (beim Hinzufügen eines Geräts
  festgelegt: lösche das Gerät und füge es erneut hinzu, um sie zu ändern), der
  letzten Partie und der Szenentexte. Standardmäßig Französisch.

## Geräte

Ein Gerät pro Spieler, „Benutzername (Seite)“ genannt.

| Funktion                   | Wert                                                         |
| -------------------------- | ------------------------------------------------------------ |
| Bullet-, Blitz-…Wertung    | die aktuelle Wertung der Bedenkzeit                          |
| Online (Lichess)           | 1, wenn der Spieler mit Lichess verbunden ist                |
| In einer Partie (Lichess)  | 1 während einer Partie                                       |
| Letzte Partie              | Ergebnis, Gegner, Bedenkzeit und Wertung danach              |
| Partien heute, Siege heute | die seit Mitternacht beendeten Partien (Zeitzone von Gladys) |

Eine nie gespielte Bedenkzeit hat bis zur ersten Partie keinen Wert.
UltraBullet-Partien zählen im Filter „Partie beendet“ als Bullet. Wertungen,
Partien und Online-Status kommen von den Seiten: Gladys speichert ihren
Verlauf.

## Widget

**Schachspieler**, im Dashboard-Editor:

- mit einem gewählten **Spieler**: bis zu vier Live-Kacheln mit Wertungen (die
  meistgespielten Bedenkzeiten), die letzte Partie, die Bilanz des Tages
  (+Siege =Remis −Niederlagen), online oder in einer Partie (Lichess) und
  Buttons zum Profil, zur letzten Partie und zum Puzzle des Tages;
- ohne Spieler: eine Zeile pro hinzugefügtem Spieler mit seiner meistgespielten
  Wertung (grün, wenn online auf Lichess, orange in einer Partie), und ein
  Button zum Puzzle des Tages jeder verfolgten Seite.

## Szenen

### Auslöser: Partie beendet

Ein verfolgter Spieler hat eine Partie beendet. Filter: der **Spieler**, das
**Ergebnis** (Sieg, Niederlage, Remis) und die **Bedenkzeit** (Bullet, Blitz,
Schnellschach, klassisch, Fernschach), alle optional. Variablen: Spieler,
Ergebnis, Gegner, Wertung des Gegners, Wertung nach der Partie,
Wertungsänderung (nur Lichess), Link zur Partie und eine fertige
**Zusammenfassung**.

Partien, die vor dem Hinzufügen des Spielers gespielt wurden, sind keine
Neuigkeit: für sie wird nichts ausgelöst. Nach einem langen Ausfall lösen nur
die letzten fünf neuen Partien aus.

### Auslöser: Neuer Wertungsrekord

Ein verfolgter Spieler hat seine beste Wertung aller Zeiten in einer
Bedenkzeit übertroffen (auf Lichess auch die Puzzle-Wertung). Die Bestmarke
ist die, die die Seite kennt (Lichess-Verlauf, „best“ von Chess.com). Eine
vorläufige Lichess-Wertung zählt nie. Variablen: Spieler, neuer Rekord,
bisheriger Rekord, Zusammenfassung.

### Aktion: Schachspieler lesen

Die Wertungen, die Partien des Tages und die letzte Partie eines Spielers:
Werte für die nächsten Blöcke und eine **Zusammenfassung** für eine
Benachrichtigung, z. B. „Hikaru (Chess.com): Blitz 3465, Bullet 3420,
Schnellschach 2838. Heute: 12 Partien: +7 =0 −5. Letzte Partie: Niederlage
gegen …“. Aus dem gelesen, was Gladys schon weiß: keine Anfrage.

### Aktion: Puzzle des Tages lesen

Das Puzzle des Tages von Lichess (standardmäßig) oder Chess.com: sein Link,
sein Titel oder seine Schwierigkeit und eine fertige **Nachricht**.

## Szenenbeispiele

- **Die Kinder anfeuern**: Auslöser Partie beendet, Spieler „Lea“, Ergebnis
  Sieg → „Bravo! {{summary}}“ an die Familie senden.
- **Das Puzzle zum Frühstück**: jeden Tag um 7:30 Uhr Puzzle des Tages lesen,
  dann seine Nachricht per Telegram senden.
- **Einen Rekord feiern**: Auslöser Neuer Wertungsrekord → das Wohnzimmer
  golden beleuchten und die Zusammenfassung senden.

## Fehlerbehebung

- **Ein Spieler erscheint nicht in Entdecken**: drück auf **Spieler prüfen**.
  „Spieler nicht gefunden“ bedeutet einen falschen Benutzernamen oder ein
  geschlossenes Konto.
- **Kein Online-Status auf Chess.com**: die öffentliche API veröffentlicht ihn
  nicht mehr (die alte Adresse `is-online` antwortet „nicht gefunden“).
- **Eine Partie kommt verspätet**: Partien erscheinen beim nächsten Abruf
  (standardmäßig 5 Minuten). Chess.com braucht manchmal auch ein paar Minuten,
  um eine Partie zu veröffentlichen.
- **„Lichess und Chess.com sind gerade nicht erreichbar“**: beide Seiten sind
  beim letzten Abruf gescheitert (Netzwerk, Wartung oder zu viele Anfragen).
  Nach einer Antwort „zu viele Anfragen“ wartet die Integration eine Minute
  und versucht es dann selbst erneut.
- **Logs**: `LOG_LEVEL=debug` zeigt jede Anfrage; die normale Stufe zeigt nur
  Starts, Fehler und ausgelöste Szenen.

## Grenzen

- Nur öffentliche Daten: keine privaten Partien, kein Chat, keine Züge.
- Lichess und Chess.com sind kostenlose Dienste: 10 Spieler pro Seite,
  höchstens alle 2 Minuten ein Abruf. Jede Anfrage trägt einen `User-Agent` mit
  dem Namen der Integration, wie Chess.com es verlangt, und die Anfragen an
  eine Seite gehen nacheinander, wie Lichess es verlangt.
- „Heute“ zählt höchstens die letzten 100 Lichess-Partien des Tages.
- Lichess sortiert die Partien nach Startdatum: eine Fernschachpartie, die vor
  der zuletzt gesehenen Partie begonnen wurde, löst „Partie beendet“
  vielleicht nie aus und zählt nicht für heute.
- Chess.com gibt die Wertungsänderung einer Partie nicht an.
