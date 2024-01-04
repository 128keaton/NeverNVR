import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Novu } from '@novu/node';
import novuConfig from '../novu.config';

@Injectable()
export class NovuMessagesService {
  private novu: Novu;

  constructor(
    @Inject(novuConfig.KEY)
    private config: ConfigType<typeof novuConfig>,
  ) {
    this.novu = new Novu(config.key);
  }

  /**
   * Trigger an email notification
   * @param eventID
   * @param subscriberID
   * @param email
   * @param payload
   */
  triggerEmail(
    eventID: string,
    subscriberID: string,
    email: string,
    payload: any,
  ) {
    return this.novu.trigger(eventID, {
      tenant: this.config.tenantID,
      to: {
        subscriberId: subscriberID,
        email,
      },
      payload,
    });
  }

  /**
   * Trigger phone and email notification
   * @param eventID
   * @param subscriberID
   * @param email
   * @param phone
   * @param payload
   */
  trigger(
    eventID: string,
    subscriberID: string,
    email: string,
    phone: string | undefined,
    payload: any,
  ) {
    return this.novu.trigger(eventID, {
      tenant: this.config.tenantID,
      to: {
        subscriberId: subscriberID,
        email,
        phone,
      },
      payload,
    });
  }
}
