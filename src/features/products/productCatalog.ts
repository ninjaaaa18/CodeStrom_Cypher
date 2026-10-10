export const PRODUCT_CATEGORIES = [
  "Men's Wear",
  "Women's Wear",
  'Ethnic Wear',
  'Fabrics & Textiles',
  'Fashion Accessories',
  'Clothing Essentials',
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export type ProductArtworkKind =
  | 'oxford-shirt'
  | 'indigo-denim'
  | 'wrap-blouse'
  | 'wide-leg-trouser'
  | 'chanderi-kurta'
  | 'handloom-saree'
  | 'khadi-cotton'
  | 'linen-weave'
  | 'canvas-tote'
  | 'silk-scarf'
  | 'rib-socks'
  | 'cotton-tee'

export type Product = {
  id: string
  name: string
  category: ProductCategory
  price: number
  description: string
  availability: string
  material: string
  color: string
  sizeOptions: string[]
  sellingUnit: 'piece' | 'pair' | 'metre'
  artwork: ProductArtworkKind
  imageAlt: string
  /** Optional real product photo served from /catalog (falls back to editorial artwork). */
  imageSrc?: string
}

export const PRODUCTS: Product[] = [
  {
    id: 'mens-cotton-oxford',
    name: "Men's cotton oxford shirt",
    category: "Men's Wear",
    price: 1290,
    description:
      'A clean, easy-wearing cotton oxford with a softly structured collar and a straight everyday fit.',
    availability: 'Demo sample listing',
    material: '100% cotton',
    color: 'Soft ecru',
    sizeOptions: ['S', 'M', 'L', 'XL'],
    sellingUnit: 'piece',
    artwork: 'oxford-shirt',
    imageAlt: 'Editorial illustration of an ecru cotton oxford shirt',
    imageSrc: '/catalog/mens-cotton-oxford.jpeg',
  },
  {
    id: 'mens-indigo-jeans',
    name: "Men's straight-fit indigo jeans",
    category: "Men's Wear",
    price: 1890,
    description:
      'Straight-leg denim in a deep indigo wash, designed as a versatile base for relaxed daily dressing.',
    availability: 'Demo sample listing',
    material: 'Cotton denim',
    color: 'Deep indigo',
    sizeOptions: ['30', '32', '34', '36'],
    sellingUnit: 'piece',
    artwork: 'indigo-denim',
    imageAlt: 'Editorial illustration of deep indigo straight-fit denim',
    imageSrc: '/catalog/mens-indigo-jeans.jpeg',
  },
  {
    id: 'womens-wrap-blouse',
    name: "Women's cotton wrap blouse",
    category: "Women's Wear",
    price: 1140,
    description:
      'A light wrap-front blouse with a gently shaped waist and an understated silhouette for work or weekends.',
    availability: 'Demo sample listing',
    material: 'Cotton voile',
    color: 'Warm terracotta',
    sizeOptions: ['XS', 'S', 'M', 'L'],
    sellingUnit: 'piece',
    artwork: 'wrap-blouse',
    imageAlt: 'Editorial illustration of a terracotta cotton wrap blouse',
    imageSrc: '/catalog/womens-wrap-blouse.jpeg',
  },
  {
    id: 'womens-wide-leg-trousers',
    name: "Women's wide-leg trousers",
    category: "Women's Wear",
    price: 1590,
    description:
      'Fluid, full-length trousers with a relaxed leg and a comfortable mid-rise waist.',
    availability: 'Demo sample listing',
    material: 'Linen-cotton blend',
    color: 'Olive',
    sizeOptions: ['XS', 'S', 'M', 'L'],
    sellingUnit: 'piece',
    artwork: 'wide-leg-trouser',
    imageAlt: 'Editorial illustration of olive wide-leg trousers',
    imageSrc: '/catalog/womens-wide-leg-trousers.jpeg',
  },
  {
    id: 'chanderi-kurta',
    name: 'Chanderi straight kurta',
    category: 'Ethnic Wear',
    price: 2190,
    description:
      'A refined straight kurta with delicate woven texture, an easy side-slit hem and considered detailing.',
    availability: 'Demo sample listing',
    material: 'Cotton-silk Chanderi',
    color: 'Sage green',
    sizeOptions: ['S', 'M', 'L', 'XL'],
    sellingUnit: 'piece',
    artwork: 'chanderi-kurta',
    imageAlt: 'Editorial illustration of a sage green Chanderi kurta',
    imageSrc: '/catalog/chanderi-kurta.jpeg',
  },
  {
    id: 'handloom-cotton-saree',
    name: 'Handloom cotton saree',
    category: 'Ethnic Wear',
    price: 2490,
    description:
      'A breathable handloom drape with a fine woven stripe and a contrasting border for everyday occasions.',
    availability: 'Demo sample listing',
    material: 'Handloom cotton',
    color: 'Ink blue with rust border',
    sizeOptions: ['One size · 5.5 m'],
    sellingUnit: 'piece',
    artwork: 'handloom-saree',
    imageAlt: 'Editorial illustration of an ink-blue handloom cotton saree',
    imageSrc: '/catalog/handloom-cotton-saree.jpeg',
  },
  {
    id: 'khadi-cotton-fabric',
    name: 'Handwoven khadi cotton',
    category: 'Fabrics & Textiles',
    price: 420,
    description:
      'A softly slubbed, handwoven cotton with a tactile, breathable finish for shirts, kurtas and craft projects.',
    availability: 'Demo sample listing',
    material: 'Handspun khadi cotton',
    color: 'Natural undyed',
    sizeOptions: [],
    sellingUnit: 'metre',
    artwork: 'khadi-cotton',
    imageAlt: 'Editorial illustration of a natural handwoven khadi cotton swatch',
    imageSrc: '/catalog/khadi-cotton.jpeg',
  },
  {
    id: 'linen-blend-fabric',
    name: 'Textured linen-blend fabric',
    category: 'Fabrics & Textiles',
    price: 560,
    description:
      'A crisp, gently textured woven cloth with a relaxed drape, suited to shirts, trousers and soft home accents.',
    availability: 'Demo sample listing',
    material: 'Linen-cotton blend',
    color: 'Stone grey',
    sizeOptions: [],
    sellingUnit: 'metre',
    artwork: 'linen-weave',
    imageAlt: 'Editorial illustration of a stone-grey linen blend fabric swatch',
    imageSrc: '/catalog/linen-blend-fabric.jpeg',
  },
  {
    id: 'canvas-everyday-tote',
    name: 'Canvas everyday tote',
    category: 'Fashion Accessories',
    price: 690,
    description:
      'A sturdy, unlined carryall with broad shoulder straps and room for the things you take along each day.',
    availability: 'Demo sample listing',
    material: 'Heavyweight cotton canvas',
    color: 'Natural with ink trim',
    sizeOptions: ['One size'],
    sellingUnit: 'piece',
    artwork: 'canvas-tote',
    imageAlt: 'Editorial illustration of a natural canvas tote with ink trim',
    imageSrc: '/catalog/canvas-tote.jpeg',
  },
  {
    id: 'printed-silk-scarf',
    name: 'Printed silk-blend scarf',
    category: 'Fashion Accessories',
    price: 790,
    description:
      'A lightweight square scarf with a small-scale botanical print and a soft, fluid hand feel.',
    availability: 'Demo sample listing',
    material: 'Silk-cotton blend',
    color: 'Cobalt and cream',
    sizeOptions: ['One size · 65 × 65 cm'],
    sellingUnit: 'piece',
    artwork: 'silk-scarf',
    imageAlt: 'Editorial illustration of a cobalt and cream printed scarf',
    imageSrc: '/catalog/silk-scarf.jpeg',
  },
  {
    id: 'cotton-rib-socks',
    name: 'Cotton rib crew socks',
    category: 'Clothing Essentials',
    price: 220,
    description:
      'A soft, everyday rib-knit crew sock with a comfortable cuff and a little stretch for an easy fit.',
    availability: 'Demo sample listing',
    material: 'Cotton-rich knit',
    color: 'Warm beige',
    sizeOptions: ['One size · UK 6–10'],
    sellingUnit: 'pair',
    artwork: 'rib-socks',
    imageAlt: 'Editorial illustration of warm beige cotton rib crew socks',
    imageSrc: '/catalog/rib-socks.jpeg',
  },
  {
    id: 'everyday-cotton-tee',
    name: 'Everyday cotton crew tee',
    category: 'Clothing Essentials',
    price: 590,
    description:
      'A dependable crew-neck tee in breathable cotton jersey, finished with a straight hem and easy fit.',
    availability: 'Demo sample listing',
    material: 'Cotton jersey',
    color: 'Washed black',
    sizeOptions: ['S', 'M', 'L', 'XL'],
    sellingUnit: 'piece',
    artwork: 'cotton-tee',
    imageAlt: 'Editorial illustration of a washed-black cotton crew-neck tee',
    imageSrc: '/catalog/cotton-tee.jpeg',
  },
]

export function getProductById(id: string | undefined): Product | undefined {
  return PRODUCTS.find((product) => product.id === id)
}
