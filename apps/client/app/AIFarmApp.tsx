"use client";

import { create } from "zustand";
import { useEffect, useMemo, useState } from "react";
import FarmExperience from "./FarmExperience";
import { ADVICES, AppPage, AuthSession, CAMERAS, FARM_ARCHIVE, PLOTS, Season, SNAPSHOT, SOLAR_TERMS_2026, VISITOR_CODEX, VISITORS } from "./farmData";

interface AppStore {
  session: AuthSession | null;
  page: AppPage;
  menuOpen: boolean;
  advisorOpen: boolean;
  cameraId: string | null;
  season: Season;
  sidebarCollapsed: boolean;
  farmIndex: number;
  instructions: FarmInstruction[];
  shareCopied: boolean;
  shareLiked: boolean;
  shareLikes: number;
  assists: FarmAssistLog[];
  setSession: (session: AuthSession | null) => void;
  setPage: (page: AppPage) => void;
  setMenuOpen: (open: boolean) => void;
  setAdvisorOpen: (open: boolean) => void;
  setCameraId: (id: string | null) => void;
  setSeason: (season: Season) => void;
  toggleSidebar: () => void;
  switchFarm: () => void;
  addInstruction: (crop: string, action: InstructionAction, icon: string) => void;
  advanceInstruction: (id: string) => void;
  setShareCopied: (copied: boolean) => void;
  toggleShareLike: () => void;
  addAssist: (type: AssistType) => void;
}

type InstructionAction = "water" | "plant" | "harvest";
type AssistType = "water" | "fertilize" | "pest" | "sun";
interface FarmInstruction { id: string; crop: string; icon: string; action: InstructionAction; title: string; createdAt: string; progress: number; status: "pending" | "working" | "done" }
interface FarmAssistLog { id: string; visitor: string; type: AssistType; label: string; icon: string; createdAt: string }
interface HarvestEvent { id: string; date: string; crop: string; icon: string; plot: string; progress: number; amount: string; status: "past" | "today" | "future"; note: string }

const ACTION_LABEL: Record<InstructionAction, string> = { water: "浇水", plant: "种植 / 补种", harvest: "收获" };
const INITIAL_INSTRUCTIONS: FarmInstruction[] = [
  { id: "task-water-b2", crop: "樱桃番茄", icon: "🍅", action: "water", title: "给番茄 B2 补水", createdAt: "今天 09:10", progress: 65, status: "working" },
  { id: "task-plant-d3", crop: "秋菠菜", icon: "🍃", action: "plant", title: "准备 D3 秋菠菜播种", createdAt: "今天 08:35", progress: 20, status: "pending" },
];
const ASSIST_ACTIONS: Record<AssistType, { label: string; icon: string; note: string }> = {
  water: { label: "助力浇水", icon: "💧", note: "给番茄区补一点水汽" },
  fertilize: { label: "助力施肥", icon: "🌿", note: "为玉米地加一份营养" },
  pest: { label: "除虫提醒", icon: "🐛", note: "提醒主人检查叶背" },
  sun: { label: "阳光点赞", icon: "☀", note: "给农场攒一点好天气" },
};
const INITIAL_ASSISTS: FarmAssistLog[] = [
  { id: "assist-1", visitor: "阿禾", type: "water", label: ASSIST_ACTIONS.water.label, icon: ASSIST_ACTIONS.water.icon, createdAt: "10分钟前" },
  { id: "assist-2", visitor: "小满", type: "sun", label: ASSIST_ACTIONS.sun.label, icon: ASSIST_ACTIONS.sun.icon, createdAt: "26分钟前" },
  { id: "assist-3", visitor: "南瓜同学", type: "fertilize", label: ASSIST_ACTIONS.fertilize.label, icon: ASSIST_ACTIONS.fertilize.icon, createdAt: "1小时前" },
];
const FARM_SIGNS = [
  { name: "麦芽谷农场", location: "杭州菜园", status: "晴朗 · 夏季 · 健康度 86" },
  { name: "溪边小菜园", location: "余杭溪畔", status: "多云 · 夏季 · 健康度 82" },
  { name: "向阳试验田", location: "杭州西侧", status: "晴朗 · 轮作观察中" },
];
const HARVEST_EVENTS: HarvestEvent[] = [
  { id: "h1", date: "2026-07-26", crop: "小白菜", icon: "🥬", plot: "D3", progress: 100, amount: "2.4kg", status: "past", note: "已完成打包，作为首批体验菜发出。" },
  { id: "h2", date: "2026-07-31", crop: "樱桃番茄", icon: "🍅", plot: "B2", progress: 100, amount: "1.8kg", status: "past", note: "甜度稳定，历史收成记录已归档。" },
  { id: "h3", date: "2026-08-05", crop: "樱桃番茄", icon: "🍅", plot: "B2", progress: 100, amount: "预计 1.6kg", status: "today", note: "今天 16:30 前建议完成采摘。" },
  { id: "h4", date: "2026-08-08", crop: "甜玉米", icon: "🌽", plot: "A1", progress: 82, amount: "预计 8 根", status: "future", note: "进入收成观察期，等待穗粒饱满。" },
  { id: "h5", date: "2026-08-13", crop: "向日葵籽", icon: "🌻", plot: "C1", progress: 64, amount: "预计 0.9kg", status: "future", note: "花盘稳定，后续观察干燥度。" },
  { id: "h6", date: "2026-08-18", crop: "秋菠菜试种", icon: "🍃", plot: "D3", progress: 28, amount: "试种记录", status: "future", note: "用于秋季计划验证，不作为正式收成。" },
];

const useApp = create<AppStore>((set) => ({
  session: null, page: "farm", menuOpen: false, advisorOpen: false, cameraId: null, season: "summer", sidebarCollapsed: false, farmIndex: 0, instructions: INITIAL_INSTRUCTIONS, shareCopied: false, shareLiked: false, shareLikes: 128, assists: INITIAL_ASSISTS,
  setSession: (session) => set({ session }),
  setPage: (page) => set({ page, menuOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setAdvisorOpen: (advisorOpen) => set({ advisorOpen }),
  setCameraId: (cameraId) => set({ cameraId }),
  setSeason: (season) => set({ season }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  switchFarm: () => set((state) => ({ farmIndex: (state.farmIndex + 1) % FARM_SIGNS.length })),
  addInstruction: (crop, action, icon) => set((state) => ({ instructions: [{ id: `task-${Date.now()}`, crop, icon, action, title: `${ACTION_LABEL[action]} · ${crop}`, createdAt: "刚刚", progress: 0, status: "pending" }, ...state.instructions] })),
  advanceInstruction: (id) => set((state) => ({ instructions: state.instructions.map((task) => task.id === id ? { ...task, progress: Math.min(100, task.progress + 35), status: task.progress + 35 >= 100 ? "done" : "working" } : task) })),
  setShareCopied: (shareCopied) => set({ shareCopied }),
  toggleShareLike: () => set((state) => ({ shareLiked: !state.shareLiked, shareLikes: state.shareLiked ? state.shareLikes - 1 : state.shareLikes + 1 })),
  addAssist: (type) => set((state) => ({ assists: [{ id: `assist-${Date.now()}`, visitor: "访客", type, label: ASSIST_ACTIONS[type].label, icon: ASSIST_ACTIONS[type].icon, createdAt: "刚刚" }, ...state.assists].slice(0, 8) })),
}));

const NAV: Array<{ id: AppPage; icon: string; label: string; note: string }> = [
  { id: "farm", icon: "🏡", label: "我的农场", note: "看看今天的田野" },
  { id: "journal", icon: "📖", label: "农场手账", note: "土地与作物分析" },
  { id: "seasons", icon: "🌱", label: "四季计划", note: "跟着时节去种植" },
  { id: "visitors", icon: "🐞", label: "访客日历", note: "虫鸟人的小故事" },
  { id: "codex", icon: "✨", label: "农场图鉴", note: "解锁田野访客" },
  { id: "archive", icon: "🗂", label: "数字档案", note: "土地的长期记录" },
  { id: "commands", icon: "📋", label: "我的指令", note: "查看农事执行进度" },
  { id: "profile", icon: "🧑‍🌾", label: "我的", note: "账号与农场设置" },
];

const SEASON_CROPS: Record<Season, Array<{ name: string; icon: string; dish: string; window: string; fit: number; tone: string }>> = {
  spring: [
    { name: "春萝卜", icon: "🥕", dish: "萝卜排骨汤", window: "2.24—3.15", fit: 91, tone: "coral" }, { name: "豌豆", icon: "🫛", dish: "豌豆虾仁", window: "2.18—3.08", fit: 88, tone: "green" }, { name: "生菜", icon: "🥬", dish: "蚝油生菜", window: "3.05—3.25", fit: 94, tone: "mint" },
    { name: "小葱", icon: "🌱", dish: "葱油拌面", window: "3.10—4.05", fit: 89, tone: "lime" }, { name: "土豆", icon: "🥔", dish: "土豆炖肉", window: "2.20—3.10", fit: 86, tone: "gold" }, { name: "菠菜", icon: "🍃", dish: "菠菜蛋汤", window: "2.15—3.12", fit: 93, tone: "green" },
    { name: "茼蒿", icon: "🌿", dish: "清炒茼蒿", window: "3.01—3.20", fit: 87, tone: "mint" }, { name: "香菜", icon: "☘️", dish: "香菜牛肉", window: "3.05—3.28", fit: 82, tone: "lime" }, { name: "樱桃萝卜", icon: "🔴", dish: "春日沙拉", window: "3.12—4.01", fit: 90, tone: "coral" },
  ],
  summer: [
    { name: "番茄", icon: "🍅", dish: "番茄炒蛋", window: "5.01—5.20", fit: 94, tone: "coral" }, { name: "黄瓜", icon: "🥒", dish: "凉拌黄瓜", window: "5.05—5.25", fit: 92, tone: "green" }, { name: "甜玉米", icon: "🌽", dish: "玉米排骨汤", window: "4.25—5.18", fit: 91, tone: "gold" },
    { name: "茄子", icon: "🍆", dish: "鱼香茄子", window: "5.10—5.30", fit: 88, tone: "purple" }, { name: "辣椒", icon: "🌶️", dish: "青椒肉丝", window: "5.01—5.20", fit: 87, tone: "coral" }, { name: "空心菜", icon: "🌿", dish: "蒜蓉空心菜", window: "5.20—8.10", fit: 95, tone: "mint" },
    { name: "丝瓜", icon: "🥒", dish: "丝瓜蛋汤", window: "4.28—5.18", fit: 89, tone: "lime" }, { name: "毛豆", icon: "🫛", dish: "盐水毛豆", window: "5.05—6.01", fit: 90, tone: "green" }, { name: "秋葵", icon: "⭐", dish: "白灼秋葵", window: "5.15—6.10", fit: 84, tone: "gold" },
  ],
  autumn: [
    { name: "秋菠菜", icon: "🍃", dish: "菠菜蛋汤", window: "8.25—9.10", fit: 88, tone: "green" }, { name: "小白菜", icon: "🥬", dish: "香菇菜心", window: "8.20—9.15", fit: 92, tone: "mint" }, { name: "白萝卜", icon: "🥕", dish: "萝卜炖牛腩", window: "8.22—9.12", fit: 90, tone: "coral" },
    { name: "西兰花", icon: "🥦", dish: "蒜蓉西兰花", window: "8.18—9.05", fit: 85, tone: "green" }, { name: "芥蓝", icon: "🌿", dish: "白灼芥蓝", window: "9.01—9.20", fit: 87, tone: "lime" }, { name: "莴笋", icon: "🎋", dish: "莴笋炒肉", window: "8.28—9.18", fit: 86, tone: "mint" },
    { name: "油麦菜", icon: "🍀", dish: "蒜香油麦菜", window: "9.05—9.25", fit: 91, tone: "green" }, { name: "荷兰豆", icon: "🫛", dish: "荷塘小炒", window: "9.20—10.10", fit: 84, tone: "lime" }, { name: "大蒜", icon: "🧄", dish: "蒜苗回锅肉", window: "9.15—10.15", fit: 89, tone: "gold" },
  ],
  winter: [
    { name: "蚕豆", icon: "🫛", dish: "葱油蚕豆", window: "10.20—11.10", fit: 84, tone: "green" }, { name: "越冬菠菜", icon: "🍃", dish: "菠菜猪肝汤", window: "10.15—11.05", fit: 90, tone: "mint" }, { name: "羽衣甘蓝", icon: "🥬", dish: "甘蓝沙拉", window: "10.10—10.30", fit: 82, tone: "purple" },
    { name: "大白菜", icon: "🥬", dish: "白菜炖豆腐", window: "8.15—9.05", fit: 91, tone: "lime" }, { name: "雪里蕻", icon: "🌿", dish: "雪菜肉丝", window: "9.10—9.30", fit: 88, tone: "green" }, { name: "冬莴笋", icon: "🎋", dish: "莴笋炒腊肉", window: "9.05—9.25", fit: 83, tone: "mint" },
    { name: "香葱", icon: "🌱", dish: "葱花煎蛋", window: "10.01—11.15", fit: 92, tone: "lime" }, { name: "芹菜", icon: "🌿", dish: "芹菜炒香干", window: "9.01—9.20", fit: 86, tone: "green" }, { name: "冬萝卜", icon: "🥕", dish: "萝卜羊肉汤", window: "8.25—9.15", fit: 89, tone: "coral" },
  ],
};

function LoginScreen() {
  const setSession = useApp((s) => s.setSession);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^1\d{10}$/.test(phone)) return setError("请输入正确的 11 位手机号");
    if (code !== "123456") return setError("验证码不正确，演示验证码是 123456");
    const session = { phoneMasked: `${phone.slice(0, 3)}****${phone.slice(-4)}`, nickname: "小麦", loginAt: new Date().toISOString() };
    localStorage.setItem("maiyagu-session", JSON.stringify(session));
    setSession(session);
  };
  return <main className="login-page">
    <div className="login-sky"><span className="cloud cloud-one" /><span className="cloud cloud-two" /><span className="login-sun">☀</span></div>
    <div className="login-landscape"><span className="hill hill-a" /><span className="hill hill-b" /><span className="tiny-house">⌂</span><span className="login-crops">♟ ♟ ♟ ♟ ♟</span></div>
    <section className="login-card">
      <div className="login-leaf">芽</div><p className="eyebrow">MAIYAGU · AI FARM</p><h1>欢迎回到麦芽谷</h1><p className="login-copy">真实土地的每一次变化，都会在这座温暖的小农场里发生。</p>
      <form onSubmit={submit}>
        <label>手机号<input inputMode="numeric" maxLength={11} placeholder="请输入手机号" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }} /></label>
        <label>验证码<span className="code-row"><input inputMode="numeric" maxLength={6} placeholder="演示验证码 123456" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }} /><button type="button" onClick={() => setSent(true)}>{sent ? "已发送" : "获取验证码"}</button></span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit">回到我的农场 <span>→</span></button>
      </form>
      <p className="demo-hint">演示模式 · 使用任意 11 位手机号与验证码 123456</p>
    </section>
  </main>;
}

function Sidebar() {
  const { page, setPage, menuOpen, setMenuOpen, sidebarCollapsed, toggleSidebar, instructions } = useApp();
  return <>
    <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="打开导航">{menuOpen ? "×" : "☰"}</button>
    <aside className={`app-sidebar ${menuOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
      <button className="sidebar-collapse" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "展开左侧导航" : "收起左侧导航"}>{sidebarCollapsed ? "›" : "‹"}</button>
      <div className="sidebar-brand"><span>芽</span><div><small>AI FARM · 001</small><strong>麦芽谷</strong></div></div>
      <div className="farm-mini"><i>🌿</i><div><strong>杭州菜园</strong><small><b /> 数据连接正常</small></div><em>{SNAPSHOT.health}</em></div>
      <nav>{NAV.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)} title={sidebarCollapsed ? item.label : undefined}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.note}</small></div>{item.id === "codex" && <i>{VISITOR_CODEX.filter((entry) => entry.unlocked).length}/{VISITOR_CODEX.length}</i>}{item.id === "commands" && instructions.some((task) => task.status !== "done") && <i>{instructions.filter((task) => task.status !== "done").length}</i>}</button>)}</nav>
      <div className="sidebar-foot"><span>☁</span><p><strong>云端同步完成</strong><small>最近更新 · 刚刚</small></p></div>
    </aside>
    {menuOpen && <button className="menu-scrim" onClick={() => setMenuOpen(false)} aria-label="关闭导航" />}
  </>;
}

function PageHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return <header className="content-header"><div><p>{icon} 麦芽谷 · 杭州菜园</p><h1>{title}</h1><span>{subtitle}</span></div><div className="header-weather"><b>⛅</b><p><strong>31°C</strong><small>晴间多云 · 杭州</small></p></div></header>;
}

function FarmAdvisor() {
  const { advisorOpen, setAdvisorOpen, setPage } = useApp();
  const advice = ADVICES.find((a) => a.season === "autumn")!;
  return <aside className={`farm-advisor ${advisorOpen ? "open" : ""}`}>
    <button className="advisor-toggle" onClick={() => setAdvisorOpen(!advisorOpen)}><span>🌱</span><div><small>小农建议 · 常驻</small><strong>秋菠菜播种期将至</strong></div><b>{advisorOpen ? "×" : "+"}</b></button>
    {advisorOpen && <div className="advisor-body"><div className="fit-ring"><strong>{advice.suitability}%</strong><small>土地适宜度</small></div><p>{advice.reason}</p><dl><div><dt>推荐地块</dt><dd>{advice.plot}</dd></div><div><dt>最佳窗口</dt><dd>{advice.window}</dd></div><div><dt>需要留意</dt><dd>{advice.risk}</dd></div><div><dt>现在准备</dt><dd>{advice.preparation}</dd></div></dl><button onClick={() => setPage("seasons")}>查看完整四季计划 →</button></div>}
  </aside>;
}

function ShareButton() {
  const { shareCopied, setShareCopied } = useApp();
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?share=1`;
  const copy = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "麦芽谷农场", text: "来我的麦芽谷农场走一走，顺手帮我浇浇水。", url: shareUrl });
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
        return;
      } catch {
        // Falling back to clipboard keeps the local demo smooth when share is cancelled.
      }
    }
    await navigator.clipboard?.writeText(shareUrl);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1800);
  };
  return <button className="farm-share-button" onClick={copy}><span>↗</span><div><small>分享农场</small><strong>{shareCopied ? "链接已复制" : "邀请朋友助力"}</strong></div></button>;
}

function FarmSign({ interactive = true }: { interactive?: boolean }) {
  const { farmIndex, switchFarm } = useApp();
  const farm = FARM_SIGNS[farmIndex];
  const content = <><span>芽</span><div><small>{farm.location}</small><strong>{farm.name}</strong><em>{farm.status}</em>{interactive && <b>点击切换农场</b>}</div></>;
  return interactive ? <button className="farm-wood-sign" onClick={switchFarm}>{content}</button> : <div className="farm-wood-sign static">{content}</div>;
}

function FarmOverlay({ shared = false, assist = false }: { shared?: boolean; assist?: boolean }) {
  const setCameraId = useApp((s) => s.setCameraId);
  return <><div className="today-note"><span>☘</span><div><small>{shared || assist ? "来自麦芽谷的邀请" : "今日农场手账"}</small><strong>田野整体状态不错</strong><p>番茄 B2 有一点渴，上午来了几位小客人。</p></div></div>{!shared && !assist && <button className="camera-entry" onClick={() => setCameraId("cam-wide")}><span>▣</span><div><small>真实现场</small><strong>查看农场监控</strong></div><i>LIVE</i></button>}<HarvestProgress /><FarmSign interactive={!shared && !assist} />{assist ? <ShareAssistPanel /> : shared ? <AssistEntryButton /> : <><ShareButton /><FarmAdvisor /></>}</>;
}

function ShareAssistPanel() {
  const { assists, addAssist, shareLiked, shareLikes, toggleShareLike } = useApp();
  const [open, setOpen] = useState(false);
  return <aside className={`share-assist-panel ${open ? "open" : "collapsed"}`}><button className="assist-dock" onClick={() => setOpen(!open)}><span>🌿</span><div><small>FRIEND SUPPORT</small><strong>{open ? "收起助力" : "展开助力功能"}</strong></div><b>{open ? "×" : "＋"}</b></button>{open && <><header><div><small>FRIEND SUPPORT</small><strong>给这块地一点帮助</strong></div><button className={shareLiked ? "liked" : ""} onClick={toggleShareLike}><span>♡</span>{shareLikes}</button></header><div className="assist-actions">{(Object.keys(ASSIST_ACTIONS) as AssistType[]).map((key) => <button key={key} onClick={() => addAssist(key)}><span>{ASSIST_ACTIONS[key].icon}</span><strong>{ASSIST_ACTIONS[key].label}</strong><small>{ASSIST_ACTIONS[key].note}</small></button>)}</div><section className="assist-log"><div><small>VISITOR LOG</small><strong>访客助力日志</strong></div>{assists.map((item) => <p key={item.id}><span>{item.icon}</span><b>{item.visitor}</b><em>{item.label}</em><small>{item.createdAt}</small></p>)}</section></>}</aside>;
}

function AssistEntryButton() {
  const openAssist = () => {
    window.history.pushState(null, "", `${window.location.pathname}?assist=1`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return <button className="assist-entry-button" onClick={openAssist}><span>🌿</span><div><small>朋友助力</small><strong>去浇水施肥</strong></div><b>›</b></button>;
}

function HarvestProgress() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  return <><aside className="harvest-timeline" onClick={() => setCalendarOpen(true)}><div className="harvest-line"><span className="harvest-line-bar" />{HARVEST_EVENTS.map((item) => <button key={item.id} className={`harvest-dot ${item.status}`}><i>{item.icon}</i></button>)}</div><div className="harvest-dates">{HARVEST_EVENTS.map((item) => <span key={item.id} className={item.status}>{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(`${item.date}T00:00:00+08:00`))}</span>)}</div></aside>{calendarOpen && <HarvestCalendarModal onClose={() => setCalendarOpen(false)} />}</>;
}

function HarvestCalendarModal({ onClose }: { onClose: () => void }) {
  const days = useMemo(() => Array.from({ length: 31 }, (_, index) => index + 1), []);
  const past = HARVEST_EVENTS.filter((item) => item.status === "past");
  const future = HARVEST_EVENTS.filter((item) => item.status !== "past");
  return <div className="harvest-modal-backdrop" role="dialog" aria-modal="true" aria-label="收成日历"><section className="harvest-modal"><header><div><small>HARVEST CALENDAR · 2026.08</small><h2>收成日历</h2><p>历史收成与即将收成都会在这里归档。</p></div><button onClick={onClose} aria-label="关闭收成日历">×</button></header><div className="harvest-calendar-layout"><article className="harvest-month"><div className="week-row">{"一二三四五六日".split("").map((day) => <span key={day}>周{day}</span>)}</div><div className="harvest-calendar-grid"><i /><i /><i /><i /><i />{days.map((day) => { const events = HARVEST_EVENTS.filter((item) => Number(item.date.slice(-2)) === day); return <button key={day} className={events.length ? `has-harvest ${events.some((item) => item.status === "today") ? "today" : ""}` : ""}><b>{day}</b><span>{events.map((item) => item.icon).join("")}</span>{events.some((item) => item.status === "today") && <em>可收</em>}</button>; })}</div></article><aside className="harvest-detail-list"><section><h3>历史收成</h3>{past.map((item) => <HarvestDetailItem key={item.id} item={item} />)}</section><section><h3>即将收成</h3>{future.map((item) => <HarvestDetailItem key={item.id} item={item} />)}</section></aside></div></section></div>;
}

function HarvestDetailItem({ item }: { item: HarvestEvent }) {
  return <article className={`harvest-detail-item ${item.status}`}><span>{item.icon}</span><div><small>{item.date} · {item.plot}</small><strong>{item.crop}</strong><p>{item.note}</p><b><i style={{ width: `${item.progress}%` }} /></b></div><em>{item.amount}</em></article>;
}

function JournalPage() {
  const [selected, setSelected] = useState(PLOTS[1]);
  const setCameraId = useApp((s) => s.setCameraId);
  return <section className="content-page journal-page"><PageHeader icon="📖" title="农场手账" subtitle="AI 把土地数据写成每天都看得懂的小故事" />
    <div className="summary-grid"><article className="health-card"><div className="health-orbit"><strong>{SNAPSHOT.health}</strong><small>健康度</small></div><div><small>今日概览</small><h2>农场正在稳稳生长</h2><p>B2 地块需要补水并检查叶背，其余区域状态平稳。</p></div></article>{[["💧", "平均湿度", "57%", "较昨日 +3%"], ["◉", "平均 pH", "6.6", "适合当前作物"], ["☀", "日照", "6.8h", "光照充足"]].map((m) => <article className="mini-stat" key={m[1]}><span>{m[0]}</span><small>{m[1]}</small><strong>{m[2]}</strong><em>{m[3]}</em></article>)}</div>
    <div className="journal-layout"><div className="plot-list"><div className="section-title"><div><small>REAL-TIME PLOTS</small><h2>地块状态</h2></div><span>4 块土地</span></div>{PLOTS.map((plot) => <button key={plot.id} className={selected.id === plot.id ? "active" : ""} onClick={() => setSelected(plot)}><span className="plot-icon">{plot.crop.includes("番茄") ? "🍅" : plot.crop.includes("玉米") ? "🌽" : plot.crop.includes("向日葵") ? "🌻" : "🌱"}</span><div><strong>{plot.name}</strong><small>{plot.crop} · {plot.status}</small></div><em>{plot.health}</em></button>)}</div>
      <article className="plot-detail"><div className="detail-head"><div><small>地块详情 · {selected.id}</small><h2>{selected.name}</h2><p>{selected.crop}</p></div><span>{selected.health}<small>健康值</small></span></div><blockquote>“{selected.status}”</blockquote><div className="metric-cards"><div><small>土壤湿度</small><strong>{selected.moisture}%</strong><i style={{ width: `${selected.moisture}%` }} /></div><div><small>土壤酸碱度</small><strong>pH {selected.ph}</strong><i style={{ width: `${selected.ph * 10}%` }} /></div></div><dl className="source-list"><div><dt>数据来源</dt><dd>{selected.source}</dd></div><div><dt>最近更新</dt><dd>今天 {selected.updatedAt}</dd></div><div><dt>AI 可信度</dt><dd>{selected.confidence}%</dd></div></dl><button className="secondary-button" onClick={() => setCameraId(selected.id === "B2" ? "cam-south" : "cam-wide")}>查看这块地的现场 →</button></article></div>
  </section>;
}

function SeasonsPage() {
  const { season, setSeason } = useApp();
  const [now] = useState(() => Date.now());
  const seasonMeta: Record<Season, { label: string; icon: string; range: string }> = { spring: { label: "春", icon: "🌸", range: "2—4月" }, summer: { label: "夏", icon: "☀️", range: "5—8月" }, autumn: { label: "秋", icon: "🍂", range: "8—10月" }, winter: { label: "冬", icon: "❄️", range: "11—1月" } };
  const percent = ((now - new Date("2026-01-01T00:00:00+08:00").getTime()) / (new Date("2027-01-01T00:00:00+08:00").getTime() - new Date("2026-01-01T00:00:00+08:00").getTime())) * 100;
  const seasonMonths: Record<Season, number[]> = { spring: [2, 3, 4], summer: [5, 6, 7, 8], autumn: [8, 9, 10], winter: [11, 12, 1] };
  const visibleTerms = SOLAR_TERMS_2026.filter((term) => seasonMonths[season].includes(Number(term[0].slice(5, 7))));
  const todayPosition = Math.max(0, Math.min(100, percent));
  return <section className={`content-page seasons-page season-${season}`}><PageHeader icon="🌱" title="四季计划" subtitle="沿着杭州的节气与土地状态，安排下一次播种" />
    <div className="season-tabs">{(Object.keys(seasonMeta) as Season[]).map((key) => <button className={season === key ? "active" : ""} key={key} onClick={() => setSeason(key)}><span>{seasonMeta[key].icon}</span><strong>{seasonMeta[key].label}季</strong><small>{seasonMeta[key].range}</small></button>)}</div>
    <div className="timeline-card"><div className="section-title"><div><small>2026 · ASIA/SHANGHAI</small><h2>杭州农事时间轴</h2></div><span>● 今天 · 实时</span></div><div className="year-track"><i style={{ width: `${todayPosition}%` }} /><b style={{ left: `${todayPosition}%` }}><span>今天</span></b>{[0, 25, 50, 75, 100].map((p, i) => <em key={p} style={{ left: `${p}%` }}>{i === 4 ? "12月" : `${i * 3 + 1}月`}</em>)}</div><div className="terms-row">{visibleTerms.map((term) => <div key={term[0]}><strong>{term[1]}</strong><small>{Number(term[0].slice(5, 7))}月{Number(term[0].slice(8))}日</small></div>)}</div></div>
    <section className="crop-recommendations"><div className="recommendation-heading"><div><small>AI SEASONAL PICKS · 9</small><h2>{seasonMeta[season].label}季推荐种植</h2><p>结合杭州气候、地块酸碱度与轮作记录生成</p></div><span>{season === "summer" ? "当前季节 · 实时建议" : `${seasonMeta[season].label}季 · 规划预览`}</span></div><div className="crop-nine-grid">{SEASON_CROPS[season].map((crop, index) => <article className={`recommend-crop tone-${crop.tone}`} key={crop.name}><div className="crop-cartoon"><span>{crop.icon}</span><i>{index < 3 ? "优先推荐" : "适合轮作"}</i></div><div className="recommend-copy"><small>适宜度 {crop.fit}%</small><h3>{crop.name}</h3><p><b>推荐菜品</b>{crop.dish}</p><time>播种 {crop.window}</time></div><button aria-label={`把${crop.name}加入种植计划`}>＋</button></article>)}</div></section>
  </section>;
}

function VisitorsPage() {
  const [selected, setSelected] = useState(VISITORS[0]);
  const [photoOpen, setPhotoOpen] = useState(false);
  const { setCameraId, setPage } = useApp();
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const unlockedCount = VISITOR_CODEX.filter((entry) => entry.unlocked).length;
  const completion = Math.round((unlockedCount / VISITOR_CODEX.length) * 100);
  return <section className="content-page visitor-page"><PageHeader icon="🐞" title="访客日历" subtitle="把摄像头见到的虫、鸟、人与小动物收进自然手账" />
    <div className="codex-summary"><div><small>VISITOR CODEX</small><strong>图鉴解锁 {unlockedCount}/{VISITOR_CODEX.length}</strong><span>灰色卡片代表真实监控还没有捕捉到足够清晰的记录。</span></div><b><i style={{ width: `${completion}%` }} /></b><em>{completion}%</em></div>
    <div className="view-switch"><button className="active">月历</button><button onClick={() => setPage("codex")}>访客图鉴</button></div>
    <div className="visitor-layout"><article className="calendar-card"><div className="calendar-head"><button>‹</button><h2>2026年 8月</h2><button>›</button></div><div className="week-row">{"一二三四五六日".split("").map((d) => <span key={d}>周{d}</span>)}</div><div className="calendar-grid"><i /><i /><i /><i /><i />{days.map((day) => { const events = VISITORS.filter((v) => Number(v.date.slice(-2)) === day); return <button key={day} className={events.length ? "has-event" : ""} onClick={() => events[0] && setSelected(events[0])}><b>{day}</b><span>{events.map((e) => e.icon).join("")}</span>{day === 5 && <em>今天</em>}</button>; })}</div></article><VisitorDetail event={selected} onCamera={() => setCameraId(selected.cameraId)} onPhoto={() => setPhotoOpen(true)} /></div>
    {photoOpen && <VisitorPhotoModal event={selected} onClose={() => setPhotoOpen(false)} />}
  </section>;
}

function CodexGrid({ onPhoto }: { onPhoto: (eventId?: string) => void }) {
  return <div className="visitor-cards codex-grid">{VISITOR_CODEX.map((entry) => {
    const event = entry.eventId ? VISITORS.find((item) => item.id === entry.eventId) : undefined;
    const seasonLabel = entry.season.map((item) => ({ spring: "春", summer: "夏", autumn: "秋", winter: "冬" })[item]).join(" / ");
    return <article key={entry.id} className={`codex-card rarity-${entry.rarity} level-${entry.level} ${entry.unlocked ? "unlocked" : "locked"} ${entry.featured ? "featured" : ""}`}><button className="visitor-card-main" disabled={!entry.unlocked} onClick={() => event && onPhoto(event.id)}><span>{entry.unlocked ? entry.icon : "?"}</span><small>{entry.rarity === "rare" ? "稀有访客" : entry.rarity === "uncommon" ? "不常见访客" : "常见访客"}</small><strong>{entry.unlocked ? entry.name : "未解锁"}</strong><p>{entry.story}</p><em>{entry.unlocked ? `累计发现 ${entry.totalSeen} 次` : `线索：${entry.habitat}`}</em></button><div className="codex-level"><span>Lv.{entry.level}</span><b>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < entry.level ? "on" : ""} />)}</b></div><div className="codex-meta"><span>{entry.kind === "insect" ? "昆虫" : entry.kind === "bird" ? "飞鸟" : entry.kind === "person" ? "人物" : "动物"}</span><span>{seasonLabel}</span></div>{entry.unlocked ? <button className="real-photo-entry" onClick={() => onPhoto(event?.id)}><span>▧</span> 查看真实照片</button> : <button className="real-photo-entry locked-entry" disabled><span>□</span> 等待监控解锁</button>}</article>;
  })}</div>;
}

function CodexPage() {
  const [photoOpen, setPhotoOpen] = useState(false);
  const [selected, setSelected] = useState(VISITORS[0]);
  const unlockedCount = VISITOR_CODEX.filter((entry) => entry.unlocked).length;
  const rareCount = VISITOR_CODEX.filter((entry) => entry.unlocked && entry.rarity === "rare").length;
  const maxLevel = Math.max(...VISITOR_CODEX.filter((entry) => entry.unlocked).map((entry) => entry.level));
  const openPhoto = (eventId?: string) => {
    const event = VISITORS.find((item) => item.id === eventId);
    if (event) setSelected(event);
    setPhotoOpen(true);
  };
  return <section className="content-page codex-page"><PageHeader icon="✨" title="农场图鉴" subtitle="把真实监控识别到的田野访客，慢慢收成一本会闪光的图鉴" />
    <section className="codex-hero"><div><small>COLLECTION BOOK</small><h2>麦芽谷访客图鉴</h2><p>解锁来自摄像头的虫、鸟、人和小动物记录。等级越高，代表越难遇见或越值得关注。</p></div><span>✨</span></section>
    <div className="archive-stats codex-stats"><article><small>解锁</small><strong>{unlockedCount}/{VISITOR_CODEX.length}</strong><span>当前进度</span></article><article><small>最高等级</small><strong>Lv.{maxLevel}</strong><span>已解锁卡牌</span></article><article><small>稀有</small><strong>{rareCount}</strong><span>闪光卡牌</span></article><article><small>照片</small><strong>5</strong><span>真实入口预留</span></article></div>
    <CodexGrid onPhoto={openPhoto} />
    {photoOpen && <VisitorPhotoModal event={selected} onClose={() => setPhotoOpen(false)} />}
  </section>;
}

function ArchivePage() {
  const { instructions, setPage, setCameraId } = useApp();
  const unlockedCount = VISITOR_CODEX.filter((entry) => entry.unlocked).length;
  const archiveStats = [
    { label: "地块", value: PLOTS.length, note: "实时映射" },
    { label: "摄像头", value: `${CAMERAS.filter((item) => item.status !== "offline").length}/${CAMERAS.length}`, note: "在线设备" },
    { label: "图鉴", value: `${unlockedCount}/${VISITOR_CODEX.length}`, note: "访客解锁" },
    { label: "指令", value: instructions.length, note: "农事记录" },
  ];
  return <section className="content-page archive-page"><PageHeader icon="🗂" title="农场数字档案" subtitle="把真实土地、监控、AI 分析和农事执行整理成一份会生长的档案" />
    <section className="archive-cover"><div className="archive-seal">芽</div><div><small>DIGITAL FARM FILE · HANGZHOU</small><h2>麦芽谷 2026 夏季档案</h2><p>这不是创建出来的虚拟农场，而是由杭州菜园的摄像头、传感器、用户指令和 AI 分析共同生成的数字副本。</p></div><button onClick={() => setCameraId("cam-wide")}>查看现场 ▣</button></section>
    <div className="archive-stats">{archiveStats.map((item) => <article key={item.label}><small>{item.label}</small><strong>{item.value}</strong><span>{item.note}</span></article>)}</div>
    <div className="archive-sections">{FARM_ARCHIVE.map((section) => <section key={section.id} className="archive-section"><div className="section-title"><div><small>ARCHIVE · {section.id.toUpperCase()}</small><h2>{section.title}</h2></div><span>{section.note}</span></div><div className="archive-records">{section.records.map((record) => <article key={record.id}><span>{record.icon}</span><div><small>{record.source}</small><strong>{record.title}</strong><p>{record.detail}</p><footer><b>{record.value}</b><em>{record.updatedAt} · 可信度 {record.confidence}%</em></footer></div></article>)}</div></section>)}</div>
    <section className="archive-actions"><button onClick={() => setPage("journal")}>查看农场手账</button><button onClick={() => setPage("codex")}>打开农场图鉴</button><button onClick={() => setPage("commands")}>查看指令进度</button></section>
  </section>;
}

function VisitorDetail({ event, onCamera, onPhoto }: { event: typeof VISITORS[number]; onCamera: () => void; onPhoto: () => void }) {
  return <article className="visitor-detail"><div className="visitor-art"><span>{event.icon}</span><i>卡通识别卡</i><button onClick={onPhoto}><b>▧</b><span>查看真实照片</span></button></div><small>{event.date} · {event.time}</small><h2>{event.name}</h2><p>{event.impact}</p><dl><div><dt>出现位置</dt><dd>{event.plot}</dd></div><div><dt>发现数量</dt><dd>{event.count}</dd></div><div><dt>识别可信度</dt><dd>{event.confidence}%</dd></div>{event.kind === "person" && <div><dt>隐私状态</dt><dd>{event.authorized ? "已授权人员" : "面部已模糊"}</dd></div>}</dl><div className="visitor-actions"><button className="photo-button" onClick={onPhoto}>▧ 真实照片</button><button className="secondary-button" onClick={onCamera}>监控记录 →</button></div></article>;
}

function VisitorPhotoModal({ event, onClose }: { event: typeof VISITORS[number]; onClose: () => void }) {
  return <div className="photo-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${event.name}真实照片`}><section className="photo-modal"><header><div><small>REAL CAPTURE · 真实记录</small><h2>{event.name}的现场照片</h2><p>{event.date} {event.time} · {event.plot}</p></div><button onClick={onClose} aria-label="关闭真实照片">×</button></header><div className="photo-placeholder"><span>▧</span><h3>真实照片待设备接入</h3><p>接入摄像头后，这里将展示 AI 截取的原始现场照片。</p><i>{event.kind === "person" ? "人物照片将默认进行面部模糊处理" : "不会使用生成图片代替现场实拍"}</i></div><aside><div><small>识别对象</small><strong>{event.name}</strong></div><div><small>拍摄设备</small><strong>{CAMERAS.find((camera) => camera.id === event.cameraId)?.name ?? "农场摄像头"}</strong></div><div><small>识别可信度</small><strong>{event.confidence}%</strong></div><div><small>记录位置</small><strong>{event.plot}</strong></div></aside></section></div>;
}

function CommandsPage() {
  const { instructions, advanceInstruction, setPage } = useApp();
  const counts = { pending: instructions.filter((item) => item.status === "pending").length, working: instructions.filter((item) => item.status === "working").length, done: instructions.filter((item) => item.status === "done").length };
  return <section className="content-page commands-page"><PageHeader icon="📋" title="我的指令" subtitle="从卡通农场发出的每一项农事操作，都会在这里留下执行进度" />
    <div className="command-summary">{[["待执行", counts.pending, "pending"], ["执行中", counts.working, "working"], ["已完成", counts.done, "done"]].map((item) => <article key={item[0]} className={`state-${item[2]}`}><small>{item[0]}</small><strong>{item[1]}</strong><span>{item[2] === "pending" ? "等待农场人员接单" : item[2] === "working" ? "现场正在处理" : "已同步执行结果"}</span></article>)}</div>
    <div className="command-board"><header><div><small>FARM COMMANDS</small><h2>指令待办列表</h2></div><button onClick={() => setPage("farm")}>＋ 从农场选择作物</button></header>{instructions.length === 0 ? <p className="empty-command">还没有农事指令，回到农场点击作物添加吧。</p> : <div className="command-list">{instructions.map((task) => <article key={task.id}><span className="command-crop">{task.icon}</span><div className="command-copy"><small>{ACTION_LABEL[task.action]} · {task.createdAt}</small><strong>{task.title}</strong><p>{task.status === "pending" ? "等待线下人员确认" : task.status === "working" ? "已经接单，正在农场执行" : "执行完成，结果已同步"}</p><b><i style={{ width: `${task.progress}%` }} /></b></div><div className={`command-state ${task.status}`}><em>{task.status === "pending" ? "待执行" : task.status === "working" ? "执行中" : "已完成"}</em><strong>{task.progress}%</strong>{task.status !== "done" && <button onClick={() => advanceInstruction(task.id)}>推进演示</button>}</div></article>)}</div>}</div>
  </section>;
}

function ProfilePage() {
  const { session, setSession } = useApp();
  const logout = () => { localStorage.removeItem("maiyagu-session"); setSession(null); };
  return <section className="content-page profile-page"><PageHeader icon="🧑‍🌾" title="我的小屋" subtitle="管理账号、农场权限和设备连接" /><div className="profile-card"><div className="profile-avatar">🧑‍🌾</div><div><small>农场观察员</small><h2>{session?.nickname}</h2><p>{session?.phoneMasked}</p></div><span>已登录</span></div><div className="settings-grid">{[["🏡", "我的农场", "麦芽谷·杭州菜园", "已授权"], ["📷", "设备管理", "4 台摄像头 · 4 个传感器", "1 项离线"], ["🔔", "通知设置", "异常、访客与农事提醒", "已开启"], ["🛡", "隐私中心", "人物画面默认模糊处理", "受保护"]].map((item) => <button key={item[1]}><span>{item[0]}</span><div><strong>{item[1]}</strong><small>{item[2]}</small></div><em>{item[3]} ›</em></button>)}</div><button className="logout-button" onClick={logout}>退出登录</button><p className="local-note">当前为本地演示模式，账号与数据不会上传。</p></section>;
}

function CameraModal() {
  const { cameraId, setCameraId } = useApp();
  const camera = CAMERAS.find((c) => c.id === cameraId);
  if (!camera) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="真实视频监控"><section className="camera-modal"><header><div><small>真实现场 · 视频功能</small><h2>{camera.name}</h2><p>{camera.plot}</p></div><span className={`camera-status ${camera.status}`}><i />{camera.status === "online" ? "设备在线" : camera.status === "weak" ? "信号较弱" : "设备离线"}</span><button onClick={() => setCameraId(null)} aria-label="关闭">×</button></header><div className="video-placeholder"><div className="video-grid" /><span>▣</span><h3>视频流待接入</h3><p>此处将显示摄像头实时画面</p><small>STREAM PLACEHOLDER · {camera.updatedAt}</small></div><aside><h3>AI 现场观察</h3><div><span>🌿</span><p><strong>作物状态</strong><small>{camera.id === "cam-south" ? "番茄叶片需要关注" : "整体长势平稳"}</small></p></div><div><span>🐛</span><p><strong>今日访客</strong><small>{camera.id === "cam-south" ? "发现 3 只疑似菜青虫" : "暂未发现异常访客"}</small></p></div><div><span>⏱</span><p><strong>数据说明</strong><small>演示识别数据 · 非真实直播</small></p></div><button className="secondary-button" onClick={() => setCameraId(null)}>返回卡通农场</button></aside></section></div>;
}

function SharedFarmPage({ assist = false }: { assist?: boolean }) {
  const addInstruction = useApp((s) => s.addInstruction);
  return <div className={`shared-shell ${assist ? "assist-mode" : "share-mode"}`}><main className="shared-farm-main"><div className="farm-layer visible"><FarmExperience onAddInstruction={addInstruction} /></div><FarmOverlay shared={!assist} assist={assist} /></main></div>;
}

function AppContent() {
  const page = useApp((s) => s.page);
  const addInstruction = useApp((s) => s.addInstruction);
  return <main className={`app-main page-${page}`}>
    <div className={`farm-layer ${page === "farm" ? "visible" : ""}`} aria-hidden={page !== "farm"}><FarmExperience onAddInstruction={addInstruction} /></div>
    {page === "farm" && <FarmOverlay />}{page === "journal" && <JournalPage />}{page === "seasons" && <SeasonsPage />}{page === "visitors" && <VisitorsPage />}{page === "codex" && <CodexPage />}{page === "archive" && <ArchivePage />}{page === "commands" && <CommandsPage />}{page === "profile" && <ProfilePage />}
  </main>;
}

export default function AIFarmApp() {
  const { session, setSession, sidebarCollapsed } = useApp();
  const [hydrated, setHydrated] = useState(false);
  const [shared, setShared] = useState(false);
  const [assist, setAssist] = useState(false);
  // Local-only demo authentication is restored after the browser mounts.
  useEffect(() => {
    const syncRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const shareMode = params.get("share") === "1";
      const assistMode = params.get("assist") === "1";
      setShared(shareMode);
      setAssist(assistMode);
      if (!shareMode && !assistMode) {
        const saved = localStorage.getItem("maiyagu-session");
        if (saved) { try { setSession(JSON.parse(saved)); } catch { localStorage.removeItem("maiyagu-session"); } }
      }
      setHydrated(true);
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, [setSession]);
  if (!hydrated) return <div className="app-boot"><span>☀</span><strong>正在打开麦芽谷…</strong></div>;
  if (shared || assist) return <SharedFarmPage assist={assist} />;
  if (!session) return <LoginScreen />;
  return <div className={`product-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}><Sidebar /><AppContent /><CameraModal /></div>;
}
