import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react-native';

const DEMO_MESSAGES = [
  {
    id: '1',
    contactName: 'Alice Johnson',
    suggestedMessage: "Hey Alice! It's been a while since we caught up. How's the new job going?",
    lastContact: '2024-01-15',
  },
  {
    id: '2',
    contactName: 'Bob Smith',
    suggestedMessage: "Hi Bob! Just wanted to check in and see how you're doing. Would love to grab coffee soon!",
    lastContact: '2024-01-10',
  },
];

export default function MessagesScreen() {
  const [messages] = useState(DEMO_MESSAGES);

  const renderMessage = ({ item }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <MessageCircle size={24} color="#007AFF" />
        <Text style={styles.contactName}>{item.contactName}</Text>
      </View>
      <Text style={styles.messageText}>{item.suggestedMessage}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.lastContact}>Last contact: {item.lastContact}</Text>
        <TouchableOpacity style={styles.sendButton}>
          <Send size={20} color="white" />
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  list: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#000',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastContact: {
    fontSize: 14,
    color: '#666',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
});