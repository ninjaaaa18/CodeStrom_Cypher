import { useState } from 'react'
import {
  Layers,
  Ribbon,
  Scissors,
  Shirt,
  ShoppingBag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Product, ProductArtworkKind } from './productCatalog'

const artworkIcons: Partial<Record<ProductArtworkKind, LucideIcon>> = {
  'oxford-shirt': Shirt,
  'wrap-blouse': Shirt,
  'chanderi-kurta': Shirt,
  'handloom-saree': Layers,
  'khadi-cotton': Scissors,
  'linen-weave': Scissors,
  'canvas-tote': ShoppingBag,
  'silk-scarf': Ribbon,
  'rib-socks': Layers,
  'cotton-tee': Shirt,
}

type ProductArtworkProps = {
  product: Product
  compact?: boolean
}

export function ProductArtwork({ product, compact = false }: ProductArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const Icon = artworkIcons[product.artwork]
  const isTrouserArtwork =
    product.artwork === 'indigo-denim' || product.artwork === 'wide-leg-trouser'
  const showImage = Boolean(product.imageSrc) && !imageFailed

  return (
    <div
      className={`product-artwork artwork-${product.artwork}${compact ? ' is-compact' : ''}${showImage ? ' has-photo' : ''}`}
      role="img"
      aria-label={product.imageAlt}
    >
      {showImage ? (
        <img
          className="product-artwork-photo"
          src={product.imageSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <div className="artwork-grid" aria-hidden="true" />
          <div className="artwork-package" aria-hidden="true">
            <span className="artwork-brand">SWIFTORA / STUDIO</span>
            {isTrouserArtwork ? (
              <span className="artwork-trouser-silhouette" />
            ) : (
              Icon && <Icon className="artwork-icon" strokeWidth={1.35} />
            )}
            <span className="artwork-product-name">{product.name}</span>
            <span className="artwork-product-category">{product.category}</span>
          </div>
          <span className="artwork-stamp" aria-hidden="true">
            STUDIO<br />EDIT
          </span>
          <span className="artwork-shadow" aria-hidden="true" />
        </>
      )}
    </div>
  )
}
