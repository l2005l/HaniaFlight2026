# HaniaFlight

סימולטור טיסה תלת־ממדי של מטוסי קרב ישראליים, שרץ בדפדפן. גרסה 0.3: F-15I רעם ומשימה אחת מלאה.

A browser flight simulator of Israeli fighter jets. Version 0.3: the F-15I Ra'am and one full mission.

## לשחק / Play

פתחו את `index.html` בדפדפן (נדרש חיבור לרשת כדי לטעון את three.js), או הפעילו GitHub Pages על הענף הראשי.

Open `index.html` in a browser (three.js loads from a CDN), or enable GitHub Pages on the main branch.

## מה יש / What's in it

- מודל טיסה פיזיקלי: עילוי, גרר, הזדקרות, מגבלת G, מבער, דלק, אטמוספירה
- חימוש: AIM-120, פייתון 5, SPICE-2000, תותח M61; מכ"ם, נעילה, אזורי שיגור על ה-HUD, מערכת התרעה
- אויב: כטב"מי תקיפה, זוג מיג-29 עם בינה מלאכותית, סוללת נ"מ עם מיסוך שטח
- משימה: המראה, יירוט, חדירה, תקיפה, נחיתה עם ILS ותחקיר
- יום ושקיעה, דיווחי קשר בקול (כשיש קול עברי במכשיר), מקלדת ומגע

## מבנה / Layout

| Path | What |
| --- | --- |
| `src/core.js` | Simulation core: math, atmosphere, terrain, flight model, weapons, AI, mission. No DOM; runs in Node. |
| `src/game.js` | Rendering (three.js r128), HUD, input, audio, UI. |
| `src/head.html` | Page markup and styles. |
| `build.py` | Bundles `src/` into `index.html` (and `dist/artifact.html`). |
| `tests/` | Node scripts that exercise the core. |

## פיתוח / Develop

```sh
python3 build.py                 # rebuild index.html after editing src/
node tests/flight-model.js       # performance, missile and bomb ranges
node tests/takeoff-landing.js    # takeoff, landing and mission-complete flow
node tests/mission-smoke.js      # crude autopilot flies the mission
```

`index.html` is generated. Edit the files in `src/` and rebuild.

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
