import { v4 as uuidv4 } from "uuid";
import { getPool } from "../../infra/db/pool";
import type { IDeploymentLog, LogPhase } from "../../shared/types";
import type { PoolClient } from "pg";

function rowToLog(row: Record<string, unknown>): IDeploymentLog {
  return {
    id: row.id as string,
    deploymentId: row.deployment_id as string,
    seq: row.seq as number,
    ts: row.ts as Date,
    line: row.line as string,
    phase: row.phase as LogPhase,
  };
}

class DeploymentLogRepository {
  async insert(
    log: Omit<IDeploymentLog, "id">,
    client?: PoolClient
  ): Promise<void> {
    const db = client ?? getPool();
    await db.query(
      `INSERT INTO deployment_logs (id, deployment_id, seq, ts, line, phase)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (deployment_id, seq) DO NOTHING`,
      [uuidv4(), log.deploymentId, log.seq, log.ts, log.line, log.phase]
    );
  }

  async insertMany(
    logs: Omit<IDeploymentLog, "id">[],
    client?: PoolClient
  ): Promise<void> {
    if (logs.length === 0) return;
    const db = client ?? getPool();

    const values = logs
      .map((_, i) => {
        const base = i * 6;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      })
      .join(", ");

    const params = logs.flatMap((log) => [
      uuidv4(),
      log.deploymentId,
      log.seq,
      log.ts,
      log.line,
      log.phase,
    ]);

    await db.query(
      `INSERT INTO deployment_logs (id, deployment_id, seq, ts, line, phase)
       VALUES ${values}
       ON CONFLICT (deployment_id, seq) DO NOTHING`,
      params
    );
  }

  async findByDeploymentId(
    deploymentId: string,
    phase?: LogPhase
  ): Promise<IDeploymentLog[]> {
    if (phase) {
      const { rows } = await getPool().query(
        `SELECT * FROM deployment_logs
         WHERE deployment_id = $1 AND phase = $2
         ORDER BY seq ASC`,
        [deploymentId, phase]
      );
      return rows.map(rowToLog);
    }

    const { rows } = await getPool().query(
      `SELECT * FROM deployment_logs
       WHERE deployment_id = $1
       ORDER BY seq ASC`,
      [deploymentId]
    );
    return rows.map(rowToLog);
  }

  async getNextSeq(deploymentId: string): Promise<number> {
    const { rows } = await getPool().query(
      `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq
       FROM deployment_logs
       WHERE deployment_id = $1`,
      [deploymentId]
    );
    return rows[0].next_seq as number;
  }

  async countByDeploymentId(deploymentId: string): Promise<number> {
    const { rows } = await getPool().query(
      "SELECT COUNT(*) AS count FROM deployment_logs WHERE deployment_id = $1",
      [deploymentId]
    );
    return parseInt(rows[0].count as string, 10);
  }
}

export const deploymentLogRepository = new DeploymentLogRepository();