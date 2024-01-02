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
}
