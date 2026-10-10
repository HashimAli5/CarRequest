// Deletes all requests (keeps the two user accounts). Usage: npm run reset-db
import { db, initDb } from './db.js';

await initDb();
const { changes } = await db.run('DELETE FROM requests');
console.log(`Deleted ${changes} request(s).`);
