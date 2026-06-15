# Assets

Place app fonts, sounds, and images here.

The default React Native asset pipeline will pick up files in this directory at build time.

## Recommended structure

```
assets/
├── fonts/        # .ttf / .otf files
├── images/       # .png / .jpg
└── sounds/       # .mp3 / .wav
```

To use bundled fonts on Android/iOS, add this to `react-native.config.js` (already created at the project root):

```js
module.exports = {
  assets: ['./assets/fonts/'],
};
```

Then run `npx react-native-asset` (or `npx react-native link`) to copy them into the native projects.
