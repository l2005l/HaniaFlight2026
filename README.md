# HaniaFlight

סימולטור טיסה תלת־ממדי של מטוסי קרב ישראליים, שרץ בדפדפן. גרסה 1.6: ארבעה מטוסים (F-15I רעם, F-16I סופה, F-35I אדיר, F-15 בז), אחת־עשרה משימות, שתי מערכות, אתגר יומי וטיסת לילה עם תאורת שדה.

A browser flight simulator of Israeli fighter jets. Version 1.6: four aircraft (F-15I Ra'am, F-16I Sufa, F-35I Adir, F-15 Baz), eleven missions, two campaigns, a daily challenge and night flying with airfield lighting.

## לשחק / Play

https://flight.hania360.com/

## אפליקציית אנדרואיד / Android app

קובץ ההתקנה: https://github.com/l2005l/HaniaFlight2026/releases/download/android-latest/HaniaFlight.apk

זו מעטפת מקורית קטנה (`android/`) שמציגה את המשחק מ-flight.hania360.com במסך מלא. המשחק מתעדכן מהאתר, כך שאין צורך להתקין את האפליקציה מחדש בכל גרסה. היא נבנית ב-GitHub Actions (`.github/workflows/android.yml`) בכל שינוי בתיקיית `android/`.

A thin native shell (`android/`) that shows the game from flight.hania360.com full screen; the game updates from the web. GitHub Actions builds the APK on every change under `android/`, and a signed Play bundle when the upload key is in the repository secrets. Publishing to Google Play: `store/README.md`.

העלאה ל-Google Play: ההוראות, הטקסטים והגרפיקה בתיקייה `store/`.

## התקנה כאפליקציה / Install as an app

המשחק הוא PWA: אחרי פתיחה ראשונה הוא עובד גם בלי רשת.

- **Android:** עדיף להתקין את אפליקציית האנדרואיד שלמעלה; היא נפתחת מהר יותר. באתר מופיע באנדרואיד כפתור הורדה שלה.
- **iPhone (Safari):** כפתור השיתוף, ואז "הוסף למסך הבית".
- **מחשב (Chrome / Edge):** סמל ההתקנה בשורת הכתובת.

The game is a PWA: open the link, then use the in-game install button or the browser's "Add to Home screen" / "Install app". After the first visit it runs offline.

## מה יש / What's in it

- מודל טיסה פיזיקלי: עילוי, גרר, הזדקרות, מגבלת G, מבער, דלק, אטמוספירה
- חימוש: AIM-120, פייתון 5, SPICE-2000, תותח M61; מכ"ם, נעילה, אזורי שיגור על ה-HUD, מערכת התרעה
- אויב: כטב"מי תקיפה, זוג מיג-29 עם בינה מלאכותית, סוללת נ"מ עם מיסוך שטח
- ארבעה מטוסים: F-15I רעם, F-16I סופה, F-35I אדיר (חמקן, חימוש פנימי) ו-F-15 בז (אוויר־אוויר בלבד), כל אחד עם מודל טיסה, מראה וחימוש משלו
- הגנת שמיים: יירוט מטח כטב"מים וטילי שיוט; טיסת הדרכה עם מדריך ברדיו
- טיסת לילה עם משקפת לילה (מקש I)
- מפה טקטית (Tab), מבט נעול על המטרה (Z), יומן טייס
- מזג אוויר (רוח צד, שכבת עננים ואובך), תקלות אקראיות ונטישה
- פצצות מונחות לייזר עם תמונת פוד הכוונה
- קוקפיט נפרד לכל מטוס, כבישים ושדות סביב היישובים
- הקלטת הגיחה וצפייה חוזרת מהתחקיר
- שתי זירות (דרום מדברי, צפון הררי), מערכה של חמישה שלבים מקושרים
- משימות דיכוי נ"מ (טילי AGM-88) וסיור חמוש נגד שיירה נעה
- מספר שתיים שטס במבנה ומקבל פקודות; סוחוי-27, מיג-21 וסוללות SA-6/SA-8/SA-10
- הגדרות שליטה: רגישות מוט, היפוך ציר, היגוי בהטיית הטלפון, כפתורי מגע גדולים
- מבצע פטיש ברזל: המראה, יירוט, חדירה, תקיפה, נחיתה עם ILS ותחקיר
- קרב אוויר: מפגש מהיר מול זוג מיג-29
- יום ושקיעה, דיווחי קשר בקול (כשיש קול עברי במכשיר)
- קוקפיט תלת־ממדי עם מבט חופשי, מסכים על לוח המחוונים ו-HUD מקובע לציר המטוס
- בקרת נשק כמו במטוס: מאסטר ארם, הדק לתותח, פיקל לטילים ולפצצות
- קוקפיט לחיץ: לוח מתגים פעיל, רצף התנעה מלא עם רשימת תיוג, והסעה למסלול
- נזק חלקי: מנוע מושבת, אש, דליפת דלק, תקלות מכ"ם, מסך איומים והידראוליקה
- מכ"ם עם מצבי חיפוש וקרב צמוד, טווח ידני וזיהוי עמית־טורף
- תדלוק אווירי ממתדלק בזרוע, כמשימה נפרדת וגם בתוך משימת התקיפה
- שלוש רמות קושי, מצב גרפיקה חסכוני, מקלדת, מגע ושלט משחק
- 1.6, טיסה: כבייה והתנעה באוויר, כשל בלמים וכבל בלימה (וו במקש 6), פגיעת ציפור, מגבלת G עם מכלים ומהירות הרמת אף לפי המשקל, נחיתה זוגית עם מספר שתיים
- 1.6, אויב: סוללה נסתרת שמדליקה מכ"ם רק מקרוב, מיג שמחכה נמוך מאחורי ההרים, זוג שמנסה פיתיון, מיגים שחוזרים הביתה בבינגו, משגר שבורח מהעמדה, ספינת טילים בזירה הרחוקה
- 1.6, לילה: אורות מסלול, תאורת גישה עם הבזק רץ, PAPI, מסלולי הסעה כחולים, יישובים ופנסי רחוב, פנס נחיתה ואורות ניווט
- 1.6, תוכן: משימות חילוץ (ליווי מסוק), צילום מודיעין בפוד ויירוט כטב"ם חמקן; מערכה שנייה מעבר לים עם צי מטוסים ומלאי חימוש; אתגר יומי עם ניקוד
- 1.6, אפליקציה: מצב חיסכון סוללה, שלט משחק גם באפליקציית האנדרואיד, יעד Android 16 וחבילה ל-Google Play

## מבנה / Layout

| Path | What |
| --- | --- |
| `src/core.js` | Simulation core: math, atmosphere, terrain, flight model, weapons, AI, mission. No DOM; runs in Node. |
| `src/game.js` | Rendering (three.js r128), HUD, input, audio, UI. |
| `src/head.html` | Page markup and styles. |
| `src/sw.js` | Service worker template (offline play). |
| `build.py` | Bundles `src/` into `index.html`, stamps `sw.js`, and writes `dist/artifact.html`. |
| `vendor/three.min.js` | three.js r128 (MIT), bundled so the app works offline. |
| `manifest.webmanifest`, `icons/` | App name, icons and display mode for installation. |
| `tests/` | Node scripts that exercise the core. |

## פיתוח / Develop

```sh
python3 build.py                 # rebuild index.html after editing src/
node tests/flight-model.js       # performance, missile and bomb ranges
node tests/takeoff-landing.js    # takeoff, landing and mission-complete flow
node tests/mission-smoke.js      # crude autopilot flies the mission
node tests/campaign.js [north]   # second theatre, SEAD, convoy, wingman, enemy types
node tests/content.js            # all aircraft, stealth, air defence, training
node tests/f16-and-duel.js       # F-16I performance and the air-combat mission
node tests/systems.js            # cold start, switches, damage, radar modes, refuelling
```

`index.html` and `sw.js` are generated. Edit the files in `src/` and rebuild.

## מקשים / Keys

| Key | Action |
| --- | --- |
| Arrows / WASD | Stick (down arrow pulls the nose up) |
| Q / E | Rudder, nosewheel steering |
| Shift or R / F | Throttle up / down (above 100% is afterburner) |
| M | Master arm. Nothing leaves the jet while it is SAFE |
| Space | Trigger: gun |
| Enter | Pickle (weapon release): the selected missile or bomb |
| 1-4 | AIM-120, Python-5, gun sight, air-to-ground |
| T / U | Lock next target / unlock |
| C | Chaff and flares |
| G / L / B | Gear / flaps / speedbrake and wheel brakes |
| H / J | Autopilot (altitude and heading hold) / jettison air-to-ground stores |
| Y / , . | Radar mode (search or close combat) / radar range down, up |
| K | Air-refuelling door; the HUD then steers to the tanker |
| 6 · ; | Arresting hook · restart a flamed-out engine in the air (above 215 kt) |
| X | Look at the switch panel; click a switch to work it |
| Mouse drag | Look around the cockpit; the head recentres on release |
| V / O / P / 0 | View / time acceleration / pause / mute |

Gamepad: left stick flies, right stick looks, RT/LT throttle, RB trigger, A pickle, B countermeasures, X lock, Y next weapon, LB speedbrake; d-pad up gear, down flaps, right master arm, left view.
