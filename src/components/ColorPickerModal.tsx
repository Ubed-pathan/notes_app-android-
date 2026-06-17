import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { hexToHsv, hsvToHex, hueToHex, normalizeHex } from '../features/theme/colorUtils';

type Props = {
  visible: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onConfirm: (hex: string) => void;
};

const HUE_COLORS = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'] as const;
const CURSOR = 22;

export function ColorPickerModal({ visible, title, value, onClose, onConfirm }: Props) {
  const theme = useTheme();
  const { width: screenW } = useWindowDimensions();
  const panelW = Math.min(screenW - 72, 300);

  const initial = useMemo(() => hexToHsv(value), [value]);
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [v, setV] = useState(initial.v);
  const [hexInput, setHexInput] = useState(value);

  const svSize = useRef({ w: panelW, h: 200 });
  const hueSize = useRef({ w: panelW });

  const hRef = useRef(h);
  const sRef = useRef(s);
  const vRef = useRef(v);
  hRef.current = h;
  sRef.current = s;
  vRef.current = v;

  useEffect(() => {
    if (!visible) return;
    const hsv = hexToHsv(value);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
    setHexInput(value);
  }, [visible, value]);

  const preview = hsvToHex(h, s, v);

  useEffect(() => {
    setHexInput(preview);
  }, [preview]);

  const pickSV = (x: number, y: number) => {
    const { w, h: ht } = svSize.current;
    if (w <= 0 || ht <= 0) return;
    setS(Math.max(0, Math.min(1, x / w)));
    setV(Math.max(0, Math.min(1, 1 - y / ht)));
  };

  const pickHue = (x: number) => {
    const { w } = hueSize.current;
    if (w <= 0) return;
    setH(Math.max(0, Math.min(360, (x / w) * 360)));
  };

  const svPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => pickSV(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: e => pickSV(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })
  ).current;

  const huePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => pickHue(e.nativeEvent.locationX),
      onPanResponderMove: e => pickHue(e.nativeEvent.locationX),
    })
  ).current;

  const applyHex = (text: string) => {
    setHexInput(text);
    const normalized = normalizeHex(text);
    if (!normalized) return;
    const hsv = hexToHsv(normalized);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  };

  const svLeft = s * svSize.current.w - CURSOR / 2;
  const svTop = (1 - v) * svSize.current.h - CURSOR / 2;
  const hueLeft = (h / 360) * hueSize.current.w - CURSOR / 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={e => e.stopPropagation()}
          style={[styles.card, { backgroundColor: theme.colors.surface, maxWidth: panelW + 40 }]}
        >
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>

          {/* 2D saturation + brightness panel (like browser color picker) */}
          <View
            style={[styles.svPanel, { width: panelW, height: 200 }]}
            onLayout={e => {
              svSize.current = {
                w: e.nativeEvent.layout.width,
                h: e.nativeEvent.layout.height,
              };
            }}
            {...svPan.panHandlers}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hueToHex(h) }]} />
            <LinearGradient
              colors={['#ffffff', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', '#000000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                styles.cursor,
                {
                  left: Math.max(0, Math.min(svSize.current.w - CURSOR, svLeft)),
                  top: Math.max(0, Math.min(svSize.current.h - CURSOR, svTop)),
                },
              ]}
            />
          </View>

          {/* Hue rainbow strip */}
          <View
            style={[styles.hueBar, { width: panelW }]}
            onLayout={e => {
              hueSize.current = { w: e.nativeEvent.layout.width };
            }}
            {...huePan.panHandlers}
          >
            <LinearGradient
              colors={[...HUE_COLORS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                styles.cursor,
                {
                  top: 1,
                  left: Math.max(0, Math.min(hueSize.current.w - CURSOR, hueLeft)),
                },
              ]}
            />
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: preview }]} />
            <TextInput
              mode="outlined"
              label="Hex"
              value={hexInput}
              onChangeText={applyHex}
              autoCapitalize="characters"
              dense
              style={{ flex: 1 }}
              outlineStyle={{ borderRadius: 10 }}
            />
          </View>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={onClose} style={styles.btn}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                onConfirm(preview);
                onClose();
              }}
              style={styles.btn}
              buttonColor={preview}
              textColor={preview === '#ffffff' || v > 0.85 ? '#111' : '#fff'}
            >
              Apply
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  title: {
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  svPanel: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  hueBar: {
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  cursor: {
    position: 'absolute',
    width: CURSOR,
    height: CURSOR,
    borderRadius: CURSOR / 2,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 2,
    elevation: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  btn: {
    borderRadius: 10,
    minWidth: 96,
  },
});
