import "dotenv/config";
import { seedIfEmpty } from "./seed.js";

const created = await seedIfEmpty();
console.log(created ? "Seeded demo data." : "Users already exist; nothing seeded.");
process.exit(0);
