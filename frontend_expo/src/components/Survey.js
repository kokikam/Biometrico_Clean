import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { submitSurvey } from '../api';

const BRAND_PRIMARY = '#8E1537';
const BRAND_TEXT = '#3F0614';

export default function Survey({ onDone }) {
  const [rating, setRating] = useState('5');
  const [feedback, setFeedback] = useState('');

  async function send() {
    const response = await submitSurvey('Usuario Demo', parseInt(rating, 10), feedback);
    if (response) {
      Alert.alert('Gracias', 'Encuesta enviada');
      if (onDone) {
        onDone();
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Encuesta post prueba</Text>
      <Text style={styles.label}>Calificacion (1-5)</Text>
      <TextInput value={rating} onChangeText={setRating} keyboardType="numeric" style={styles.input} />
      <Text style={styles.label}>Comentarios</Text>
      <TextInput
        value={feedback}
        onChangeText={setFeedback}
        multiline
        style={[styles.input, styles.textArea]}
        placeholder="Tu experiencia con el proceso biometrico"
      />
      <TouchableOpacity style={styles.button} onPress={send}>
        <Text style={styles.buttonText}>Enviar encuesta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 16 },
  title: { fontWeight: '700', fontSize: 16, marginBottom: 12, color: BRAND_TEXT },
  label: { fontWeight: '500', marginTop: 8, color: BRAND_TEXT },
  input: { borderWidth: 1, borderColor: '#E2D8D5', borderRadius: 10, padding: 10, marginTop: 6 },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: BRAND_PRIMARY, padding: 12, borderRadius: 10, marginTop: 16 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600' },
});
