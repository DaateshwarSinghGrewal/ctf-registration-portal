import dotenv from 'dotenv';
import { Pool } from 'pg';
import * as dns from 'dns';
import * as net from 'net';

// Force Node to prioritize IPv4 over IPv6 and disable autoSelectFamily.
// This prevents ENETUNREACH/ETIMEDOUT AggregateErrors when local networks drop IPv6 or multi-IP packets.
dns.setDefaultResultOrder('ipv4first');
if ((net as any).setDefaultAutoSelectFamily) {
  (net as any).setDefaultAutoSelectFamily(false);
}

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
} as any);

/** Asynchronously to verify -> PostgreSQL connection 
 *  Issue log kardega application ke starting mein
*/

async function connectToDatabase() {
    try {
        const client = await pool.connect();
        console.log("Connected to Database : Lesgoooooooo");
        client.release(); // Release the client back to the pool to prevent leakage
    } catch (error) {
        console.error("Database connection failed: oh hell nah", error);
    }
}

connectToDatabase();
export default pool;