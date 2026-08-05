import dotenv from 'dotenv';
import { Pool } from 'pg';
import * as dns from 'dns';

// Force Node to prioritize IPv4 over IPv6. This prevents ENETUNREACH/ETIMEDOUT 
// errors when the local network drops IPv6 packets to Neon/AWS databases.
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
});

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