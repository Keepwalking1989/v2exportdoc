
import mysql from 'mysql2/promise';
import 'dotenv/config'

// Create a connection pool instead of a single connection for better performance
// The pool manages multiple connections and reuses them, which is more efficient.
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'bizform_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
