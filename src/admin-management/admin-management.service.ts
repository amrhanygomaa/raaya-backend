import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { FacilitySettings, ManagedUser } from './admin-management.schema';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { UpdateFacilitySettingsDto } from './dto/update-facility-settings.dto';

function dateToIso(value: unknown): string | undefined {
  if (!value) return undefined;
  return (value as Date)?.toISOString?.() ?? (value as string);
}

function rowToManagedUser(row: Record<string, unknown>): ManagedUser {
  return {
    id: row.id as string,
    cognitoSub: (row.cognito_sub as string) ?? undefined,
    facilityId: row.facility_id as string,
    email: row.email as string,
    fullName: row.full_name as string,
    role: row.role as ManagedUser['role'],
    status: row.status as ManagedUser['status'],
    createdBy: row.created_by as string,
    disabledBy: (row.disabled_by as string) ?? undefined,
    disabledAt: dateToIso(row.disabled_at),
    createdAt: dateToIso(row.created_at) as string,
    updatedAt: dateToIso(row.updated_at) as string,
  };
}

function rowToFacilitySettings(row: Record<string, unknown>): FacilitySettings {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    medicationReminderMinutesBefore: Number(
      row.medication_reminder_minutes_before,
    ),
    visitReminderHoursBefore: Number(row.visit_reminder_hours_before),
    alertPushEnabled: Boolean(row.alert_push_enabled),
    timezone: row.timezone as string,
    vitalThresholds: (row.vital_thresholds ??
      {}) as FacilitySettings['vitalThresholds'],
    updatedBy: (row.updated_by as string) ?? undefined,
    createdAt: dateToIso(row.created_at) as string,
    updatedAt: dateToIso(row.updated_at) as string,
  };
}

@Injectable()
export class AdminManagementService {
  private readonly logger = new Logger(AdminManagementService.name);
  private readonly cognito: CognitoIdentityProviderClient;
  private readonly userPoolId?: string;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.cognito = new CognitoIdentityProviderClient({
      region:
        process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
  }

  async createUser(
    facilityId: string,
    adminUserId: string,
    dto: CreateManagedUserDto,
  ): Promise<ManagedUser> {
    if (!this.userPoolId) {
      throw new BadRequestException('COGNITO_USER_POOL_ID is not configured');
    }

    const cognitoResult = await this.cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: dto.email,
        TemporaryPassword: dto.temporaryPassword,
        MessageAction: dto.suppressInvite ? 'SUPPRESS' : undefined,
        UserAttributes: [
          { Name: 'email', Value: dto.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: dto.fullName },
          { Name: 'custom:role', Value: dto.role },
          { Name: 'custom:facilityId', Value: facilityId },
        ],
      }),
    );

    const attributes = cognitoResult.User?.Attributes ?? [];
    const cognitoSub =
      attributes.find((attr) => attr.Name === 'sub')?.Value ??
      cognitoResult.User?.Username;

    const sql = `
      INSERT INTO managed_users
        (cognito_sub, facility_id, email, full_name, role, status, created_by)
      VALUES ($1,$2,$3,$4,$5,'active',$6)
      ON CONFLICT (facility_id, email)
      DO UPDATE SET
        cognito_sub = EXCLUDED.cognito_sub,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = 'active',
        disabled_by = NULL,
        disabled_at = NULL
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      cognitoSub ?? null,
      facilityId,
      dto.email,
      dto.fullName,
      dto.role,
      adminUserId,
    ]);

    this.logger.log(`Managed user created: ${dto.email}`);
    return rowToManagedUser(result.rows[0]);
  }

  async findUsers(
    facilityId: string,
    filters?: { status?: string; role?: string },
  ): Promise<ManagedUser[]> {
    let sql = `SELECT * FROM managed_users WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.status) {
      sql += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }
    if (filters?.role) {
      sql += ` AND role = $${idx}`;
      params.push(filters.role);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToManagedUser);
  }

  async disableUser(
    facilityId: string,
    userId: string,
    adminUserId: string,
  ): Promise<ManagedUser> {
    if (!this.userPoolId) {
      throw new BadRequestException('COGNITO_USER_POOL_ID is not configured');
    }

    const existing = await this.pool.query(
      `SELECT * FROM managed_users WHERE id = $1 AND facility_id = $2`,
      [userId, facilityId],
    );

    if (existing.rowCount === 0) {
      throw new NotFoundException(`Managed user ${userId} not found`);
    }

    const user = rowToManagedUser(existing.rows[0]);

    await this.cognito.send(
      new AdminDisableUserCommand({
        UserPoolId: this.userPoolId,
        Username: user.email,
      }),
    );

    const result = await this.pool.query(
      `
        UPDATE managed_users
           SET status = 'disabled',
               disabled_by = $1,
               disabled_at = NOW()
         WHERE id = $2
           AND facility_id = $3
        RETURNING *
      `,
      [adminUserId, userId, facilityId],
    );

    this.logger.log(`Managed user disabled: ${user.email}`);
    return rowToManagedUser(result.rows[0]);
  }

  async getSettings(facilityId: string): Promise<FacilitySettings> {
    const sql = `
      INSERT INTO facility_settings (facility_id)
      VALUES ($1)
      ON CONFLICT (facility_id) DO NOTHING
      RETURNING *
    `;
    const insertResult = await this.pool.query(sql, [facilityId]);

    if ((insertResult.rowCount ?? 0) > 0) {
      return rowToFacilitySettings(insertResult.rows[0]);
    }

    const result = await this.pool.query(
      `SELECT * FROM facility_settings WHERE facility_id = $1`,
      [facilityId],
    );
    return rowToFacilitySettings(result.rows[0]);
  }

  async updateSettings(
    facilityId: string,
    adminUserId: string,
    dto: UpdateFacilitySettingsDto,
  ): Promise<FacilitySettings> {
    const existing = await this.getSettings(facilityId);
    const nextVitalThresholds = dto.vitalThresholds ?? existing.vitalThresholds;

    const sql = `
      INSERT INTO facility_settings
        (facility_id, medication_reminder_minutes_before,
         visit_reminder_hours_before, alert_push_enabled,
         timezone, vital_thresholds, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (facility_id)
      DO UPDATE SET
        medication_reminder_minutes_before = EXCLUDED.medication_reminder_minutes_before,
        visit_reminder_hours_before = EXCLUDED.visit_reminder_hours_before,
        alert_push_enabled = EXCLUDED.alert_push_enabled,
        timezone = EXCLUDED.timezone,
        vital_thresholds = EXCLUDED.vital_thresholds,
        updated_by = EXCLUDED.updated_by
      RETURNING *
    `;
    const result = await this.pool.query(sql, [
      facilityId,
      dto.medicationReminderMinutesBefore ??
        existing.medicationReminderMinutesBefore,
      dto.visitReminderHoursBefore ?? existing.visitReminderHoursBefore,
      dto.alertPushEnabled ?? existing.alertPushEnabled,
      dto.timezone ?? existing.timezone,
      JSON.stringify(nextVitalThresholds),
      adminUserId,
    ]);

    if (dto.vitalThresholds) {
      await this.syncVitalThresholds(facilityId, dto.vitalThresholds);
    }

    this.logger.log(`Facility settings updated: ${facilityId}`);
    return rowToFacilitySettings(result.rows[0]);
  }

  private async syncVitalThresholds(
    facilityId: string,
    thresholds: FacilitySettings['vitalThresholds'],
  ): Promise<void> {
    for (const [vitalType, threshold] of Object.entries(thresholds)) {
      await this.pool.query(
        `
          INSERT INTO vital_thresholds (facility_id, vital_type, min_value, max_value, unit)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (facility_id, vital_type)
          DO UPDATE SET
            min_value = EXCLUDED.min_value,
            max_value = EXCLUDED.max_value,
            unit = COALESCE(NULLIF(EXCLUDED.unit, ''), vital_thresholds.unit)
        `,
        [
          facilityId,
          vitalType,
          threshold.minValue ?? null,
          threshold.maxValue ?? null,
          threshold.unit ?? '',
        ],
      );
    }
  }
}
