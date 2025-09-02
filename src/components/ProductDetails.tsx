// In src/components/ProductDetails.tsx
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

export default function ProductDetails({ product }) {
  return (
    <CardHeader>
      <div className="flex items-center space-x-4">
        {product.imageUrl && (
          <Image src={product.imageUrl} alt={product.name} width={64} height={64} className="rounded-md" />
        )}
        <div>
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>Your Price: {product.currentPrice?.toFixed(2)} {product.currency}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}