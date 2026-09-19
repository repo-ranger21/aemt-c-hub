# AEMT-C Hub

Offline study app for the NREMT AEMT exam and Rhode Island AEMT-Cardiac practice.
Expo SDK 57, React Native, TypeScript. No backend: all content ships in `src/data/`.

## The display rule

Every answer and drug card leads with the NREMT / national method (textbook + AHA),
because that is what the national exam tests. When the RI Statewide Protocols
(v2026.02) differ, the RI version follows in a gold callout with its protocol number.

## Run it (Windows PowerShell)

```powershell
cd aemt-c-hub
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your phone (Android or iPhone).
Your phone and PC need to be on the same Wi-Fi. If not, run `npx expo start --tunnel`.

## Update content

Edit or replace the JSON files in `src/data/`. Shapes are defined in `src/types.ts`.
Items with a `ri` block (questions) or `conflicts` array (drugs, topics) show the gold RI callout.

## Build an installable app later

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview   # APK you can sideload
eas build -p ios                         # needs an Apple Developer account
```

EAS builds in the cloud, so iOS builds work from Windows.

## Layout

```
App.tsx                 tabs + navigation
src/types.ts            content schema
src/theme.ts            colors and type
src/data/               drugs.json, topics.json (8 decks), questions.json (148)
src/lib/review.ts       Leitner spaced repetition, saved on-device
src/components/         Standards (NREMT/RI callouts), UI bits
src/screens/            Today, Drugs, DrugDetail, Topics, Drill
```
