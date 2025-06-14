import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Star, Clock, Leaf } from 'lucide-react';
import { Product } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../utils/format';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCartStore();

  const getFreshnessVariant = (freshness: string) => {
    switch (freshness) {
      case 'premium': return 'default';
      case 'very-fresh': return 'secondary';
      default: return 'outline';
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.minOrder);
  };

  return (
    <>
    <Link href={`/products/${product.id}`}>
        <Card className="h-full hover:shadow-lg transition-shadow duration-200 border border-gray-100">
            {/* Image container with proper aspect ratio and no extra space */}
            <div className="relative aspect-[4/3] overflow-hidden"> {/* Changed to 4:3 aspect ratio */}
            <Image
                fill
                src={product.images[0]}
                alt={product.name}
                className="object-cover rounded-t-lg"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                // priority={index < 3} // Optional: prioritize loading first few images
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.isOrganic && (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    <Leaf className="w-3 h-3 mr-1" />
                    Organic
                </Badge>
                )}
                <Badge className={getFreshnessVariant(product.freshness) === 'default' 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-blue-100 text-blue-800'}>
                <Clock className="w-3 h-3 mr-1" />
                {product.freshness.replace('-', ' ')}
                </Badge>
            </div>

            {/* Stock indicator */}
            {product.stock < 10 && (
                <div className="absolute top-2 right-2">
                <Badge variant="destructive">
                    Low Stock
                </Badge>
                </div>
            )}
            </div>

            <CardContent className="p-4 space-y-3">
            <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{product.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
            </div>

            <div className="flex items-center justify-between">
                <div>
                <span className="text-2xl font-bold text-emerald-600"> {/* Green price */}
                    {formatCurrency(product.price)}
                </span>
                <span className="text-gray-500 text-sm ml-1">/{product.unit}</span>
                </div>
                
                {product.bulkPricing && product.bulkPricing.length > 0 && (
                <Badge className="bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 text-xs"> {/* Deep yellow badge */}
                    Bulk discounts
                </Badge>
                )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Min order: {product.minOrder} {product.unit}</span>
                <span>Stock: {product.stock}</span>
            </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-between">
            <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-500">4.8 (24)</span>
            </div>
            
            <Button
                size="sm"
                onClick={handleAddToCart}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700" 
                disabled={!product.isAvailable || product.stock === 0}
            >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
            </Button>
            </CardFooter>
        </Card>
    </Link>
    </>
  );
};

export default ProductCard;