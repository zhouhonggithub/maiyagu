export type AppPage = "farm" | "journal" | "seasons" | "visitors" | "commands" | "profile";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type VisitorKind = "insect" | "bird" | "person" | "animal";

export interface AuthSession { phoneMasked: string; nickname: string; loginAt: string }
export interface FarmSnapshot { farmName: string; location: string; updatedAt: string; health: number; weather: string; temperature: number }
export interface PlotAnalysis { id: string; name: string; crop: string; health: number; moisture: number; ph: number; status: string; source: string; updatedAt: string; confidence: number }
export interface PlantingAdvice { id: string; season: Season; crop: string; plot: string; suitability: number; window: string; reason: string; risk: string; preparation: string }
export interface SeasonTimelineEvent { id: string; date: string; season: Season; type: "solar-term" | "plant" | "care" | "harvest"; title: string; detail: string; status: "past" | "current" | "future" }
export interface VisitorEvent { id: string; date: string; time: string; kind: VisitorKind; name: string; icon: string; plot: string; count: number; confidence: number; impact: string; cameraId: string; authorized?: boolean }
export interface CameraFeed { id: string; name: string; plot: string; status: "online" | "weak" | "offline"; updatedAt: string; streamUrl?: string }

export const SNAPSHOT: FarmSnapshot = { farmName: "麦芽谷·杭州菜园", location: "浙江杭州 · 余杭区", updatedAt: "刚刚", health: 86, weather: "晴间多云", temperature: 31 };

export const PLOTS: PlotAnalysis[] = [
  { id: "A1", name: "溪边 A1", crop: "甜玉米", health: 93, moisture: 62, ph: 6.5, status: "长势舒展，暂未发现明显异常。", source: "A1 土壤探针 · 东侧摄像头", updatedAt: "14:25", confidence: 96 },
  { id: "B2", name: "番茄 B2", crop: "樱桃番茄", health: 72, moisture: 38, ph: 6.4, status: "有一点渴，叶片附近发现疑似菜青虫。", source: "B2 土壤探针 · 南侧摄像头", updatedAt: "14:22", confidence: 88 },
  { id: "C1", name: "向阳 C1", crop: "向日葵", health: 89, moisture: 57, ph: 6.7, status: "花盘状态稳定，午后光照充足。", source: "C1 土壤探针 · 全景摄像头", updatedAt: "14:20", confidence: 94 },
  { id: "D3", name: "水渠 D3", crop: "秋季预留地", health: 81, moisture: 71, ph: 6.8, status: "排水良好，适合为下一季播种做准备。", source: "D3 土壤探针", updatedAt: "14:18", confidence: 91 },
];

export const ADVICES: PlantingAdvice[] = [
  { id: "sp", season: "spring", crop: "春萝卜", plot: "D3", suitability: 91, window: "2月24日—3月15日", reason: "杭州早春回温快，D3 土质疏松、排水稳定。", risk: "倒春寒可能造成幼苗生长放缓。", preparation: "播前深翻 18cm，并准备薄膜保温。" },
  { id: "su", season: "summer", crop: "耐热小白菜", plot: "D3", suitability: 78, window: "8月10日—8月20日", reason: "预留地湿度稳定，可进行短周期叶菜轮作。", risk: "高温和暴雨会影响出苗率。", preparation: "搭建遮阳网，采用傍晚条播。" },
  { id: "au", season: "autumn", crop: "秋菠菜", plot: "D3", suitability: 88, window: "8月25日—9月10日", reason: "杭州入秋后温度适宜，D3 排水良好且 pH 为 6.8。", risk: "9月上旬仍可能出现连续高温。", preparation: "播种前一周整地，准备遮阳与补水。" },
  { id: "wi", season: "winter", crop: "越冬蚕豆", plot: "A1 轮作区", suitability: 84, window: "10月20日—11月10日", reason: "杭州冬季适合耐寒豆类，轮作能帮助改善土壤。", risk: "持续低温和积水会影响根系。", preparation: "开沟排水，选择耐寒早熟品种。" },
];

export const VISITORS: VisitorEvent[] = [
  { id: "v1", date: "2026-08-05", time: "09:42", kind: "insect", name: "菜青虫", icon: "🐛", plot: "番茄 B2", count: 3, confidence: 87, impact: "可能啃食幼嫩叶片，建议检查叶背。", cameraId: "cam-south" },
  { id: "v2", date: "2026-08-05", time: "11:18", kind: "bird", name: "麻雀", icon: "🐦", plot: "溪边 A1", count: 2, confidence: 93, impact: "短暂停留，没有发现明显作物损伤。", cameraId: "cam-east" },
  { id: "v3", date: "2026-08-04", time: "18:06", kind: "insect", name: "七星瓢虫", icon: "🐞", plot: "番茄 B2", count: 1, confidence: 96, impact: "农场里的益虫朋友，可能帮助控制蚜虫。", cameraId: "cam-south" },
  { id: "v4", date: "2026-08-03", time: "07:35", kind: "person", name: "巡田工作人员", icon: "🧑‍🌾", plot: "水渠 D3", count: 1, confidence: 99, impact: "已授权人员，完成了水渠例行检查。", cameraId: "cam-wide", authorized: true },
  { id: "v5", date: "2026-08-02", time: "22:14", kind: "animal", name: "橘猫", icon: "🐈", plot: "北侧围栏", count: 1, confidence: 84, impact: "停留约 4 分钟，没有进入种植区。", cameraId: "cam-north" },
];

export const CAMERAS: CameraFeed[] = [
  { id: "cam-wide", name: "农场全景", plot: "中心高杆", status: "online", updatedAt: "刚刚" },
  { id: "cam-south", name: "番茄地块", plot: "B2 南侧", status: "online", updatedAt: "12秒前" },
  { id: "cam-east", name: "溪边地块", plot: "A1 东侧", status: "weak", updatedAt: "1分钟前" },
  { id: "cam-north", name: "北侧围栏", plot: "北侧入口", status: "offline", updatedAt: "18分钟前" },
];

export const SOLAR_TERMS_2026 = [
  ["2026-02-04", "立春"], ["2026-02-18", "雨水"], ["2026-03-05", "惊蛰"], ["2026-03-20", "春分"], ["2026-04-05", "清明"], ["2026-04-20", "谷雨"],
  ["2026-05-05", "立夏"], ["2026-05-21", "小满"], ["2026-06-05", "芒种"], ["2026-06-21", "夏至"], ["2026-07-07", "小暑"], ["2026-07-23", "大暑"],
  ["2026-08-07", "立秋"], ["2026-08-23", "处暑"], ["2026-09-07", "白露"], ["2026-09-23", "秋分"], ["2026-10-08", "寒露"], ["2026-10-23", "霜降"],
  ["2026-11-07", "立冬"], ["2026-11-22", "小雪"], ["2026-12-07", "大雪"], ["2026-12-22", "冬至"], ["2026-01-05", "小寒"], ["2026-01-20", "大寒"],
] as const;
