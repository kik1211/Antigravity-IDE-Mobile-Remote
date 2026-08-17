// @ts-check
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const _ownDir = dirname(dirname(fileURLToPath(import.meta.url)));
const _ownEnv = join(_ownDir, '.env');

if (fs.existsSync(_ownEnv)) {
    dotenv.config({ path: _ownEnv });
} else {
    dotenv.config(); // fallback to cwd
}
