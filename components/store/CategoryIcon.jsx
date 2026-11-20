import { Apple, Carrot, Cherry, Citrus, Grape, Leaf, Nut, TreePalm } from "lucide-react";

const ICONS = {
  fruits: Apple,
  vegetables: Carrot,
  berries: Cherry,
  greens: Leaf,
  "dried-fruits": Grape,
  nuts: Nut,
  citrus: Citrus,
  exotic: TreePalm,
};

export default function CategoryIcon({ slug, className = "h-6 w-6" }) {
  const Icon = ICONS[slug] ?? Leaf;
  return <Icon className={className} strokeWidth={1.6} aria-hidden="true" />;
}
