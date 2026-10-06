# HaniaFlight

סימולטור טיסה תלת־ממדי של מטוסי קרב ישראליים, שרץ בדפדפן. גרסה 0.4: F-15I רעם ומשימה אחת מלאה.

A browser flight simulator of Israeli fighter jets. Version 0.4: the F-15I Ra'am and one full mission.

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
- משימה: המראה, יירוט, חדירה, תקיפה, נחיתה עם ILS ותחקיר
- יום ושקיעה, דיווחי קשר בקול (כשיש קול עברי במכשיר)
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
```

`index.html` and `sw.js` are generated. Edit the files in `src/` and rebuild.

## מקשים / Keys

| Key | Action |
| --- | --- |
| Arrows / WASD | Stick (down arrow pulls the nose up) |
| Q / E | Rudder, nosewheel steering |
| Shift or R / F | Throttle up / down (above 100% is afterburner) |
| G / L / B | Gear / flaps / speedbrake and wheel brakes |
| 1-4, Enter | AIM-120, Python-5, gun, SPICE / next weapon |
| T / U | Lock next target / unlock |
| Space / C | Fire or release / chaff and flares |
| V / O / P / M | View / time acceleration / pause / mute |
