export interface imagenes {
  isVideo?: boolean;
  needContrast?: boolean;
  src: string;
}

export interface Variants_producto {
  description?: string;
  images: imagenes[];

  sizes_x: number;
  sizes_y: number;
  sizes_z: number;

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
  topicTag?: { tag: string[] };
  topicTags?: { tag: string[] };
  docena?: boolean;
  variants: Variants_producto[];
}
