import { ClipFormat } from '@prisma/client';

export type ClipProperties = {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  duration: number;
  format?: ClipFormat;
  start: Date;
  end?: Date;
};
