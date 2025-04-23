import { create } from 'zustand';
import { supabase } from './supabase';
import { addDays, addWeeks, addMonths } from 'date-fns';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastContact: Date;
  nextContact: Date;
  reminderInterval: string;
  streak?: number;
}

interface ContactStore {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  addContact: (
    contact: Omit<Contact, 'id' | 'lastContact' | 'nextContact'> & {
      firstContactDate?: Date;
      birthday?: string;
    }
  ) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
  updateLastContact: (contactId: string) => Promise<void>;
  updateReminderInterval: (
    contactId: string,
    interval: string
  ) => Promise<void>;
  setError: (error: string | null) => void; // Add setError interface
  clearError: () => void;
}

const getReminderInterval = (frequency: Contact['frequency']): string => {
  switch (frequency) {
    case 'daily':
      return '1 day';
    case 'weekly':
      return '7 days';
    case 'monthly':
      return '1 month';
    case 'quarterly':
      return '3 months';
    default:
      return '7 days';
  }
};

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  setError: (error) => {
    set({ error });
  },

  fetchContacts: async () => {
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('next_contact', { ascending: true });

      if (error) throw error;

      set({
        contacts: data.map((contact) => ({
          ...contact,
          lastContact: new Date(contact.last_contact),
          nextContact: new Date(contact.next_contact),
          reminderInterval: contact.reminder_interval,
        })),
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteContact: async (contactId) => {
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      console.log(`[deleteContact] Attempting to decrement count for user: ${user.id}`);
      // *** ADDED STEP: Decrement the count using RPC ***
      const { error: decrementError } = await supabase
        .rpc('decrement_contact_count', { p_user_id: user.id });

      if (decrementError) {
        // Log the error but proceed with UI update for better UX
        // The count might be temporarily wrong, but the contact is gone
        console.error(`[deleteContact] Failed to decrement contact count for user ${user.id}:`, decrementError);
        // Optionally: Set a different kind of error state?
        // set({ error: 'Contact deleted, but count update failed.' });
      } else {
        console.log(`[deleteContact] Successfully decremented count for user: ${user.id}`);
      }

      // 2. Update local state
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== contactId),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addContact: async (contact) => {
    // Set initial state immediately
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const lastContact = new Date();
      const reminderInterval = getReminderInterval(contact.frequency);

      let nextContactDate: Date;
      if (contact.firstContactDate) {
        nextContactDate = contact.firstContactDate;
      } else {
        const now = new Date();
        switch (contact.frequency) {
          case 'daily':
            nextContactDate = addDays(now, 1);
            break;
          case 'weekly':
            nextContactDate = addWeeks(now, 1);
            break;
          case 'monthly':
            nextContactDate = addMonths(now, 1);
            break;
          case 'quarterly':
            nextContactDate = addMonths(now, 3);
            break;
          default:
            nextContactDate = addWeeks(now, 1);
        }
      }

      const { firstContactDate, ...contactDataToSend } = contact;
      const payload = {
        ...contactDataToSend,
        last_contact: lastContact.toISOString(),
        next_contact: nextContactDate.toISOString(),
        reminder_interval: reminderInterval,
      };

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) throw sessionError || new Error('Not authenticated');

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/add-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 402) {
        const errorData = await response.json();
        // Set the error, loading will be handled by finally
        set({ error: errorData.details || 'Payment required' });
        // Don't set loading: false here, let finally do it
        return; // Exit early for payment required
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to add contact');
      }

      // Success case:
      const { contact: data } = await response.json();
      set((state) => ({
        contacts: [
          ...state.contacts,
          {
            ...data,
            lastContact: new Date(data.last_contact),
            nextContact: new Date(data.next_contact),
            reminderInterval: data.reminder_interval,
          },
        ],
        error: null, // Ensure error is null on success
        // loading: false will be handled by finally
      }));

    } catch (error) {
      // Set error state, loading will be handled by finally
      set({ error: (error as Error).message });
      // Don't set loading: false here
    } finally {
      // This block ALWAYS runs
      set({ loading: false });
    }
  },

  updateLastContact: async (contactId) => {
    const currentState = get();
    const contact = currentState.contacts.find((c) => c.id === contactId);

    if (!contact) {
      console.error(`Contact with ID ${contactId} not found in store.`);
      set({ error: `Contact with ID ${contactId} not found.`, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const lastContact = new Date();
      const currentNextContactDate = new Date(contact.nextContact);
      const currentStreak = contact.streak || 0;

      let newStreak = 1;
      if (lastContact <= currentNextContactDate) {
        newStreak = currentStreak + 1;
        console.log(
          `Contact ${contactId}: On time! Streak incremented to ${newStreak}`
        );
      } else {
        console.log(`Contact ${contactId}: Late! Streak reset to 1`);
      }

      const { data, error } = await supabase
        .from('contacts')
        .update({
          last_contact: lastContact.toISOString(),
          streak: newStreak,
        })
        .eq('id', contactId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId
            ? {
                ...c,
                lastContact: new Date(data.last_contact),
                nextContact: new Date(data.next_contact),
                streak: data.streak,
              }
            : c
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateReminderInterval: async (contactId, interval) => {
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contacts')
        .update({
          reminder_interval: interval,
        })
        .eq('id', contactId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contactId
            ? {
                ...c,
                reminderInterval: data.reminder_interval,
                nextContact: new Date(data.next_contact),
              }
            : c
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));
