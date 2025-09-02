// src/app/products/productsClient.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2, ExternalLink, DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteProduct, deleteMultipleProducts, addNewProduct } from "@/actions/product-actions"; 

// Helper functions
function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function truncateText(text: string, maxLength: number) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

export default function DashboardClient({ products: initialProducts, handleDelete }) {
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const products = initialProducts;
  
  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };
  
  const handleDeleteSelected = async () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selectedProductIds.length} منتج؟`)) {
      await deleteMultipleProducts(selectedProductIds);
      setSelectedProductIds([]);
    }
  };
  
  async function addNewProductAction(formData) {
    setIsAdding(true);
    const url = formData.get("url");
    const result = await addNewProduct(url, "example_user_id");
    setIsAdding(false);
    
    if (result.success) {
      redirect(`/products`);
    } else {
      alert(`خطأ: ${result.error}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-gray-600 mt-2">إدارة المنتجات والمنافسين واستراتيجيات التسعير</p>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedProductIds.length > 0 && (
              <Button 
                onClick={handleDeleteSelected}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                حذف ({selectedProductIds.length})
              </Button>
            )}
          </div>
        </div>
        
        {/* Add Product Form */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5 text-indigo-600" />
              إضافة منتج جديد
            </CardTitle>
            <CardDescription>
              أضف منتجًا جديدًا لتتبع أسعار المنافسين وتحسين استراتيجية التسعير
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addNewProductAction} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="url"
                name="url"
                placeholder="https://www.example.com/product/123"
                required
                className="flex-1"
                disabled={isAdding}
              />
              <Button 
                type="submit" 
                disabled={isAdding}
                className="px-6 bg-indigo-600 hover:bg-indigo-700"
              >
                {isAdding ? "جاري الإضافة..." : "إضافة منتج"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Products Grid */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">المنتجات</h2>
            <div className="text-sm text-gray-500">
              {products.length} منتج
            </div>
          </div>
          
          {products.length === 0 ? (
            <Card className="shadow-sm border-0 bg-white p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <Package className="h-16 w-16 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-700">لا توجد منتجات</h3>
                <p className="text-gray-500 max-w-md">
                  أضف منتجك الأول لبدء تتبع أسعار المنافسين وتحسين استراتيجية التسعير
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card 
                  key={product.id} 
                  className={`shadow-md border-0 bg-white transition-all duration-200 hover:shadow-lg ${
                    selectedProductIds.includes(product.id) ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="absolute top-4 right-4 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <CardTitle className="text-lg leading-tight">
                            <Link 
                              href={`/products/${product.id}`}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {truncateText(product.name, 60)}
                            </Link>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {product.currency}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Price Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-xs font-medium">السعر الحالي</span>
                          </div>
                          <div className="text-lg font-bold text-green-800 mt-1">
                            {product.currentPrice?.toFixed(2) || "0.00"}
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-700">
                            <Package className="h-4 w-4" />
                            <span className="text-xs font-medium">التكلفة</span>
                          </div>
                          <div className="text-lg font-bold text-blue-800 mt-1">
                            {product.cost ? `${product.cost.toFixed(2)}` : "غير محدد"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 my-4"></div>
                      
                      {/* Strategy & Recommended Price */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm">الاستراتيجية</span>
                          </div>
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                            {product.strategyName}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm">السعر الموصى به</span>
                          </div>
                          <div className="font-semibold text-indigo-600">
                            {product.recommendedPrice !== null 
                              ? `${product.recommendedPrice.toFixed(2)} ${product.currency}` 
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 my-4"></div>
                      
                      {/* Competitors */}
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">المنافسون</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {product.competitors.length > 0 ? (
                            <>
                              <div className="flex -space-x-2">
                                {product.competitors.slice(0, 3).map((c) => {
                                  const domain = getDomainFromUrl(c.url);
                                  const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
                                  return (
                                    <div key={c.id} className="relative">
                                      <Image
                                        src={favicon}
                                        alt={domain}
                                        width={24}
                                        height={24}
                                        className="rounded-full border border-white"
                                        title={domain}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              {product.competitors.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{product.competitors.length - 3}
                                </div>
                              )}
                            </>
                          ) : (
                            <Link 
                              href={`/products/${product.id}`} 
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              إضافة منافس
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2">
                        <Link 
                          href={`/products/${product.id}`}
                          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          عرض التفاصيل
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        
                        <form action={handleDelete}>
                          <Button 
                            type="submit" 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}