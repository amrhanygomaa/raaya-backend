import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

export interface FamilyMember {
  id: string;
  residentId: string;
  fullName: string;
  relationship: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  notes?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

function rowToMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: row.id as string,
    residentId: row.resident_id as string,
    fullName: row.full_name as string,
    relationship: row.relationship as string,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    isPrimary: (row.is_primary as boolean) ?? false,
    notes: row.notes as string | undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class FamilyMembersService {
  private readonly logger = new Logger(FamilyMembersService.name);
  private readonly cognito: CognitoIdentityProviderClient;
  private readonly userPoolId?: string;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.cognito = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
  }

  private async lookupCognitoSub(email: string): Promise<string | undefined> {
    if (!this.userPoolId || !email) return undefined;
    try {
      const res = await this.cognito.send(
        new AdminGetUserCommand({ UserPoolId: this.userPoolId, Username: email }),
      );
      return res.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
    } catch {
      return undefined;
    }
  }

  private async enrichWithUserId(members: FamilyMember[]): Promise<FamilyMember[]> {
    return Promise.all(
      members.map(async (m) => {
        if (m.email) {
          m.userId = await this.lookupCognitoSub(m.email);
        }
        return m;
      }),
    );
  }

  // قائمة جهات الأسرة لمقيم محدد (مع التحقق من الـ facility)
  async findByResident(
    facilityId: string,
    residentId: string,
  ): Promise<FamilyMember[]> {
    // التحقق إن المقيم في نفس facility المستخدم
    const residentCheck = await this.pool.query<Record<string, unknown>>(
      'SELECT id FROM residents WHERE id = $1 AND facility_id = $2',
      [residentId, facilityId],
    );
    if (residentCheck.rows.length === 0) {
      throw new NotFoundException('Resident not found in your facility');
    }

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM family_members
       WHERE resident_id = $1
       ORDER BY is_primary DESC, full_name ASC`,
      [residentId],
    );
    return this.enrichWithUserId(result.rows.map(rowToMember));
  }

  async findByEmail(
    facilityId: string,
    email: string,
  ): Promise<FamilyMember[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT fm.* FROM family_members fm
       INNER JOIN residents r ON fm.resident_id = r.id
       WHERE r.facility_id = $1
         AND LOWER(fm.email) = LOWER($2)
       ORDER BY fm.is_primary DESC, fm.full_name ASC`,
      [facilityId, email],
    );
    return this.enrichWithUserId(result.rows.map(rowToMember));
  }

  async findOne(facilityId: string, id: string): Promise<FamilyMember> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT fm.* FROM family_members fm
       INNER JOIN residents r ON fm.resident_id = r.id
       WHERE fm.id = $1 AND r.facility_id = $2`,
      [id, facilityId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Family member not found');
    }
    return rowToMember(result.rows[0]);
  }

  async create(
    facilityId: string,
    dto: CreateFamilyMemberDto,
  ): Promise<FamilyMember> {
    // التحقق من المقيم
    const residentCheck = await this.pool.query<Record<string, unknown>>(
      'SELECT id FROM residents WHERE id = $1 AND facility_id = $2',
      [dto.residentId, facilityId],
    );
    if (residentCheck.rows.length === 0) {
      throw new NotFoundException('Resident not found in your facility');
    }

    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO family_members
        (resident_id, full_name, relationship, phone, email, is_primary, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dto.residentId,
        dto.fullName,
        dto.relationship,
        dto.phone ?? null,
        dto.email ?? null,
        dto.isPrimary ?? false,
        dto.notes ?? null,
      ],
    );
    return rowToMember(result.rows[0]);
  }

  async update(
    facilityId: string,
    id: string,
    dto: Partial<CreateFamilyMemberDto>,
  ): Promise<FamilyMember> {
    await this.findOne(facilityId, id); // throws if not in facility

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      fullName: 'full_name',
      relationship: 'relationship',
      phone: 'phone',
      email: 'email',
      isPrimary: 'is_primary',
      notes: 'notes',
    };
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      const col = map[k];
      if (!col) continue;
      fields.push(`${col} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return this.findOne(facilityId, id);
    values.push(id);
    const result = await this.pool.query<Record<string, unknown>>(
      `UPDATE family_members SET ${fields.join(', ')}
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rowToMember(result.rows[0]);
  }

  async delete(facilityId: string, id: string): Promise<{ deleted: true }> {
    await this.findOne(facilityId, id);
    await this.pool.query('DELETE FROM family_members WHERE id = $1', [id]);
    return { deleted: true };
  }
}
