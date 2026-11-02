import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled mobile app error:', error);
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.brand}>DandoEv</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>The app hit an unexpected error. Your account and payments are safe. Please try again.</Text>
        <TouchableOpacity style={styles.button} onPress={this.retry} accessibilityRole="button">
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F6F7FC' },
  brand: { color: '#2E3192', fontSize: 18, fontWeight: '800', marginBottom: 28 },
  title: { color: '#0A154F', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  message: { color: '#64748B', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360, marginBottom: 24 },
  button: { backgroundColor: '#2E3192', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
