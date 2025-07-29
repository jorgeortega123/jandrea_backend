export interface imagenes {
  isVideo?: boolean;
  needContrast?: boolean;
  src: string;
}

export interface Variants_producto {
  description?: string;
  images: imagenes[];
  sizes?: {
    x: number;
    y: number;
    z: number;
  };
  precioDocena?: number;
  price: number;
  priceWithoutOff: number;
  colors?: { name?: string; color: string }[];
}

export interface Producto {
  cantidad?: number;
  title?: string;
  description?: string;
  productId?: string;
  categoryId: string;
  identificador: string;
  topicTags?: { tag: string[] };
  docena?: boolean;
  variants: Variants_producto[];
}
