import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../api';

const BRAND_PRIMARY = '#8E1537';
const BRAND_TEXT = '#3F0614';
const BRAND_ACCENT = '#C5304F';

export default function DocumentCapture({ onSuccess }) {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galeria');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });

    if (res.cancelled || res.canceled) {
      return;
    }

    const asset = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : res;
    if (!asset || !asset.uri) {
      Alert.alert('Error', 'No se pudo obtener la imagen seleccionada.');
      return;
    }

    try {
      setImage(asset.uri);
      const uploadPayload = {
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      };
      const ocrResponse = await uploadImage('/ocr', uploadPayload);
      setResult(ocrResponse);

      if (ocrResponse?.is_valid) {
        onSuccess(ocrResponse);
      } else {
        console.warn('OCR invalido', ocrResponse);
        Alert.alert('OCR invalido', 'No se detectaron campos necesarios. Reintenta con otra imagen.');
      }
    } catch (error) {
      console.error('OCR upload failed', error);
      const message = error?.message || 'No se pudo procesar el documento. Intenta nuevamente.';
      Alert.alert('Error', message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>1) Captura del documento</Text>
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.btnText}>Seleccionar foto del documento</Text>
      </TouchableOpacity>
      {result && <Text style={styles.resultText}>OCR: {JSON.stringify(result, null, 2)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D8D5',
    marginBottom: 16,
  },
  header: { fontWeight: '700', marginBottom: 8, color: BRAND_TEXT, fontSize: 16 },
  preview: { width: 240, height: 160, marginBottom: 8, borderRadius: 8 },
  button: { backgroundColor: BRAND_PRIMARY, padding: 12, borderRadius: 10 },
  btnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600' },
  resultText: { marginTop: 8, color: BRAND_ACCENT },
});
