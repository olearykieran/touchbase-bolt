import { create } from 'zustand';
import { supabase } from './supabase';
import { addDays, addWeeks, addMonths } from 'date-fns';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastContact: Date;
  nextContact: Date;
  reminderInterval: string;
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

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== contactId),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addContact: async (contact) => {
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

      const { firstContactDate, ...contactDataToInsert } = contact;

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contactDataToInsert,
          user_id: user.id,
          last_contact: lastContact.toISOString(),
          next_contact: nextContactDate.toISOString(),
          reminder_interval: reminderInterval,
        })
        .select()
        .single();

      if (error) throw error;

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
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateLastContact: async (contactId) => {
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const lastContact = new Date();

      const { data, error } = await supabase
        .from('contacts')
        .update({
          last_contact: lastContact.toISOString(),
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
