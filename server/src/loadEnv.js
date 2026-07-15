import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Prefer server/.env, then monorepo root .env
dotenv.config({ path: path.resolve(here, '../.env') });
dotenv.config({ path: path.resolve(here, '../../.env') });
