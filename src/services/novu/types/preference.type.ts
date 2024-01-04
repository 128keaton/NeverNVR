export interface Preference {
  template: {
    _id: string;
    name: string;
    critical: boolean;
  };
  preference: {
    enabled: boolean;
    channels: {
      email: boolean;
      sms: boolean;
    };
  };
}
