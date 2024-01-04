import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Novu } from '@novu/node';
import novuConfig from '../novu.config';
import { IUpdateSubscriberPreferencePayload } from '@novu/node/build/main/lib/subscribers/subscriber.interface';
import { NovuPaginationResponse, NovuResponse } from '../responses';
import { Subscriber, Preference } from '../types';

@Injectable()
export class NovuSubscribersService {
  private novu: Novu;

  constructor(
    @Inject(novuConfig.KEY)
    private config: ConfigType<typeof novuConfig>,
  ) {
    this.novu = new Novu(config.key);
  }

  /**
   * Update a subscriber's phone number
   * @param subscriberID
   * @param phone
   */
  updatePhoneNumber(subscriberID: string, phone: string) {
    return this.novu.subscribers.update(subscriberID, {
      phone,
    });
  }

  /**
   * Update a subscriber's email address
   * @param subscriberID
   * @param email
   */
  updateEmailAddress(subscriberID: string, email: string) {
    return this.novu.subscribers.update(subscriberID, {
      email,
    });
  }

  /**
   * Associate a subscriber's details with their subscriber ID
   * @param subscriberID
   * @param email
   * @param firstName
   * @param lastName
   */
  initialIdentification(
    subscriberID: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    return this.novu.subscribers
      .identify(subscriberID, {
        firstName,
        lastName,
        email,
      })
      .catch((error) => {
        throw new HttpException(error.response.data, error.response.status);
      });
  }

  /**
   * Update a subscriber's details
   * @param subscriberID
   * @param email
   * @param phone
   * @param firstName
   * @param lastName
   */
  update(
    subscriberID: string,
    email: string,
    phone: string | null,
    firstName: string,
    lastName: string,
  ) {
    return this.novu.subscribers
      .update(subscriberID, {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
      })
      .then((response) => response.data as Subscriber)
      .catch((error) => {
        throw new HttpException(error.response.data, error.response.status);
      });
  }

  /**
   * Delete a subscriber completely
   * @param subscriberID
   */
  delete(subscriberID: string) {
    return this.novu.subscribers.delete(subscriberID);
  }

  /**
   * Get a subscriber by subscriber's ID
   * @param subscriberID
   */
  get(subscriberID: string) {
    return this.novu.subscribers
      .get(subscriberID)
      .then((response) => response.data as Subscriber);
  }

  /**
   * Check if a subscriber exists by subscriber's ID
   * @param subscriberID
   */
  exists(subscriberID: string) {
    return this.novu.subscribers
      .get(subscriberID)
      .catch(() => false)
      .then((response) => !!response);
  }

  /**
   * Get subscriber's notification preferences
   * @param subscriberID
   */
  getPreferences(subscriberID: string) {
    return this.novu.subscribers
      .getPreference(subscriberID)
      .then((response) => response.data as NovuResponse<Preference>)
      .then((response) =>
        response.data.filter((preference) => preference.template.critical),
      );
  }

  /**
   * Update a subscriber's notification preferences
   * @param subscriberID
   * @param templateID
   * @param payload
   */
  updatePreferences(
    subscriberID: string,
    templateID: string,
    payload: IUpdateSubscriberPreferencePayload,
  ) {
    return this.novu.subscribers.updatePreference(
      subscriberID,
      templateID,
      payload,
    );
  }

  /**
   * List the subscribers
   * @param pageNumber
   * @param limit
   */
  listSubscribers(pageNumber = 1, limit = 150) {
    return this.novu.subscribers
      .list(pageNumber, limit)
      .then((response) => response.data as NovuPaginationResponse<Subscriber>)
      .catch((error) => {
        throw new HttpException(error.response.data, error.response.status);
      });
  }
}
