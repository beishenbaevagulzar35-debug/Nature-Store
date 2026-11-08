import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Instagram, LayoutDashboard,
  MapPin, Menu, Minus, Package, Pencil, Phone, Plus, Search, ShoppingBag,
  ShoppingCart, Star, Trash2, Upload, X,
} from 'lucide-react'
import { initialProducts, instagramPhotos, storeCategories } from './catalog.js'

const API = '/api'
const money = value => `${Number(value || 0).toLocaleString('ru-RU')} с`
const imageFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"%3E%3Crect width="320" height="240" fill="%23f2ecdf"/%3E%3Cpath d="M143 56h34v20h14v82h-62V76h14zM143 76h34m-48 67h62" fill="none" stroke="%238d9875" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/%3E%3Ctext x="160" y="202" text-anchor="middle" fill="%23777c69" font-family="Arial,sans-serif" font-size="15"%3ENature Store%3C/text%3E%3C/svg%3E'
const statusLabels = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  preparing: 'Собирается',
  shipped: 'Отправлен',
  completed: 'Завершён',
  cancelled: 'Отменён',
  contacted: 'Связались',
  closed: 'Закрыт',
}
const orderStatuses = ['new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled']
const categories = ['Все товары', ...storeCategories, 'Популярные', 'Новинки', 'Бестселлеры', 'Спецпредложения']
const allBrands = [
  'COSRX', 'Beauty of Joseon', 'SKIN1004', 'Anua', 'Some By Mi', 'Laneige', 'Round Lab', 'Torriden',
  'Dr. Jart+', 'Etude', 'Innisfree', 'Purito', 'Isntree', 'Haruharu Wonder', 'Medicube', 'Mixsoon',
  'iUNIK', 'Pyunkang Yul', 'CeraVe', 'La Roche-Posay', 'The Ordinary', 'Bioderma', 'Avène', 'Clinique',
  'Eucerin', 'Neutrogena', 'Cetaphil', 'Vichy', "Kiehl's", "Paula's Choice", 'Nivea', 'Garnier',
  'Simple', 'Maybelline', 'NYX', 'Rare Beauty', 'Huda Beauty', 'Fenty Beauty', 'MAC', 'Dior Beauty',
  'Chanel Beauty', 'Charlotte Tilbury', 'YSL Beauty', 'Makeup by Mario', 'Essence', 'Catrice',
  "L'Oréal Paris", 'Revolution', 'Benefit Cosmetics', 'Too Faced', 'Kylie Cosmetics', 'Sephora Collection',
  'Urban Decay', 'Olaplex', 'Kérastase', "L'Oréal Professionnel", 'Wella Professionals', 'Schwarzkopf',
  'TRESemmé', 'Pantene', 'OGX', 'Moroccanoil', 'Redken', 'Davines', 'Chanel', 'Dior',
  'Gucci', 'Yves Saint Laurent', 'Armani Beauty', 'Versace', 'Burberry', 'Lancôme', 'Carolina Herrera',
  'Givenchy', 'Jo Malone', 'Maison Margiela',
]
const generatedHeroSlides = [
  { src: '/products/hero-generated/nature-store-hero-2.png', alt: 'Средства Nature Store с цветами и полотенцем' },
  { src: '/products/hero-generated/nature-store-hero-3.png', alt: 'Средства Nature Store среди цветов и натурального камня' },
]

async function api(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    credentials: 'same-origin',
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'Не удалось выполнить запрос. Попробуйте ещё раз.')
  return data
}

function useProducts() {
  const [products, setProducts] = useState(initialProducts)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const refresh = async () => {
    try {
      const rows = await api('/products')
      setProducts(rows)
      setConnected(true)
      setError('')
    } catch (reason) {
      setConnected(false)
      setError(reason.message)
    }
  }
  useEffect(() => { refresh() }, [])
  return { products, refresh, connected, error }
}

function StoreImage({ src, alt = '', ...props }) {
  return <img {...props} src={src || imageFallback} alt={alt} onError={event => {
    event.currentTarget.onerror = null
    event.currentTarget.src = imageFallback
  }} />
}

function Reveal({ children, className = '', delay = 0 }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    if (!element || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>{children}</div>
}

function SectionTitle({ eyebrow, title, action }) {
  return <div className="section-heading">
    <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
    {action}
  </div>
}

function Header({ cartCount, onCart }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  return <>
    <header className="topbar">
      <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Открыть меню"><Menu /></button>
      <Link to="/" className="brand">Nature Store</Link>
      <div className="head-actions">
        <form className={`header-search ${searchOpen ? 'search-open' : ''}`} onSubmit={event => {
          event.preventDefault()
          navigate(`/catalog?q=${encodeURIComponent(query)}`)
          setSearchOpen(false)
        }}>
          {searchOpen && <input autoFocus aria-label="Поиск товаров" placeholder="Поиск" value={query} onChange={event => setQuery(event.target.value)} />}
          <button type="button" className="icon-btn" aria-label="Поиск" onClick={() => setSearchOpen(!searchOpen)}><Search /></button>
        </form>
        <button className="icon-btn cart-head" onClick={onCart} aria-label={`Корзина, товаров: ${cartCount}`}><ShoppingBag /><b>{cartCount}</b></button>
      </div>
    </header>
    {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)}>
      <aside className="side-menu" onClick={event => event.stopPropagation()}>
        <button className="close" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню"><X /></button>
        <Link to="/" className="menu-logo" onClick={() => setMenuOpen(false)}>Nature Store</Link>
        <nav className="menu-links">
          {categories.map(category => <Link key={category} to={`/catalog${category === 'Все товары' ? '' : `?category=${encodeURIComponent(category)}`}`} onClick={() => setMenuOpen(false)}>{category}</Link>)}
          <Link to="/brands" onClick={() => setMenuOpen(false)}>Все бренды</Link>
          <Link to="/reviews" onClick={() => setMenuOpen(false)}>Отзывы</Link>
          <Link to="/faq" onClick={() => setMenuOpen(false)}>Ответы на вопросы</Link>
          <Link to="/contacts" onClick={() => setMenuOpen(false)}>Контакты</Link>
        </nav>
        <div className="menu-contact"><span><Phone size={17} /> +996 (500) 458-888</span><span><MapPin size={17} /> Кара-Балта, Кыргызстан</span><span><Clock3 size={17} /> Ежедневно, 09:00–19:00</span></div>
        <Link className="button full" to="/consultation" onClick={() => setMenuOpen(false)}>Получить консультацию</Link>
      </aside>
    </div>}
  </>
}

function ProductCard({ product, add, index = 0 }) {
  const [quantity, setQuantity] = useState(1)
  const discounted = product.oldPrice && Number(product.oldPrice) > Number(product.price)
  return <Reveal className="product-card" delay={(index % 5) * 70}>
    <Link to={`/product/${product.id}`} className="product-photo" aria-label={`Подробнее: ${product.name}`}>
      <StoreImage src={product.image} alt={product.name} loading="lazy" />
      {discounted && <span className="sale-tag">Спеццена</span>}
      {product.newArrival && <span className="new-tag">Новинка</span>}
    </Link>
    <div className="product-info">
      <small className="product-brand">{product.brand || 'Nature Store'}</small>
      <Link to={`/product/${product.id}`} className="product-name">{product.name}</Link>
      <p className="muted product-description">{product.description}</p>
      <div className="product-rating" aria-label={product.ratingCount ? `Рейтинг ${product.rating} из 5` : 'Пока нет оценок'}>
        <span className="stars">{product.ratingCount ? '★★★★★' : '☆☆☆☆☆'}</span>
        <span>{product.ratingCount ? `${Number(product.rating).toFixed(1)} (${product.ratingCount})` : 'Пока без оценок'}</span>
      </div>
      {(product.volume || product.category === 'Подарочные наборы') && <><p className="volume-label">Объём / размер</p><span className="volume-chip">{product.volume || 'Подарочный набор'}</span></>}
      <div className="price-line"><strong>{Number(product.price) > 0 ? money(product.price) : 'Цена уточняется'}</strong>{discounted && <del>{money(product.oldPrice)}</del>}</div>
      {!product.stock && <p className="out-of-stock">Нет в наличии</p>}
      <div className="buy-row">
        <div className="quantity" aria-label="Количество">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Уменьшить количество"><Minus size={14} /></button>
          <span>{quantity}</span>
          <button onClick={() => setQuantity(Math.min(99, quantity + 1))} aria-label="Увеличить количество"><Plus size={14} /></button>
        </div>
        <button className="button add-button" disabled={!product.stock} onClick={() => add(product, quantity)}><ShoppingBag size={16} /> В корзину</button>
      </div>
    </div>
  </Reveal>
}

function ProductGrid({ products, add }) {
  if (!products.length) return <p className="empty">В этой категории пока нет товаров.</p>
  return <div className="products-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} add={add} index={index} />)}</div>
}

function BrandsPage() {
  return <main className="section brands-page">
    <p className="eyebrow">NATURE STORE</p>
    <h1 className="page-title">Nature Store — All Brands</h1>
    <p className="brands-intro">Выберите бренд, чтобы посмотреть товары из каталога.</p>
    <div className="brands-grid">{allBrands.map(brand => <Link className="brand-card" key={brand} to={`/catalog?brand=${encodeURIComponent(brand)}`}>{brand}<ArrowRight size={16} /></Link>)}</div>
  </main>
}

function Home({ products, add, settings }) {
  const heroSlides = useMemo(() => [
    { src: settings.heroImage || '/products/nature-store-hero.png', alt: 'Коллекция косметики Nature Store' },
    ...generatedHeroSlides,
  ].filter((slide, index, slides) => slides.findIndex(item => item.src === slide.src) === index), [settings.heroImage])
  const [heroSlide, setHeroSlide] = useState(0)
  const popular = products.filter(product => product.popular).slice(0, 4)
  const newArrivals = products.filter(product => product.newArrival).slice(0, 4)
  const bestsellers = products.filter(product => product.bestseller).slice(0, 4)
  const offers = products.filter(product => product.oldPrice && product.oldPrice > product.price).slice(0, 4)
  useEffect(() => {
    if (heroSlides.length < 2) return
    const timer = setInterval(() => setHeroSlide(current => (current + 1) % heroSlides.length), 5000)
    return () => clearInterval(timer)
  }, [heroSlides.length])
  return <>
    <main>
      <section className="hero">
        <p className="eyebrow">МАГАЗИН УХОДОВОЙ КОСМЕТИКИ</p>
        <h1>Nature Store</h1>
        <p className="hero-sub">Красота начинается с заботы о себе</p>
        <Link className="button hero-button" to="/catalog">Перейти к каталогу <ArrowRight size={18} /></Link>
        <div className="hero-image" aria-label="Фотографии косметики Nature Store">
          {heroSlides.map((slide, index) => <StoreImage
            key={slide.src}
            className={`hero-slide ${index === heroSlide ? 'hero-slide-active' : ''}`}
            src={slide.src}
            alt={index === heroSlide ? slide.alt : ''}
            aria-hidden={index !== heroSlide}
          />)}
          <div className="hero-slide-indicators" aria-label="Выбрать фотографию">
            {heroSlides.map((slide, index) => <button
              key={slide.src}
              type="button"
              className={index === heroSlide ? 'active' : ''}
              aria-label={`Показать фото ${index + 1}`}
              aria-pressed={index === heroSlide}
              onClick={() => setHeroSlide(index)}
            />)}
          </div>
        </div>
      </section>

      <section className="section" id="popular">
        <SectionTitle eyebrow="ВЫБРАНО ДЛЯ ВАС" title="Популярное" action={<Link to="/catalog?category=Популярные" className="text-link">Весь каталог <ArrowRight size={16} /></Link>} />
        <ProductGrid products={popular} add={add} />
      </section>
      {newArrivals.length > 0 && <section className="section section-soft">
        <SectionTitle eyebrow="НЕДАВНО В МАГАЗИНЕ" title="Новинки" action={<Link to="/catalog?category=Новинки" className="text-link">Смотреть все <ArrowRight size={16} /></Link>} />
        <ProductGrid products={newArrivals} add={add} />
      </section>}
      {bestsellers.length > 0 && <section className="section">
        <SectionTitle eyebrow="ВЫБОР ПОКУПАТЕЛЕЙ" title="Бестселлеры" action={<Link to="/catalog?category=Бестселлеры" className="text-link">Весь каталог <ArrowRight size={16} /></Link>} />
        <ProductGrid products={bestsellers} add={add} />
      </section>}
      {offers.length > 0 && <section className="section section-soft">
        <SectionTitle eyebrow="УСПЕЙТЕ ВЫБРАТЬ" title="Специальные предложения" action={<Link to="/catalog?category=Спецпредложения" className="text-link">Все предложения <ArrowRight size={16} /></Link>} />
        <ProductGrid products={offers} add={add} />
      </section>}
      <section className="social-banner section">
        <Reveal className="social-copy"><p className="eyebrow">ОСТАВАЙТЕСЬ НА СВЯЗИ</p><h2>Мы в соц. сетях</h2><p>Будьте в курсе наших новинок, событий и специальных предложений.</p>
          <a className="button" href={settings.instagramUrl} target="_blank" rel="noreferrer">@natural_store.kg <ArrowRight size={17} /></a>
          <div className="social-tiles">{instagramPhotos.map(image => <StoreImage key={image} src={image} alt="Фото Nature Store в Instagram" loading="lazy" />)}</div>
        </Reveal>
        <Reveal className="social-phone"><StoreImage src="/products/instagram-profile.png" alt="Instagram Nature Store" loading="lazy" /></Reveal>
      </section>
      <section className="section reviews-home">
        <SectionTitle eyebrow="ВАШИ ВПЕЧАТЛЕНИЯ" title="Отзывы покупателей" action={<Link to="/reviews" className="text-link">Все отзывы <ArrowRight size={16} /></Link>} />
        <ReviewsPreview />
      </section>
      <section className="consult section">
        <Reveal className="consult-image"><StoreImage src="/products/consultation-portrait.png" alt="Консультация по уходу" loading="lazy" /></Reveal>
        <Reveal className="consult-copy"><p className="eyebrow">МЫ ПОМОЖЕМ ВЫБРАТЬ</p><h2>Нужна консультация?</h2><p>Оставьте номер, и мы свяжемся с вами в ближайшее время.</p><ConsultForm /></Reveal>
      </section>
      <FaqContent compact />
      <ContactsContent />
    </main>
  </>
}

function Catalog({ products, add }) {
  const [params, setParams] = useSearchParams()
  const selectedCategory = params.get('category') || 'Все товары'
  const query = params.get('q') || ''
  const [search, setSearch] = useState(query)
  const brand = params.get('brand') || ''
  const [availability, setAvailability] = useState('')
  const [sort, setSort] = useState('default')
  const searchTerm = search.trim().toLocaleLowerCase('ru')
  const searchingForSerum = /^(?:свратк|сыворотк)/u.test(searchTerm)
  useEffect(() => setSearch(query), [query])
  const brands = useMemo(() => [...new Set([...allBrands, ...products.map(product => product.brand)].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)), [products])
  const shown = useMemo(() => {
    let rows = products.filter(product => {
      const categoryMatch = selectedCategory === 'Все товары'
        || product.category === selectedCategory
        || (selectedCategory === 'Новинки' && product.newArrival)
        || (selectedCategory === 'Бестселлеры' && product.bestseller)
        || (selectedCategory === 'Популярные' && product.popular)
        || (selectedCategory === 'Спецпредложения' && product.oldPrice > product.price)
      return categoryMatch
        && (!brand || product.brand === brand)
        && (!availability || String(product.stock) === availability)
        && (searchingForSerum
          ? /сыворотк|serum/iu.test(`${product.name} ${product.brand} ${product.description}`)
          : `${product.name} ${product.brand} ${product.description}`.toLocaleLowerCase('ru').includes(searchTerm))
    })
    if (sort === 'low') rows = [...rows].sort((a, b) => a.price - b.price)
    if (sort === 'high') rows = [...rows].sort((a, b) => b.price - a.price)
    if (sort === 'name') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    return rows
  }, [products, selectedCategory, brand, availability, searchTerm, searchingForSerum, sort])
  const chooseCategory = category => {
    const next = new URLSearchParams(params)
    if (category === 'Все товары') next.delete('category')
    else next.set('category', category)
    setParams(next)
  }
  const chooseBrand = value => {
    const next = new URLSearchParams(params)
    if (value) next.set('brand', value)
    else next.delete('brand')
    setParams(next)
  }
  return <main className="section catalog-page">
    <p className="eyebrow">NATURE STORE · КАТАЛОГ</p><h1 className="page-title">{selectedCategory === 'Все товары' ? 'Каталог товаров' : selectedCategory}</h1>
    <div className="category-pills">{categories.map(category => <button className={selectedCategory === category ? 'active' : ''} key={category} onClick={() => chooseCategory(category)}>{category}</button>)}</div>
    <div className="catalog-tools">
      <label className="search-box"><Search /><input placeholder="Поиск товаров" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <select aria-label="Фильтр по бренду" value={brand} onChange={event => chooseBrand(event.target.value)}><option value="">Все бренды</option>{brands.map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Фильтр наличия" value={availability} onChange={event => setAvailability(event.target.value)}><option value="">Любое наличие</option><option value="true">В наличии</option><option value="false">Нет в наличии</option></select>
      <select aria-label="Сортировка" value={sort} onChange={event => setSort(event.target.value)}><option value="default">По умолчанию</option><option value="low">Сначала дешевле</option><option value="high">Сначала дороже</option><option value="name">По названию</option></select>
    </div>
    <p className="result-count">Товаров: {shown.length}</p><ProductGrid products={shown} add={add} />
  </main>
}

function ProductPage({ products, add }) {
  const { id } = useParams()
  const product = products.find(item => String(item.id) === id)
  if (!product) return <main className="section empty"><h1>Товар не найден</h1><Link className="button" to="/catalog">Вернуться в каталог</Link></main>
  const related = products.filter(item => item.category === product.category && item.id !== product.id).slice(0, 4)
  return <main className="section product-detail">
    <Link className="back-link" to="/catalog"><ArrowLeft size={17} /> Назад в каталог</Link>
    <div className="detail-layout"><div className="detail-photo"><StoreImage src={product.image} alt={product.name} /></div>
      <div className="detail-copy"><p className="eyebrow">{product.brand}</p><h1>{product.name}</h1><p>{product.description}</p>
        <p className="detail-rating"><span className="stars">{product.ratingCount ? '★★★★★' : '☆☆☆☆☆'}</span> {product.ratingCount ? `${Number(product.rating).toFixed(1)} · ${product.ratingCount} оценок` : 'Пока без оценок'}</p>
        {(product.volume || product.category === 'Подарочные наборы') && <><p className="volume-label">Объём / размер</p><span className="volume-chip">{product.volume || 'Подарочный набор'}</span></>}
        <div className="price-line detail-price"><strong>{Number(product.price) > 0 ? money(product.price) : 'Цена уточняется'}</strong>{product.oldPrice > product.price && <del>{money(product.oldPrice)}</del>}</div>
        <button className="button" disabled={!product.stock} onClick={() => add(product, 1)}><ShoppingBag size={18} /> {product.stock ? 'Добавить в корзину' : 'Нет в наличии'}</button>
      </div>
    </div>
    {related.length > 0 && <section className="related"><SectionTitle eyebrow="ПОДОБРАНО ДЛЯ ВАС" title="Смотрите также" /><ProductGrid products={related} add={add} /></section>}
  </main>
}

function CartDrawer({ items, setItems, close }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', comment: '' })
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(false)
  const [busy, setBusy] = useState(false)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const updateQuantity = (id, quantity) => setItems(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item))
  const submitOrder = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const order = await api('/orders', { method: 'POST', body: JSON.stringify({
        ...form,
        items: items.map(item => ({ productId: item.id, quantity: item.quantity })),
      }) })
      setItems([])
      setPlaced(true)
      setError(`Заказ №${order.id} принят.`)
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }
  return <div className="overlay cart-overlay" onClick={close}>
    <aside className="cart-panel" onClick={event => event.stopPropagation()}>
      <button className="close" onClick={close} aria-label="Закрыть корзину"><X /></button>
      <p className="eyebrow">NATURE STORE</p><h2>Ваша корзина</h2>
      {placed ? <div className="success-message"><Check size={42} /><h3>Спасибо за заказ!</h3><p>{error} Мы свяжемся с вами для подтверждения.</p><button className="button" onClick={close}>Продолжить покупки</button></div>
        : !items.length ? <div className="empty cart-empty"><ShoppingBag size={36} /><p>В корзине пока пусто.</p><Link className="button" to="/catalog" onClick={close}>Перейти в каталог</Link></div>
          : <><div className="cart-lines">{items.map(item => <article className="cart-item" key={item.id}>
            <StoreImage src={item.image} alt={item.name} />
            <div className="cart-item-info"><b>{item.name}</b><span>{item.volume} · {money(item.price)} / шт.</span>
              <div className="quantity"><button aria-label="Уменьшить" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label="Увеличить" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={13} /></button></div>
            </div><strong>{money(item.price * item.quantity)}</strong>
            <button className="remove" aria-label={`Удалить ${item.name}`} onClick={() => setItems(current => current.filter(row => row.id !== item.id))}><X size={17} /></button>
          </article>)}</div>
            <div className="cart-total"><span>Сумма</span><b>{money(total)}</b></div>
            <form className="order-form" onSubmit={submitOrder}><h3>Данные для оформления</h3>
              <input required maxLength={120} placeholder="Ваше имя" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
              <input required type="tel" maxLength={40} placeholder="Номер телефона" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />
              <input maxLength={300} placeholder="Адрес доставки" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} />
              <textarea maxLength={1000} placeholder="Комментарий к заказу" value={form.comment} onChange={event => setForm({ ...form, comment: event.target.value })} />
              {error && <p className="form-error">{error}</p>}
              <button className="button full" disabled={busy}>{busy ? 'Отправляем…' : 'Оформить заказ'}</button>
            </form>
          </>}
    </aside>
  </div>
}

function ConsultForm() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = async event => {
    event.preventDefault()
    setError('')
    try {
      await api('/consultations', { method: 'POST', body: JSON.stringify(form) })
      setSent(true)
    } catch (reason) {
      setError(reason.message)
    }
  }
  if (sent) return <p className="success-inline"><Check size={20} /> Спасибо! Заявка принята, скоро свяжемся.</p>
  return <form className="consult-form" onSubmit={submit}>
    <input required maxLength={120} placeholder="Ваше имя" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
    <input required type="tel" maxLength={40} placeholder="Ваш номер телефона" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />
    <textarea maxLength={1000} placeholder="Что вас интересует? (необязательно)" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} />
    {error && <p className="form-error">{error}</p>}<button className="button">Отправить</button>
  </form>
}

function ReviewsPreview() {
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api('/reviews')
      .then(setReviews)
      .catch(reason => setError(reason.message))
      .finally(() => setLoading(false))
  }, [])
  if (error) return <p className="form-error">{error}</p>
  if (loading) return <p className="empty">Загружаем отзывы…</p>
  if (!reviews.length) return <div className="reviews-empty">
    <p>Пока нет опубликованных отзывов. Поделитесь впечатлением — ваш отзыв появится после проверки.</p>
    <Link className="button" to="/reviews">Оставить отзыв <ArrowRight size={17} /></Link>
  </div>
  return <div className="reviews-grid">{reviews.slice(0, 3).map((review, index) => <Reveal className="review-card" key={review.id} delay={index * 80}>
    <div className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div><p>{review.message}</p><b>{review.name}</b>
  </Reveal>)}</div>
}

function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [form, setForm] = useState({ name: '', message: '', rating: '5' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = () => {
    setLoading(true)
    setError('')
    api('/reviews')
      .then(setReviews)
      .catch(reason => setError(reason.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { refresh() }, [])
  const submit = async event => {
    event.preventDefault()
    setError('')
    try {
      await api('/reviews', { method: 'POST', body: JSON.stringify({ ...form, rating: Number(form.rating) }) })
      setSent(true)
    } catch (reason) { setError(reason.message) }
  }
  return <main className="section simple-page"><p className="eyebrow">ОПЫТ НАШИХ ПОКУПАТЕЛЕЙ</p><h1 className="page-title">Отзывы</h1>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Загружаем отзывы…</p> : reviews.length
      ? <div className="reviews-grid">{reviews.map(review => <article className="review-card" key={review.id}><div className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div><p>{review.message}</p><b>{review.name}</b></article>)}</div>
      : !error && <p className="empty">Пока нет опубликованных отзывов. Станьте первым и расскажите о своём опыте.</p>}
    <div className="review-form-card" id="review-form"><h2>Оставить отзыв</h2>{sent ? <p className="success-inline"><Check size={20} /> Спасибо! Отзыв появится после проверки.</p> : <form className="admin-form-grid" onSubmit={submit}>
      <input required maxLength={100} placeholder="Ваше имя" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
      <select aria-label="Ваша оценка" value={form.rating} onChange={event => setForm({ ...form, rating: event.target.value })}>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} из 5 звёзд</option>)}</select>
      <textarea required maxLength={1500} placeholder="Поделитесь впечатлениями" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} />
      {error && <p className="form-error">{error}</p>}<button className="button">Отправить на проверку</button>
    </form>}</div>
  </main>
}

function FaqContent({ compact = false }) {
  const questions = [
    ['Оплата и доставка', 'Доставка доступна по Кара-Балте, Бишкеку и другим городам Кыргызстана. Стоимость и сроки доставки менеджер подтвердит после оформления заказа.'],
    ['Как выбрать подходящую косметику?', 'Оставьте заявку на консультацию и расскажите о своих пожеланиях. Мы свяжемся с вами и поможем подобрать уход.'],
    ['Оригинальная ли продукция?', 'Мы поможем уточнить информацию о товаре и ответим на вопросы до оформления заказа.'],
    ['Как оформить заказ?', 'Добавьте нужные товары в корзину и укажите имя и номер телефона. Менеджер свяжется с вами для подтверждения.'],
  ]
  return <section className={`section faq-section ${compact ? 'faq-compact' : ''}`}>
    <SectionTitle eyebrow="ПОМОГАЕМ РАЗОБРАТЬСЯ" title="Ответы на вопросы" action={compact && <Link className="text-link" to="/faq">Все вопросы <ArrowRight size={16} /></Link>} />
    <div className="faq-layout"><StoreImage src="/products/nature-store-sign.png" alt="Вывеска Nature Store" loading="lazy" />
      <div>{questions.slice(0, compact ? 3 : questions.length).map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div>
    </div>
  </section>
}

function ContactsContent() {
  const mapQuery = encodeURIComponent('Кара-Балта, улица Сторонже, 12')
  return <section className="section contacts-section"><SectionTitle eyebrow="МЫ РЯДОМ" title="Контакты" />
    <div className="contacts-grid"><div className="contact-cards">
      <p><Phone /> <a href="tel:+996500458888">+996 (500) 458-888</a></p>
      <p><MapPin /> Кара-Балта, ул. Сторонже, 12</p><p><Clock3 /> Ежедневно с 09:00 до 19:00</p>
      <a className="button" href="https://instagram.com/natural_store.kg" target="_blank" rel="noreferrer"><Instagram size={18} /> Instagram</a>
      <Link to="/consultation" className="text-link">Задать вопрос <ArrowRight size={16} /></Link>
    </div>
    <div className="map-frame"><iframe title="Карта: Nature Store в Кара-Балте" loading="lazy" src={`https://yandex.ru/map-widget/v1/?text=${mapQuery}&z=16`} /><a href={`https://yandex.com/maps/?text=${mapQuery}`} target="_blank" rel="noreferrer">Открыть карту</a></div></div>
  </section>
}

function FaqPage() {
  return <main className="simple-page"><FaqContent /></main>
}

function ContactsPage() {
  return <main className="simple-page"><ContactsContent /></main>
}

function Footer({ settings }) {
  return <footer className="footer"><div className="footer-inner">
    <div><Link to="/" className="footer-brand">Nature Store</Link><p className="footer-tag">BEAUTY · NATURE · CARE</p><p>Натуральная косметика<br />для вашей красоты и здоровья.</p></div>
    <div><h3>Для связи</h3><a href="tel:+996500458888">+996 (500) 458-888</a><p>Ежедневно · 09:00–19:00</p></div>
    <div><h3>Информация</h3><Link to="/catalog">Каталог</Link><Link to="/brands">Все бренды</Link><Link to="/reviews">Отзывы</Link><Link to="/faq">Вопросы и ответы</Link><Link to="/contacts">Контакты</Link></div>
    <div><h3>Мы в соц. сетях</h3><a href={settings.instagramUrl} target="_blank" rel="noreferrer"><Instagram size={18} /> @natural_store.kg</a><p>Доставка по Кыргызстану ♥</p></div>
  </div><p className="copyright">© {new Date().getFullYear()} Nature Store · Кара-Балта, Кыргызстан</p></footer>
}

const blankProduct = {
  name: '', brand: '', category: storeCategories[0], description: '', price: '', oldPrice: '',
  volume: '', image: '', rating: 0, ratingCount: 0, stock: true, popular: false, newArrival: false, bestseller: false,
}

function AdminPage({ refreshProducts, connected }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [credentials, setCredentials] = useState({ username: 'admin', password: '' })
  const [tab, setTab] = useState('dashboard')
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [consultations, setConsultations] = useState([])
  const [editing, setEditing] = useState(null)
  const [productForm, setProductForm] = useState(blankProduct)
  const [settings, setSettings] = useState({ heroImage: '', instagramUrl: '' })
  const [busy, setBusy] = useState(false)
  const loadAdminData = async () => {
    const [productRows, settingRows, statRows] = await Promise.all([
      api('/admin/products'), api('/admin/settings'), api('/admin/stats'),
    ])
    setProducts(productRows)
    setSettings(settingRows)
    setStats(statRows)
  }
  useEffect(() => {
    api('/admin/me').then(() => setLoggedIn(true)).catch(() => {}).finally(() => setChecking(false))
  }, [])
  useEffect(() => {
    if (!loggedIn) return
    setError('')
    if (tab === 'dashboard' || tab === 'products' || tab === 'settings') {
      loadAdminData().catch(reason => setError(reason.message))
    }
    if (tab === 'orders') api('/admin/orders').then(setOrders).catch(reason => setError(reason.message))
    if (tab === 'reviews') api('/admin/reviews').then(setReviews).catch(reason => setError(reason.message))
    if (tab === 'consultations') api('/admin/consultations').then(setConsultations).catch(reason => setError(reason.message))
  }, [loggedIn, tab])
  const login = async event => {
    event.preventDefault()
    setLoginError('')
    try {
      await api('/admin/login', { method: 'POST', body: JSON.stringify(credentials) })
      setLoggedIn(true)
      setTab('dashboard')
    } catch (reason) { setLoginError(reason.message) }
  }
  const logout = async () => {
    try { await api('/admin/logout', { method: 'POST' }) } catch (reason) { setError(reason.message) }
    setLoggedIn(false)
  }
  const updateOrder = async (id, status) => {
    try {
      await api(`/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setOrders(rows => rows.map(row => row.id === id ? { ...row, status } : row))
      const freshStats = await api('/admin/stats')
      setStats(freshStats)
    } catch (reason) { setError(reason.message) }
  }
  const updateConsultation = async (id, status) => {
    try {
      await api(`/admin/consultations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setConsultations(rows => rows.map(row => row.id === id ? { ...row, status } : row))
    } catch (reason) { setError(reason.message) }
  }
  const updateReview = async (review, approved) => {
    try {
      await api(`/admin/reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ approved }) })
      setReviews(rows => rows.map(row => row.id === review.id ? { ...row, approved } : row))
    } catch (reason) { setError(reason.message) }
  }
  const deleteReview = async id => {
    if (!window.confirm('Удалить отзыв?')) return
    try {
      await api(`/admin/reviews/${id}`, { method: 'DELETE' })
      setReviews(rows => rows.filter(row => row.id !== id))
    } catch (reason) { setError(reason.message) }
  }
  const deleteProduct = async id => {
    if (!window.confirm('Удалить этот товар?')) return
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' })
      await refreshProducts()
      setProducts(rows => rows.filter(row => row.id !== id))
    } catch (reason) { setError(reason.message) }
  }
  const editProduct = product => {
    setEditing(product.id)
    setProductForm({ ...product, oldPrice: product.oldPrice ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const saveProduct = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const body = { ...productForm, price: Number(productForm.price), oldPrice: productForm.oldPrice === '' ? null : Number(productForm.oldPrice) }
    try {
      await api(editing ? `/admin/products/${editing}` : '/admin/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) })
      setProductForm(blankProduct)
      setEditing(null)
      await Promise.all([refreshProducts(), loadAdminData()])
    } catch (reason) { setError(reason.message) } finally { setBusy(false) }
  }
  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    const body = new FormData()
    body.append('image', file)
    try {
      const result = await api('/admin/upload', { method: 'POST', body })
      setProductForm(current => ({ ...current, image: result.url }))
    } catch (reason) { setError(reason.message) }
    event.target.value = ''
  }
  const saveSettings = async event => {
    event.preventDefault()
    try {
      const saved = await api('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
      setSettings(saved)
      await refreshProducts()
    } catch (reason) { setError(reason.message) }
  }
  const uploadBanner = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    const body = new FormData()
    body.append('image', file)
    try {
      const result = await api('/admin/upload', { method: 'POST', body })
      setSettings(current => ({ ...current, heroImage: result.url }))
    } catch (reason) { setError(reason.message) }
    event.target.value = ''
  }
  if (checking) return <main className="login-wrap"><p>Проверяем доступ…</p></main>
  if (!loggedIn) return <main className="login-wrap">
    <form className="login-card" onSubmit={login}><p className="eyebrow">NATURE STORE</p><h1>Вход в админ-панель</h1>
      <input required autoComplete="username" placeholder="Логин" value={credentials.username} onChange={event => setCredentials({ ...credentials, username: event.target.value })} />
      <input required type="password" autoComplete="current-password" placeholder="Пароль" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} />
      {loginError && <p className="form-error">{loginError}</p>}<button className="button full">Войти</button><small>Защищённый вход администратора</small>
    </form>
  </main>
  const tabs = [
    ['dashboard', 'Обзор', <LayoutDashboard key="dashboard" />],
    ['products', 'Товары', <Package key="products" />],
    ['orders', 'Заказы', <ShoppingCart key="orders" />],
    ['consultations', 'Заявки', <Phone key="consultations" />],
    ['reviews', 'Отзывы', <Star key="reviews" />],
    ['settings', 'Настройки сайта', <Pencil key="settings" />],
  ]
  return <main className="admin-shell">
    <aside className="admin-sidebar"><Link to="/" className="admin-logo">Nature Store</Link><p className="admin-caption">ПАНЕЛЬ УПРАВЛЕНИЯ</p>
      <nav>{tabs.map(([key, title, icon]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{icon}{title}</button>)}</nav>
      <button className="admin-logout" onClick={logout}><ArrowLeft size={17} /> Выйти</button>
    </aside>
    <section className="admin-content"><div className="admin-top"><div><p className="eyebrow">УПРАВЛЕНИЕ МАГАЗИНОМ</p><h1>{tabs.find(([key]) => key === tab)?.[1]}</h1></div><span className={`connection ${connected ? 'online' : ''}`}><i />{connected ? 'Магазин подключён' : 'Нет соединения с API'}</span></div>
      {error && <p className="form-error admin-error">{error}</p>}
      {tab === 'dashboard' && <div className="stats-grid">{[
        ['Товары', stats?.products ?? '—', Package], ['Заказы', stats?.orders ?? '—', ShoppingBag],
        ['Новые заказы', stats?.newOrders ?? '—', ShoppingCart], ['Продажи', money(stats?.revenue), Check],
        ['Заявки на консультацию', stats?.consultations ?? '—', Phone],
      ].map(([label, value, Icon]) => <article className="stat-card" key={label}><Icon /><span>{label}</span><strong>{value}</strong></article>)}</div>}
      {tab === 'products' && <><form className="admin-panel" onSubmit={saveProduct}><h2>{editing ? 'Изменить товар' : 'Добавить товар'}</h2>
        <div className="admin-form-grid">
          <label>Название<input required maxLength={160} value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })} /></label>
          <label>Бренд<input value={productForm.brand} onChange={event => setProductForm({ ...productForm, brand: event.target.value })} /></label>
          <label>Категория<select value={productForm.category} onChange={event => setProductForm({ ...productForm, category: event.target.value })}>{storeCategories.map(category => <option key={category}>{category}</option>)}</select></label>
          <label>Объём / размер<input value={productForm.volume} onChange={event => setProductForm({ ...productForm, volume: event.target.value })} /></label>
          <label>Цена, сом<input required type="number" min="0" step="1" value={productForm.price} onChange={event => setProductForm({ ...productForm, price: event.target.value })} /></label>
          <label>Старая цена<input type="number" min="0" step="1" value={productForm.oldPrice} onChange={event => setProductForm({ ...productForm, oldPrice: event.target.value })} /></label>
          <label>Рейтинг (если есть)<input type="number" min="0" max="5" step="0.1" value={productForm.rating} onChange={event => setProductForm({ ...productForm, rating: event.target.value })} /></label>
          <label>Количество оценок<input type="number" min="0" step="1" value={productForm.ratingCount} onChange={event => setProductForm({ ...productForm, ratingCount: event.target.value })} /></label>
          <label className="wide">Ссылка на фото<input value={productForm.image} onChange={event => setProductForm({ ...productForm, image: event.target.value })} placeholder="/products/имя-файла.jpg" /></label>
          <label className="upload-button wide"><Upload size={18} /> Загрузить фото (JPG, PNG, WebP · до 5 МБ)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>
          {productForm.image && <StoreImage className="admin-image-preview wide" src={productForm.image} alt="Предпросмотр товара" />}
          <label className="wide">Описание<textarea maxLength={2000} value={productForm.description} onChange={event => setProductForm({ ...productForm, description: event.target.value })} /></label>
          <div className="checkbox-row wide">{[['stock', 'В наличии'], ['popular', 'Популярное'], ['newArrival', 'Новинка'], ['bestseller', 'Бестселлер']].map(([key, title]) => <label key={key}><input type="checkbox" checked={Boolean(productForm[key])} onChange={event => setProductForm({ ...productForm, [key]: event.target.checked })} />{title}</label>)}</div>
        </div><div className="form-actions"><button className="button" disabled={busy}>{busy ? 'Сохраняем…' : editing ? 'Сохранить товар' : 'Добавить товар'}</button>{editing && <button type="button" className="button secondary" onClick={() => { setEditing(null); setProductForm(blankProduct) }}>Отмена</button>}</div>
      </form><div className="admin-panel"><h2>Каталог ({products.length})</h2><div className="admin-product-list">{products.map(product => <article className="admin-product" key={product.id}><StoreImage src={product.image} alt="" /><div><b>{product.name}</b><small>{product.brand} · {money(product.price)} · {product.category}</small></div><button aria-label="Изменить товар" onClick={() => editProduct(product)}><Pencil size={17} /></button><button aria-label="Удалить товар" onClick={() => deleteProduct(product.id)}><Trash2 size={17} /></button></article>)}</div></div></>}
      {tab === 'orders' && <div className="admin-panel"><h2>Заказы ({orders.length})</h2>{orders.length ? <div className="admin-record-list">{orders.map(order => <article className="admin-record" key={order.id}><div className="record-heading"><h3>Заказ №{order.id}</h3><strong>{money(order.total)}</strong></div><p>{order.name} · <a href={`tel:${order.phone}`}>{order.phone}</a></p><p>{order.address || 'Самовывоз / адрес уточнить'}{order.comment && ` · ${order.comment}`}</p><ul>{order.items.map((item, index) => <li key={`${order.id}-${index}`}>{item.name} × {item.quantity} — {money(item.price * item.quantity)}</li>)}</ul><div className="record-bottom"><small>{new Date(order.createdAt).toLocaleString('ru-RU')}</small><select aria-label={`Статус заказа ${order.id}`} value={order.status} onChange={event => updateOrder(order.id, event.target.value)}>{orderStatuses.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></div></article>)}</div> : <p className="empty">Заказов пока нет.</p>}</div>}
      {tab === 'consultations' && <div className="admin-panel"><h2>Заявки на консультацию ({consultations.length})</h2>{consultations.length ? <div className="admin-record-list">{consultations.map(item => <article className="admin-record" key={item.id}><div className="record-heading"><h3>{item.name}</h3><select aria-label={`Статус заявки ${item.id}`} value={item.status} onChange={event => updateConsultation(item.id, event.target.value)}>{['new', 'contacted', 'closed'].map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div><p><a href={`tel:${item.phone}`}>{item.phone}</a></p><p>{item.message || 'Без комментария'}</p><small>{new Date(item.createdAt).toLocaleString('ru-RU')}</small></article>)}</div> : <p className="empty">Заявок пока нет.</p>}</div>}
      {tab === 'reviews' && <div className="admin-panel"><h2>Отзывы ({reviews.length})</h2>{reviews.length ? <div className="admin-record-list">{reviews.map(review => <article className="admin-record" key={review.id}><div className="record-heading"><h3>{review.name}</h3><span className="stars">{'★'.repeat(review.rating)}</span></div><p>{review.message}</p><small>{new Date(review.createdAt).toLocaleDateString('ru-RU')} · {review.approved ? 'Опубликован' : 'На проверке'}</small><div className="form-actions"><button className="button small-button" onClick={() => updateReview(review, !review.approved)}>{review.approved ? 'Скрыть отзыв' : 'Опубликовать'}</button><button className="button danger small-button" onClick={() => deleteReview(review.id)}>Удалить</button></div></article>)}</div> : <p className="empty">Отзывов пока нет.</p>}</div>}
      {tab === 'settings' && <form className="admin-panel admin-settings" onSubmit={saveSettings}><h2>Главный баннер и соцсети</h2>
        <label>Фото главного баннера<input value={settings.heroImage} onChange={event => setSettings({ ...settings, heroImage: event.target.value })} placeholder="/products/nature-store-hero.png" /></label>
        <label className="upload-button"><Upload size={18} /> Загрузить новый баннер<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} /></label>
        {settings.heroImage && <StoreImage className="banner-preview" src={settings.heroImage} alt="Предпросмотр баннера" />}
        <label>Ссылка на Instagram<input type="url" required value={settings.instagramUrl} onChange={event => setSettings({ ...settings, instagramUrl: event.target.value })} /></label>
        <button className="button">Сохранить настройки</button>
      </form>}
    </section>
  </main>
}

export default function App() {
  const { products, refresh, connected, error } = useProducts()
  const [settings, setSettings] = useState({ heroImage: '/products/nature-store-hero.png', instagramUrl: 'https://instagram.com/natural_store.kg' })
  const [settingsError, setSettingsError] = useState('')
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ns_cart') || '[]')
      return Array.isArray(saved) ? saved : []
    } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => { localStorage.setItem('ns_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => {
    api('/settings')
      .then(value => {
        setSettings(value)
        setSettingsError('')
      })
      .catch(reason => setSettingsError(reason.message))
  }, [connected])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(timer)
  }, [toast])
  const add = (product, quantity = 1) => {
    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      return existing
        ? current.map(item => item.id === product.id ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item)
        : [...current, { ...product, quantity }]
    })
    setToast('Товар добавлен в корзину')
  }
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  return <>
    <Header cartCount={cartCount} onCart={() => setCartOpen(true)} />
    {!connected && <div className="api-notice">Сервер магазина недоступен. Каталог показан в режиме просмотра; заказы и заявки пока не отправляются. {error && <span>{error}</span>}</div>}
    {connected && settingsError && <div className="api-notice">{settingsError}</div>}
    <Routes>
      <Route path="/" element={<Home products={products} add={add} settings={settings} />} />
      <Route path="/catalog" element={<Catalog products={products} add={add} />} />
      <Route path="/brands" element={<BrandsPage />} />
      <Route path="/product/:id" element={<ProductPage products={products} add={add} />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/consultation" element={<main className="section consultation-page"><Reveal className="consult-image"><StoreImage src="/products/consultation-portrait.png" alt="Консультация по уходу" /></Reveal><div><p className="eyebrow">МЫ ПОМОЖЕМ ВЫБРАТЬ</p><h1 className="page-title">Нужна консультация?</h1><ConsultForm /></div></main>} />
      <Route path="/admin" element={<AdminPage refreshProducts={refresh} connected={connected} />} />
      <Route path="*" element={<main className="section empty"><h1>Страница не найдена</h1><Link className="button" to="/">На главную</Link></main>} />
    </Routes>
    <Footer settings={settings} />
    {cartOpen && <CartDrawer items={cart} setItems={setCart} close={() => setCartOpen(false)} />}
    <div className={`toast ${toast ? 'toast-visible' : ''}`} role="status">{toast}</div>
  </>
}
