import {
  Controller,
  Post,
  Headers,
  Inject,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

const isAiEnabled = (): boolean => process.env.AI_ENABLED === 'true';

@Controller('jobs')
export class JobsController {
  constructor(@Optional() @Inject(PG_POOL) private readonly pool?: Pool) {}

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

  @Post('volunteer-public-links/cleanup')
  async cleanupVolunteerPublicLinks(
    @Headers('x-job-secret') secret: string | undefined,
  ) {
    this.assertJobSecret(secret);

    if (!this.pool) {
      return {
        status: 'skipped',
        job: 'volunteer-public-links-cleanup',
        timestamp: new Date().toISOString(),
        reason: 'Database pool is not available',
      };
    }

    const result = await this.pool.query(
      `UPDATE volunteer_public_links
          SET revoked_at = NOW()
        WHERE revoked_at IS NULL
          AND expires_at <= NOW()
        RETURNING token`,
    );

    return {
      status: 'ok',
      job: 'volunteer-public-links-cleanup',
      timestamp: new Date().toISOString(),
      revoked: result.rowCount ?? 0,
    };
  }
}
