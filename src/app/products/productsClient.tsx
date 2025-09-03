"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { deleteProductAction, deleteMultipleProducts, addProductFromUrl } from "@/actions/product-actions";
import { Input } from "@/components/ui/input";



export default function DashboardClient({ products: initialProducts }) {
  const router = useRouter();
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  const products = initialProducts; // Data is already sanitized in the server component

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleDeleteSelected = async () => {
    await deleteMultipleProducts(selectedProductIds);
    setSelectedProductIds([]);
    router.refresh(); // Refresh the page to reflect the changes
  };

  async function addNewProductAction(formData: FormData) {
    setIsAdding(true);
    const url = formData.get("url") as string;
    const result = await addProductFromUrl(url, "example_user_id");

    if (result.success) {
      router.refresh();
      setIsAdding(false);
    } else {
      console.error(result.error);
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">إضافة منتج جديد</h1>
          <form action={addNewProductAction} className="flex items-center space-x-3">
            <Input
              type="url"
              name="url"
              placeholder="https://www.example.com/product/123"
              required
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3"
            />
            <Button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition"
              disabled={isAdding}
            >
              {isAdding ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">قائمة المنتجات</h2>
          {selectedProductIds.length > 0 && (
            <div className="mb-4">
              <Button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" /> حذف المنتجات المحددة ({selectedProductIds.length})
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    onChange={() => {
                      if (selectedProductIds.length === products.length) {
                        setSelectedProductIds([]);
                      } else {
                        setSelectedProductIds(products.map((p) => p.id));
                      }
                    }}
                    checked={selectedProductIds.length === products.length && products.length > 0}
                  />
                </TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>السعر الحالي</TableHead>
                <TableHead>الاستراتيجية</TableHead>
                <TableHead>السعر الموصى به</TableHead>
                <TableHead>المنافسون</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/products/${product.id}`} className="hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {product.currentPrice !== null ? `${product.currentPrice.toFixed(2)} ${product.currency}` : "N/A"}
                  </TableCell>
                  <TableCell>{product.strategyName}</TableCell>
                  <TableCell>
                    {product.recommendedPrice !== null ? `${product.recommendedPrice.toFixed(2)} ${product.currency}` : "N/A"}
                  </TableCell>
                  <TableCell>{product.competitors.length}</TableCell>
                  <TableCell className="text-right">
                    <form action={() => deleteProductAction(product.id)}>
                      <input type="hidden" name="productId" value={product.id} />
                      <Button variant="ghost" size="icon" type="submit">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}