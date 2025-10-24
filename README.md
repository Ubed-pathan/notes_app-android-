# Local Notes App (React Native + Expo)

An offline-first notes app with polished UI, built using Expo, React Native Paper, and FlashList. Notes are stored locally on the device (no server or database).

## Features
- Create, edit, and delete notes
- Instant local storage via AsyncStorage
- Pin notes to the top
- Fast list rendering using FlashList
- Debounced autosave in the editor
- Haptic feedback on actions
- Expo Router navigation and modern theming

## Tech
- Expo SDK 54 (managed)
- TypeScript
- react-native-paper (UI)
- @shopify/flash-list (performance)
- @react-native-async-storage/async-storage (local storage)

## Getting started

Install dependencies:

```bash
cd "d:/ANS Project/Notes-app-reactnative"
npm install
```

Install Expo native deps (already done by scripts, but safe to repeat):

```bash
npx expo install react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated
```

Run the app:

```bash
# Start Expo dev server
npm run android   # for Android (recommended)
# or
npm run web       # quick web check (limited features)
```

Notes:
- For iOS builds, macOS is required. You can still preview via Expo Go on an iPhone.
- Data is stored purely on-device using AsyncStorage under the key `notes.v1`.

## Project structure
- `app/` — expo-router screens (`index`, `note`, `settings`)
- `src/storage/notes.ts` — storage API (list/get/upsert/delete/togglePin)
- `src/components/NoteCard.tsx` — reusable note card

## Performance tips
- FlashList renders large lists smoothly; we pass `estimatedItemSize` to optimize layout.
- Editor uses debounced autosave (300ms) to avoid excessive writes.
- Actions give light haptics for better UX feedback.

## Future improvements
- Optional MMKV backend for even faster storage
- Rich text editing and tags
- Export/Import notes to file
