import { getProductById } from '../products/productCatalog'

export const CUSTOMER_CART_STORAGE_KEY = 'swiftora.customer.cart.v1'

export type CartItemRecord = {
  productId: string
  selectedSize: string | null
  quantity: number
}

export type CartReadResult = {
  items: CartItemRecord[]
  warning: string | null
  error: string | null
}

export type CartMutationResult = CartReadResult

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unitPriceInPaise(productId: string): number | null {
  const product = getProductById(productId)
  if (!product || !Number.isSafeInteger(product.price) || product.price <= 0) {
    return null
  }

  const priceInPaise = Math.round(product.price * 100)
  return Number.isSafeInteger(priceInPaise) ? priceInPaise : null
}

function isValidVariant(productId: string, selectedSize: unknown): selectedSize is string | null {
  const product = getProductById(productId)
  if (!product) return false

  if (product.sizeOptions.length > 1) {
    return (
      typeof selectedSize === 'string' &&
      product.sizeOptions.includes(selectedSize)
    )
  }

  return selectedSize === null
}

function isValidQuantity(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0
}

function identityMatches(
  item: CartItemRecord,
  productId: string,
  selectedSize: string | null,
): boolean {
  return item.productId === productId && item.selectedSize === selectedSize
}

function getQuantityLimit(productId: string): number {
  const priceInPaise = unitPriceInPaise(productId)
  return priceInPaise ? Math.floor(Number.MAX_SAFE_INTEGER / priceInPaise) : 0
}

function hasSafeCartTotals(items: CartItemRecord[]): boolean {
  let totalQuantity = 0
  let totalPaise = 0

  for (const item of items) {
    const priceInPaise = unitPriceInPaise(item.productId)
    if (priceInPaise === null) return false
    totalQuantity += item.quantity
    totalPaise += priceInPaise * item.quantity
    if (!Number.isSafeInteger(totalQuantity) || !Number.isSafeInteger(totalPaise)) {
      return false
    }
  }

  return true
}

function normalizeItems(value: unknown): { items: CartItemRecord[]; warning: string | null } {
  if (!Array.isArray(value)) {
    return {
      items: [],
      warning: 'Saved cart data was not in the expected format and has been ignored.',
    }
  }

  const items: CartItemRecord[] = []
  let totalItems = 0
  let totalPaise = 0
  let discarded = false

  for (const candidate of value) {
    if (!isRecord(candidate)) {
      discarded = true
      continue
    }

    const productId = candidate.productId
    const selectedSize = candidate.selectedSize
    const quantity = candidate.quantity
    if (
      typeof productId !== 'string' ||
      unitPriceInPaise(productId) === null ||
      !isValidVariant(productId, selectedSize) ||
      !isValidQuantity(quantity)
    ) {
      discarded = true
      continue
    }

    const priceInPaise = unitPriceInPaise(productId)
    if (priceInPaise === null) {
      discarded = true
      continue
    }

    const existingIndex = items.findIndex((item) =>
      identityMatches(item, productId, selectedSize),
    )
    const combinedQuantity =
      quantity + (existingIndex >= 0 ? items[existingIndex].quantity : 0)
    const lineTotal = priceInPaise * combinedQuantity
    const nextTotalItems = totalItems + quantity
    const nextTotalPaise = totalPaise + priceInPaise * quantity
    if (
      !Number.isSafeInteger(combinedQuantity) ||
      combinedQuantity > getQuantityLimit(productId) ||
      !Number.isSafeInteger(lineTotal) ||
      !Number.isSafeInteger(nextTotalItems) ||
      !Number.isSafeInteger(nextTotalPaise)
    ) {
      discarded = true
      continue
    }

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], quantity: combinedQuantity }
    } else {
      items.push({ productId, selectedSize, quantity })
    }
    totalItems = nextTotalItems
    totalPaise = nextTotalPaise
  }

  return {
    items,
    warning: discarded
      ? 'Some invalid or outdated saved cart entries were ignored.'
      : null,
  }
}

export function readCustomerCart(): CartReadResult {
  try {
    const storage = getStorage()
    if (!storage) {
      return {
        items: [],
        warning: null,
        error: 'Browser storage is unavailable, so this device cart could not be read.',
      }
    }

    const saved = storage.getItem(CUSTOMER_CART_STORAGE_KEY)
    if (saved === null) return { items: [], warning: null, error: null }

    let parsed: unknown
    try {
      parsed = JSON.parse(saved) as unknown
    } catch {
      return {
        items: [],
        warning: 'Saved cart data could not be read and has been ignored.',
        error: null,
      }
    }

    return { ...normalizeItems(parsed), error: null }
  } catch {
    return {
      items: [],
      warning: null,
      error: 'Browser storage is unavailable, so this device cart could not be read.',
    }
  }
}

function persist(items: CartItemRecord[], warning: string | null = null): CartMutationResult {
  if (!hasSafeCartTotals(items)) {
    return {
      items: readCustomerCart().items,
      warning,
      error: 'That cart change is too large to calculate safely.',
    }
  }

  try {
    const storage = getStorage()
    if (!storage) {
      return {
        items: readCustomerCart().items,
        warning,
        error: 'Browser storage is unavailable; your cart change was not saved.',
      }
    }

    storage.setItem(CUSTOMER_CART_STORAGE_KEY, JSON.stringify(items))
    return { items, warning, error: null }
  } catch {
    return {
      items: readCustomerCart().items,
      warning,
      error: 'Browser storage could not save this change. Your cart may not persist.',
    }
  }
}

function getReadableCartForMutation(): CartReadResult {
  return readCustomerCart()
}

export function addCustomerCartItem(
  productId: string,
  selectedSize: string | null,
  quantity: number,
): CartMutationResult {
  const cart = getReadableCartForMutation()
  if (cart.error) return cart
  const product = getProductById(productId)
  const priceInPaise = unitPriceInPaise(productId)
  if (
    !product ||
    priceInPaise === null ||
    !isValidVariant(productId, selectedSize) ||
    !isValidQuantity(quantity)
  ) {
    return {
      ...cart,
      error: 'Choose a valid product option and a positive whole-number quantity.',
    }
  }

  const existingIndex = cart.items.findIndex((item) =>
    identityMatches(item, productId, selectedSize),
  )
  const combinedQuantity =
    quantity + (existingIndex >= 0 ? cart.items[existingIndex].quantity : 0)
  if (
    !Number.isSafeInteger(combinedQuantity) ||
    combinedQuantity > getQuantityLimit(productId) ||
    !Number.isSafeInteger(priceInPaise * combinedQuantity)
  ) {
    return { ...cart, error: 'That quantity is too large to calculate safely.' }
  }

  const items = [...cart.items]
  const line: CartItemRecord = { productId, selectedSize, quantity: combinedQuantity }
  if (existingIndex >= 0) items[existingIndex] = line
  else items.push(line)

  return persist(items, cart.warning)
}

export function setCustomerCartItemQuantity(
  productId: string,
  selectedSize: string | null,
  quantity: number,
): CartMutationResult {
  const cart = getReadableCartForMutation()
  if (cart.error) return cart
  const priceInPaise = unitPriceInPaise(productId)
  const index = cart.items.findIndex((item) =>
    identityMatches(item, productId, selectedSize),
  )
  if (
    index < 0 ||
    !isValidQuantity(quantity) ||
    priceInPaise === null ||
    quantity > getQuantityLimit(productId) ||
    !Number.isSafeInteger(priceInPaise * quantity)
  ) {
    return { ...cart, error: 'This cart quantity could not be updated safely.' }
  }

  const items = [...cart.items]
  items[index] = { ...items[index], quantity }
  return persist(items, cart.warning)
}

export function removeCustomerCartItem(
  productId: string,
  selectedSize: string | null,
): CartMutationResult {
  const cart = getReadableCartForMutation()
  if (cart.error) return cart
  const items = cart.items.filter(
    (item) => !identityMatches(item, productId, selectedSize),
  )
  return persist(items, cart.warning)
}

export function clearCustomerCart(): CartMutationResult {
  const cart = getReadableCartForMutation()
  if (cart.error) return cart
  return persist([], cart.warning)
}
