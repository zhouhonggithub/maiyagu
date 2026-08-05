"use client";

/* Three.js animation frames intentionally mutate scene graph objects. */
/* eslint-disable react-hooks/purity, react-hooks/immutability */

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, RoundedBox, Sparkles } from "@react-three/drei";
import { create } from "zustand";
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

export type WeatherMode = "sunny" | "cloudy" | "rainy" | "windy" | "night";
export type CropState = "healthy" | "pest" | "damaged";
export type CropKind = "corn" | "tomato" | "sunflower";
export type ViewMode = "overview" | "walk";

export interface FarmPlot {
  id: string;
  position: [number, number, number];
  kind: CropKind;
  state: CropState;
}

export interface CropInspection extends FarmPlot {
  name: string;
  stage: string;
  health: number;
  moisture: number;
  note: string;
}

interface FarmStore {
  weather: WeatherMode;
  selected: CropInspection | null;
  autoPlay: boolean;
  viewMode: ViewMode;
  setWeather: (weather: WeatherMode) => void;
  select: (crop: CropInspection | null) => void;
  toggleAuto: () => void;
  setViewMode: (viewMode: ViewMode) => void;
}

const useFarm = create<FarmStore>((set) => ({
  weather: "sunny",
  selected: null,
  autoPlay: false,
  viewMode: "overview",
  setWeather: (weather) => set({ weather }),
  select: (selected) => set({ selected }),
  toggleAuto: () => set((state) => ({ autoPlay: !state.autoPlay })),
  setViewMode: (viewMode) => set({ viewMode, selected: null }),
}));

const WEATHER: Record<WeatherMode, { label: string; icon: string; temp: string; sky: string; fog: string; light: string; wind: number }> = {
  sunny: { label: "晴朗", icon: "☀", temp: "24°", sky: "#91c9dc", fog: "#d7d6a8", light: "#fff3c4", wind: 0.7 },
  cloudy: { label: "多云", icon: "☁", temp: "20°", sky: "#9aa9a8", fog: "#b7b7a3", light: "#d8dfd4", wind: 1.1 },
  rainy: { label: "细雨", icon: "☂", temp: "17°", sky: "#627d87", fog: "#7f9494", light: "#b7cad0", wind: 1.7 },
  windy: { label: "大风", icon: "≋", temp: "19°", sky: "#8faeb4", fog: "#b1bbb0", light: "#e3dec2", wind: 2.7 },
  night: { label: "夜晚", icon: "☾", temp: "13°", sky: "#182a3f", fog: "#30475a", light: "#9ebef0", wind: 0.45 },
};

const cropDetails: Record<CropKind, Pick<CropInspection, "name" | "stage"> & { notes: Record<CropState, string> }> = {
  corn: { name: "甜玉米", stage: "拔节期", notes: { healthy: "长势很好，叶片舒展。", pest: "发现一只贪吃的毛毛虫。", damaged: "叶缘出现缺口，建议观察。" } },
  tomato: { name: "樱桃番茄", stage: "挂果期", notes: { healthy: "果实正在慢慢变红。", pest: "瓢虫正在叶面巡逻。", damaged: "下层叶片有啃食痕迹。" } },
  sunflower: { name: "向日葵", stage: "盛花期", notes: { healthy: "花盘正追着阳光转动。", pest: "叶背检测到小型昆虫。", damaged: "一片叶子出现明显缺口。" } },
};

interface CropPatch {
  id: string;
  kind: CropKind;
  center: [number, number];
  cols: number;
  rows: number;
  spacing: [number, number];
  size: [number, number];
  rotation: number;
}

const PATCHES: CropPatch[] = [
  { id: "p1", kind: "corn", center: [-5.35, -3.45], cols: 2, rows: 2, spacing: [1.08, 1.02], size: [2.65, 2.45], rotation: -0.08 },
  { id: "p2", kind: "tomato", center: [-2.35, -3.35], cols: 2, rows: 2, spacing: [1.08, 1.02], size: [2.55, 2.4], rotation: 0.06 },
  { id: "p3", kind: "sunflower", center: [-5.05, -0.45], cols: 2, rows: 2, spacing: [1.2, 1.08], size: [2.9, 2.55], rotation: 0.09 },
  { id: "p4", kind: "corn", center: [-2.0, -0.35], cols: 2, rows: 2, spacing: [1.05, 1.05], size: [2.5, 2.5], rotation: -0.05 },
  { id: "p5", kind: "tomato", center: [-5.0, 2.65], cols: 3, rows: 2, spacing: [0.98, 1.02], size: [3.65, 2.45], rotation: -0.04 },
  { id: "p6", kind: "sunflower", center: [-1.75, 2.75], cols: 2, rows: 2, spacing: [1.12, 1.08], size: [2.7, 2.55], rotation: 0.1 },
  { id: "p7", kind: "tomato", center: [2.35, -3.35], cols: 2, rows: 2, spacing: [1.02, 1.02], size: [2.55, 2.4], rotation: -0.07 },
  { id: "p8", kind: "sunflower", center: [5.2, -3.2], cols: 2, rows: 2, spacing: [1.14, 1.05], size: [2.7, 2.45], rotation: 0.08 },
  { id: "p9", kind: "corn", center: [2.45, -0.35], cols: 2, rows: 2, spacing: [1.08, 1.05], size: [2.6, 2.5], rotation: 0.05 },
  { id: "p10", kind: "tomato", center: [5.25, -0.15], cols: 2, rows: 2, spacing: [1.02, 1.02], size: [2.5, 2.45], rotation: -0.1 },
  { id: "p11", kind: "sunflower", center: [2.45, 2.75], cols: 2, rows: 2, spacing: [1.15, 1.05], size: [2.75, 2.5], rotation: -0.06 },
  { id: "p12", kind: "corn", center: [5.15, 2.85], cols: 2, rows: 2, spacing: [1.06, 1.04], size: [2.55, 2.45], rotation: 0.07 },
];

function makePatchCrops(patch: CropPatch, patchIndex: number): CropInspection[] {
  const detail = cropDetails[patch.kind];
  return Array.from({ length: patch.cols * patch.rows }, (_, index) => {
    const col = index % patch.cols;
    const row = Math.floor(index / patch.cols);
    const localX = (col - (patch.cols - 1) / 2) * patch.spacing[0];
    const localZ = (row - (patch.rows - 1) / 2) * patch.spacing[1];
    const cos = Math.cos(patch.rotation);
    const sin = Math.sin(patch.rotation);
    const jitterX = Math.sin((index + 1) * (patchIndex + 2) * 2.31) * 0.14;
    const jitterZ = Math.cos((index + 2) * (patchIndex + 3) * 1.77) * 0.14;
    const state: CropState = (index + patchIndex) % 9 === 3 ? "pest" : (index + patchIndex) % 11 === 5 ? "damaged" : "healthy";
    return { id: `${patch.id}-${index}`, position: [patch.center[0] + localX * cos - localZ * sin + jitterX, 0, patch.center[1] + localX * sin + localZ * cos + jitterZ], kind: patch.kind, state, name: detail.name, stage: detail.stage, health: state === "healthy" ? 90 + ((index + patchIndex) % 9) : state === "pest" ? 70 : 63, moisture: 50 + ((index * 7 + patchIndex * 3) % 25), note: detail.notes[state] };
  });
}

const CROPS: CropInspection[] = PATCHES.flatMap(makePatchCrops);

function Leaf({ position, rotation = [0, 0, 0], color = "#5a913d", damaged = false, scale = 1 }: { position: [number, number, number]; rotation?: [number, number, number]; color?: string; damaged?: boolean; scale?: number }) {
  if (damaged) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh position={[-0.19, 0, 0]} rotation={[0, 0, -0.14]} castShadow>
          <sphereGeometry args={[0.32, 8, 5]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        <mesh position={[0.25, 0.02, 0]} rotation={[0, 0, 0.2]} castShadow>
          <sphereGeometry args={[0.2, 7, 4]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={position} rotation={rotation} scale={[0.64 * scale, 0.14 * scale, 0.28 * scale]} castShadow>
      <sphereGeometry args={[0.55, 10, 6]} />
      <meshStandardMaterial color={color} roughness={0.86} />
    </mesh>
  );
}

function Bug({ type = "worm" }: { type?: "worm" | "ladybug" }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x = Math.sin(clock.elapsedTime * 2.4) * 0.11;
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 1.7) * 0.5;
    }
  });
  return (
    <group ref={ref} position={[0.34, 1.05, 0.18]} scale={0.7}>
      {type === "worm" ? (
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.11, Math.sin(i) * 0.025, 0]} castShadow>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color={i === 2 ? "#d9bf3d" : "#8eaf3d"} />
          </mesh>
        ))
      ) : (
        <group>
          <mesh castShadow><sphereGeometry args={[0.14, 10, 7]} /><meshStandardMaterial color="#d84b35" /></mesh>
          <mesh position={[0, 0.045, 0.125]}><sphereGeometry args={[0.032, 6, 5]} /><meshStandardMaterial color="#35231c" /></mesh>
          <mesh position={[0.07, 0.06, 0.08]}><sphereGeometry args={[0.025, 6, 5]} /><meshStandardMaterial color="#35231c" /></mesh>
        </group>
      )}
    </group>
  );
}

function Corn({ state }: { state: CropState }) {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow><cylinderGeometry args={[0.07, 0.11, 1.45, 8]} /><meshStandardMaterial color="#5c8735" /></mesh>
      {[0.35, 0.68, 1.02].map((y, i) => (
        <group key={y}>
          <Leaf position={[i % 2 ? 0.3 : -0.3, y, 0]} rotation={[0, 0, i % 2 ? 0.38 : -0.38]} damaged={state === "damaged" && i === 2} scale={1 + i * 0.07} />
          <Leaf position={[0, y + 0.12, i % 2 ? 0.26 : -0.26]} rotation={[Math.PI / 2, 0.25, 0]} color="#6f9d45" scale={0.85} />
        </group>
      ))}
      <mesh position={[0.18, 0.88, 0]} rotation={[0, 0, -0.18]} castShadow><capsuleGeometry args={[0.13, 0.34, 5, 8]} /><meshStandardMaterial color="#efbd3e" roughness={0.9} /></mesh>
      <group position={[0, 1.5, 0]}>{[-0.11, 0, 0.11].map((x) => <mesh key={x} position={[x, 0.12, 0]} rotation={[0, 0, x * 2]}><cylinderGeometry args={[0.012, 0.025, 0.32, 5]} /><meshStandardMaterial color="#d69743" /></mesh>)}</group>
      {state === "pest" && <Bug />}
    </group>
  );
}

function Tomato({ state }: { state: CropState }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.045, 0.07, 1.1, 7]} /><meshStandardMaterial color="#477637" /></mesh>
      {[0.38, 0.68, 0.93].map((y, i) => <group key={y}><Leaf position={[-0.25, y, 0]} rotation={[0, 0, -0.3]} damaged={state === "damaged" && i === 0} scale={0.72} /><Leaf position={[0.25, y + 0.06, 0.08]} rotation={[0, 0, 0.3]} scale={0.72} /></group>)}
      {[[-0.25, 0.58, 0.18], [0.24, 0.72, 0.12], [0.08, 0.45, -0.22]].map((p, i) => <mesh key={i} position={p as [number, number, number]} castShadow><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color={i === 2 ? "#e1873c" : "#d95838"} roughness={0.65} /></mesh>)}
      {state === "pest" && <Bug type="ladybug" />}
    </group>
  );
}

function Sunflower({ state }: { state: CropState }) {
  return (
    <group>
      <mesh position={[0, 0.78, 0]} castShadow><cylinderGeometry args={[0.055, 0.09, 1.55, 8]} /><meshStandardMaterial color="#527d35" /></mesh>
      <Leaf position={[-0.28, 0.66, 0]} rotation={[0, 0, -0.4]} damaged={state === "damaged"} scale={0.88} />
      <Leaf position={[0.28, 0.94, 0]} rotation={[0, 0, 0.4]} scale={0.92} />
      <group position={[0, 1.62, 0]} rotation={[-0.18, 0, 0]}>
        {Array.from({ length: 14 }, (_, i) => <mesh key={i} rotation={[0, 0, (i / 14) * Math.PI * 2]} position={[Math.cos((i / 14) * Math.PI * 2) * 0.32, Math.sin((i / 14) * Math.PI * 2) * 0.32, 0]} scale={[1, 1.7, 0.35]} castShadow><sphereGeometry args={[0.14, 7, 5]} /><meshStandardMaterial color="#f4c83f" /></mesh>)}
        <mesh position={[0, 0, 0.05]} castShadow><sphereGeometry args={[0.27, 12, 8]} /><meshStandardMaterial color="#6d4426" roughness={1} /></mesh>
      </group>
      {state === "pest" && <Bug />}
    </group>
  );
}

function Crop({ crop, index }: { crop: CropInspection; index: number }) {
  const ref = useRef<THREE.Group>(null);
  const weather = useFarm((s) => s.weather);
  const selected = useFarm((s) => s.selected?.id === crop.id);
  const select = useFarm((s) => s.select);
  const [hovered, setHovered] = useState(false);
  const harvestReady = crop.kind === "tomato" && index % 5 === 1;
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const strength = WEATHER[weather].wind;
    const target = Math.sin(clock.elapsedTime * (0.8 + index * 0.025) + index * 1.31) * 0.035 * strength;
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, target, 4, delta);
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, target * 0.35, 4, delta);
    const scale = selected ? 1.12 : hovered ? 1.06 : 1;
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12);
  });
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); select(crop); };
  return (
    <group position={crop.position} rotation={[0, Math.sin(index * 2.47) * 0.28, 0]}>
      <group ref={ref} onClick={click} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}>
        {crop.kind === "corn" && <Corn state={crop.state} />}
        {crop.kind === "tomato" && <Tomato state={crop.state} />}
        {crop.kind === "sunflower" && <Sunflower state={crop.state} />}
      </group>
      {(hovered || selected) && <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.45, 0.54, 32]} /><meshBasicMaterial color={selected ? "#fff0a1" : "#ffffff"} transparent opacity={0.8} /></mesh>}
      {harvestReady && <Html position={[0, 1.72, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}><div className="harvest-world-marker"><span>🧺</span><b>可收成</b></div></Html>}
    </group>
  );
}

function Fence() {
  const posts: Array<[number, number, number]> = [];
  for (let x = -7.2; x <= 7.2; x += 1.2) { posts.push([x, 0.42, -5.4], [x, 0.42, 5.4]); }
  for (let z = -4.2; z <= 4.2; z += 1.2) { posts.push([-7.2, 0.42, z], [7.2, 0.42, z]); }
  return <group>{posts.map((p, i) => <mesh key={i} position={p} rotation={[0, i % 3 ? 0 : 0.08, 0]} castShadow><cylinderGeometry args={[0.11, 0.15, 0.82, 6]} /><meshStandardMaterial color="#76503a" roughness={1} /></mesh>)}
    {[[-7.2, 0.44, 0, 0, 10.8], [7.2, 0.44, 0, 0, 10.8], [0, 0.44, -5.4, Math.PI / 2, 14.4], [0, 0.44, 5.4, Math.PI / 2, 14.4]].map((p, i) => <mesh key={`r${i}`} position={[p[0], p[1], p[2]]} rotation={[0, p[3], Math.sin(i) * 0.02]} castShadow><boxGeometry args={[0.12, 0.13, p[4]]} /><meshStandardMaterial color="#916647" roughness={0.9} /></mesh>)}</group>;
}

function FarmBase() {
  return (
    <group>
      <RoundedBox args={[16, 0.7, 12]} radius={0.42} smoothness={3} position={[0, -0.48, 0]} castShadow receiveShadow><meshStandardMaterial color="#6c4939" roughness={0.95} /></RoundedBox>
      <RoundedBox args={[14.8, 0.35, 10.8]} radius={0.32} smoothness={3} position={[0, -0.08, 0]} receiveShadow><meshStandardMaterial color="#4c7b3b" roughness={1} /></RoundedBox>
      {PATCHES.map((patch, index) => <RoundedBox key={patch.id} args={[patch.size[0], 0.24, patch.size[1]]} radius={0.2} smoothness={3} position={[patch.center[0], 0.08 + (index % 3) * 0.008, patch.center[1]]} rotation={[0, patch.rotation, 0]} receiveShadow><meshStandardMaterial color={index % 3 === 0 ? "#78533d" : index % 3 === 1 ? "#704b37" : "#7d5840"} roughness={1} /></RoundedBox>)}
      <Fence />
      <WaterChannel />
      <Props />
    </group>
  );
}

function WaterChannel() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = 0.12 + Math.sin(clock.elapsedTime * 1.4) * 0.015; });
  return <group><RoundedBox ref={ref} args={[0.82, 0.12, 10]} radius={0.18} smoothness={3} position={[0.55, 0.13, 0]} receiveShadow><meshStandardMaterial color="#4da9c5" roughness={0.25} metalness={0.08} transparent opacity={0.9} /></RoundedBox>
    <group position={[0.55, 0.45, 2.15]}>{[-0.31, 0, 0.31].map((x) => <mesh key={x} position={[x, 0, 0]} castShadow><boxGeometry args={[0.24, 0.16, 1.55]} /><meshStandardMaterial color="#9a704d" roughness={1} /></mesh>)}</group></group>;
}

function Props() {
  return <group>
    <group position={[-4.45, 0.25, 2.9]} rotation={[0, 0.35, 0]}><mesh castShadow><cylinderGeometry args={[0.34, 0.28, 0.54, 10]} /><meshStandardMaterial color="#9e5b37" /></mesh><mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.3, 0.045, 6, 12]} /><meshStandardMaterial color="#684532" /></mesh></group>
    <group position={[4.55, 0.28, 2.9]}><mesh rotation={[0, 0, -0.6]} castShadow><boxGeometry args={[0.1, 1.35, 0.1]} /><meshStandardMaterial color="#76503a" /></mesh><mesh position={[0.36, 0.53, 0]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.66, 0.18, 0.08]} /><meshStandardMaterial color="#859598" metalness={0.35} /></mesh></group>
    {[[-4.8, -2.9], [4.65, -3.1], [4.7, 3.25]].map(([x, z], i) => <group key={i} position={[x, 0.4, z]}><mesh castShadow><boxGeometry args={[0.13, 0.8, 0.13]} /><meshStandardMaterial color="#5d4435" /></mesh><mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.18, 8, 6]} /><meshStandardMaterial emissive="#ffcf70" emissiveIntensity={useFarm.getState().weather === "night" ? 4 : 0.5} color="#ffe0a0" /></mesh></group>)}
    {[[4.75, -2.2], [-4.8, 3.15], [4.8, 2]].map(([x, z], i) => <mesh key={`stone${i}`} position={[x, 0.18, z]} rotation={[i * 0.2, i, 0]} castShadow><dodecahedronGeometry args={[0.28 + i * 0.04, 0]} /><meshStandardMaterial color="#8b8272" roughness={1} /></mesh>)}
  </group>;
}

function Rain() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => { const a = new Float32Array(1350); for (let i = 0; i < 450; i++) { a[i * 3] = (Math.random() - 0.5) * 34; a[i * 3 + 1] = Math.random() * 13; a[i * 3 + 2] = (Math.random() - 0.5) * 27; } return a; }, []);
  useFrame((_, delta) => { if (!ref.current) return; const a = ref.current.geometry.attributes.position.array as Float32Array; for (let i = 1; i < a.length; i += 3) { a[i] -= delta * 8; if (a[i] < 0) a[i] = 8; } ref.current.geometry.attributes.position.needsUpdate = true; });
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d8f0fa" size={0.055} transparent opacity={0.72} /></points>;
}

function WindLeaves() {
  const leaves = useMemo(() => Array.from({ length: 38 }, (_, i) => ({ p: [(i * 3.21) % 30 - 15, 1 + (i % 9) * 0.9, (i * 4.73) % 23 - 11.5] as [number, number, number], r: i * 0.7 })), []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.position.x = ((clock.elapsedTime * 2.5) % 14) - 7; ref.current.rotation.y = clock.elapsedTime; } });
  return <group ref={ref}>{leaves.map((leaf, i) => <mesh key={i} position={leaf.p} rotation={[leaf.r, leaf.r, leaf.r]}><sphereGeometry args={[0.09, 5, 3]} /><meshStandardMaterial color={i % 2 ? "#c58d39" : "#78983f"} /></mesh>)}</group>;
}

function WeatherWorld() {
  const weather = useFarm((s) => s.weather);
  const data = WEATHER[weather];
  const { scene } = useThree();
  const ambient = useRef<THREE.AmbientLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  useFrame((_, delta) => {
    const targetSky = new THREE.Color(data.sky);
    if (!(scene.background instanceof THREE.Color)) scene.background = targetSky;
    else scene.background.lerp(targetSky, 1 - Math.exp(-delta * 1.8));
    if (scene.fog instanceof THREE.Fog) scene.fog.color.lerp(new THREE.Color(data.fog), 1 - Math.exp(-delta * 1.6));
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.damp(ambient.current.intensity, weather === "night" ? 0.45 : weather === "rainy" ? 0.65 : 1.1, 2, delta);
    if (sun.current) { sun.current.intensity = THREE.MathUtils.damp(sun.current.intensity, weather === "night" ? 0.38 : weather === "cloudy" ? 1.2 : 2.3, 2, delta); sun.current.color.lerp(new THREE.Color(data.light), 0.04); }
  });
  return <><fog attach="fog" args={[data.fog, 42, 86]} /><ambientLight ref={ambient} intensity={1.1} /><directionalLight ref={sun} position={weather === "night" ? [-10, 16, -10] : [-14, 22, 10]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
    {weather === "rainy" && <Rain />}{weather === "windy" && <WindLeaves />}{weather === "night" && <Sparkles count={100} scale={[30, 10, 24]} size={2.8} speed={0.35} color="#ffe98a" />}</>;
}

function Explorer() {
  const viewMode = useFarm((s) => s.viewMode);
  const { camera } = useThree();
  const character = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());
  const overviewPosition = useMemo(() => new THREE.Vector3(0, 20, 30), []);
  const overviewTarget = useMemo(() => new THREE.Vector3(0, 0.4, 0), []);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const gazeTarget = useMemo(() => new THREE.Vector3(), []);
  const cameraForward = useMemo(() => new THREE.Vector3(0, 0, -1), []);
  const cameraYaw = useRef(Math.PI);

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame(({ clock }, delta) => {
    const model = character.current;
    if (!model) return;
    let dx = 0;
    let dz = 0;
    if (viewMode === "walk") {
      if (keys.current.has("w") || keys.current.has("arrowup")) dz -= 1;
      if (keys.current.has("s") || keys.current.has("arrowdown")) dz += 1;
      if (keys.current.has("a") || keys.current.has("arrowleft")) dx -= 1;
      if (keys.current.has("d") || keys.current.has("arrowright")) dx += 1;
    }
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const length = Math.hypot(dx, dz);
      model.position.x = THREE.MathUtils.clamp(model.position.x + (dx / length) * delta * 3.8, -12.7, 12.7);
      model.position.z = THREE.MathUtils.clamp(model.position.z + (dz / length) * delta * 3.8, -9.1, 9.1);
      const targetYaw = Math.atan2(dx, dz);
      const turnDelta = Math.atan2(Math.sin(targetYaw - model.rotation.y), Math.cos(targetYaw - model.rotation.y));
      model.rotation.y += turnDelta * (1 - Math.exp(-delta * 8));
    }
    const step = moving ? Math.sin(clock.elapsedTime * 10) * 0.55 : 0;
    if (leftLeg.current && rightLeg.current) {
      leftLeg.current.rotation.x = THREE.MathUtils.damp(leftLeg.current.rotation.x, step, 10, delta);
      rightLeg.current.rotation.x = THREE.MathUtils.damp(rightLeg.current.rotation.x, -step, 10, delta);
    }
    model.position.y = 0.2 + (moving ? Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.035 : 0);

    if (viewMode === "overview") {
      camera.position.lerp(overviewPosition, 1 - Math.exp(-delta * 2.2));
      lookTarget.lerp(overviewTarget, 1 - Math.exp(-delta * 3));
    } else {
      const yawDelta = Math.atan2(Math.sin(model.rotation.y - cameraYaw.current), Math.cos(model.rotation.y - cameraYaw.current));
      cameraYaw.current += yawDelta * (1 - Math.exp(-delta * 1.7));
      cameraForward.set(Math.sin(cameraYaw.current), 0, Math.cos(cameraYaw.current)).normalize();
      cameraTarget.copy(model.position).addScaledVector(cameraForward, -5.2);
      cameraTarget.y = model.position.y + 3.15;
      gazeTarget.copy(model.position).addScaledVector(cameraForward, 2.2);
      gazeTarget.y = model.position.y + 1.05;
      camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 3));
      lookTarget.lerp(gazeTarget, 1 - Math.exp(-delta * 3.2));
    }
    camera.lookAt(lookTarget);
  });

  return <group ref={character} position={[0.6, 0.2, 8.3]} rotation={[0, Math.PI, 0]} scale={0.78}>
    <mesh position={[0, 1.68, 0]} castShadow><sphereGeometry args={[0.32, 12, 9]} /><meshStandardMaterial color="#e9b489" /></mesh>
    <mesh position={[0, 1.94, -0.02]} rotation={[0.12, 0, 0]} castShadow><cylinderGeometry args={[0.36, 0.31, 0.24, 10]} /><meshStandardMaterial color="#b87a3e" /></mesh>
    <mesh position={[0, 1.85, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.38, 0.38, 0.08, 10]} /><meshStandardMaterial color="#9d6534" /></mesh>
    <mesh position={[0, 1.02, 0]} castShadow><capsuleGeometry args={[0.34, 0.72, 6, 10]} /><meshStandardMaterial color="#708f4f" roughness={0.8} /></mesh>
    <mesh position={[0, 1.18, -0.32]} castShadow><boxGeometry args={[0.52, 0.58, 0.2]} /><meshStandardMaterial color="#8d5d3c" /></mesh>
    <group ref={leftLeg} position={[-0.18, 0.58, 0]}><mesh position={[0, -0.3, 0]} castShadow><capsuleGeometry args={[0.1, 0.48, 5, 8]} /><meshStandardMaterial color="#4d6570" /></mesh><mesh position={[0, -0.62, 0.08]} castShadow><boxGeometry args={[0.22, 0.15, 0.38]} /><meshStandardMaterial color="#553e32" /></mesh></group>
    <group ref={rightLeg} position={[0.18, 0.58, 0]}><mesh position={[0, -0.3, 0]} castShadow><capsuleGeometry args={[0.1, 0.48, 5, 8]} /><meshStandardMaterial color="#4d6570" /></mesh><mesh position={[0, -0.62, 0.08]} castShadow><boxGeometry args={[0.22, 0.15, 0.38]} /><meshStandardMaterial color="#553e32" /></mesh></group>
    <mesh position={[-0.39, 1.08, 0]} rotation={[0, 0, -0.18]} castShadow><capsuleGeometry args={[0.08, 0.52, 5, 8]} /><meshStandardMaterial color="#e9b489" /></mesh>
    <mesh position={[0.39, 1.08, 0]} rotation={[0, 0, 0.18]} castShadow><capsuleGeometry args={[0.08, 0.52, 5, 8]} /><meshStandardMaterial color="#e9b489" /></mesh>
  </group>;
}

function Scene() {
  const select = useFarm((s) => s.select);
  return <>
    <WeatherWorld />
    <group onClick={() => select(null)}>
      <group scale={2}>
        <FarmBase />
        {CROPS.map((crop, index) => <Crop key={crop.id} crop={crop} index={index} />)}
      </group>
      <Explorer />
    </group>
    <ContactShadows position={[0, -1.2, 0]} opacity={0.35} scale={44} blur={2.2} far={8} />
  </>;
}

function LoadingScreen() {
  return <div className="loading"><div className="loading-sun">☀</div><strong>正在唤醒麦芽谷…</strong><span>给泥土一点阳光</span></div>;
}

function WeatherPanel() {
  const { weather, setWeather, autoPlay, toggleAuto } = useFarm();
  return <aside className="weather-panel" aria-label="天气测试面板">
    <div className="panel-title"><span>天气测试</span><small>实时场景</small></div>
    <div className="weather-grid">{(Object.keys(WEATHER) as WeatherMode[]).map((key) => <button key={key} className={weather === key ? "active" : ""} onClick={() => setWeather(key)} aria-pressed={weather === key}><b>{WEATHER[key].icon}</b><span>{WEATHER[key].label}</span></button>)}</div>
    <button className={`auto-button ${autoPlay ? "on" : ""}`} onClick={toggleAuto}><span className="toggle"><i /></span><span>自动轮播</span></button>
  </aside>;
}

function ExplorerButton() {
  const viewMode = useFarm((s) => s.viewMode);
  const setViewMode = useFarm((s) => s.setViewMode);
  const walking = viewMode === "walk";
  return <button className={`explorer-button ${walking ? "active" : ""}`} onClick={() => setViewMode(walking ? "overview" : "walk")} aria-pressed={walking} aria-label={walking ? "返回上帝视角" : "进入农场漫游"}>
    <span className="avatar"><i className="avatar-hat" /><i className="avatar-head" /><i className="avatar-body" /></span>
    <span><small>{walking ? "正在农场里" : "农场主小麦"}</small><strong>{walking ? "返回上帝视角" : "进入农场走走"}</strong></span>
    <b>{walking ? "↗" : "›"}</b>
  </button>;
}

function CropCard({ onAddInstruction }: { onAddInstruction?: (crop: string, action: "water" | "plant" | "harvest", icon: string) => void }) {
  const selected = useFarm((s) => s.selected);
  const select = useFarm((s) => s.select);
  if (!selected) return null;
  const stateLabel = { healthy: "状态良好", pest: "发现访客", damaged: "叶片受损" }[selected.state];
  const cropIcon = selected.kind === "corn" ? "🌽" : selected.kind === "tomato" ? "🍅" : "🌻";
  const add = (action: "water" | "plant" | "harvest") => onAddInstruction?.(selected.name, action, cropIcon);
  return <section className="crop-card" aria-live="polite">
    <button className="close" onClick={() => select(null)} aria-label="关闭作物卡片">×</button>
    <div className={`crop-badge ${selected.state}`}>{cropIcon}</div>
    <div className="crop-heading"><span>{selected.stage}</span><h2>{selected.name}</h2><p>{stateLabel}</p></div>
    <div className="metric"><span>健康值</span><strong>{selected.health}</strong><div><i style={{ width: `${selected.health}%` }} /></div></div>
    <div className="metric moisture"><span>土壤湿度</span><strong>{selected.moisture}%</strong><div><i style={{ width: `${selected.moisture}%` }} /></div></div>
    <p className="crop-note">“{selected.note}”</p>
    {selected.kind === "tomato" && <div className="crop-harvest-ready"><span>🧺</span><strong>这一株今天可以收成</strong><small>建议 16:30 前完成采摘</small></div>}
    <div className="crop-command-actions"><button onClick={() => add("water")}>💧 浇水</button><button onClick={() => add("plant")}>🌱 补种</button><button className={selected.kind === "tomato" ? "ready" : ""} onClick={() => add("harvest")}>🧺 {selected.kind === "tomato" ? "立即收获" : "预约收获"}</button></div>
    <div className="card-foot"><span>AI巡田员</span><time>刚刚更新</time></div>
  </section>;
}

function AmbientSoundControl() {
  const weather = useFarm((s) => s.weather);
  const [enabled, setEnabled] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    contextRef.current = context;
    const master = context.createGain();
    master.gain.value = 0.28;
    master.connect(context.destination);
    const intervals: number[] = [];

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noise.length; index += 1) noise[index] = Math.sin(index * 12.9898) * Math.cos(index * 0.071) * 0.36;
    const noiseSource = context.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = weather === "rainy" ? "highpass" : "lowpass";
    noiseFilter.frequency.value = weather === "rainy" ? 1800 : weather === "windy" ? 760 : 420;
    const noiseGain = context.createGain();
    noiseGain.gain.value = weather === "rainy" ? 0.32 : weather === "windy" ? 0.2 : 0.045;
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(master);
    noiseSource.start();

    const chirp = (kind: "bird" | "insect") => {
      if (context.state === "closed") return;
      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "bird" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(kind === "bird" ? 1650 : 4200, start);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "bird" ? 2450 : 3300, start + (kind === "bird" ? 0.16 : 0.08));
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "bird" ? 0.16 : 0.055, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "bird" ? 0.34 : 0.12));
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.38);
    };

    if (weather === "sunny" || weather === "cloudy") {
      chirp("bird");
      intervals.push(window.setInterval(() => chirp("bird"), weather === "sunny" ? 4200 : 6500));
      intervals.push(window.setInterval(() => chirp("insect"), 2800));
    } else if (weather === "night") {
      intervals.push(window.setInterval(() => chirp("insect"), 900));
    } else if (weather === "windy") {
      intervals.push(window.setInterval(() => chirp("bird"), 8500));
    }

    return () => {
      intervals.forEach((timer) => window.clearInterval(timer));
      noiseSource.stop();
      void context.close();
      contextRef.current = null;
    };
  }, [enabled, weather]);

  const label = weather === "rainy" ? "雨落田野" : weather === "windy" ? "风吹叶片" : weather === "night" ? "夜虫低鸣" : "虫鸣与飞鸟";
  return <button className={`sound-control ${enabled ? "on" : ""}`} onClick={() => setEnabled((value) => !value)} aria-pressed={enabled} aria-label={enabled ? "关闭农场环境音" : "开启农场环境音"}><span>{enabled ? "♫" : "♪"}</span><div><small>环境音 · {enabled ? "互动中" : "点击开启"}</small><strong>{label}</strong></div><i>{enabled ? "ON" : "OFF"}</i></button>;
}

export default function FarmExperience({ onAddInstruction }: { onAddInstruction?: (crop: string, action: "water" | "plant" | "harvest", icon: string) => void }) {
  const { weather, autoPlay, setWeather, viewMode } = useFarm();
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(true);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 1000); return () => clearTimeout(t); }, []);
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!autoPlay) return; const modes = Object.keys(WEATHER) as WeatherMode[]; const t = window.setInterval(() => setWeather(modes[(modes.indexOf(useFarm.getState().weather) + 1) % modes.length]), 4500); return () => clearInterval(t); }, [autoPlay, setWeather]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === "Escape") useFarm.getState().select(null); if (/^[1-5]$/.test(e.key)) setWeather((Object.keys(WEATHER) as WeatherMode[])[Number(e.key) - 1]); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [setWeather]);
  const moveKey = (key: string, pressed: boolean) => window.dispatchEvent(new KeyboardEvent(pressed ? "keydown" : "keyup", { key }));
  const data = WEATHER[weather];
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric", weekday: "short" }).format(now);
  const timeLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  return <main className={`farm-app weather-${weather}`}>
    {!ready && <LoadingScreen />}
    <header className="topbar status-only">
      <div className="status-strip"><div><small>{dateLabel} · 杭州</small><strong>{timeLabel}</strong></div><span className="divider" /><div className="weather-now"><b>{data.icon}</b><div><small>{data.label} · 夏季</small><strong>{data.temp}</strong></div></div><span className="live"><i /> AI 映射</span></div>
    </header>
    <div className="canvas-wrap"><Canvas orthographic={false} shadows dpr={[1, 1.65]} camera={{ position: [0, 20, 30], fov: 38, near: 0.1, far: 100 }} gl={{ antialias: true, powerPreference: "high-performance" }}><Suspense fallback={null}><Scene /></Suspense></Canvas></div>
    <WeatherPanel />
    <ExplorerButton />
    <AmbientSoundControl />
    <CropCard onAddInstruction={onAddInstruction} />
    {help && <div className="help"><span className="mouse">⌁</span><div><strong>{viewMode === "walk" ? "漫步农场" : "探索农场"}</strong><small>{viewMode === "walk" ? "WASD / 方向键行走 · 点击人物按钮返回" : "固定上帝视角 · 点击作物查看状态"}</small></div><button onClick={() => setHelp(false)} aria-label="关闭操作提示">知道了</button></div>}
    {viewMode === "walk" && <div className="walk-hud"><span>{[["w", "W"], ["a", "A"], ["s", "S"], ["d", "D"]].map(([key, label]) => <button key={key} aria-label={`向${label === "W" ? "前" : label === "S" ? "后" : label === "A" ? "左" : "右"}移动`} onPointerDown={() => moveKey(key, true)} onPointerUp={() => moveKey(key, false)} onPointerLeave={() => moveKey(key, false)}>{label}</button>)}</span><p><strong>漫游模式</strong><small>使用键盘、方向键或点击方向键行走</small></p></div>}
    <div className="quality"><i /> 画质 · 自动</div>
  </main>;
}
