import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Command } from 'commander';
import superagent from 'superagent';

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

// 2. Створення HTTP-сервера
const server = http.createServer(async (req, res) => {
  try {
    // Парсимо шлях запиту, наприклад /200 -> код '200'
    const urlParts = req.url.split('/').filter(Boolean);
    
    if (urlParts.length !== 1) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const code = urlParts[0];
    if (!/^\d{3}$/.test(code)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Invalid HTTP status code');
      return;
    }

    const filePath = path.join(CACHE_DIR, `${code}.jpg`);

    // Обробка методу GET
    if (req.method === 'GET') {
      try {
        // Спроба прочитати картинку з кешу
        const cachedData = await fs.readFile(filePath);
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'X-Cache-Source': 'cache'
        });
        res.end(cachedData);
      } catch (err) {
        // Якщо в кеші немає — запитуємо у http.cat
        try {
          const response = await superagent.get(`https://http.cat/${code}`).responseType('blob');
          const imageBuffer = response.body;

          // Зберігаємо у кеш
          await fs.writeFile(filePath, imageBuffer);

          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'X-Cache-Source': 'http.cat'
          });
          res.end(imageBuffer);
        } catch (catErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`Image for status ${code} not found on http.cat`);
        }
      }
    } else {
      // Для інших методів поки що повертаємо 405 (реалізуємо детальніше пізніше)
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
    }
  } catch (serverErr) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

// 3. Ініціалізація теки кешу та запуск сервера
async function startServer() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    server.listen(PORT, HOST, () => {
      console.log(`Проксі-сервер запущено на http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('Помилка запуску сервера:', err);
    process.exit(1);
  }
}

startServer();