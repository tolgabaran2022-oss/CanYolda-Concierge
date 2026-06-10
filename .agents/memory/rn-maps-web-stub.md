---
name: react-native-maps web stub
description: react-native-maps@1.18.0 imports codegenNativeCommands which crashes on web; requires a metro resolver override + JS stub file
---

## Rule
When using `react-native-maps` in an Expo project that targets web, always add a metro.config.js resolver override that maps `react-native-maps` → a CJS stub on the `web` platform.

**Why:** react-native-maps@1.18.0 (the only Expo Go compatible version) imports `react-native/Libraries/Utilities/codegenNativeCommands` in `MapMarkerNativeComponent.js`, which Metro refuses to bundle for the web platform. The expo skill docs say it's polyfilled, but in practice it crashes the web bundler.

**How to apply:**

1. In `metro.config.js`:
```js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { filePath: path.resolve(__dirname, 'stubs/react-native-maps.web.js'), type: 'sourceFile' };
  }
  if (originalResolveRequest) return originalResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};
```

2. Create `stubs/react-native-maps.web.js` exporting a dummy MapView (View + text placeholder), Marker (null), PROVIDER_DEFAULT, PROVIDER_GOOGLE, etc. as CommonJS exports.

3. This is separate from the native code — no Platform.OS guards needed in the React components themselves.
