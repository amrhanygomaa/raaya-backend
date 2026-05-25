import { UnauthorizedException } from '@nestjs/common';
import { JobsController } from './jobs.controller';

describe('JobsController', () => {
  const originalJobSecret = process.env.JOB_SECRET;
  const originalAiEnabled = process.env.AI_ENABLED;
  const originalAiSummaryResidentId = process.env.AI_SUMMARY_RESIDENT_ID;

  beforeEach(() => {
    process.env.JOB_SECRET = 'test-secret';
    process.env.AI_SUMMARY_RESIDENT_ID = 'resident-demo';
  });

  afterEach(() => {
    if (originalJobSecret === undefined) {
      delete process.env.JOB_SECRET;
    } else {
      process.env.JOB_SECRET = originalJobSecret;
    }

    if (originalAiEnabled === undefined) {
      delete process.env.AI_ENABLED;
    } else {
      process.env.AI_ENABLED = originalAiEnabled;
    }

    if (originalAiSummaryResidentId === undefined) {
      delete process.env.AI_SUMMARY_RESIDENT_ID;
    } else {
      process.env.AI_SUMMARY_RESIDENT_ID = originalAiSummaryResidentId;
    }
  });

  it('rejects jobs without the configured secret', () => {
    const controller = new JobsController();
    expect(() => controller.runMedicationReminder(undefined)).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.runMedicationReminder('wrong-secret')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects jobs if JOB_SECRET is not configured', () => {
    delete process.env.JOB_SECRET;
    const controller = new JobsController();
    expect(() => controller.runMedicationReminder(undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts medication reminder jobs with the configured secret', () => {
    const controller = new JobsController();
    expect(controller.runMedicationReminder('test-secret')).toMatchObject({
      status: 'ok',
      job: 'medication-reminder',
    });
  });

  it('accepts daily digest jobs with the configured secret', () => {
    const controller = new JobsController();
    expect(controller.runDailyDigest('test-secret')).toMatchObject({
      status: 'ok',
      job: 'daily-digest',
    });
  });

  it('skips weekly AI summary when AI_SUMMARY_RESIDENT_ID is not configured', () => {
    delete process.env.AI_SUMMARY_RESIDENT_ID;
    process.env.AI_ENABLED = 'true';
    const controller = new JobsController();
    expect(controller.runWeeklyAiSummary('test-secret')).toMatchObject({
      status: 'skipped',
      job: 'weekly-ai-summary',
      reason: 'AI_SUMMARY_RESIDENT_ID is not configured',
    });
  });

  it('skips weekly AI summary jobs when AI is disabled', () => {
    process.env.AI_ENABLED = 'false';
    const controller = new JobsController();
    expect(controller.runWeeklyAiSummary('test-secret')).toMatchObject({
      status: 'skipped',
      job: 'weekly-ai-summary',
      reason: 'AI_ENABLED is not true',
    });
  });

  it('accepts weekly AI summary jobs when AI is enabled', () => {
    process.env.AI_ENABLED = 'true';
    const controller = new JobsController();
    expect(controller.runWeeklyAiSummary('test-secret')).toMatchObject({
      status: 'ok',
      job: 'weekly-ai-summary',
      residentId: 'resident-demo',
    });
  });

  it('revokes expired volunteer public links', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({ rowCount: 3 }),
    };
    const controller = new JobsController(pool as any);

    await expect(
      controller.cleanupVolunteerPublicLinks('test-secret'),
    ).resolves.toMatchObject({
      status: 'ok',
      job: 'volunteer-public-links-cleanup',
      revoked: 3,
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('volunteer_public_links'),
    );
  });
});
