import { v4 as uuidv4 } from "uuid";
import { getPool } from "../../infra/db/pool";
import type { IDeadLetter, JobType, PaginatedResult } from "../../shared/types";
import type { PoolClient } from "pg";

function rowToDeadLetter(row: Record<string, unknown>): IDeadLetter {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    jobType: row.job_type as JobType,
    tenantId: row.tenant_id as string,
    payload: row.payload as Record<string, unknown>,
    attempts: row.attempts as number,
    errors: row.errors as IDeadLetter["errors"],
    deadAt: row.dead_at as Date,
    resolvedAt: row.resolved_at as Date | undefined,
    resolvedBy: row.resolved_by as string | undefined,
    resolution: row.resolution as string | undefined,
    expiresAt: row.expires_at as Date,
  };
}

class DeadLetterRepository {
  async create(
    data: Pick<
      IDeadLetter,
      "jobId" | "jobType" | "tenantId" | "payload" | "attempts" | "errors"
    >,
    client?: PoolClient
  ): Promise<IDeadLetter> {
    const db = client ?? getPool();
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    const { rows } = await db.query(
      `INSERT INTO dead_letters
         (id, job_id, job_type, tenant_id, payload, attempts, errors, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        data.jobId,
        data.jobType,
        data.tenantId,
        JSON.stringify(data.payload),
        data.attempts,
        JSON.stringify(data.errors),
        expiresAt,
      ]
    );

    return rowToDeadLetter(rows[0]);
  }

  async findByJobId(jobId: string): Promise<IDeadLetter | null> {
    const { rows } = await getPool().query(
      "SELECT * FROM dead_letters WHERE job_id = $1",
      [jobId]
    );
    return rows.length ? rowToDeadLetter(rows[0]) : null;
  }

  async findUnresolved(
    tenantId: string | undefined,
    jobType: JobType | undefined,
    page: number,
    limit: number
  ): Promise<PaginatedResult<IDeadLetter>> {
    const conditions: string[] = ["resolved_at IS NULL"];
    const values: unknown[] = [];
    let idx = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(tenantId);
    }
    if (jobType) {
      conditions.push(`job_type = $${idx++}`);
      values.push(jobType);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      getPool().query(
        `SELECT * FROM dead_letters ${where}
         ORDER BY dead_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      getPool().query(
        `SELECT COUNT(*) AS count FROM dead_letters ${where}`,
        values
      ),
    ]);

    return {
      data: dataResult.rows.map(rowToDeadLetter),
      totalCount: parseInt(countResult.rows[0].count as string, 10),
      page,
      limit,
    };
  }

  async resolve(
    jobId: string,
    resolvedBy: string,
    resolution: string,
    client?: PoolClient
  ): Promise<IDeadLetter | null> {
    const db = client ?? getPool();
    const { rows } = await db.query(
      `UPDATE dead_letters
       SET resolved_at = NOW(), resolved_by = $2, resolution = $3, updated_at = NOW()
       WHERE job_id = $1 AND resolved_at IS NULL
       RETURNING *`,
      [jobId, resolvedBy, resolution]
    );
    return rows.length ? rowToDeadLetter(rows[0]) : null;
  }
}

export const deadLetterRepository = new DeadLetterRepository();