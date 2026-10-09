import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../features/products/ProductCard'
import {
  PRODUCT_CATEGORIES,
  PRODUCTS,
  type ProductCategory,
} from '../../features/products/productCatalog'
import { CUSTOMER_PATHS } from '../../features/customer/customerPaths'
import '../../features/products/productExperience.css'
import './customerProductResponsive.css'

function isProductCategory(value: string | null): value is ProductCategory {
  return PRODUCT_CATEGORIES.some((category) => category === value)
}

export function CustomerProducts() {
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search')?.trim() ?? ''
  const categoryParam = searchParams.get('category')
  const category = isProductCategory(categoryParam) ? categoryParam : ''
  const normalizedSearch = search.toLocaleLowerCase()
  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLocaleLowerCase().includes(normalizedSearch)
    const matchesCategory = !category || product.category === category
    return matchesSearch && matchesCategory
  })

  function categoryLink(value: ProductCategory | '') {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (value) params.set('category', value)
    const query = params.toString()
    return query ? `${CUSTOMER_PATHS.products}?${query}` : CUSTOMER_PATHS.products
  }

  return (
    <div className="product-page">
      <header className="catalogue-heading">
        <div>
          <p className="eyebrow">THE SWIFTORA STYLE EDIT / 01</p>
          <h1>Made to wear,<br /><span>ready to discover.</span></h1>
        </div>
        <p className="catalogue-heading-note">
          An editorial selection of clothing, textiles and considered finishing
          touches.
        </p>
      </header>

      <section className="catalogue-controls" aria-label="Find products">
        <form className="catalogue-search" action={CUSTOMER_PATHS.products} method="get">
          <label htmlFor="catalogue-search">Find something by name</label>
          <div className="catalogue-search-control">
            <Search size={19} aria-hidden="true" />
            <input
              id="catalogue-search"
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Try linen, kurta, cotton…"
            />
            {category && <input type="hidden" name="category" value={category} />}
            <button type="submit">Search</button>
          </div>
        </form>

        <nav className="category-filter" aria-label="Filter products by category">
          <div className="category-filter-label">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>FILTER BY</span>
          </div>
          <div className="category-filter-options">
            <Link
              className={!category ? 'category-filter-link is-selected' : 'category-filter-link'}
              to={categoryLink('')}
              aria-current={!category ? 'page' : undefined}
            >
              All <span>{PRODUCTS.length.toString().padStart(2, '0')}</span>
            </Link>
            {PRODUCT_CATEGORIES.map((item) => (
              <Link
                className={category === item ? 'category-filter-link is-selected' : 'category-filter-link'}
                to={categoryLink(item)}
                key={item}
                aria-current={category === item ? 'page' : undefined}
              >
                {item}
              </Link>
            ))}
          </div>
        </nav>
      </section>

      <section className="catalogue-results" aria-labelledby="catalogue-results-title">
        <div className="catalogue-results-heading">
          <div>
            <p className="eyebrow">CLOTHING, TEXTILES & FINISHING TOUCHES</p>
            <h2 id="catalogue-results-title">
              {search || category
                ? `${filteredProducts.length} ${filteredProducts.length === 1 ? 'find' : 'finds'}`
                : 'A good place to start'}
            </h2>
          </div>
          <p className="catalogue-count">
            {filteredProducts.length.toString().padStart(2, '0')} /{' '}
            {PRODUCTS.length.toString().padStart(2, '0')} DEMO STYLES
          </p>
        </div>

        {filteredProducts.length ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : (
          <div className="catalogue-empty">
            <p className="eyebrow">NO MATCHES THIS TIME</p>
            <h3>No style found this time.</h3>
            <p>
              Try a different product name or clear the category filter to see
              the full demo edit.
            </p>
            <Link className="text-link" to={CUSTOMER_PATHS.products}>
              See the full style edit <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <p className="demo-disclaimer">
        Demo catalogue only. Prices are illustrative; availability and sizes
        are not verified live inventory.
      </p>
    </div>
  )
}
