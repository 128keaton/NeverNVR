import { join } from 'path';

export class AppHelpers {
  static getFileKey(
    fileName: string,
    cameraID: string,
    type: '.mp4' | '.jpeg',
  ) {
    return join(this.getBucketDirectory(fileName, cameraID, type), fileName);
  }

  static getBucketDirectory(
    fileName: string,
    cameraID: string,
    type: '.mp4' | '.jpeg',
  ) {
    const rawDateString = fileName
      .replace(`${cameraID}-`, '')
      .replace(type, '')
      .split('_');

    const yearMonthDay = rawDateString[0];
    const typeDirectory = type === '.mp4' ? 'clips' : 'snapshots';
    return join(yearMonthDay, cameraID, typeDirectory);
  }

  static getGeneratedAlarmBucketDirectory(fileName: string, cameraID: string) {
    const rawDateString = fileName
      .replace(`${cameraID}-`, '')
      .replace('alarm', '')
      .split('_');

    const yearMonthDay = rawDateString[0];
    return join(yearMonthDay, cameraID, 'alarms');
  }

  static handleTagsFilter(tags: string[] | string | undefined, where: any) {
    if (!!tags && tags.length) {
      if (Array.isArray(tags)) {
        if (tags.length === 1) {
          return {
            ...where,
            tags: {
              has: tags[0],
            },
          };
        } else {
          return {
            ...where,
            tags: {
              hasEvery: tags,
            },
          };
        }
      } else {
        tags = (tags as string).split(',');

        if (tags.length === 1) {
          return {
            ...where,
            tags: {
              has: tags[0],
            },
          };
        } else {
          return {
            ...where,
            tags: {
              hasEvery: tags,
            },
          };
        }
      }
    }

    return where;
  }

  public static validateUserID(userID: string) {
    const uuidRegex =
      /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

    return uuidRegex.test(userID);
  }
}
