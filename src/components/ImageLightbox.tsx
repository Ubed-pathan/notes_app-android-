import { Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  uri: string | null;
  onClose: () => void;
};

export function ImageLightbox({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible={uri != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <IconButton
          icon="close"
          iconColor="#fff"
          size={26}
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 8, right: 8 }]}
        />
        <Pressable style={styles.content} onPress={onClose}>
          {uri ? (
            <Image
              source={{ uri }}
              style={{ width, height: height - insets.top - insets.bottom }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
