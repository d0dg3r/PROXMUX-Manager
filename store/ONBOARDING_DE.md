# PROXMUX Manager – Store-Onboarding-Leitfaden (Deutsch)

> Dieses Dokument ist die deutsche Übersetzung von [`store/ONBOARDING.md`](ONBOARDING.md). Die englische Datei bleibt die kanonische Quelle für die Store-Einreichung. Diese Übersetzung dient ausschließlich der Vorbereitung der deutschen Storefront-Einreichung und der internen Abstimmung.

Aktuelles Release-Ziel: `v1.3.0` (vor der Einreichung mit dem obersten Eintrag in `CHANGELOG.md` abgleichen).

## 1. Store-Metadaten

- **Produktname**: PROXMUX Manager
- **Kurzname**: PROXMUX
- **Detaillierte Beschreibung**: (siehe Abschnitt 2)
- **Kurzbeschreibung**: Proxmox VE Cluster im Browser verwalten: Monitoring, Konsolenzugriff, Failover sowie Side Panel oder Floating Window.
- **Kategorie**: Entwicklertools
- **Zusätzliche Kategorie**: Produktivität
- **Verifizierte Website**: https://github.com/d0dg3r/PROXMUX-Manager
- **Single-Purpose-Statement**: Stellt eine Monitoring- und Verwaltungsoberfläche für Proxmox VE Cluster direkt im Browser bereit.

---

## 2. Store-Beschreibungen (ohne Emojis)

### Deutsch (Deutschland)

Die fertige deutsche Storefront-Beschreibung wird in [`store/CWS_DESCRIPTION_DE.txt`](CWS_DESCRIPTION_DE.txt) gepflegt. Vor der Einreichung mit dem aktuellen Featureset abgleichen.

Vorlage (kann 1:1 übernommen oder vor der Einreichung angepasst werden):

```text
PROXMUX Manager ist die professionelle Chrome-Erweiterung für Proxmox VE Administratoren. Greife direkt im Browser auf deinen Virtualisierungs-Cluster zu, überwache Nodes, VMs und Container und starte Konsolen mit wenigen Klicks.

Hauptfunktionen:
- Cluster-Dashboard: Aggregierte CPU-, RAM- und Storage-Kacheln plus Node- und Gast-Health am Anfang der Ressourcenliste.
- Gruppierung nach Node: Optionale Gruppierung mit klebenden Node-Headern und Gast-Anzahl pro Node für große Cluster.
- Snapshot-Management: Snapshots auflisten, anlegen, löschen und zurückrollen für QEMU/LXC mit zweistufiger Bestätigung bei destruktiven Aktionen.
- Auto-Refresh: Wählbares Intervall (Aus, 15s, 30s, 60s, 2m, 5m) pro aktivem Cluster-Tab; pausiert, solange die Inline-Einstellungen geöffnet sind.
- Power-Management: Start, Stop, Shutdown, Reboot, Pause, Resume mit zweistufiger Bestätigung und optionalem globalen Skip-Schalter.
- Letzte Cluster-Tasks: Kompaktes Panel unter dem Dashboard, gespeist aus dem Cluster-Task-Archiv mit Status running/ok/failed.
- Interaktive Tags: Cluster-weite Tags entdecken und für sofortige kategorische Filterung anklicken.
- Uptime-Anzeige: Echtzeit-Uptime in gut lesbarer Form (z. B. 2d 5h) für alle laufenden Ressourcen.
- Verbessertes Monitoring: Status, OS-Typen und IP-Adressen von VM/LXC auf einen Blick.
- Flexible Startmodi: Side Panel (Standard) oder persistentes Floating Window.
- Inline Advanced Settings: Einstellungen direkt in der aktiven Erweiterungsansicht öffnen und bearbeiten.
- UI-Skalierungs-Presets: Lesbarkeit über Compact/Standard/Large-Presets plus Feinjustierungs-Slider anpassen.
- Intelligente Konsolen: noVNC, SPICE (remote-viewer) und Node-Shell.
- SSH-Export-Formate: Linux-Hosts als OpenSSH-Config, PuTTY `.reg` oder CSV exportieren.
- TLS-bewusste Verbindungsfehler: Bei selbstsignierten Zertifikaten wird ein passender Hinweis und ein Ein-Klick-`Proxmox-URL öffnen`-Button angezeigt.
- Modernes Design: Dark-, Light- oder System-Theme.
- Hochverfügbarkeit: Automatische Node-Erkennung und nahtloses Failover.
- Sicher: API-Tokens werden lokal gespeichert und verlassen den Browser nicht.

Perfekt für DevOps-Engineers und Home-Server-Enthusiasten, die Proxmox-Infrastruktur schnell, professionell und sicher im Browser verwalten wollen.
```

---

## 3. Datenschutz- und Berechtigungsbegründungen
*Erforderlich für den Reiter „Datenschutz" im Developer Dashboard.*

### Begründungstexte je Berechtigung

1. **`storage`**:
   - *Begründung*: Erforderlich, um die vom Nutzer eingegebenen Proxmox-API-Zugangsdaten und die Cluster-Node-Konfiguration sicher lokal auf dem Gerät des Nutzers zu speichern.

2. **`sidePanel`**:
   - *Begründung*: Stellt eine persistente Verwaltungsoberfläche bereit, die parallel zu den Browser-Tabs des Nutzers sichtbar bleibt und so effizientes Cluster-Monitoring ermöglicht.

3. **`tabs`**:
   - *Begründung*: Erforderlich, um neue Browser-Tabs für Proxmox-Konsolen (noVNC, SPICE und Shell) programmatisch zu öffnen und zu verwalten.

4. **`scripting`**:
   - *Begründung*: Erforderlich, um begrenzte In-Page-Skripte für unterstützte Konsolen-Workflows auszuführen, etwa Best-Effort-Befehlseinfügung in vertrauenswürdigen Proxmox-Konsolen-Tabs, die der Nutzer selbst geöffnet hat.

5. **`downloads` & `downloads.open`**:
   - *Begründung*: Notwendig, um SPICE-Konfigurationsdateien (`.vv`) zu erzeugen und automatisch in externen Viewer-Anwendungen wie remote-viewer zu öffnen.

6. **`cookies`**:
   - *Begründung*: Erforderlich, um zu prüfen, ob eine aktive Proxmox-Web-UI-Session-Cookie vorhanden ist. Das verhindert 401-Fehler beim Öffnen interaktiver Konsolen und sichert eine reibungslose Benutzererfahrung.

7. **Host-Permissions (`https://*/*`)**:
   - *Begründung*: Erforderlich, um mit selbst gehosteten Proxmox-VE-API-Endpunkten zu kommunizieren. Die Erweiterung sendet Anfragen ausschließlich an URLs, die der Nutzer explizit konfiguriert hat.

### Richtlinie zu Nutzerdaten

- **Datenerhebung**: Es werden keine personenbezogenen Daten, Browserverläufe oder Nutzeridentitäten erhoben.
- **Datennutzung**: API-Zugangsdaten werden ausschließlich zur Authentifizierung mit dem eigenen Proxmox-Server des Nutzers verwendet.
- **Datenspeicherung**: Alle sensiblen Daten werden lokal in Chromes verschlüsselungsgestütztem Storage gespeichert und niemals an Dritte oder vom Entwickler kontrollierte Server übertragen.

---

## 4. Anweisungen für Reviewer (Pflicht)
*Erforderlich für das Feld „Testanweisungen".*

**Wichtig**: Die Erweiterung ist ein Verwaltungstool für selbst gehostete Proxmox-VE-Virtualisierungs-Cluster. Für den Zugriff auf eine Live-Umgebung wird private Infrastruktur benötigt.

### Empfohlener Ansatz

> „Diese Erweiterung verwaltet private, selbst gehostete Proxmox-VE-Cluster. Da für die volle Funktionalität ein Live-Cluster benötigt wird, stelle ich eine Video-Demonstration bereit, die die Erweiterung beim Verbinden mit einer Testumgebung, beim Auflisten von Ressourcen und beim Starten von Konsolen zeigt."

### Manuell testen (mit eigener Testumgebung)

1. Erweiterung installieren.
2. Auf das Erweiterungssymbol klicken; prüfen, dass sie standardmäßig im Side Panel öffnet.
3. Den Floating-Window-Schalter klicken und prüfen, dass ein persistentes Floating-Manager-Fenster öffnet.
4. Im Header der Erweiterung das Zahnrad-Icon klicken und prüfen, dass die erweiterten Einstellungen inline in derselben Ansicht öffnen.
5. Gültige Proxmox-VE-API-Zugangsdaten eingeben (URL, Nutzer, Token-ID, Secret).
6. Einstellungen speichern.
7. Die Erweiterung füllt die Ressourcenliste mit Nodes, VMs und Containern.
8. Prüfen, dass die Konsolen-Buttons (noVNC, SPICE, Shell/SSH) je nach Ressourcen-Konfiguration erscheinen.

### API-Token-Setup-Referenz (intern / Reviewer-Vorbereitung)

- Kanonische Anleitung: [docs/proxmox-token-setup.md](../docs/proxmox-token-setup.md)
- Interaktiver Helper (auf der Proxmox-Host-Shell ausführen):

```bash
curl -fsSL 'https://raw.githubusercontent.com/d0dg3r/PROXMUX-Manager/refs/heads/main/scripts/setup_proxmox_token.sh' -o '/tmp/setup_proxmox_token.sh' && chmod 700 '/tmp/setup_proxmox_token.sh' && bash '/tmp/setup_proxmox_token.sh'
```

- Empfohlener Ansatz: dedizierter API-Nutzer + ACL-Rolle auf `/`
- Fallback: Root-Token mit `--privsep 0` (höheres Risiko, nur in geeigneten Fällen)

---

## 5. Visual-Assets-Checkliste

- **Icon**: 128x128 Pixel (`store/proxmux_logo.png`).
- **Screenshots (primäres Store-Set, Light + Dark kombiniert)**:
  - `store/screenshot_01_multi_cluster_1280x800.png`
  - `store/screenshot_02_resource_expanded_1280x800.png`
  - `store/screenshot_03_onboarding_1280x800.png`
  - `store/screenshot_04_settings_cluster_1280x800.png`
  - `store/screenshot_05_settings_backup_1280x800.png`
- **Aufnahme-Modell**: Light und Dark werden je Szene mit `640x800` aufgenommen und nebeneinander zu einem `1280x800`-Export kombiniert.
- **Marquee/Tile**: 440x280 Pixel (`store/small_promo_tile_new.png`).
