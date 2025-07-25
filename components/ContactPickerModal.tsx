import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { X, User, Mail, Phone } from 'lucide-react-native';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
}

export default function ContactPickerModal({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access contacts was denied');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.ID,
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
      });

      const filteredContacts = data
        .filter((contact) =>
          contact.name?.toLowerCase().includes(query.toLowerCase())
        )
        .map((contact) => ({
          id: contact.id || '',
          name: contact.name || 'No Name',
          email: contact.emails?.[0]?.email || undefined,
          phone: contact.phoneNumbers?.[0]?.number || undefined,
        }))
        .slice(0, 50); // Limit results for better performance

      setContacts(filteredContacts);
    } catch (err) {
      setError('Failed to load contacts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      loadContacts(text);
    } else {
      setContacts([]);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => {
        onSelectContact(item);
        onClose();
      }}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <View style={styles.contactDetails}>
          {item.email && (
            <View style={styles.detailRow}>
              <Mail size={14} color="#666" />
              <Text style={styles.detailText}>{item.email}</Text>
            </View>
          )}
          {item.phone && (
            <View style={styles.detailRow}>
              <Phone size={14} color="#666" />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Contact</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
          </View>

          {error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#19e27c" />
            </View>
          ) : contacts.length === 0 ? (
            <View style={styles.centerContainer}>
              <User size={48} color="#666" />
              <Text style={styles.emptyText}>
                {searchQuery.length < 2
                  ? 'Start typing a contact name to search'
                  : 'No contacts found'}
              </Text>
              {searchQuery.length < 2 && (
                <Text style={styles.helpText}>
                  Type at least 2 characters to begin searching
                </Text>
              )}
            </View>
          ) : (
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  list: {
    paddingBottom: 16,
  },
  contactItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  contactDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  helpText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
