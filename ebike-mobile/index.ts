import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
const isDesignGallery = __DEV__ && typeof window !== 'undefined' && window.location.search.includes('design-gallery=1');
registerRootComponent(isDesignGallery ? require('./DesignGallery').default : App);

// Local-only design capture, enabled explicitly by the Figma capture URL.
if (__DEV__ && typeof document !== 'undefined' && window.location.hash.includes('figmacapture=')) {
  const script = document.createElement('script');
  script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
  script.async = true;
  document.head.appendChild(script);
}
