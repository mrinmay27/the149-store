import React from "react";
import { ScrollArea } from "./ui/scroll-area";
import ProductCard from "./ProductCard";
import { Input } from "./ui/input";
import { Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  variants: Array<{
    color: string;
    size: string;
    stock: number;
  }>;
}

interface ProductCatalogProps {
  products?: Product[];
  onEditProduct?: (id: string) => void;
  onAddToCart?: (id: string) => void;
}

const ProductCatalog = ({
  products = [
    {
      id: "1",
      name: "Basic Tee",
      price: 49,
      imageUrl:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
      variants: [
        { color: "Black", size: "M", stock: 15 },
        { color: "White", size: "L", stock: 13 },
      ],
    },
    {
      id: "2",
      name: "Premium Tee",
      price: 99,
      imageUrl:
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
      variants: [
        { color: "Blue", size: "M", stock: 8 },
        { color: "Black", size: "L", stock: 12 },
      ],
    },
    {
      id: "3",
      name: "Polo Shirt",
      price: 149,
      imageUrl:
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
      variants: [
        { color: "Navy", size: "L", stock: 10 },
        { color: "White", size: "M", stock: 7 },
      ],
    },
    {
      id: "4",
      name: "Casual Pants",
      price: 199,
      imageUrl:
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
      variants: [
        { color: "Khaki", size: "32", stock: 6 },
        { color: "Black", size: "34", stock: 9 },
      ],
    },
    {
      id: "5",
      name: "Denim Jeans",
      price: 249,
      imageUrl:
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
      variants: [
        { color: "Blue", size: "32", stock: 8 },
        { color: "Black", size: "34", stock: 5 },
      ],
    },
    {
      id: "6",
      name: "Casual Jacket",
      price: 299,
      imageUrl:
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
      variants: [
        { color: "Brown", size: "L", stock: 4 },
        { color: "Black", size: "M", stock: 6 },
      ],
    },
    {
      id: "7",
      name: "Winter Jacket",
      price: 349,
      imageUrl:
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
      variants: [
        { color: "Grey", size: "L", stock: 3 },
        { color: "Black", size: "M", stock: 5 },
      ],
    },
  ],
  onEditProduct = () => {},
  onAddToCart = () => {},
}: ProductCatalogProps) => {
  return (
    <div className="w-full min-h-[480px] bg-gray-50 p-3 md:p-6">
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input
          placeholder="Search products..."
          className="pl-10 w-full max-w-sm"
        />
      </div>

      <ScrollArea className="h-[400px] w-full rounded-md border bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={product.imageUrl}
              variants={product.variants}
              onEdit={onEditProduct}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProductCatalog;
