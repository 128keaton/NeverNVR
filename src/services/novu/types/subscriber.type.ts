export interface Subscriber {
  _id: string;
  _organizationId: string;
  _environmentId: string;
  firstName: string;
  lastName: string;
  subscriberId: string;
  email: string;
  phone: string;
  data: { [key: string]: string };
  channels: {
    credentials: { deviceTokens?: string[]; webhookUrl?: string };
    _integrationId: string;
    providerId: string;
  }[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  isOnline: boolean;
  lastOnlineAt: string;
  avatar: string;
  id: string;
}
