import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { initialProducts, storeCategories } from '../src/catalog.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(root, '.env')
const dataDirectory = path.join(root, 'server', 'data')
const uploadDirectory = path.join(root, 'server', 'uploads')
const distDirectory = path.join(root, 'dist')

if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && !Object.hasOwn(process.env, match[1])) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
}

function saveEnv(values) {
  const contents = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n'
  fs.writeFileSync(envFile, contents, { flag: 'wx', mode: 0o600 })
}

if (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD) {
  if (process.env.NODE_ENV === 'production' || fs.existsSync(envFile)) {
    throw new Error('Set JWT_SECRET and ADMIN_PASSWORD in .env before starting the server.')
  }
  const password = crypto.randomBytes(15).toString('base64url')
  const secret = crypto.randomBytes(48).toString('base64url')
  saveEnv({
    PORT: process.env.PORT || '4000',
    JWT_SECRET: secret,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD: password,
    INSTAGRAM_URL: 'https://instagram.com/natural_store.kg',
  })
  process.env.JWT_SECRET = secret
  process.env.ADMIN_USERNAME ||= 'admin'
  process.env.ADMIN_PASSWORD = password
  process.env.INSTAGRAM_URL ||= 'https://instagram.com/natural_store.kg'
  console.log(`Initial administrator: ${process.env.ADMIN_USERNAME}`)
  console.log(`Initial password: ${password}`)
  console.log('The password is saved in .env. Change it before deploying the store.')
}

if (process.env.JWT_SECRET.length < 32 || process.env.ADMIN_PASSWORD.length < 12
  || process.env.JWT_SECRET.startsWith('generate-') || process.env.ADMIN_PASSWORD.startsWith('use-a-unique')) {
  throw new Error('JWT_SECRET must be at least 32 characters and ADMIN_PASSWORD at least 12 characters.')
}

fs.mkdirSync(dataDirectory, { recursive: true })
fs.mkdirSync(uploadDirectory, { recursive: true })
const db = new DatabaseSync(process.env.NATURE_DB_PATH || path.join(dataDirectory, 'nature-store.sqlite'))
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL CHECK (price >= 0),
    old_price REAL CHECK (old_price IS NULL OR old_price >= 0),
    volume TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    rating REAL NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    stock INTEGER NOT NULL DEFAULT 1,
    popular INTEGER NOT NULL DEFAULT 0,
    new_arrival INTEGER NOT NULL DEFAULT 0,
    bestseller INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    name TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
  );
  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count
if (!productCount) {
  const insert = db.prepare(`
    INSERT INTO products (id, name, brand, category, description, price, old_price, volume, image, rating, rating_count, stock, popular, new_arrival, bestseller)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const p of initialProducts) {
      insert.run(p.id, p.name, p.brand, p.category, p.description, p.price, p.oldPrice, p.volume, p.image, p.rating, p.ratingCount, p.stock ? 1 : 0, p.popular ? 1 : 0, p.newArrival ? 1 : 0, p.bestseller ? 1 : 0)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const addMakeupSample = db.prepare(`
  INSERT INTO products (name, brand, category, description, price, old_price, volume, image, rating, rating_count, stock, popular, new_arrival, bestseller)
  SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ? AND brand = ?)
`)
const addMakeupSamplePhoto = db.prepare(`
  UPDATE products SET image = ?
  WHERE name = ? AND brand = ? AND image = ?
`)
const oldMakeupSampleImages = [
  '/products/Anua_Azelaic_Acid_Serum.jpg',
  '/products/Anua_Heartleaf_70_Cream.jpg',
  '/products/instagram-makeup.jpg',
  '/products/Anua_Heartleaf_77_Clear_Pad.jpg',
  '/products/Anua_Heartleaf_80_Ampoule.jpg',
  '/products/Anua_Niacinamide_TXA_Serum.jpg',
  '/products/Anua_PDRN_Moisture_Cream.jpg',
  '/products/Anua_Peach_77_Cream.jpg',
  '/products/Anua_Peach_77_Toner.jpg',
  '/products/Anua_Rice_70_Toner.jpg',
  '/products/Anua_Rice_Enzyme_Powder.jpg',
  '/products/Anua_Sunscreen.jpg',
  '/products/DrAlthea_147_Barrier_Cream.jpg',
  '/products/DrAlthea_345_Relief_Cream.jpg',
  '/products/Lador_Perfume_Hair_Oil.jpg',
  '/products/Lador_Perfume_Hair_Shampoo.jpg',
  '/products/Lador_Perfume_Hair_Treatment.jpg',
  '/products/Tamburins_CHAMO_Hand_Cream.webp',
  '/products/Tamburins_CHAMO_Perfume.jpg',
  '/products/instagram-althea.jpg',
]
const sampleProducts = initialProducts.filter(product => ['Декоративная косметика', 'Подарочные наборы'].includes(product.category))
db.exec('BEGIN IMMEDIATE')
try {
  for (const p of sampleProducts) {
    addMakeupSample.run(
      p.name, p.brand, p.category, p.description, p.price, p.oldPrice, p.volume, p.image,
      p.rating, p.ratingCount, p.stock ? 1 : 0, p.popular ? 1 : 0,
      p.newArrival ? 1 : 0, p.bestseller ? 1 : 0, p.name, p.brand,
    )
    if (p.category === 'Декоративная косметика') {
      addMakeupSamplePhoto.run(p.image, p.name, p.brand, oldMakeupSampleImages[p.id - 24])
    }
  }
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
}

const seedReviews = [
  ['Маргарита', 'Добрый день! Спасибо за подобранный уход — кожа стала более гладкой и ровной. Теперь подбираю SPF и крем вокруг глаз.', 5],
  ['Клиент Nature Store', 'Хотела поблагодарить за консультацию: косметика подошла, кожа сияет. Спасибо за внимательное отношение.', 5],
  ['Покупатель Nature Store', 'Спасибо за подарок и рекомендации по уходу. Очень приятно, когда помогают подобрать подходящие средства.', 5],
  ['Клиент Nature Store', 'Хорошо подобранный уход помог мне найти подходящие средства. Благодарю за консультацию.', 5],
]
const removeSeedReview = db.prepare('DELETE FROM reviews WHERE name = ? AND message = ? AND rating = ?')
seedReviews.forEach(review => removeSeedReview.run(...review))

const settingInsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
settingInsert.run('heroImage', '/products/nature-store-hero.png')
settingInsert.run('instagramUrl', process.env.INSTAGRAM_URL || 'https://instagram.com/natural_store.kg')

const app = express()
const port = Number(process.env.PORT || 4000)
const username = process.env.ADMIN_USERNAME || 'admin'
const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12)
const jwtSecret = process.env.JWT_SECRET
const statusNames = new Set(['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'])
const loginAttempts = new Map()

app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))
app.use('/uploads', express.static(uploadDirectory, { fallthrough: false, maxAge: '1d' }))

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, done) => {
      const extension = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg'
      done(null, `${crypto.randomUUID()}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      done(new Error('Загрузите изображение JPG, PNG или WebP размером до 5 МБ.'))
      return
    }
    done(null, true)
  },
})

const cookieName = 'nature_admin'
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
  maxAge: 8 * 60 * 60 * 1000,
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message })
}

function readCookie(req, name) {
  const cookies = req.headers.cookie?.split(';') || []
  const cookie = cookies.find(value => value.trim().startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : ''
}

function requireAdmin(req, res, next) {
  try {
    const token = readCookie(req, cookieName)
    const payload = jwt.verify(token, jwtSecret)
    if (payload.sub !== username) return sendError(res, 401, 'Требуется вход администратора.')
    next()
  } catch {
    return sendError(res, 401, 'Требуется вход администратора.')
  }
}

function productFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description,
    price: row.price,
    oldPrice: row.old_price,
    volume: row.volume,
    image: row.image,
    rating: row.rating,
    ratingCount: row.rating_count,
    stock: Boolean(row.stock),
    popular: Boolean(row.popular),
    newArrival: Boolean(row.new_arrival),
    bestseller: Boolean(row.bestseller),
  }
}

function getProduct(id) {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  return row ? productFromRow(row) : null
}

function validImageUrl(value) {
  if (!value) return true
  if (/^\/(products|uploads)\/[A-Za-z0-9._-]+$/.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function parseProduct(body) {
  const name = String(body.name || '').trim()
  const category = String(body.category || '').trim()
  const price = Number(body.price)
  const oldPrice = body.oldPrice === '' || body.oldPrice == null ? null : Number(body.oldPrice)
  const rating = Number(body.rating ?? 0)
  const ratingCount = Number(body.ratingCount ?? 0)
  if (!name || name.length > 160) throw new Error('Укажите название товара (до 160 символов).')
  if (!storeCategories.includes(category) && !['Новинки', 'Бестселлеры', 'Спецпредложения'].includes(category)) throw new Error('Выберите категорию из списка.')
  if (!Number.isFinite(price) || price < 0 || (oldPrice != null && (!Number.isFinite(oldPrice) || oldPrice < 0))) throw new Error('Проверьте цену товара.')
  if (!Number.isFinite(rating) || rating < 0 || rating > 5 || !Number.isInteger(ratingCount) || ratingCount < 0) throw new Error('Проверьте рейтинг товара.')
  const image = String(body.image || '').trim()
  if (!validImageUrl(image)) throw new Error('Для фото используйте локальный файл или HTTPS-ссылку.')
  return {
    name,
    brand: String(body.brand || '').trim().slice(0, 100),
    category,
    description: String(body.description || '').trim().slice(0, 2000),
    price,
    oldPrice,
    volume: String(body.volume || '').trim().slice(0, 60),
    image,
    rating,
    ratingCount,
    stock: body.stock === 'false' || body.stock === false || body.stock === '0' || body.stock === 0 ? 0 : 1,
    popular: body.popular === 'true' || body.popular === true || body.popular === '1' ? 1 : 0,
    newArrival: body.newArrival === 'true' || body.newArrival === true || body.newArrival === '1' ? 1 : 0,
    bestseller: body.bestseller === 'true' || body.bestseller === true || body.bestseller === '1' ? 1 : 0,
  }
}

const publicSettings = () => Object.fromEntries(db.prepare("SELECT key, value FROM settings WHERE key IN ('heroImage', 'instagramUrl')").all().map(row => [row.key, row.value]))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.get('/api/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id ASC').all()
  res.json(rows.map(productFromRow))
})
app.get('/api/products/:id', (req, res) => {
  const product = getProduct(Number(req.params.id))
  if (!product) return sendError(res, 404, 'Товар не найден.')
  res.json(product)
})
app.get('/api/settings', (_req, res) => res.json(publicSettings()))
app.get('/api/reviews', (_req, res) => {
  const reviews = db.prepare('SELECT id, name, message, rating, created_at AS createdAt FROM reviews WHERE approved = 1 ORDER BY id DESC').all()
  res.json(reviews)
})
app.post('/api/reviews', (req, res) => {
  const name = String(req.body.name || '').trim()
  const message = String(req.body.message || '').trim()
  const rating = Number(req.body.rating)
  if (!name || name.length > 100 || !message || message.length > 1500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return sendError(res, 400, 'Укажите имя, отзыв и оценку от 1 до 5.')
  }
  const result = db.prepare('INSERT INTO reviews (name, message, rating, approved) VALUES (?, ?, ?, 0)').run(name, message, rating)
  res.status(201).json({ id: Number(result.lastInsertRowid), approved: false })
})

app.post('/api/orders', (req, res) => {
  const name = String(req.body.name || '').trim()
  const phone = String(req.body.phone || '').trim()
  const address = String(req.body.address || '').trim()
  const comment = String(req.body.comment || '').trim()
  const items = req.body.items
  if (!name || name.length > 120 || phone.length < 5 || phone.length > 40 || address.length > 300 || comment.length > 1000) return sendError(res, 400, 'Заполните имя и корректный номер телефона.')
  if (!Array.isArray(items) || !items.length || items.length > 50) return sendError(res, 400, 'Корзина пуста или содержит слишком много товаров.')
  const lines = []
  for (const item of items) {
    const product = getProduct(Number(item.productId))
    const quantity = Number(item.quantity)
    if (!product || !product.stock || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return sendError(res, 400, 'Проверьте товары и количество в корзине.')
    lines.push({ product, quantity })
  }
  const total = lines.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  db.exec('BEGIN IMMEDIATE')
  try {
    const order = db.prepare('INSERT INTO orders (name, phone, address, comment, total) VALUES (?, ?, ?, ?, ?)').run(name, phone, address, comment, total)
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, image, price, quantity) VALUES (?, ?, ?, ?, ?, ?)')
    lines.forEach(({ product, quantity }) => insertItem.run(order.lastInsertRowid, product.id, product.name, product.image, product.price, quantity))
    db.exec('COMMIT')
    res.status(201).json({ id: Number(order.lastInsertRowid), total })
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
})

app.post('/api/consultations', (req, res) => {
  const name = String(req.body.name || '').trim()
  const phone = String(req.body.phone || '').trim()
  const message = String(req.body.message || '').trim()
  if (!name || name.length > 120 || phone.length < 5 || phone.length > 40 || message.length > 1000) return sendError(res, 400, 'Укажите имя и корректный номер телефона.')
  const result = db.prepare('INSERT INTO consultations (name, phone, message) VALUES (?, ?, ?)').run(name, phone, message)
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

app.post('/api/admin/login', async (req, res) => {
  const address = req.ip
  const attempts = loginAttempts.get(address) || { count: 0, startedAt: Date.now() }
  if (Date.now() - attempts.startedAt > 15 * 60 * 1000) {
    attempts.count = 0
    attempts.startedAt = Date.now()
  }
  if (attempts.count >= 8) return sendError(res, 429, 'Слишком много попыток. Попробуйте через 15 минут.')
  const validUsername = typeof req.body.username === 'string' && req.body.username === username
  const validPassword = typeof req.body.password === 'string' && await bcrypt.compare(req.body.password, passwordHash)
  if (!validUsername || !validPassword) {
    attempts.count++
    loginAttempts.set(address, attempts)
    return sendError(res, 401, 'Неверный логин или пароль.')
  }
  loginAttempts.delete(address)
  const token = jwt.sign({ sub: username }, jwtSecret, { expiresIn: '8h', issuer: 'nature-store' })
  res.cookie(cookieName, token, cookieOptions).json({ user: username })
})

app.post('/api/admin/logout', requireAdmin, (_req, res) => res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined }).json({ ok: true }))
app.get('/api/admin/me', requireAdmin, (_req, res) => res.json({ user: username }))
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const products = db.prepare('SELECT COUNT(*) AS count FROM products').get().count
  const orders = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status != 'cancelled'").get().count
  const newOrders = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'new'").get().count
  const revenue = db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status = 'completed'").get().total
  const consultations = db.prepare("SELECT COUNT(*) AS count FROM consultations WHERE status = 'new'").get().count
  res.json({ products, orders, newOrders, revenue, consultations })
})

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all()
  const items = db.prepare('SELECT product_id AS productId, name, image, price, quantity FROM order_items WHERE order_id = ?')
  res.json(orders.map(order => ({
    id: order.id,
    name: order.name,
    phone: order.phone,
    address: order.address,
    comment: order.comment,
    total: order.total,
    status: order.status,
    createdAt: order.created_at,
    items: items.all(order.id),
  })))
})
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const status = String(req.body.status || '')
  if (!statusNames.has(status)) return sendError(res, 400, 'Укажите корректный статус заказа.')
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(req.params.id))
  if (!result.changes) return sendError(res, 404, 'Заказ не найден.')
  res.json({ ok: true })
})

app.get('/api/admin/consultations', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT id, name, phone, message, status, created_at AS createdAt FROM consultations ORDER BY id DESC').all())
})
app.patch('/api/admin/consultations/:id', requireAdmin, (req, res) => {
  const status = String(req.body.status || '')
  if (!['new', 'contacted', 'closed'].includes(status)) return sendError(res, 400, 'Укажите корректный статус заявки.')
  const result = db.prepare('UPDATE consultations SET status = ? WHERE id = ?').run(status, Number(req.params.id))
  if (!result.changes) return sendError(res, 404, 'Заявка не найдена.')
  res.json({ ok: true })
})

app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT id, name, message, rating, approved, created_at AS createdAt FROM reviews ORDER BY id DESC').all().map(review => ({ ...review, approved: Boolean(review.approved) })))
})
app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const result = db.prepare('UPDATE reviews SET approved = ? WHERE id = ?').run(req.body.approved ? 1 : 0, Number(req.params.id))
  if (!result.changes) return sendError(res, 404, 'Отзыв не найден.')
  res.json({ ok: true })
})
app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(req.params.id))
  if (!result.changes) return sendError(res, 404, 'Отзыв не найден.')
  res.json({ ok: true })
})

app.get('/api/admin/settings', requireAdmin, (_req, res) => res.json(publicSettings()))
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const heroImage = String(req.body.heroImage || '').trim()
  const instagramUrl = String(req.body.instagramUrl || '').trim()
  if (!validImageUrl(heroImage)) return sendError(res, 400, 'Выберите изображение или укажите локальное/HTTPS фото.')
  try {
    const url = new URL(instagramUrl)
    if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)) throw new Error()
  } catch {
    return sendError(res, 400, 'Укажите корректную ссылку Instagram.')
  }
  const update = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  update.run('heroImage', heroImage)
  update.run('instagramUrl', instagramUrl)
  res.json(publicSettings())
})

app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return sendError(res, 400, 'Выберите фотографию для загрузки.')
  res.status(201).json({ url: `/uploads/${req.file.filename}` })
})
app.get('/api/admin/products', requireAdmin, (_req, res) => res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(productFromRow)))
app.post('/api/admin/products', requireAdmin, (req, res) => {
  let product
  try {
    product = parseProduct(req.body)
  } catch (error) {
    return sendError(res, 400, error.message)
  }
  const result = db.prepare(`
    INSERT INTO products (name, brand, category, description, price, old_price, volume, image, rating, rating_count, stock, popular, new_arrival, bestseller)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(product.name, product.brand, product.category, product.description, product.price, product.oldPrice, product.volume, product.image, product.rating, product.ratingCount, product.stock, product.popular, product.newArrival, product.bestseller)
  res.status(201).json(getProduct(Number(result.lastInsertRowid)))
})
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!getProduct(id)) return sendError(res, 404, 'Товар не найден.')
  let product
  try {
    product = parseProduct(req.body)
  } catch (error) {
    return sendError(res, 400, error.message)
  }
  db.prepare(`
    UPDATE products SET name=?, brand=?, category=?, description=?, price=?, old_price=?, volume=?, image=?, rating=?, rating_count=?, stock=?, popular=?, new_arrival=?, bestseller=?
    WHERE id=?
  `).run(product.name, product.brand, product.category, product.description, product.price, product.oldPrice, product.volume, product.image, product.rating, product.ratingCount, product.stock, product.popular, product.newArrival, product.bestseller, id)
  res.json(getProduct(id))
})
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id))
  if (!result.changes) return sendError(res, 404, 'Товар не найден.')
  res.status(204).end()
})

app.use('/api', (_req, res) => sendError(res, 404, 'API endpoint не найден.'))
if (fs.existsSync(distDirectory)) app.use(express.static(distDirectory))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || !fs.existsSync(path.join(distDirectory, 'index.html'))) return next()
  res.sendFile(path.join(distDirectory, 'index.html'))
})
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return sendError(res, 413, 'Размер изображения не должен превышать 5 МБ.')
  if (error.message?.startsWith('Загрузите изображение')) return sendError(res, 400, error.message)
  console.error(error)
  sendError(res, 500, 'Внутренняя ошибка сервера.')
})

app.listen(port, () => console.log(`Nature Store API is ready at http://localhost:${port}`))
