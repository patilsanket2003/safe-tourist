import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { WebViewMessage, TileServerConfig } from './types';
import { generateMapHTML } from './mapHtml';

interface MapContainerProps {
  webViewKey: number;
  height: number;
  tileConfig: TileServerConfig;
  onWebViewMessage: (event: any) => void;
  webViewRef: React.RefObject<WebView>;
  isFullScreen?: boolean;
}

const MapContainer = ({ 
  webViewKey, 
  height, 
  tileConfig, 
  onWebViewMessage, 
  webViewRef,
  isFullScreen
}: MapContainerProps) => {
  return (
    <View style={[styles.mapContainer, isFullScreen ? styles.mapContainerFull : undefined, { height }]}>
      <WebView
        key={webViewKey} // Force remount when key changes
        ref={webViewRef}
        source={{ html: generateMapHTML(tileConfig) }}
        style={styles.webView}
        onMessage={onWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text>Loading interactive map...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
          // Error message will be handled in parent component
        }}
        // Disable zoom controls to prevent conflicts
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // Allow mixed content for map tiles
        mixedContentMode="compatibility"
        // Additional WebView optimizations
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
    marginBottom: 0,
    backgroundColor: "#000",
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
