import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { TimelapseService } from "./timelapse.service";

@Processor('timelapse')
export class TimelapseQueue {

  constructor(private timelapseService: TimelapseService) {
  }

  @Process('finished')
  async timelapseFinished(job: Job<{jobID: string, outputFilename: string}>) {
    const timelapse = await this.timelapseService.getByJobID(
      job.data.jobID,
    );

    if (!timelapse) return;


    return this.timelapseService.update(timelapse.id, {
      generating: false,
      fileName: job.data.outputFilename
    });
  }
}
