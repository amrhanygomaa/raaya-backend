import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';

const isAiEnabled = (): boolean => process.env.AI_ENABLED === 'true';

@Controller('jobs')
export class JobsController {
  private assertJobSecret(secret: string | undefined): void {
    const expectedSecret = process.env.JOB_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid job secret');
    }
  }

  @Post('medication-reminder')
  runMedicationReminder(@Headers('x-job-secret') secret: string | undefined) {
    this.assertJobSecret(secret);

    return {
      status: 'ok',
      job: 'medication-reminder',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('daily-digest')
  runDailyDigest(@Headers('x-job-secret') secret: string | undefined) {
    this.assertJobSecret(secret);

    return {
      status: 'ok',
      job: 'daily-digest',
      timestamp: new Date().toISOString(),
      message: 'Daily digest job accepted.',
    };
  }

  @Post('weekly-ai-summary')
  runWeeklyAiSummary(@Headers('x-job-secret') secret: string | undefined) {
    this.assertJobSecret(secret);

    const residentId = process.env.AI_SUMMARY_RESIDENT_ID;
    if (!residentId) {
      return {
        status: 'skipped',
        job: 'weekly-ai-summary',
        timestamp: new Date().toISOString(),
        reason: 'AI_SUMMARY_RESIDENT_ID is not configured',
      };
    }
    if (!isAiEnabled()) {
      return {
        status: 'skipped',
        job: 'weekly-ai-summary',
        timestamp: new Date().toISOString(),
        residentId,
        reason: 'AI_ENABLED is not true',
      };
    }

    return {
      status: 'ok',
      job: 'weekly-ai-summary',
      timestamp: new Date().toISOString(),
      residentId,
    };
  }
}
