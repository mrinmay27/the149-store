import React from "react";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Edit, ShoppingCart } from "lucide-react";

interface ProductVariant {
  color: string;
  size: string;
  stock: number;
}

interface ProductCardProps {
  id?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
  variants?: ProductVariant[];
  onEdit?: (id: string) => void;
  onAddToCart?: (id: string) => void;
}

const ProductCard = ({
  id = "1",
  name = "Sample Product",
  price = 29.99,
  imageUrl = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=60",
  variants = [
    { color: "Black", size: "M", stock: 5 },
    { color: "White", size: "L", stock: 3 },
    { color: "Blue", size: "S", stock: 0 },
  ],
  onEdit = () => {},
  onAddToCart = () => {},
}: ProductCardProps) => {
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const isLowStock = totalStock > 0 && totalStock < 5;
  const isOutOfStock = totalStock === 0;

  return (
    <Card className="w-full max-w-[280px] mx-auto h-[320px] bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="relative h-[180px] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 space-x-2">
            {isOutOfStock && <Badge variant="destructive">Out of Stock</Badge>}
            {isLowStock && (
              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-500/80">
                Low Stock
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">{name}</h3>
          <p className="text-green-600 font-medium">₹{price.toFixed(2)}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {variants.map((variant, index) => (
              <Badge
                key={index}
                variant={variant.stock === 0 ? "outline" : "secondary"}
                className="text-xs"
              >
                {variant.color} - {variant.size} ({variant.stock})
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          onClick={() => onAddToCart(id)}
          disabled={isOutOfStock}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
