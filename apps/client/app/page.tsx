import type { Metadata } from "next";
import AIFarmApp from "./AIFarmApp";

export const metadata: Metadata = {
  title: "麦芽谷 · AI 农场",
  description: "一座会呼吸的 3D 智慧农场 — 观察作物、虫害与天气变化。",
};

export default function Home() {
  return <AIFarmApp />;
}
