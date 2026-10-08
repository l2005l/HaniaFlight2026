# העלאת HaniaFlight ל-Google Play

הכול מוכן מצד הקוד. מה שנשאר דורש את החשבון שלך ב-Google, ולכן נעשה אצלך.

## מה כבר מוכן

| מה | איפה |
|---|---|
| חבילת AAB חתומה, נבנית אוטומטית | GitHub Actions › Android app › ‏HaniaFlight-play-bundle |
| אפליקציה ל-Android 16 (‏API 36), כנדרש מאפליקציות חדשות מאוגוסט 2026 | `android/` |
| מדיניות פרטיות | https://flight.hania360.com/privacy.html |
| שם, תיאור קצר ותיאור מלא | `store/listing-he.md`, ‏`store/listing-en.md` |
| סמל 512×512 | `store/icon-512.png` |
| גרפיקה ראשית 1024×500 | `store/feature-graphic.png` |
| חמישה צילומי מסך 1920×1080 | `store/screenshots/` |

## 1. מפתח ההעלאה (פעם אחת)

Google חותמת את האפליקציה במפתח שלה. המפתח שלך משמש רק כדי להוכיח שההעלאה באה ממך.

1. ב-GitHub: המאגר › Settings › Secrets and variables › Actions › New repository secret.
2. הוסף ארבעה סודות. השמות והערכים נמצאים בקובץ `upload-secrets.txt` שקיבלת בצ'אט:
   `UPLOAD_KEYSTORE_B64`, ‏`UPLOAD_STORE_PASSWORD`, ‏`UPLOAD_KEY_ALIAS`, ‏`UPLOAD_KEY_PASSWORD`.
3. שמור את `hania-upload.jks` ואת קובץ הסודות במקום פרטי, ואל תעלה אותם למאגר. אם הם אובדים, אפשר לבקש מ-Google מפתח העלאה חדש.

## 2. בניית החבילה

1. GitHub › Actions › Android app › Run workflow.
2. בסיום, הורד את הארטיפקט **HaniaFlight-play-bundle**. בתוכו `HaniaFlight.aab`.

אם הסודות לא הוגדרו, הבנייה מדלגת על החבילה ובונה רק את קובץ ה-APK הרגיל.

## 3. חשבון מפתח

1. נרשמים ב-https://play.google.com/console. יש תשלום חד־פעמי של 25 דולר ואימות זהות.
2. בחשבון אישי חדש Google דורשת בדיקה סגורה לפני פרסום: לפחות 12 בודקים שמותקנת אצלם האפליקציה במשך 14 ימים רצופים. רק אחרי זה אפשר לבקש גישה לפרסום ציבורי.

## 4. יצירת האפליקציה ב-Play Console

1. **Create app**: שם HaniaFlight, שפת ברירת מחדל עברית, סוג Game, חינם.
2. **Store listing**: מעתיקים מ-`listing-he.md`. מעלים סמל, גרפיקה ראשית וצילומי מסך מתיקיית `store`.
3. **App content**:
   - Privacy policy: ‏`https://flight.hania360.com/privacy.html`
   - Ads: לא
   - App access: אין צורך בהתחברות
   - Data safety: לא נאסף ולא משותף שום מידע
   - Target audience: מגיל 13 ומעלה
   - Content rating: בשאלון עונים שיש אלימות כלפי כלי רכב וכלי טיס, בלי דם ובלי פגיעה מוצגת באנשים. הדירוג הסופי נקבע בשאלון.
4. **Testing › Closed testing**: יוצרים מסלול, מוסיפים רשימת מיילים של 12 בודקים לפחות, ומעלים את `HaniaFlight.aab`. בהעלאה הראשונה מאשרים את Play App Signing.
5. אחרי 14 ימים: **Production › Apply for production**.

## עדכונים

- רוב העדכונים לא דורשים גרסה חדשה בחנות: האפליקציה טוענת את המשחק מהאתר.
- שינוי בקוד האנדרואיד עצמו (תיקייה `android/`) בונה חבילה חדשה עם מספר גרסה גבוה יותר. מעלים אותה לאותו מסלול.
