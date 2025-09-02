import { db } from "@/lib/db";
import { priceTrackingService } from "../lib/price-tracking";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // مثال على user id ثابت، يمكنك استبداله لاحقًا بنظام مصادقة
  const userId = "example_user_id";
  
  
  // دالة لتنفيذ الـ Server Action لإضافة منتج جديد
async function addNewProduct(formData: FormData) {
    "use server";
    const url = formData.get("url") as string;
    
    // استدعاء الدالة من خلال الكلاس
    const result = await priceTrackingService.addProductFromUrl(url, userId);
    
    if (result.success) {
      redirect(`/products`);
    } else {
      console.error(result.error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          ابدأ بتتبع أسعار منتجاتك 💰
        </h1>
        <form action={addNewProduct} className="space-y-4">
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700"
            >
              رابط المنتج
            </label>
            <input
              type="url"
              name="url"
              id="url"
              placeholder="https://www.example.com/product/123"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            إضافة المنتج
          </button>
        </form>
      </div>
    </div>
  );
}