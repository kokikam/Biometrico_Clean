import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import DocumentCapture from './src/components/DocumentCapture';
import SelfieCapture from './src/components/SelfieCapture';
import Survey from './src/components/Survey';

const MARRIOTT_RED = '#8E1537';
const MARRIOTT_LIGHT = '#F8F4F1';
const MARRIOTT_DARK = '#3F0614';
const MARRIOTT_ACCENT = '#C5304F';
const LOGO_URI =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Marriott_logo.svg/512px-Marriott_logo.svg.png';
const WALLET_ICON_URI =
  'https://developer.apple.com/design/human-interface-guidelines/images/shared-apple-wallet-icon.png';

const createCheckId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `CHK-${stamp}-${random}`;
};

export default function App() {
  const [step, setStep] = useState(1);
  const [showTest, setShowTest] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [checkId, setCheckId] = useState(null);
  const [verificationDetails, setVerificationDetails] = useState(null);

  const firstName = useMemo(() => {
    if (!ocrResult?.nombre) return null;
    return ocrResult.nombre.trim().split(/\s+/)[0];
  }, [ocrResult]);

  const handleVerificationComplete = (payload) => {
    const id = payload?.checkId || createCheckId();
    setCheckId(id);
    setVerificationDetails(payload);
    setStep(3);
  };

  const resetFlow = () => {
    setStep(1);
    setOcrResult(null);
    setCheckId(null);
    setVerificationDetails(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URI }} resizeMode="contain" style={styles.logo} />
          <View>
            <Text style={styles.title}>Onboarding Biometrico</Text>
            <Text style={styles.subtitle}>Marriott Bonvoy · Prototype</Text>
          </View>
        </View>

        {step === 1 && (
          <DocumentCapture
            onSuccess={(res) => {
              setOcrResult(res);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <SelfieCapture userName={ocrResult?.nombre} onVerificationComplete={handleVerificationComplete} />
        )}

        {step === 3 && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Verificación completada</Text>
            {firstName ? (
              <Text style={styles.successSubtitle}>¡Gracias, {firstName}! Tu identidad ha sido validada.</Text>
            ) : (
              <Text style={styles.successSubtitle}>Tu identidad ha sido validada exitosamente.</Text>
            )}

            <View style={styles.uidBadge}>
              <Text style={styles.uidLabel}>Identificador de validación</Text>
              <Text style={styles.uidValue}>{checkId}</Text>
            </View>

            <View style={styles.walletCard}>
              <Image source={{ uri: WALLET_ICON_URI }} style={styles.walletIcon} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.walletTitle}>Llave digital lista</Text>
                <Text style={styles.walletCaption}>
                  Añádela a Apple Wallet en cuanto esté disponible en la app oficial.
                </Text>
              </View>
            </View>

            {verificationDetails?.liveness?.metrics ? (
              <View style={styles.metrics}>
                <Text style={styles.metricsLabel}>Resumen liveness</Text>
                <Text style={styles.metricsValue}>
                  {JSON.stringify(verificationDetails.liveness.metrics, null, 2)}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={() => setStep(4)}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comparte tu experiencia</Text>
            <Survey
              onDone={() => {
                Alert.alert('Gracias', 'Encuesta enviada');
                resetFlow();
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: MARRIOTT_LIGHT },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logo: { width: 90, height: 40, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: MARRIOTT_DARK },
  subtitle: { fontSize: 14, color: MARRIOTT_ACCENT, marginTop: 2 },
  button: { backgroundColor: MARRIOTT_RED, padding: 12, borderRadius: 10, marginTop: 12 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MARRIOTT_ACCENT,
  },
  secondaryButtonText: { color: MARRIOTT_ACCENT, textAlign: 'center', fontWeight: '600' },
  testWrapper: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2D8D5',
  },
  card: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D8D5',
    marginBottom: 16,
  },
  cardTitle: { fontWeight: '700', fontSize: 16, color: MARRIOTT_DARK, marginBottom: 8 },
  successCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2D8D5',
    marginBottom: 16,
  },
  successTitle: { fontWeight: '700', fontSize: 20, color: MARRIOTT_DARK, marginBottom: 6 },
  successSubtitle: { color: MARRIOTT_ACCENT, marginBottom: 16 },
  uidBadge: {
    backgroundColor: '#F3E8EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2D8D5',
  },
  uidLabel: { fontSize: 12, color: MARRIOTT_DARK, marginBottom: 4 },
  uidValue: { fontSize: 18, fontWeight: '700', color: MARRIOTT_RED, letterSpacing: 1 },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2D8D5',
    marginBottom: 16,
  },
  walletIcon: { width: 56, height: 56, marginRight: 16 },
  walletTitle: { fontWeight: '700', color: MARRIOTT_DARK, marginBottom: 4 },
  walletCaption: { color: '#6B4C57' },
  metrics: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FAF6F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2D8D5',
  },
  metricsLabel: { fontWeight: '600', color: MARRIOTT_DARK, marginBottom: 4 },
  metricsValue: { fontFamily: 'Courier', color: MARRIOTT_ACCENT },
});
