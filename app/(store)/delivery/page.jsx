import { redirect } from "next/navigation";

// Раздел «Доставка» убран с сайта: старые ссылки ведут на главную
export default function DeliveryPage() {
  redirect("/");
}
