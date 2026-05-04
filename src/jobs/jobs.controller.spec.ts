import { UnauthorizedException } from '@nestjs/common';
import { AI_DISABLED_FLAG } from '../ai/ai.insights';
import { AI_HUMAN_REVIEW_FLAG } from '../ai/ai.guardrails';
import { JobsController } from './jobs.controller';

describe('JobsController', () => {
  const originalJobSecret = process.env.JOB_SECRET;
  const originalAiEnabled = process.env.AI_ENABLED;
  const originalDemoResidentId = process.env.DEMO_RESIDENT_ID;

  beforeEach(() => {
    process.env.JOB_SECRET = 'test-secret';
    process.env.DEMO_RESIDENT_ID = 'resident-demo';
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

    if (originalDemoResidentId === undefined) {
      delete process.env.DEMO_RESIDENT_ID;
    } else {
      process.env.DEMO_RESIDENT_ID = originalDemoResidentId;
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

  it('skips weekly AI summary jobs when AI is disabled', () => {
    process.env.AI_ENABLED = 'false';
    const controller = new JobsController();

    expect(controller.runWeeklyAiSummary('test-secret')).toMatchObject({
      status: 'skipped',
      job: 'weekly-ai-summary',
      recommendation: {
        enabled: false,
        residentId: 'resident-demo',
        flag: AI_DISABLED_FLAG,
      },
    });
  });

  it('builds demo weekly AI summaries when AI is enabled', () => {
    process.env.AI_ENABLED = 'true';
    const controller = new JobsController();

    expect(controller.runWeeklyAiSummary('test-secret')).toMatchObject({
      status: 'ok',
      job: 'weekly-ai-summary',
      recommendation: {
        enabled: true,
        residentId: 'resident-demo',
        flag: AI_HUMAN_REVIEW_FLAG,
      },
    });
  });
});
