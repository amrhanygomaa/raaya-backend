import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

export interface FacilitySearchHit {
  facilityId: string;
  facilityName: string;
  governorate: string;
  city: string;
  features: string[];
}

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async search(
    governorate: string,
    city: string,
    features: string[],
  ): Promise<FacilitySearchHit[]> {
    try {
      const params: unknown[] = [governorate, city];
      let featureFilter = '';
      if (features.length > 0) {
        params.push(features);
        featureFilter = ` AND features && $3::text[]`;
      }

      const result = await this.pool.query<Record<string, unknown>>(
        `SELECT id, name, governorate, city, features
         FROM facilities
         WHERE is_active
           AND governorate = $1
           AND city ILIKE '%' || $2 || '%'
           ${featureFilter}
         ORDER BY name ASC
         LIMIT 50`,
        params,
      );

      return result.rows.map((row) => ({
        facilityId: row.id as string,
        facilityName: row.name as string,
        governorate: row.governorate as string,
        city: row.city as string,
        features: (row.features as string[]) ?? [],
      }));
    } catch (err) {
      this.logger.error(
        `Facility search failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  async createInquiry(
    dto: CreateInquiryDto,
    sourceIp: string | null,
  ): Promise<{ id: string; status: string }> {
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        `INSERT INTO facility_inquiries
           (facility_id, name, phone, governorate, city, features, source_ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, status`,
        [
          dto.facilityId ?? null,
          dto.name,
          dto.phone,
          dto.governorate,
          dto.city,
          dto.features ?? [],
          sourceIp,
        ],
      );
      this.logger.log(
        `Inquiry received: ${String(result.rows[0].id)} from ${dto.phone} (${dto.city})`,
      );
      return {
        id: result.rows[0].id as string,
        status: result.rows[0].status as string,
      };
    } catch (err) {
      this.logger.error(
        `Inquiry create failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }
}
