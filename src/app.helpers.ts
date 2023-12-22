import { join } from 'path';

export class AppHelpers {
  static getFileKey(
    fileName: string,
    cameraName: string,
    type: '.mp4' | '.jpeg',
  ) {
    return join(this.getBucketDirectory(fileName, cameraName, type), fileName);
  }

  static getBucketDirectory(
    fileName: string,
    cameraName: string,
    type: '.mp4' | '.jpeg',
  ) {
    const rawDateString = fileName
      .replace(`${cameraName}-`, '')
      .replace(type, '')
      .split('_');

    const yearMonthDay = rawDateString[0];
    const typeDirectory = type === '.mp4' ? 'clips' : 'snapshots';
    return join(yearMonthDay, cameraName, typeDirectory);
  }

  static getDateFromFilename(
    fileName: string,
    cameraName: string,
    type: '.mp4' | '.jpeg',
  ) {
    const rawDateString = fileName
      .replace(`${cameraName}-`, '')
      .replace(type, '')
      .split('_');

    const yearMonthDay = rawDateString[0];
    const [hours, minutes, seconds] = rawDateString[1].split('-');

    const dateString = `${yearMonthDay}T${hours}:${minutes}:${seconds}.000Z`;

    return new Date(dateString);
  }

  public static validateUserID(userID: string) {
    const uuidRegex =
      /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

    return uuidRegex.test(userID);
  }
}
