import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  buildDemoRecommendation,
  buildDisabledRecommendation,
} from '../ai/ai.insights';

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
      message: 'Daily digest job accepted for the graduation demo pipeline.',
    };
  }

  @Post('weekly-ai-summary')
  runWeeklyAiSummary(@Headers('x-job-secret') secret: string | undefined) {
    this.assertJobSecret(secret);

    const residentId = process.env.DEMO_RESIDENT_ID ?? 'demo-resident';
    if (!isAiEnabled()) {
      return {
        status: 'skipped',
        job: 'weekly-ai-summary',
        timestamp: new Date().toISOString(),
        recommendation: buildDisabledRecommendation(residentId),
      };
    }

    return {
      status: 'ok',
      job: 'weekly-ai-summary',
      timestamp: new Date().toISOString(),
      recommendation: buildDemoRecommendation(residentId),
    };
  }
}
