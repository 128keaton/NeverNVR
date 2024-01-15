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
    clipIDs: string[],
    snapshotIDs: string[],
  ): Promise<Timeline[]> {
    const timeline: Timeline[] = [];
    const clips = await this.clipsService.getClipsList(clipIDs, true);
    const cameras: { name?: string; id: string }[] = [];
    const items: { [key: string]: TimelineItem[] } = {};

    let snapshots = await this.snapshotsService.getSnapshotsList(
      snapshotIDs,
      true,
    );

    for (const clip of clips) {
      const clipURL = await this.clipsService
        .getClipDownloadURL(clip.id, clip.analyzed)
        .catch(() => this.clipsService.getClipDownloadURL(clip.id, false))
        .then((result) => result.url);

      let camera = cameras.find((camera) => camera.id === clip.cameraID);

      if (!camera) {
        cameras.push(clip.camera);
        camera = clip.camera;
      }

      const item = new TimelineItem(clip.start, clip.end);
      item.clipURL = clipURL;
      item.tags = clip.tags;
      item.primaryTag = clip.primaryTag;

      const snapshot = snapshots.find((snap) => {
        return (
          snap.timestamp >= clip.start &&
          snap.timestamp <= clip.end &&
          snap.cameraID === clip.cameraID
        );
      });

      if (!!snapshot) {
        item.snapshotURL = await this.snapshotsService
          .getSnapshotDownloadURL(snapshot.id, snapshot.analyzed)
          .catch(() =>
            this.snapshotsService.getSnapshotDownloadURL(snapshot.id, false),
          )
          .then((result) => result.url);

        if (!item.primaryTag) item.primaryTag = snapshot.primaryTag;
        if (!item.tags || !item.tags.length) item.tags = snapshot.tags;

        snapshots = snapshots.filter((snap) => snap.id !== snapshot.id);
      }

      if (!!items.hasOwnProperty(camera.id)) items[camera.id].push(item);
      else items[camera.id] = [item];
    }

    // Iterate through remaining snapshots
    for (const snapshot of snapshots) {
      const item = new TimelineItem(snapshot.timestamp, snapshot.timestamp);
      item.snapshotURL = await this.snapshotsService
        .getSnapshotDownloadURL(snapshot.id, snapshot.analyzed)
        .catch(() =>
          this.snapshotsService.getSnapshotDownloadURL(snapshot.id, false),
        )
        .then((result) => result.url);

      let camera = cameras.find((camera) => camera.id === snapshot.cameraID);

      if (!camera) {
        cameras.push(snapshot.camera);
        camera = snapshot.camera;
      }

      item.primaryTag = snapshot.primaryTag;
      item.tags = snapshot.tags;

      if (!!items.hasOwnProperty(camera.id)) items[camera.id].push(item);
      else items[camera.id] = [item];
    }

    Object.keys(items).forEach((key) => {
      const timelineItems = items[key];

      items[key] = timelineItems.sort((a, b) => {
        return a.start.getTime() - b.start.getTime();
      });

      const start = timelineItems[0].start;
      const end = timelineItems[timelineItems.length - 1].end;
      const camera = cameras.find((cam) => cam.id === key);

      if (!!camera)
        timeline.push({
          start,
          end,
          items: timelineItems,
          camera,
        });
    });

    return timeline;
  }
}
