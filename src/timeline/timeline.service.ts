import { Injectable } from '@nestjs/common';
import { Timeline, TimelineItem } from './types';
import { ClipsService } from '../clips/clips.service';
import { SnapshotsService } from '../snapshots/snapshots.service';

@Injectable()
export class TimelineService {
  constructor(
    private clipsService: ClipsService,
    private snapshotsService: SnapshotsService,
  ) {}

  async getTimeline(
    cameraID: string,
    clipIDs: string[],
    snapshotIDs: string[],
  ): Promise<Timeline> {
    const clips = await this.clipsService.getClipsList(cameraID, clipIDs);
    let items: TimelineItem[] = [];

    let snapshots = await this.snapshotsService.getSnapshotsList(
      cameraID,
      snapshotIDs,
    );

    for (const clip of clips) {
      const clipURL = await this.clipsService
        .getClipDownloadURL(clip.id, clip.analyzed)
        .then((result) => result.url);

      const item = new TimelineItem(clip.start, clip.end);
      item.clipURL = clipURL;

      const snapshot = snapshots.find((snap) => {
        return snap.timestamp >= clip.start && snap.timestamp <= clip.end;
      });

      if (!!snapshot) {
        item.snapshotURL = await this.snapshotsService
          .getSnapshotDownloadURL(snapshot.id, snapshot.analyzed)
          .then((result) => result.url);

        snapshots = snapshots.filter((snap) => snap.id !== snapshot.id);
      }

      items.push(item);
    }

    // Iterate through remaining snapshots
    for (const snapshot of snapshots) {
      const item = new TimelineItem(snapshot.timestamp, snapshot.timestamp);
      item.snapshotURL = await this.snapshotsService
        .getSnapshotDownloadURL(snapshot.id, snapshot.analyzed)
        .then((result) => result.url);

      items.push(item);
    }

    items = items.sort((a, b) => {
      return a.start.getTime() - b.start.getTime();
    });

    const start = items[0].start;
    const end = items[items.length - 1].end;

    return {
      start,
      end,
      items,
      cameraID,
    };
  }
}
