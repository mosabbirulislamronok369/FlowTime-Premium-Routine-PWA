# FlowTime

Premium personal routine + goal + focus timer PWA, designed to later package as Android APK/AAB with Capacitor.

## Features
- One-time and weekly routines
- Start a routine with live countdown
- Pause / Resume
- Add +5 or +10 minutes
- Goals with completion state
- Dark / Light mode
- Local browser persistence
- PWA manifest + service worker
- Reminder permission + speech synthesis
- Capacitor Local Notifications dependency for Android packaging
- No Supabase, no Cloudflare Storage, no backend database

## Run
```bash
npm install
npm run dev
```

## Production
```bash
npm run build
```

Deploy the generated `dist/` directory to Cloudflare Pages.

## Android
```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
Then build APK/AAB from Android Studio.

## Notes
Browser notifications and background speech are subject to browser/OS permissions and lifecycle restrictions. The Android Capacitor build can use native Local Notifications for scheduled notifications. For a production release, add a proper Android notification icon resource and configure exact-alarm/background behavior according to the target Android version and Play policy.
