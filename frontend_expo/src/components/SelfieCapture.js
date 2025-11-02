import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../api';

const BRAND_PRIMARY = '#8E1537';
const BRAND_TEXT = '#3F0614';
const BRAND_SUCCESS = '#1E9E6F';

const createCheckId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `CHK-${stamp}-${random}`;
};

export default function SelfieCapture({ userName, onVerificationComplete }) {
  const firstName = typeof userName === 'string' ? userName.trim().split(/\s+/)[0] : null;
  const [image, setImage] = useState(null);
  const [faceRes, setFaceRes] = useState(null);
  const [livenessRes, setLivenessRes] = useState(null);

  async function takeSelfie() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });

    if (res.cancelled || res.canceled) {
      return;
    }

    const asset = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : res;
    if (!asset || !asset.uri) {
      Alert.alert('Error', 'No se pudo capturar la imagen.');
      return;
    }

    const uploadPayload = {
      uri: asset.uri,
      name: asset.fileName || 'selfie.jpg',
      type: asset.mimeType || 'image/jpeg',
    };

    try {
      setImage(asset.uri);

      const faceResponse = await uploadImage('/face-recognition', uploadPayload);
      setFaceRes(faceResponse);
      if (!faceResponse?.detected) {
        Alert.alert('Rostro no detectado', 'Intenta otra vez con buena iluminacion');
        return;
      }

      const livenessResponse = await uploadImage('/liveness', uploadPayload);
      setLivenessRes(livenessResponse);
      if (livenessResponse?.liveness) {
        const checkId = createCheckId();
        onVerificationComplete?.({
          checkId,
          face: faceResponse,
          liveness: livenessResponse,
        });
      } else {
        Alert.alert('Liveness fallido', 'Vuelve a intentar siguiendo las indicaciones en pantalla.');
      }
    } catch (error) {
      console.error('Selfie upload failed', error);
      Alert.alert('Error', error?.message || 'No se pudo procesar la selfie.');
    }
  }

  return (
    <View style={styles.container}>
      {firstName ? <Text style={styles.welcome}>Bienvenido, {firstName}</Text> : null}
      <Text style={styles.header}>2) Captura selfie para verificacion</Text>
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      <TouchableOpacity style={styles.primaryButton} onPress={takeSelfie}>
        <Text style={styles.buttonText}>Tomar selfie</Text>
      </TouchableOpacity>
      {faceRes && <Text style={styles.resultText}>Face: {JSON.stringify(faceRes)}</Text>}
      {livenessRes && <Text style={styles.resultText}>Liveness: {JSON.stringify(livenessRes)}</Text>}
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
  welcome: { fontWeight: '700', fontSize: 20, color: BRAND_PRIMARY, marginBottom: 6 },
  header: { fontWeight: '700', marginBottom: 8, color: BRAND_TEXT, fontSize: 16 },
  preview: { width: 220, height: 220, borderRadius: 110, marginBottom: 12, alignSelf: 'center' },
  primaryButton: { backgroundColor: BRAND_PRIMARY, padding: 12, borderRadius: 10, marginTop: 8 },
  successButton: { backgroundColor: BRAND_SUCCESS, padding: 12, borderRadius: 10, marginTop: 12 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600' },
  resultText: { marginTop: 8, color: BRAND_PRIMARY },
});
