const productPhoto = n => `${import.meta.env.BASE_URL}products/${n}`

// Картинки товаров: ключ -> файл. Фото, загруженные из админки, хранятся как data-URL.
export const IMG = {
  big: productPhoto('DrAlthea_345_Relief_Cream.jpg'),
}
export const SOCIAL_PHOTOS = [
  'instagram-althea.jpg',
  'instagram-anua.jpg',
  'instagram-hair.jpg',
  'instagram-makeup.jpg',
  'instagram-round-lab.jpg',
  'instagram-tamburins.jpg',
].map(productPhoto)
export const PRODUCT_PHOTOS = [
  ['Anua Azelaic Acid Serum', 'Anua_Azelaic_Acid_Serum.jpg'],
  ['Anua Heartleaf 70 Cream', 'Anua_Heartleaf_70_Cream.jpg'],
  ['Anua Heartleaf 77 Clear Pad', 'Anua_Heartleaf_77_Clear_Pad.jpg'],
  ['Anua Heartleaf 80 Ampoule', 'Anua_Heartleaf_80_Ampoule.jpg'],
  ['Anua Niacinamide TXA Serum', 'Anua_Niacinamide_TXA_Serum.jpg'],
  ['Anua PDRN Moisture Cream', 'Anua_PDRN_Moisture_Cream.jpg'],
  ['Anua Peach 77 Cream', 'Anua_Peach_77_Cream.jpg'],
  ['Anua Peach 77 Toner', 'Anua_Peach_77_Toner.jpg'],
  ['Anua Rice 70 Toner', 'Anua_Rice_70_Toner.jpg'],
  ['Anua Rice Enzyme Powder', 'Anua_Rice_Enzyme_Powder.jpg'],
  ['Anua Sunscreen', 'Anua_Sunscreen.jpg'],
  ['Dr. Althea 147 Barrier Cream', 'DrAlthea_147_Barrier_Cream.jpg'],
  ['Dr. Althea 345 Relief Cream', 'DrAlthea_345_Relief_Cream.jpg'],
  ['Lador Perfume Hair Oil', 'Lador_Perfume_Hair_Oil.jpg'],
  ['Lador Perfume Hair Shampoo', 'Lador_Perfume_Hair_Shampoo.jpg'],
  ['Lador Perfume Hair Treatment', 'Lador_Perfume_Hair_Treatment.jpg'],
  ['Revyline Dental Floss', 'Revyline_Dental_Floss.jpg'],
  ['Revyline Electric Toothbrush', 'Revyline_Electric_Toothbrush.jpg'],
  ['Revyline Irrigator', 'Revyline_Irrigator.jpg'],
  ['Revyline Orthodontic Kit', 'Revyline_Orthodontic_Kit.jpg'],
  ['Revyline Toothpaste', 'Revyline_Toothpaste.jpg'],
  ['Tamburins CHAMO Hand Cream', 'Tamburins_CHAMO_Hand_Cream.webp'],
  ['Tamburins CHAMO Perfume', 'Tamburins_CHAMO_Perfume.jpg'],
].map(([name, file]) => ({ name, src: productPhoto(file) }))
export const PIC = {
  hero: null,
  phone: productPhoto('instagram-profile.png'),
  grid: null,
  rphone: productPhoto('review-phone.png'),
  face: productPhoto('consultation-portrait.png'),
  sign: productPhoto('nature-store-sign.png'),
}

// Товары по умолчанию (то, что видит покупатель, пока вы ничего не меняли в админке)
export const DEF = [
  { id: 1, n: 'Byoma Moisturizing Gel-Cream', b: 'Byoma', d: 'Увлажняющий крем-гель для лица', p: 1950, o: 2350, v: '50 ml', c: 'face', pop: 1, bs: 1, st: 1, img: 'byoma' },
  { id: 2, n: 'Amouage Existence', b: 'Amouage', d: 'Парфюмерная вода', p: 2200, o: 2750, v: '100 ml', c: 'parf', pop: 1, st: 1, img: 'am1' },
  { id: 3, n: 'Amouage Guidance 46', b: 'Amouage', d: 'Парфюмерная вода', p: 2850, o: 3170, v: '100 ml', c: 'parf', pop: 1, st: 1, img: 'am2' },
  { id: 4, n: 'Bvlgari Le Gemme Tygar', b: 'Bvlgari', d: 'Парфюмерная вода', p: 2350, o: 2600, v: '100 ml', c: 'parf', pop: 1, st: 1, img: 'bv' },
  { id: 5, n: 'SKIN&LAB Barrierderm Milky Serum', b: 'SKIN&LAB', d: 'Основная сыворотка', p: 1250, v: '50 ml', c: 'face', pop: 1, st: 1, img: 'p1' },
  { id: 6, n: 'SKIN&LAB Vitamin C Brightening Serum', b: 'SKIN&LAB', d: 'Осветляющая сыворотка с витамином C и пептидами', p: 1250, v: '30 ml', c: 'face', pop: 1, nw: 1, st: 1, img: 'p2' },
  { id: 7, n: 'Cu Skin Calming Intensive Serum', b: 'Cu Skin', d: 'Интенсивная сыворотка против купероза с витамином K', p: 2050, v: '30 ml', c: 'face', pop: 1, st: 1, img: 'p3' },
  { id: 8, n: 'Genosys Multi Vita Radiance Cream', b: 'Genosys', d: 'Мультивитаминный крем для сияния кожи', p: 5200, v: '50 ml', c: 'face', pop: 1, st: 1, img: 'p4' },
  { id: 9, n: "Paula's Choice Skin Balancing Pore-Reducing Toner", b: "Paula's Choice", d: 'Матирующий тоник для сужения пор', p: 3030, v: '190 ml', c: 'face', pop: 1, bs: 1, st: 1, img: 'p5' },
  { id: 10, n: 'Dr. Althea 345 Relief Cream', b: 'Dr. Althea', d: 'Успокаивающий крем с ресвератролом', p: 1890, v: '50 ml', c: 'face', nw: 1, st: 1, img: 'big', pu: 'Снимает воспаление и покраснение, глубоко увлажняет, предотвращает сухость, снижает видимость следов от акне', tp: 'Крем', ct: 'Южная Корея' },
]

export const CATS = [['pop', 'Популярные'], ['face', 'Уход за лицом'], ['body', 'Уход для тела'], ['hair', 'Уход для волос'], ['deco', 'Декоративная косметика'], ['parf', 'Парфюмы'], ['bad', 'БАДы и витамины'], ['nw', 'Новинки'], ['bs', 'Бестселлеры'], ['sale', 'Спецпредложения']]
export const SEL = [['face', 'Уход за лицом'], ['body', 'Уход для тела'], ['hair', 'Уход для волос'], ['deco', 'Декоративная косметика'], ['parf', 'Парфюмы'], ['bad', 'БАДы и витамины'], ['other', 'Прочее']]

// Хэш PIN-кода по умолчанию (PIN: 2580). Меняется кнопкой «Сменить PIN» в админке.
export const PIN0 = '82b6a1k97p'
