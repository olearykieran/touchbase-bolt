export interface NotificationTrigger {
  id: string;
  contactId: string;
  lastContactDate: Date;
  nextContactDate: Date;
  isActive: boolean;
}
