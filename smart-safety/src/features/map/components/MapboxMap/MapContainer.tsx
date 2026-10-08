
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { WebViewMessage } from './types';
import { generateMapHTML } from './mapHtml';
import { generateMapHTML as generateOsmHTML } from '../OsmMap/mapHtml';
import { MAPBOX_ACCESS_TOKEN } from '../../../../config';

interface MapContainerProps {
  webViewKey: number;
  height: number;
  onWebViewMessage: (event: any) => void;
  webViewRef: React.RefObject<WebView>;
  isFullScreen?: boolean;
}

const defaultTileConfig = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
};

const MapContainer = ({
  webViewKey,
  height,
  onWebViewMessage,
  webViewRef,
  isFullScreen
}: MapContainerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // If token is provided and starts with pk., use Mapbox; otherwise use OpenStreetMap Leaflet
  const rawHtml = (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.startsWith('pk.'))
    ? generateMapHTML(MAPBOX_ACCESS_TOKEN)
    : generateOsmHTML(defaultTileConfig);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMsg = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const data = typeof event.data === 'string' ? event.data : (event.data.data || event.data);
        if (typeof data === 'string') {
          onWebViewMessage({ nativeEvent: { data } });
        } else if (typeof data === 'object') {
          onWebViewMessage({ nativeEvent: { data: JSON.stringify(data) } });
        }
      } catch (_) {}
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [onWebViewMessage]);

  useEffect(() => {
    if (Platform.OS === 'web' && webViewRef) {
      (webViewRef as any).current = {
        postMessage: (msg: string) => {
          iframeRef.current?.contentWindow?.postMessage(msg, '*');
        },
        injectJavaScript: (code: string) => {
          try {
            (iframeRef.current?.contentWindow as any)?.eval(code);
          } catch (_) {}
        }
      };
    }
  }, [webViewRef]);

  if (Platform.OS === 'web') {
    const webHtmlWithBridge = `
      <script>
        window.ReactNativeWebView = {
          postMessage: function(msg) {
            window.parent.postMessage(msg, '*');
          }
        };
      </script>
      ${rawHtml}
    `;

    return (
      <View style={[styles.mapContainer, isFullScreen ? styles.mapContainerFull : undefined, { height }]}>
        <iframe
          ref={iframeRef as any}
          key={webViewKey}
          srcDoc={webHtmlWithBridge}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          title="Interactive Map"
          allow="geolocation; camera; microphone"
        />
      </View>
    );
  }

  return (
    <View style={[styles.mapContainer, isFullScreen ? styles.mapContainerFull : undefined, { height }]}>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ html: rawHtml }}
        style={styles.webView}
        onMessage={onWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text>Loading map...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        mixedContentMode="compatibility"
        cacheEnabled={true}
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#f5f5f5",
  },
  mapContainerFull: {
    borderRadius: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  }
});

export default MapContainer;
