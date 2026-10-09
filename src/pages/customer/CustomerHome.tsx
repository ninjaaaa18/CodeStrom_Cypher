import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import { ProductArtwork } from '../../features/products/ProductArtwork'
import { ProductCard } from '../../features/products/ProductCard'
import {
  PRODUCT_CATEGORIES,
  PRODUCTS,
} from '../../features/products/productCatalog'
import '../../features/products/productExperience.css'
import './customerHome.css'

const heroProduct =
  PRODUCTS.find((product) => product.id === 'chanderi-kurta') ?? PRODUCTS[0]
const supportingProducts = [
  PRODUCTS.find((product) => product.id === 'handloom-cotton-saree'),
  PRODUCTS.find((product) => product.id === 'khadi-cotton-fabric'),
]
const textileProduct = PRODUCTS.find(
  (product) => product.id === 'khadi-cotton-fabric',
)

export function CustomerHome() {
  if (!heroProduct || supportingProducts.some((product) => !product) || !textileProduct) {
    return null
  }

  return (
    <div className="home-page">
      <section className="editorial-hero" aria-labelledby="home-title">
        <div className="editorial-hero-copy">
          <p className="editorial-eyebrow">
            <span aria-hidden="true" />
            NEW ARRIVALS <span className="editorial-eyebrow-divider">/</span> THE STUDIO EDIT
          </p>
          <h1 id="home-title">
            Wear the story.
            <br />
            Keep the ease.
          </h1>
          <p className="editorial-hero-description">
            Thoughtful clothing, tactile textiles and everyday pieces, gathered
            in one considered edit.
          </p>
          <div className="editorial-hero-actions">
            <Link className="editorial-button" to={CUSTOMER_PATHS.products}>
              Explore collection <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p>Illustrative styles &amp; INR prices · customer preview</p>
          </div>
          <div className="editorial-hero-index" aria-label="Collection details">
            <span>01 — MADE TO BE WORN</span>
            <span>{PRODUCTS.length.toString().padStart(2, '0')} DEMO PIECES</span>
          </div>
        </div>

        <div className="editorial-hero-gallery" aria-label="Featured collection">
          <Link
            className="editorial-artwork editorial-artwork-main"
            to={`/products/${heroProduct.id}`}
            aria-label={`View ${heroProduct.name}, demo price ₹${heroProduct.price}`}
          >
            <ProductArtwork product={heroProduct} />
            <span className="editorial-artwork-caption">
              <span>{heroProduct.category}</span>
              <strong>{heroProduct.name}</strong>
              <span>₹{heroProduct.price} · illustrative price</span>
            </span>
          </Link>
          {supportingProducts.map((product, index) =>
            product ? (
              <Link
                className={`editorial-artwork editorial-artwork-small editorial-artwork-small-${index + 1}`}
                key={product.id}
                to={`/products/${product.id}`}
                aria-label={`View ${product.name}, demo price ₹${product.price}`}
              >
                <ProductArtwork product={product} compact />
                <span className="editorial-small-caption">
                  <span>0{index + 2} / {product.category}</span>
                  <strong>{product.name}</strong>
                </span>
              </Link>
            ) : null,
          )}
        </div>
        <span className="editorial-hero-aside" aria-hidden="true">
          SWIFTORA — CLOTHING &amp; TEXTILES
        </span>
      </section>

      <section className="editorial-search" aria-labelledby="home-search-title">
        <div>
          <p className="editorial-kicker">FIND YOUR NEXT FAVOURITE</p>
          <h2 id="home-search-title">What are you looking for?</h2>
        </div>
        <form
          className="editorial-search-form"
          action={CUSTOMER_PATHS.products}
          method="get"
          role="search"
        >
          <Search size={18} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="home-product-search">
            Search products by name
          </label>
          <input
            id="home-product-search"
            type="search"
            name="search"
            placeholder="Try linen, kurta, cotton…"
          />
          <button type="submit">
            Search <ArrowRight size={15} aria-hidden="true" />
          </button>
        </form>
      </section>

      <nav className="editorial-categories" aria-label="Shop by category">
        <p className="editorial-kicker">SHOP BY CATEGORY</p>
        <div className="editorial-category-grid">
          {PRODUCT_CATEGORIES.map((category, index) => (
            <Link
              className="editorial-category-link"
              key={category}
              to={`${CUSTOMER_PATHS.products}?category=${encodeURIComponent(category)}`}
            >
              <span className="editorial-category-index">
                0{index + 1}
                <span>
                  {PRODUCTS.filter((product) => product.category === category)
                    .length.toString()
                    .padStart(2, '0')}
                </span>
              </span>
              <span className="editorial-category-name">{category}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </nav>

      <section className="editorial-textile" aria-labelledby="textile-title">
        <div className="editorial-textile-artwork">
          <ProductArtwork product={textileProduct} />
          <span>THE MATERIAL NOTE / 01</span>
        </div>
        <div className="editorial-textile-copy">
          <p className="editorial-kicker">A CLOSER LOOK AT THE CLOTH</p>
          <h2 id="textile-title">Made slowly. Meant to be lived in.</h2>
          <p>
            A softly slubbed khadi cotton, handspun and handwoven with the
            irregular texture that makes each length feel its own. An
            illustrative fabric listing for your next considered make.
          </p>
          <Link
            className="editorial-text-link"
            to={`${CUSTOMER_PATHS.products}?category=${encodeURIComponent('Fabrics & Textiles')}`}
          >
            Explore fabrics &amp; textiles <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <span className="editorial-textile-note">
            {textileProduct.name} · ₹{textileProduct.price} / m · demo listing
          </span>
        </div>
      </section>

      <section className="editorial-featured" aria-labelledby="featured-title">
        <div className="editorial-section-heading">
          <div>
            <p className="editorial-kicker">A FEW GOOD PLACES TO START / 01</p>
            <h2 id="featured-title">Pieces for everyday, thoughtfully chosen.</h2>
          </div>
          <Link className="editorial-text-link" to={CUSTOMER_PATHS.products}>
            Browse all styles <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="editorial-product-grid">
          {PRODUCTS.slice(0, 4).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
        <p className="editorial-demo-note">
          Demo selection only. Prices, availability and size options are
          illustrative and not verified live inventory.
        </p>
      </section>

      <section className="editorial-mirror" aria-labelledby="magic-promo-title">
        <div className="editorial-mirror-copy">
          <p className="editorial-kicker">A DIFFERENT WAY TO DISCOVER</p>
          <h2 id="magic-promo-title">Meet your Magic Mirror.</h2>
          <p>
            Curious about finding your fit? Explore the customer preview for a
            little help discovering what works for you.
          </p>
        </div>
        <Link className="editorial-mirror-link" to={CUSTOMER_PATHS.magicMirror}>
          Explore Magic Mirror <Sparkles size={15} aria-hidden="true" />
        </Link>
      </section>

      <div className="editorial-signoff">
        <span aria-hidden="true">✳</span>
        <p>Good style is worth getting right.</p>
        <small>A FASHION DEMO, NOT A LIVE STORE</small>
      </div>
    </div>
  )
}
