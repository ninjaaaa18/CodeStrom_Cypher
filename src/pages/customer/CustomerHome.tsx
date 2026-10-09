import { ArrowDownRight, ArrowRight, MoveUpRight, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import { ProductCard } from '../../features/products/ProductCard'
import {
  PRODUCT_CATEGORIES,
  PRODUCTS,
} from '../../features/products/productCatalog'
import '../../features/products/productExperience.css'

export function CustomerHome() {
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            A FRESH TAKE ON FASHION & TEXTILES
          </p>
          <h1 id="home-title">
            STYLE, MADE
            <br />
            <span>TO MOVE WITH YOU.</span>
          </h1>
          <div className="hero-bottom">
            <p className="hero-tagline">Thoughtful pieces. Clear demo details.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to={CUSTOMER_PATHS.products}>
                Explore the style edit <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button button-quiet" to={CUSTOMER_PATHS.magicMirror}>
                Meet Magic Mirror <MoveUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="art-caption art-caption-top">TEXTURE, CUT, COLOUR</div>
          <div className="orbit orbit-outer" />
          <div className="orbit orbit-middle" />
          <div className="orbit orbit-inner" />
          <div className="orbit-cross orbit-cross-x" />
          <div className="orbit-cross orbit-cross-y" />
          <div className="orbit-core">
            <span>SWIFT</span>
            <span className="core-dot" />
          </div>
          <span className="orbit-node orbit-node-one" />
          <span className="orbit-node orbit-node-two" />
          <span className="orbit-node orbit-node-three" />
          <span className="orbit-label">YOUR STYLE<br />IN MOTION</span>
          <div className="art-caption art-caption-bottom">
            <ArrowDownRight size={15} aria-hidden="true" /> THE SWIFTORA STUDIO EDIT
          </div>
        </div>

        <div className="hero-index" aria-hidden="true">
          <span>01 — THE STYLE EDIT</span>
          <span>MADE FOR EVERYDAY EXPRESSION</span>
        </div>
      </section>

      <section className="customer-home-search" aria-labelledby="home-search-title">
        <div className="customer-home-search-copy">
          <p>CLOTHING, TEXTILES & FINISHING TOUCHES</p>
          <h2 id="home-search-title">What would you like to wear?</h2>
        </div>
        <form
          className="home-product-search"
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
            Search <ArrowRight size={14} aria-hidden="true" />
          </button>
        </form>
      </section>
      <nav className="home-category-strip" aria-label="Shop by category">
        <span className="home-category-label">SHOP BY</span>
        {PRODUCT_CATEGORIES.map((category) => (
          <Link
            className="home-category-link"
            key={category}
            to={`${CUSTOMER_PATHS.products}?category=${encodeURIComponent(category)}`}
          >
            {category}
            <span>
              {PRODUCTS.filter((product) => product.category === category)
                .length.toString()
                .padStart(2, '0')}
            </span>
          </Link>
        ))}
      </nav>

      <section className="home-intro" aria-labelledby="intro-title">
        <div className="intro-marker">
          <span>01</span>
          <span className="marker-rule" />
          <span>THE EDIT</span>
        </div>
        <div className="intro-copy">
          <h2 id="intro-title">A little more style.<br />A lot less waiting.</h2>
          <div className="intro-aside">
            <p>
              Explore considered clothing, tactile fabrics and easy-to-wear
              accessories in one editorial demo catalogue. Every price and
              availability note is illustrative, not live store information.
            </p>
            <Link className="text-link" to={CUSTOMER_PATHS.products}>
              Explore the full edit <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-featured" aria-labelledby="home-featured-title">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">A FEW GOOD PLACES TO START / 01</p>
            <h2 id="home-featured-title">Pieces for everyday, thoughtfully chosen.</h2>
          </div>
          <Link className="text-link" to={CUSTOMER_PATHS.products}>
            Browse all demo styles <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-featured-grid">
          {PRODUCTS.slice(0, 4).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
        <p className="demo-disclaimer">
          Demo selection only. Prices, availability and size options are
          illustrative and not verified live inventory.
        </p>
      </section>

      <section className="home-magic-promo" aria-labelledby="magic-promo-title">
        <div className="home-magic-copy">
          <p className="eyebrow">A DIFFERENT WAY TO DISCOVER</p>
          <h2 id="magic-promo-title">Meet your Magic Mirror.</h2>
          <p>
            Curious about finding your fit? Take a look at the customer preview
            for a little help discovering what works for you.
          </p>
        </div>
        <Link className="home-magic-link" to={CUSTOMER_PATHS.magicMirror}>
          Explore Magic Mirror <Sparkles size={15} aria-hidden="true" />
        </Link>
      </section>

      <section className="home-signoff">
        <span className="signoff-spark" aria-hidden="true">✳</span>
        <p>Good style is worth getting right.</p>
        <span className="signoff-note">A FASHION DEMO, NOT A LIVE STORE</span>
      </section>
    </div>
  )
}
