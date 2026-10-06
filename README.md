# HaniaFlight

סימולטור טיסה תלת־ממדי של מטוסי קרב ישראליים, שרץ בדפדפן. גרסה 0.6: F-15I רעם ו-F-16I סופה, משימת תקיפה מלאה ומשימת קרב אוויר.

A browser flight simulator of Israeli fighter jets. Version 0.6: the F-15I Ra'am and F-16I Sufa, a full strike mission and a quick air-combat mission.

## לשחק / Play

https://flight.hania360.com/

## התקנה כאפליקציה / Install as an app

המשחק הוא PWA: אחרי פתיחה ראשונה הוא עובד גם בלי רשת.

- **Android (Chrome):** פתחו את הקישור, ולחצו "התקנה כאפליקציה" בתדריך, או בתפריט הדפדפן "הוספה למסך הבית" / "התקנת האפליקציה".
- **iPhone (Safari):** כפתור השיתוף, ואז "הוסף למסך הבית".
- **מחשב (Chrome / Edge):** סמל ההתקנה בשורת הכתובת.

The game is a PWA: open the link, then use the in-game install button or the browser's "Add to Home screen" / "Install app". After the first visit it runs offline.

## מה יש / What's in it

- מודל טיסה פיזיקלי: עילוי, גרר, הזדקרות, מגבלת G, מבער, דלק, אטמוספירה
- חימוש: AIM-120, פייתון 5, SPICE-2000, תותח M61; מכ"ם, נעילה, אזורי שיגור על ה-HUD, מערכת התרעה
- אויב: כטב"מי תקיפה, זוג מיג-29 עם בינה מלאכותית, סוללת נ"מ עם מיסוך שטח
- שני מטוסים: F-15I רעם ו-F-16I סופה, כל אחד עם מודל טיסה, מראה וחימוש משלו
- מבצע פטיש ברזל: המראה, יירוט, חדירה, תקיפה, נחיתה עם ILS ותחקיר
- קרב אוויר: מפגש מהיר מול זוג מיג-29
- יום ושקיעה, דיווחי קשר בקול (כשיש קול עברי במכשיר)
- קוקפיט תלת־ממדי עם מבט חופשי, מסכים על לוח המחוונים ו-HUD מקובע לציר המטוס
- בקרת נשק כמו במטוס: מאסטר ארם, הדק לתותח, פיקל לטילים ולפצצות
- שלוש רמות קושי, מצב גרפיקה חסכוני, מקלדת, מגע ושלט משחק

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
node tests/f16-and-duel.js       # F-16I performance and the air-combat mission
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
| Mouse drag | Look around the cockpit; the head recentres on release |
| V / O / P / 0 | View / time acceleration / pause / mute |

Gamepad: left stick flies, right stick looks, RT/LT throttle, RB trigger, A pickle, B countermeasures, X lock, Y next weapon, LB speedbrake; d-pad up gear, down flaps, right master arm, left view.
