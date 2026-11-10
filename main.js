import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Command } from 'commander';

// 1. Налаштування та парсинг аргументів командного рядка
const program = new Command();
program
  .requiredOption('-h, --host <address>', 'Адреса, на якій працює сервер')
  .requiredOption('-p, --port <number>', 'Порт сервера', parseInt)
  .requiredOption('-c, --cache <path>', 'Шлях до теки для кешованих картинок');

program.parse(process.argv);
const options = program.opts();

const HOST = options.host;
const PORT = options.port;
const CACHE_DIR = path.resolve(options.cache);

// 2. Функція ініціалізації: створення теки кешу перед запуском сервера
async function startServer() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log(`Теку кешу успішно підготовлено: ${CACHE_DIR}`);
  } catch (err) {
    console.error('Помилка при створенні теки кешу:', err);
    process.exit(1);
  }
}

startServer();