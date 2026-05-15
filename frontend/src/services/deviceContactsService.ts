import { normalizePhoneNumber } from '@/utils/phone';

export interface DeviceContactOption {
  id: string;
  name: string;
  phoneNumber: string;
  normalizedPhone: string;
}

export interface ContactsPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
}

export class ContactsPermissionError extends Error {
  canAskAgain: boolean;

  constructor(message: string, canAskAgain: boolean) {
    super(message);
    this.name = 'ContactsPermissionError';
    this.canAskAgain = canAskAgain;
  }
}

const dedupeContacts = (contacts: DeviceContactOption[]): DeviceContactOption[] => {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    if (!contact.normalizedPhone || seen.has(contact.normalizedPhone)) {
      return false;
    }
    seen.add(contact.normalizedPhone);
    return true;
  });
};

export const deviceContactsService = {
  async ensurePermission(): Promise<ContactsPermissionResult> {
    const Contacts = await import('expo-contacts');
    const current = await Contacts.getPermissionsAsync();

    if (current.granted) {
      return {
        granted: true,
        canAskAgain: current.canAskAgain ?? true,
      };
    }

    const next =
      current.canAskAgain === false ? current : await Contacts.requestPermissionsAsync();

    return {
      granted: next.granted,
      canAskAgain: next.canAskAgain ?? false,
    };
  },

  async getSelectableContacts(): Promise<DeviceContactOption[]> {
    const Contacts = await import('expo-contacts');
    const permission = await this.ensurePermission();
    if (!permission.granted) {
      throw new ContactsPermissionError(
        permission.canAskAgain
          ? 'Contacts permission is required to import trusted people from your phone.'
          : 'Contacts permission is turned off. Please enable it from app settings to import trusted people.',
        permission.canAskAgain,
      );
    }

    const response = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });

    const mapped = response.data.flatMap((contact) => {
      const name = contact.name?.trim() || 'Unnamed contact';
      return (contact.phoneNumbers || [])
        .map((entry, index) => {
          const phoneNumber = entry.number?.trim() || '';
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          if (!normalizedPhone) {
            return null;
          }

          return {
            id: `${contact.id}:${index}`,
            name,
            phoneNumber,
            normalizedPhone,
          } satisfies DeviceContactOption;
        })
        .filter((entry): entry is DeviceContactOption => !!entry);
    });

    return dedupeContacts(mapped);
  },
};
