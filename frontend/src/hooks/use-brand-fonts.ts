import { useFonts } from 'expo-font';

// Use require() so Metro bundles the TTF into the JS bundle and Expo Go
// can render it without hitting any CDN.
export const useBrandFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    BebasNeue: require('../../assets/fonts/BebasNeue-Regular.ttf'),
  });
