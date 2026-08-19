'use strict';

/* bikeRouteriOS — Parameterkatalog
   ---------------------------------------------------------------------------
   Warum diese Datei getrennt liegt: Sie ist reine Datenhaltung — deutsche
   Bezeichnungen, Erklärungen und Wertebereiche für die BRouter-Parameter.
   Zusammen mit der Logik in app.js wäre keine der beiden Dateien mehr
   überschaubar. Die Beschreibungen stecken bei BRouter nur als englische
   Kommentare in den .brf-Dateien und sind zur Laufzeit nicht abrufbar; wir
   halten sie deshalb selbst und bestimmen damit auch die Wortwahl.

   Zur Übertragung siehe CLAUDE.md: Werte gehen als profile:<name>=<wert> im
   normalen GET mit. WAHRHEITSWERTE ZWINGEND ALS 1 UND 0 — true/false liefert
   HTTP 500 mit leerem Body. Unbekannte Namen werden still ignoriert, ein
   Tippfehler fällt also nicht auf. Deshalb kommen alle Namen aus dieser Datei
   und nirgends aus freiem Text. */

/* ---------------------------------------------------------- Formatierer */

function n1(v) { return v.toFixed(1).replace('.', ','); }
function n2(v) { return v.toFixed(2).replace('.', ','); }
function n3(v) { return v.toFixed(3).replace('.', ','); }

/* Der Verkehrsregler ist der wichtigste Wert der App. Die nackte Zahl sagt
   nichts, deshalb steht ein Wort daneben. Die Stufen stammen aus der
   Dokumentation von fastbike.brf, oberhalb von 1.0 aus eigener Messung
   (siehe BROUTER.md, Abschnitt "Belegte Gleichungen").

   Die Schwellen sind auf die Skalenbeschriftung abgestimmt: Bei 0, 4 und 8
   muss das Wort dasselbe sagen wie die Marke darunter. Vorher stand bei 4,0
   „kompromisslos" über einer Marke, die „stark" hiess — zwei Beschriftungen
   für denselben Punkt. */
function trafficWord(v) {
  if (v <= 0) return 'aus';
  if (v < 0.5) return 'leicht';
  if (v < 1.5) return 'deutlich';
  if (v < 3.5) return 'stark';
  if (v < 6.0) return 'sehr stark';
  return 'kompromisslos';
}

/* ------------------------------------------------------ Parameterkatalog

   type: 'range' | 'switch' | 'choice'
   Bei 'range' ist `def` nur ein Rückfallwert — der tatsächliche Standard
   kommt aus dem jeweiligen Basisprofil (siehe BASES weiter unten). */

const PARAM_DEFS = {

  /* --- Verkehr & Autos --- */
  consider_traffic: {
    name: 'Autoverkehr meiden', type: 'range',
    min: 0, max: 8, step: 0.1, def: 0.1,
    fmt: function (v) { return n1(v) + ' · ' + trafficWord(v); },
    scale: ['aus', 'sehr stark', 'kompromisslos'],
    desc: 'Meidet Straßen mit viel Verkehr, auch wenn der Weg dadurch länger wird. ' +
          'Grundlage ist die Verkehrsschätzung von BRouter — sie liegt auf allen ' +
          'Straßen vor, auf denen überhaupt Autos fahren.',
    /* Gemessen am 18.08.2026 im Harz. Die Zahlen stehen dran, weil „1,0" allein
       nichts sagt — und weil der Regler ueber den dokumentierten Bereich hinaus
       sauber weiterskaliert, was man ihm nicht ansieht. */
    messung: 'Gemessen: Hauptstraßenanteil 42,5 % bei 1,0 · 36,8 % bei 4,0 · 27,6 % ' +
             'bei 8,0. Der Regler wirkt also auch oberhalb von 1,0 weiter.'
  },
  consider_traffic_bool: {
    key: 'consider_traffic',
    name: 'Autoverkehr meiden', type: 'switch', def: false,
    desc: 'In diesem Basisprofil gibt es nur an oder aus, keine Abstufung.'
  },
  consider_town: {
    name: 'Ortschaften umfahren', type: 'switch', def: false,
    desc: 'Führt außen an Städten und größeren Orten vorbei statt mitten hindurch.'
  },
  allow_motorways: {
    name: 'Kraftfahrstraßen erlauben', type: 'switch', def: false,
    desc: 'Normalerweise aus. Nur außerhalb Europas sinnvoll, wo Radfahren auf ' +
          'Schnellstraßen erlaubt sein kann.'
  },
  avoid_unsafe: {
    name: 'Gefährliche Straßen meiden', type: 'switch', def: false,
    desc: 'Meidet Straßen ohne Radinfrastruktur besonders stark.'
  },

  /* --- Wege & Untergrund --- */
  unpavedPenalty: {
    name: 'Unbefestigte Wege meiden', type: 'range',
    min: 0, max: 6, step: 0.1, def: 1.0, fmt: n1,
    scale: ['egal', 'meiden', 'strikt'],
    desc: 'Feldwege, Schotter und Waldwege. Bei null werden sie wie befestigte ' +
          'Wege behandelt.'
  },
  allow_steps: {
    name: 'Treppen erlauben', type: 'switch', def: true,
    desc: 'Auf dem Rennrad praktisch immer unerwünscht — bedeutet Absteigen und Tragen.'
  },
  allow_ferries: {
    name: 'Fähren erlauben', type: 'switch', def: true,
    desc: 'Fähren werden eingeplant, wenn sie den Weg deutlich verkürzen. ' +
          'Fahrpläne kennt die Berechnung nicht.'
  },
  use_proposed_cycleroutes: {
    name: 'Geplante Radrouten mitnutzen', type: 'switch', def: false,
    desc: 'Behandelt erst vorgeschlagene Radrouten wie fertige. Kann über Wege ' +
          'führen, die es in der Wirklichkeit noch nicht gibt.'
  },
  ignore_cycleroutes: {
    name: 'Radrouten ignorieren', type: 'switch', def: false,
    desc: 'Folgt nicht mehr bevorzugt ausgeschilderten Radrouten. Ergibt oft ' +
          'direktere Strecken mit weniger Höhenmetern.'
  },
  stick_to_cycleroutes: {
    name: 'Auf Radrouten bleiben', type: 'switch', def: false,
    desc: 'Folgt ausgeschilderten Radrouten so weit wie möglich, auch mit Umweg.'
  },

  /* --- Steigung --- */
  consider_elevation: {
    name: 'Höhenmeter einbeziehen', type: 'switch', def: true,
    desc: 'Aus bedeutet: Die Route ignoriert das Gelände vollständig und rechnet flach.'
  },
  uphillcost: {
    name: 'Steigungen meiden', type: 'range',
    min: 0, max: 120, step: 5, def: 0, fmt: String,
    scale: ['egal', 'mittel', 'stark'],
    desc: 'Nimmt Umwege in Kauf, um Anstiege zu vermeiden. Bei null zählt nur die Länge.'
  },
  uphillcutoff: {
    name: 'Steigung zählt erst ab', type: 'range',
    min: 0, max: 5, step: 0.1, def: 1.5,
    fmt: function (v) { return n1(v) + ' %'; },
    scale: ['0 %', '2,5 %', '5 %'],
    desc: 'Anstiege flacher als dieser Wert bleiben unbewertet.'
  },
  downhillcost: {
    name: 'Gefälle meiden', type: 'range',
    min: 0, max: 120, step: 5, def: 60, fmt: String,
    scale: ['egal', 'mittel', 'stark'],
    desc: 'Wirkt gegen Strecken, die viel Höhe verschenken und danach wieder ' +
          'aufholen müssen.'
  },
  downhillcutoff: {
    name: 'Gefälle zählt erst ab', type: 'range',
    min: 0, max: 5, step: 0.1, def: 1.5,
    fmt: function (v) { return n1(v) + ' %'; },
    scale: ['0 %', '2,5 %', '5 %'],
    desc: 'Gefälle flacher als dieser Wert bleiben unbewertet.'
  },

  /* --- Umgebung --- */
  consider_forest: {
    name: 'Durch Wald und Parks führen', type: 'switch', def: false,
    desc: 'BRouter schätzt die Waldnähe selbst. Daten liegen auf etwa 95 % der ' +
          'Strecke vor.'
  },
  consider_noise: {
    name: 'Lärm meiden', type: 'switch', def: false,
    desc: 'Bevorzugt leise Abschnitte. Daten auf etwa 56 % der Strecke.'
  },
  consider_river: {
    name: 'An Gewässern entlang', type: 'switch', def: false,
    desc: 'Zieht Wege an Flüssen und Seen vor. Daten auf etwa 46 % der Strecke.'
  },

  /* --- Wegführung --- */
  considerTurnRestrictions: {
    name: 'Abbiegeverbote beachten', type: 'switch', def: true,
    desc: 'Beachtet Abbiegeverbote aus den Kartendaten. Für Radfahrer oft strenger ' +
          'als nötig, dafür näher an der Beschilderung.'
  },
  correctMisplacedViaPoints: {
    name: 'Umwege an Zwischenpunkten glätten', type: 'switch', def: false,
    desc: 'Entfernt Hin-und-zurück-Schleifen, die entstehen, wenn ein Zwischenpunkt ' +
          'ungünstig neben der Straße liegt.'
  },
  correctMisplacedViaPointsDistance: {
    name: 'Nur Schleifen bis', type: 'range',
    min: 0, max: 1200, step: 50, def: 400,
    fmt: function (v) { return v + ' m'; },
    scale: ['0 m', '600 m', '1200 m'],
    desc: 'Längere Schleifen bleiben unangetastet — sie sind vermutlich Absicht.'
  },
  add_beeline: {
    name: 'Luftlinie zu abgelegenen Punkten', type: 'switch', def: false,
    desc: 'Verbindet Start- oder Zielpunkte, die weit von jeder Straße liegen, ' +
          'mit einer geraden Linie, statt die Berechnung abzubrechen.'
  },

  /* --- GPX-Export --- */
  /* Am 19.08.2026 alle sieben Werte an derselben Strecke ausgegeben und die
     GPX-Dateien verglichen. Zwei Befunde, die man der Liste nicht ansieht:

     1. „automatisch wählen" (1) liefert eine Datei, die BYTE-IDENTISCH mit
        „keine" (0) ist. Der Standard erzeugt also gar keine Hinweise — wer
        welche will, muss den Stil ausdrücklich wählen.
     2. Die Stile unterscheiden sich nicht in der Qualität, sondern in der
        Stelle, an der die Hinweise stehen. Deshalb steht das jetzt dran. */
  turnInstructionMode: {
    name: 'Abbiegehinweise in der Datei', type: 'choice', def: '1',
    opts: [['0', 'keine'],
           ['1', 'automatisch (= keine, gemessen)'],
           ['2', 'Locus · sym am Streckenpunkt'],
           ['3', 'OsmAnd · eigene Route mit rtept'],
           ['4', 'als Kommentar im Dateikopf'],
           ['5', 'GPSies · Wegpunkte mit Namen'],
           ['6', 'OruxMaps · Wegpunkte mit extensions']],
    desc: 'Diese App navigiert nicht. Die Hinweise landen in der GPX-Datei und werden ' +
          'von der Ziel-App gelesen.',
    messung: 'Alle sieben Werte am 19.08.2026 verglichen: „automatisch" liefert eine ' +
             'byte-identische Datei wie „keine" — der Standard erzeugt also GAR KEINE ' +
             'Hinweise. Für OsmAnd ist „OsmAnd" richtig: nur dieser Stil legt eine ' +
             'eigene Route mit Abbiegepunkten an.'
  },
  turnInstructionCatchingRange: {
    name: 'Hinweise zusammenfassen bis', type: 'range',
    min: 0, max: 120, step: 5, def: 40,
    fmt: function (v) { return v + ' m'; },
    scale: ['0 m', '60 m', '120 m'],
    desc: 'Mehrere Abbiegungen innerhalb dieser Strecke werden zu einem Hinweis ' +
          'verschmolzen. Wirkt nur, wenn oben ein Stil gewählt ist — ohne Hinweise ' +
          'gibt es nichts zusammenzufassen.'
  },
  turnInstructionRoundabouts: {
    name: 'Kreisverkehre eigens ansagen', type: 'switch', def: true,
    desc: 'Erzeugt für Kreisverkehre eigene Hinweise („dritte Ausfahrt") statt ' +
          'gewöhnlicher Abbiegungen. Wirkt nur mit gewähltem Stil.'
  },

  /* processUnusedTags steht bewusst NICHT mehr hier. Die App setzt ihn bei
     jeder Anzeigeberechnung selbst, weil die Auswertung von Tempolimits sonst
     dauerhaft leer bliebe — ein stiller Ausfall, den niemand bemerkt. Ein
     Schalter, den man nur falsch stellen kann, ist kein Schalter. */
};

/* ------------------------------------------------------- Fahrer und Rad

   Bewusst getrennt: Technisch sind das Parameter derselben Profildatei,
   fachlich beschreiben sie den Nutzer und nicht die Art der Route. Sie hängen
   deshalb am Gerät, nicht am Profil, und werden jeder Anfrage angehängt.
   Sie ändern die Route NICHT, nur die geschätzte Fahrzeit. */

const USER_DEFS = {
  totalMass: {
    name: 'Gewicht Fahrer und Rad', type: 'range',
    min: 40, max: 160, step: 1, def: 90,
    fmt: function (v) { return v + ' kg'; },
    scale: ['40 kg', '100 kg', '160 kg'],
    desc: 'Alles zusammen: du, Rad, Gepäck, Flaschen.'
  },
  bikerPower: {
    name: 'Dauerleistung', type: 'range',
    min: 50, max: 400, step: 5, def: 100,
    fmt: function (v) { return v + ' W'; },
    scale: ['50 W', '225 W', '400 W'],
    desc: 'Die Leistung, die du über die ganze Fahrt hältst — nicht die Spitze.'
  },
  maxSpeed: {
    name: 'Maximaltempo', type: 'range',
    min: 20, max: 80, step: 1, def: 45,
    fmt: function (v) { return v + ' km/h'; },
    scale: ['20', '50', '80'],
    desc: 'Deckelt die Zeitschätzung bergab. Darüber wird nicht gerechnet.'
  },
  S_C_x: {
    name: 'Luftwiderstand', type: 'range',
    min: 0.15, max: 0.45, step: 0.005, def: 0.225, fmt: n3,
    scale: ['0,15', '0,30', '0,45'],
    desc: 'Stirnfläche mal Widerstandsbeiwert. Tief auf dem Rennrad etwa 0,20 — ' +
          'aufrecht etwa 0,35.'
  },
  C_r: {
    name: 'Rollwiderstand', type: 'range',
    min: 0.003, max: 0.02, step: 0.001, def: 0.01, fmt: n3,
    scale: ['0,003', '0,011', '0,020'],
    desc: 'Schmale Rennreifen etwa 0,005. Breite oder profilierte Reifen etwa 0,015.'
  }
};

/* -------------------------------------------------------------- Gruppen */

const SECTIONS = [
  { id: 'verkehr',  title: 'Verkehr & Autos' },
  { id: 'wege',     title: 'Wege & Untergrund' },
  { id: 'steigung', title: 'Steigung' },
  { id: 'umgebung', title: 'Umgebung' },
  { id: 'fein',     title: 'Wegführung' },
  { id: 'export',   title: 'GPX-Export' }
];

/* --------------------------------------------------------- Basisprofile

   Jedes Basisprofil bringt seinen eigenen Parametersatz mit — sie sind nicht
   deckungsgleich. `defs` weicht dort vom Katalog ab, wo das Profil einen
   anderen Standardwert oder einen anderen Typ hat.

   Nachgewiesen am 18.08.2026 (siehe BROUTER.md): fastbike-lowtraffic ist
   fastbike mit consider_traffic = 1.0. Genau deshalb steht hier 1.0 und
   nicht der fastbike-Standard 0.1 — sonst zeigte der Editor einen Wert an,
   der nie gerechnet wurde. */

const BASES = {
  'fastbike': {
    label: 'Zügig',
    hint: 'Asphalt, direkt, nimmt Hauptstraßen gern mit.',
    groups: {
      verkehr:  ['consider_traffic', 'consider_town', 'allow_motorways'],
      wege:     ['allow_steps', 'allow_ferries', 'use_proposed_cycleroutes'],
      steigung: ['consider_elevation', 'uphillcost', 'uphillcutoff',
                 'downhillcost', 'downhillcutoff'],
      umgebung: ['consider_forest', 'consider_noise', 'consider_river'],
      fein:     ['considerTurnRestrictions', 'correctMisplacedViaPoints',
                 'correctMisplacedViaPointsDistance'],
      export:   ['turnInstructionMode', 'turnInstructionCatchingRange',
                 'turnInstructionRoundabouts']
    },
    defs: {}
  },

  'fastbike-lowtraffic': {
    label: 'Wenig Verkehr',
    hint: 'Wie „Zügig", aber Hauptstraßen werden deutlich bestraft. Voreinstellung.',
    inherit: 'fastbike',
    defs: { consider_traffic: 1.0 }
  },

  'fastbike-verylowtraffic': {
    label: 'Sehr wenig Verkehr',
    hint: 'Eigenes, älteres Profil. Deutlich verkehrsscheuer, dafür längere Wege.',
    groups: {
      verkehr:  ['consider_traffic_bool', 'consider_town', 'allow_motorways'],
      wege:     ['allow_steps', 'allow_ferries', 'use_proposed_cycleroutes'],
      steigung: ['consider_elevation', 'uphillcost', 'uphillcutoff',
                 'downhillcost', 'downhillcutoff'],
      umgebung: ['consider_forest', 'consider_noise', 'consider_river'],
      fein:     ['considerTurnRestrictions'],
      export:   ['turnInstructionMode', 'turnInstructionCatchingRange',
                 'turnInstructionRoundabouts']
    },
    defs: { consider_traffic_bool: true }
  },

  'trekking': {
    label: 'Trekking',
    hint: 'Allrounder, toleriert unbefestigte Wege und folgt gern Radrouten.',
    groups: {
      verkehr:  ['consider_traffic_bool', 'consider_town', 'avoid_unsafe'],
      wege:     ['unpavedPenalty', 'allow_steps', 'allow_ferries',
                 'ignore_cycleroutes', 'stick_to_cycleroutes',
                 'use_proposed_cycleroutes'],
      steigung: ['consider_elevation', 'uphillcost', 'uphillcutoff',
                 'downhillcost', 'downhillcutoff'],
      umgebung: ['consider_forest', 'consider_noise', 'consider_river'],
      fein:     ['considerTurnRestrictions', 'correctMisplacedViaPoints',
                 'correctMisplacedViaPointsDistance', 'add_beeline'],
      export:   ['turnInstructionMode', 'turnInstructionCatchingRange',
                 'turnInstructionRoundabouts']
    },
    defs: {}
  }
};

/* ------------------------------------------------- Weitere Serverprofile

   Alles, was brouter.de sonst noch beantwortet — am 19.08.2026 einzeln
   nachgemessen (siehe PROFILE.md). Sie sind waehlbar, aber NICHT einstellbar:
   Welche Parameter sie kennen, weiss die App nicht, und Regler anzubieten, die
   der Server still ignoriert, waere eine Luege an der Oberflaeche. Genau
   deshalb steht `frei: true` daran und `groups` bleibt leer.

   `gruppe` ordnet die Profilliste. `was` sagt, was das Profil tut — nicht, wie
   es heisst: Mehrere Originalnamen fuehren in die Irre, Belege in PROFILE.md. */

const WEITERE = [
  ['fastbike-asia-pacific', 'Zügig (Asien/Pazifik)', 'Rennrad',
   'Wie „Zügig", erlaubt aber Autobahnen — in Europa unbrauchbar.'],

  ['safety', 'Trekking, Hauptstraßen meiden', 'Tourenrad',
   'Trekking mit einem einzigen Schalter (avoid_unsafe). Der Originalname „safety" verspricht mehr, als der hält.'],
  ['trekking-steep', 'Trekking, Steigungen egal', 'Tourenrad',
   'Ignoriert die Höhe (consider_elevation aus) — kürzer und steiler. „steep" meint erlauben, nicht suchen.'],
  ['trekking-ignore-cr', 'Trekking ohne Radrouten-Bonus', 'Tourenrad',
   '„cr" heißt cycleroutes: ausgeschilderte Radrouten bekommen keinen Vorzug mehr.'],
  ['trekking-noferries', 'Trekking ohne Fähren', 'Tourenrad',
   'Trekking mit allow_ferries = false.'],
  ['trekking-nosteps', 'Trekking ohne Treppen', 'Tourenrad',
   'Trekking mit allow_steps = false.'],

  ['quaelnix-gravel', 'Gravel', 'Gelände',
   'Fassung vom 21.06.2025 — die neuere der beiden von quaelnix.'],
  ['gravel', 'Gravel (ältere Fassung)', 'Gelände',
   'Fassung vom 28.04.2024, gleicher Autor. Zwei Stände desselben Profils, nicht zwei Profile.'],
  ['mtb', 'Mountainbike', 'Gelände',
   'Nimmt Pfade und groben Untergrund bewusst mit. Achtung: nur klein geschrieben vorhanden.'],

  ['vm-forum-liegerad-schnell', 'Liegerad schnell', 'Liegerad und Velomobil',
   'Aus dem Velomobilforum — flacher Sitz, andere Steigungsbewertung.'],
  ['vm-forum-velomobil-schnell', 'Velomobil schnell', 'Liegerad und Velomobil',
   'Dreirädrig und breit, meidet enge und schlechte Wege.'],

  ['hiking-beta', 'Wandern', 'Andere Fortbewegung', 'Zu Fuß, Wege statt Straßen.'],
  ['hiking-mountain', 'Bergwandern', 'Andere Fortbewegung', 'Zu Fuß im Gebirge, nimmt Steigungen in Kauf.'],
  ['skating', 'Inline-Skating', 'Andere Fortbewegung', 'Nur glatter Asphalt.'],
  ['moped', 'Moped', 'Andere Fortbewegung', 'Kleinkraftrad, meidet Autobahnen.'],
  ['car-eco', 'Auto sparsam', 'Andere Fortbewegung', 'Zielgeschwindigkeit 90 km/h.'],
  ['car-fast', 'Auto schnell', 'Andere Fortbewegung',
   'Identisch mit „Auto sparsam" bis auf vmax 160 statt 90.'],
  ['car-vario', 'Auto einstellbar', 'Andere Fortbewegung', 'Auto mit Reglern für Maut, Fähren, Tempo.'],
  ['car-vario-nocost', 'Auto ohne Zeitmodell', 'Andere Fortbewegung', 'Wie einstellbar, aber ohne Fahrzeitberechnung.'],

  ['shortest', 'Kürzeste Strecke', 'Sonderzwecke',
   'Ignoriert Höhenmeter und Wegart — misst nur Länge.'],
  ['all', 'Alles gleich teuer', 'Sonderzwecke',
   'Testprofil: jeder Weg zählt gleich. Zeigt, was überhaupt verbunden ist.'],
  ['softaccess', 'Zugangsprüfung', 'Sonderzwecke', 'Hilfsprofil der Engine, kein Fahrprofil.'],
  ['dummy', 'Platzhalter', 'Sonderzwecke', 'Leeres Profil, nur zum Prüfen der Datenlage.'],
  ['rail', 'Schiene', 'Sonderzwecke', 'Folgt Bahnstrecken statt Straßen.'],
  ['river', 'Fluss', 'Sonderzwecke', 'Folgt Wasserläufen — für Karten, nicht fürs Fahren.']
];

WEITERE.forEach(function (w) {
  BASES[w[0]] = {
    label: w[1], hint: w[3], gruppe: w[2],
    frei: true,          /* waehlbar, aber ohne Parameterkatalog */
    groups: {}, defs: {}
  };
});

/* Die vier eingerichteten Profile bekommen ihre Gruppe nachgereicht. */
BASES['fastbike'].gruppe = 'Rennrad';
BASES['fastbike-lowtraffic'].gruppe = 'Rennrad';
BASES['fastbike-verylowtraffic'].gruppe = 'Rennrad';
BASES['trekking'].gruppe = 'Tourenrad';

const GRUPPEN = ['Rennrad', 'Tourenrad', 'Gelände',
                 'Liegerad und Velomobil', 'Andere Fortbewegung', 'Sonderzwecke'];

/* Erbende Basisprofile auflösen, damit der Rest der App keine Sonderfälle kennt. */
Object.keys(BASES).forEach(function (id) {
  const b = BASES[id];
  if (!b.inherit) return;
  const parent = BASES[b.inherit];
  b.groups = parent.groups;
  const merged = {};
  Object.keys(parent.defs).forEach(function (k) { merged[k] = parent.defs[k]; });
  Object.keys(b.defs).forEach(function (k) { merged[k] = b.defs[k]; });
  b.defs = merged;
});

/* --------------------------------------------------------------- Zugriff */

/* Eine Katalogangabe samt echtem Parameternamen. `id` kann von `key`
   abweichen — consider_traffic gibt es als Zahl und als Schalter. */
function paramDef(id) {
  const d = PARAM_DEFS[id];
  if (!d) return null;
  const out = {};
  Object.keys(d).forEach(function (k) { out[k] = d[k]; });
  out.id = id;
  out.key = d.key || id;
  return out;
}

const FALLBACK_BASE = 'fastbike-lowtraffic';

/* Ein unbekanntes Basisprofil darf die App nicht umbringen. Es kann aus altem
   Bestand kommen, aus einer Sicherungsdatei oder aus einer Fassung, die andere
   Namen kannte. Statt an einer Stelle tief im Code zu scheitern, fällt alles
   auf den Standard zurück — und `isKnownBase` erlaubt es der Oberfläche, das
   sichtbar zu machen, statt es zu verschweigen. */
function isKnownBase(baseId) {
  return !!BASES[baseId];
}

function base(baseId) {
  return BASES[baseId] || BASES[FALLBACK_BASE];
}

/* Der Standardwert eines Parameters in einem bestimmten Basisprofil. */
function baseDefault(baseId, paramId) {
  const b = base(baseId);
  if (b && Object.prototype.hasOwnProperty.call(b.defs, paramId)) return b.defs[paramId];
  const d = PARAM_DEFS[paramId];
  return d ? d.def : null;
}

/* Alle Parameter eines Basisprofils mit ihren Standardwerten. */
function baseDefaults(baseId) {
  const out = {};
  const b = base(baseId);
  Object.keys(b.groups).forEach(function (g) {
    b.groups[g].forEach(function (id) { out[id] = baseDefault(baseId, id); });
  });
  return out;
}

/* Alle Parameter-Ids eines Basisprofils, in Gruppenreihenfolge. */
function baseParamIds(baseId) {
  const b = base(baseId);
  const out = [];
  Object.keys(b.groups).forEach(function (g) {
    b.groups[g].forEach(function (id) { out.push(id); });
  });
  return out;
}

window.BR = {
  GRUPPEN: GRUPPEN,
  PARAM_DEFS: PARAM_DEFS,
  USER_DEFS: USER_DEFS,
  SECTIONS: SECTIONS,
  BASES: BASES,
  FALLBACK_BASE: FALLBACK_BASE,
  isKnownBase: isKnownBase,
  base: base,
  paramDef: paramDef,
  baseDefault: baseDefault,
  baseDefaults: baseDefaults,
  baseParamIds: baseParamIds
};
