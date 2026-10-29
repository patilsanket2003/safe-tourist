import { Platform } from 'react-native';

export function injectWebFonts() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const STYLE_ID = 'expo-vector-icons-web-fonts';
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const cdnBase = 'https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts';

  const fontStyles = `
    @font-face {
      font-family: 'material-community';
      src: url('${cdnBase}/MaterialCommunityIcons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url('${cdnBase}/MaterialCommunityIcons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Material Design Icons';
      src: url('${cdnBase}/MaterialCommunityIcons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'ionicons';
      src: url('${cdnBase}/Ionicons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Ionicons';
      src: url('${cdnBase}/Ionicons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'FontAwesome';
      src: url('${cdnBase}/FontAwesome.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'MaterialIcons';
      src: url('${cdnBase}/MaterialIcons.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'feather';
      src: url('${cdnBase}/Feather.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.type = 'text/css';
  style.appendChild(document.createTextNode(fontStyles));
  document.head.appendChild(style);
  console.log('✅ [injectWebFonts] Icon web fonts injected successfully');
}

// Automatically execute on web import
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  injectWebFonts();
}
