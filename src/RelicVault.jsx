import React, { useState, useMemo, useEffect, useCallback } from "react";
import { storage } from "./storage.js";
import { Star, Search, Moon } from "lucide-react";

/* ---------- フォント ---------- */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;800&family=Noto+Serif+JP:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
  `}</style>
);

/* ---------- 遺物データ (relic_name, s1,d1,s2,d2,s3,d3, id) ---------- */
const DEFAULT_RAW = [];

/* ---------- 属性辞書 ---------- */
const SLOT_PREFIX = { "壮大な": 3, "端正な": 2, "繊細な": 1 };
const COLORS = ["燃える", "滴る", "輝く", "静まる"];
const COLOR_STYLE = {
  "燃える": { fg: "#D97A5C", bg: "rgba(180,85,58,0.16)", ring: "#B4553A" },
  "滴る": { fg: "#7FB4D9", bg: "rgba(74,122,158,0.16)", ring: "#4A7A9E" },
  "輝く": { fg: "#E0C24E", bg: "rgba(201,162,39,0.18)", ring: "#C9A227" },
  "静まる": { fg: "#8FC49A", bg: "rgba(92,138,98,0.16)", ring: "#5C8A62" },
  "固有": { fg: "#B3A3E8", bg: "rgba(139,126,200,0.16)", ring: "#8B7EC8" },
};

function parseRelic(name) {
  let rest = name;
  let slot = null;
  for (const p of Object.keys(SLOT_PREFIX)) {
    if (rest.startsWith(p)) { slot = SLOT_PREFIX[p]; rest = rest.slice(p.length); break; }
  }
  let color = null;
  for (const c of COLORS) {
    if (rest.startsWith(c)) { color = c; rest = rest.slice(c.length); break; }
  }
  let depth = null;
  let special = false;
  if (rest === "景色") depth = "景色";
  else if (rest === "昏景") depth = "昏景";
  else special = true;
  return { slot, color, depth, special };
}

/* ---------- 数値効果（攻撃力・ステータス等）のパース ---------- */
const NUMERIC_RE = /^(.+?)[+＋](\d+)$/;
const STAT_ORDER = ["生命力", "精神力", "持久力", "筋力", "技量", "知力", "信仰", "神秘"];

function categoryOf(base) {
  if (STAT_ORDER.includes(base)) return "stat";
  if (base.includes("攻撃力")) return "attack";
  return "other";
}

function parseNumeric(text) {
  const m = text.match(NUMERIC_RE);
  if (!m) return null;
  const base = m[1];
  const value = parseInt(m[2], 10);
  return { base, value, category: categoryOf(base) };
}

/* ---------- 数値効果の実際の上昇率（％等）変換テーブル 出典：神攻略Wiki(kamikouryaku.net) ---------- */
const PERCENT_MAP = {"物理攻撃力上昇":{"unit":"%","normal":{"0":4,"1":5,"2":6},"deep":{"0":4,"1":5,"2":6,"3":10.5,"4":12}},"魔力攻撃力上昇":{"unit":"%","normal":{"0":4,"1":5,"2":6},"deep":{"0":4,"1":5,"2":6,"3":10.5,"4":12}},"炎攻撃力上昇":{"unit":"%","normal":{"0":4,"1":5,"2":6},"deep":{"0":4,"1":5,"2":6,"3":10.5,"4":12}},"雷攻撃力上昇":{"unit":"%","normal":{"0":4,"1":5,"2":6},"deep":{"0":4,"1":5,"2":6,"3":10.5,"4":12}},"聖攻撃力上昇":{"unit":"%","normal":{"0":4,"1":5,"2":6},"deep":{"0":4,"1":5,"2":6,"3":10.5,"4":12}},"属性攻撃力上昇":{"unit":"%","deep":{"0":5,"1":8,"2":10}},"脂アイテム使用時、追加で物理攻撃力上昇":{"unit":"%","normal":{"0":10},"deep":{"0":10,"1":17,"2":20}},"毒状態の敵に対する攻撃を強化":{"unit":"%","normal":{"0":10},"deep":{"0":10,"1":16,"2":20}},"腐敗状態の敵に対する攻撃を強化":{"unit":"%","normal":{"0":10},"deep":{"0":10,"1":16,"2":20}},"凍傷状態の敵に対する攻撃を強化":{"unit":"%","normal":{"0":10},"deep":{"0":10,"1":16,"2":20}},"周囲で睡眠状態の発生時、攻撃力上昇":{"unit":"%","deep":{"0":12,"1":22}},"周囲で発狂状態の発生時、攻撃力上昇":{"unit":"%","deep":{"0":12,"1":22}},"ガードカウンター強化":{"unit":"%","normal":{"0":17},"deep":{"0":17,"1":25,"2":29}},"致命の一撃強化":{"unit":"%","normal":{"0":17,"1":24}},"攻撃命中時、スタミナ回復":{"unit":"","normal":{"0":2,"1":3}},"魔術強化":{"unit":"%","normal":{"0":12},"deep":{"0":5,"1":8.5,"2":10}},"祈祷強化":{"unit":"%","normal":{"0":12},"deep":{"0":5,"1":8.5,"2":10}},"物理カット率上昇":{"unit":"%","normal":{"0":8},"deep":{"1":10,"2":13}},"属性カット率上昇":{"unit":"%","deep":{"0":7,"1":12,"2":14}},"雷カット率上昇":{"unit":"%","deep":{"0":10,"1":16,"2":18}},"毒耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"腐敗耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"出血耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"冷気耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"睡眠耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"発狂耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"抗死耐性上昇":{"unit":"","normal":{"0":75,"1":150,"2":225},"deep":{"0":75,"1":110}},"刺突カウンター発生時、HP回復":{"unit":"%","normal":{"0":2.5},"deep":{"0":2.5,"1":3.3}},"苔薬などのアイテム使用でHP回復":{"unit":"","normal":{"0":50},"deep":{"0":50,"1":80}},"致命の一撃で、スタミナ回復速度上昇":{"unit":"%","normal":{"0":15},"deep":{"0":15,"1":25}},"敵を倒した時、アーツゲージ増加":{"unit":"%","normal":{"0":5},"deep":{"0":5,"1":6.5}},"致命の一撃で、アーツゲージ増加":{"unit":"%","normal":{"0":5},"deep":{"0":5,"1":6.5}},"ガード成功時、アーツゲージ増加":{"unit":"%","normal":{"0":1},"deep":{"0":1,"1":1.5}},"調香術強化":{"unit":"%","normal":{"0":14},"deep":{"0":14,"1":30}},"投擲ナイフの攻撃力上昇":{"unit":"%","normal":{"0":14},"deep":{"0":14,"1":30}},"投擲壺の攻撃力上昇":{"unit":"%","normal":{"0":15},"deep":{"0":15,"1":30}},"輝石、重力石アイテムの攻撃力上昇":{"unit":"%","normal":{"0":15},"deep":{"0":15,"1":30}},"アーツゲージ自然蓄積":{"unit":"%","normal":{"1":5,"2":7.5,"3":10}},"スキルクールタイム軽減":{"unit":"%","normal":{"1":5,"2":7.5,"3":10}},"強靭度":{"unit":"%","normal":{"1":5,"2":10,"3":15}},"生命力":{"unit":"HP","normal":{"1":20,"2":40,"3":60}},"精神力":{"unit":"FP","normal":{"1":5,"2":10,"3":15}},"持久力":{"unit":"スタミナ","normal":{"1":2,"2":4,"3":6}}};
const DEMERIT_MAP = {"生命力と神秘が低下":{"value":-3,"label":"ずつ"},"筋力と知力が低下":{"value":-3,"label":"ずつ"},"技量と信仰が低下":{"value":-3,"label":"ずつ"},"知力と技量が低下":{"value":-3,"label":"ずつ"},"信仰と筋力が低下":{"value":-3,"label":"ずつ"},"取得ルーン減少":{"value":-10,"label":"%"},"HP持続減少":{"value":-2,"label":"/秒"},"すべての状態異常耐性低下":{"value":-80,"label":""},"聖杯瓶使用時、カット率低下":{"value":-45,"label":"%"},"回避直後、カット率低下":{"value":-45,"label":"%"},"回避連続時、カット率低下":{"value":-35,"label":"%"},"被ダメージ時、毒を蓄積":{"value":65,"label":"/ヒット"},"被ダメージ時、腐敗を蓄積":{"value":55,"label":"/ヒット"},"被ダメージ時、出血を蓄積":{"value":55,"label":"/ヒット"},"被ダメージ時、冷気を蓄積":{"value":55,"label":"/ヒット"},"被ダメージ時、睡眠を蓄積":{"value":50,"label":"/ヒット"},"被ダメージ時、発狂を蓄積":{"value":50,"label":"/ヒット"},"被ダメージ時、死を蓄積":{"value":40,"label":"/ヒット"},"聖杯瓶の回復量低下":{"value":-15,"label":"%"},"アーツゲージ蓄積鈍化":{"value":-15,"label":"%"},"HP最大未満時、攻撃力低下":{"value":-10,"label":"%"},"HP最大未満時、毒が蓄積":{"value":2,"label":"/秒"},"HP最大未満時、腐敗が蓄積":{"value":2,"label":"/秒"},"瀕死時、最大HP低下":{"value":-25,"label":"%"}};

// 無印(値0)スキルの検出: PERCENT_MAPに載っている基礎名と完全一致するなら「無印=最低ランク」として扱う
function parseBareNumeric(text) {
  if (!PERCENT_MAP[text]) return null;
  return { base: text, value: 0, category: categoryOf(text) };
}

function getPercent(base, value, depth) {
  const entry = PERCENT_MAP[base];
  if (!entry) return null;
  const mode = depth === "昏景" ? "deep" : "normal";
  const table = entry[mode] || entry.deep || entry.normal;
  if (!table) return null;
  const v = table[String(value)];
  if (v === undefined) return null;
  return { value: v, unit: entry.unit };
}

function formatPercent(p) {
  if (!p) return null;
  if (p.unit === "%") return `＝${p.value}%`;
  if (p.unit === "") return `＝${p.value}`;
  if (p.unit.endsWith("+")) return `＝${p.unit}${p.value}`;
  return `＝${p.value}${p.unit}`;
}

function getDemeritInfo(text) {
  const d = DEMERIT_MAP[text];
  if (!d) return null;
  const sign = d.value > 0 ? "+" : "";
  return { ...d, display: `${sign}${d.value}${d.label}` };
}

const CATEGORY_LABEL = { attack: "攻撃力", stat: "ステータス", other: "その他数値" };
const CATEGORY_STYLE = {
  attack: { fg: "#E08A5C", bg: "rgba(180,85,58,0.20)" },
  stat: { fg: "#E0C24E", bg: "rgba(201,162,39,0.20)" },
  other: { fg: "#9FB0C9", bg: "rgba(90,110,140,0.20)" },
};

function buildRelics(raw) {
  return raw.map((row) => {
    const [name, s1, d1, s2, d2, s3, d3, id] = row;
    const meta = parseRelic(name);
    const skills = [
      s1 ? { text: s1, demerit: d1 } : null,
      s2 ? { text: s2, demerit: d2 } : null,
      s3 ? { text: s3, demerit: d3 } : null,
    ]
      .filter(Boolean)
      .map((s) => ({
        ...s,
        numeric: parseNumeric(s.text) || parseBareNumeric(s.text),
        demeritNumeric: s.demerit ? getDemeritInfo(s.demerit) : null,
      }));
    const effectiveSlot = meta.slot ?? skills.length;
    const effectiveColor = meta.special ? "固有" : meta.color;
    const searchBlob = (name + " " + skills.map(s => s.text + " " + s.demerit).join(" ")).toLowerCase();
    return { id, name, skills, ...meta, effectiveSlot, effectiveColor, searchBlob };
  });
}

/* 数値効果フィルタ用の候補一覧＋観測範囲(min〜max)を、所持データ自体から集計 */
function buildNumericStats(relics) {
  const byCat = { attack: new Map(), stat: new Map(), other: new Map() };
  relics.forEach((r) => r.skills.forEach((s) => {
    if (!s.numeric) return;
    const { category, base, value } = s.numeric;
    const map = byCat[category];
    const cur = map.get(base);
    if (!cur) map.set(base, { min: value, max: value, count: 1 });
    else { cur.min = Math.min(cur.min, value); cur.max = Math.max(cur.max, value); cur.count += 1; }
  }));
  return byCat;
}

function buildNumericBases(numericStats) {
  const sortBases = (cat) => {
    const keys = [...numericStats[cat].keys()];
    if (cat === "stat") return STAT_ORDER.filter((b) => numericStats.stat.has(b));
    return keys.sort((a, b) => a.localeCompare(b, "ja"));
  };
  return { attack: sortBases("attack"), stat: sortBases("stat"), other: sortBases("other") };
}

function rangeOf(numericStats, category, base) {
  return numericStats[category].get(base) || null;
}

/* デメリットの候補一覧（データ内に実在するもののみ） */
function buildDemeritBases(relics) {
  const set = new Set();
  relics.forEach((r) => r.skills.forEach((s) => {
    if (s.demeritNumeric) set.add(s.demerit);
  }));
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}

/* 効果一覧（検索リストから選択できるように、全遺物のスキルをユニーク化） */
function skillIdentity(s) {
  return s.numeric ? `N:${s.numeric.base}` : `T:${s.text}`;
}

function buildEffectOptions(relics) {
  const counts = new Map(); // identity -> { label, count }
  relics.forEach((r) => r.skills.forEach((s) => {
    const key = skillIdentity(s);
    const label = s.numeric ? s.numeric.base : s.text;
    const cur = counts.get(key);
    if (cur) cur.count += 1;
    else counts.set(key, { label, count: 1 });
  }));
  return [...counts.entries()]
    .map(([value, v]) => ({ value, label: v.label, count: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));
}

/* 「完全上位互換」判定：candが baseの全効果を同等以上でカバーし、
   candの持つデメリットが baseにない/より軽いものを除いて存在しない場合 true */
function dominatesOrEqual(cand, base) {
  if (cand.effectiveSlot !== base.effectiveSlot) return false;
  if (cand.effectiveColor !== base.effectiveColor) return false;
  if (cand.depth !== base.depth) return false;

  const used = new Array(cand.skills.length).fill(false);

  for (const sb of base.skills) {
    const idKey = skillIdentity(sb);
    let foundIdx = -1;
    for (let i = 0; i < cand.skills.length; i++) {
      if (used[i]) continue;
      const sc = cand.skills[i];
      if (skillIdentity(sc) !== idKey) continue;
      if (sb.numeric && (!sc.numeric || sc.numeric.value < sb.numeric.value)) continue;

      if (!sb.demerit) {
        if (sc.demerit) continue; // candがbaseにないデメリットを持つ場合は不可
      } else if (sc.demerit) {
        if (sc.demerit === sb.demerit) {
          if (sb.demeritNumeric && sc.demeritNumeric &&
              Math.abs(sc.demeritNumeric.value) > Math.abs(sb.demeritNumeric.value)) continue;
        } else {
          continue; // 異なるデメリットへのすり替えは不可
        }
      }
      foundIdx = i;
      break;
    }
    if (foundIdx === -1) return false;
    used[foundIdx] = true;
  }

  for (let i = 0; i < cand.skills.length; i++) {
    if (!used[i] && cand.skills[i].demerit) return false; // 余剰スキルに新たなデメリットがあれば不可
  }
  return true;
}

/* 全遺物に対して「これを完全に上回る（同等以上の）遺物」の一覧を作る */
function buildDominanceMap(relics) {
  const groups = new Map();
  relics.forEach((r) => {
    const key = `${r.effectiveSlot}|${r.effectiveColor}|${r.depth}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const map = new Map(); // id -> [{id,name}]
  groups.forEach((group) => {
    for (const base of group) {
      const supersededBy = [];
      for (const cand of group) {
        if (cand.id === base.id) continue;
        if (dominatesOrEqual(cand, base)) supersededBy.push({ id: cand.id, name: cand.name });
      }
      if (supersededBy.length) map.set(base.id, supersededBy);
    }
  });
  return map;
}

/* ---------- 盃（献器）データ：色スロット構成（通常/深層） 出典：神攻略Wiki(kamikouryaku.net) ---------- */
const CHALICE_ORDER = ["追跡者", "守護者", "鉄の目", "レディ", "無頼漢", "復讐者", "隠者", "執行者", "学者", "葬儀屋", "共通"];
const CHALICES2 = {"共通":[["黄金樹の聖杯",["輝く","輝く","輝く"],["輝く","輝く","輝く"],"小壺商人のバザー (ラスボス撃破後)"],["霊樹の聖杯",["静まる","静まる","静まる"],["静まる","静まる","静まる"],"小壺商人のバザー (夜の王4体撃破後)"],["巨人樹の聖杯",["滴る","滴る","滴る"],["滴る","滴る","滴る"],"小壺商人のバザー (ラスボス以外の夜の王7体撃破後)"],["影樹の聖杯",["燃える","燃える","燃える"],["燃える","燃える","燃える"],"小壺商人のバザー (瓦礫の王撃破後)"]],"追跡者":[["追跡者の器",["燃える","燃える","滴る"],["燃える","燃える","滴る"],"初期"],["追跡者の盃",["輝く","静まる","静まる"],["輝く","静まる","静まる"],"小壺商人のバザー (グラディウス撃破後)"],["追跡者の高杯",["燃える","輝く","無"],["燃える","滴る","静まる"],"追跡者Chapter5達成"],["煤けた追跡者の器",["滴る","滴る","輝く"],["滴る","滴る","輝く"],"コレクターの看板"],["封じられた追跡者の器",["滴る","燃える","燃える"],["静まる","輝く","輝く"],"コレクターの看板"],["朽ちた追跡者の盃",["滴る","静まる","輝く"],["滴る","静まる","輝く"],"コレクターの看板(DLCで追加)"],["忘れられた追跡者の盃",["静まる","静まる","輝く"],["燃える","静まる","無"],"コレクターの看板(DLCで追加)"]],"守護者":[["守護者の器",["燃える","輝く","輝く"],["燃える","輝く","輝く"],"初期"],["守護者の盃",["滴る","滴る","静まる"],["滴る","滴る","静まる"],"小壺商人のバザー (グラディウス撃破後)"],["守護者の高杯",["滴る","輝く","無"],["燃える","滴る","輝く"],"守護者Chapter6達成"],["煤けた守護者の器",["燃える","静まる","静まる"],["燃える","静まる","静まる"],"コレクターの看板"],["封じられた守護者の器",["輝く","輝く","燃える"],["静まる","静まる","輝く"],"コレクターの看板"],["朽ちた守護者の盃",["輝く","静まる","静まる"],["輝く","静まる","静まる"],"コレクターの看板(DLCで追加)"],["忘れられた守護者の盃",["静まる","滴る","滴る"],["燃える","滴る","無"],"コレクターの看板(DLCで追加)"]],"鉄の目":[["鉄の目の器",["輝く","静まる","静まる"],["輝く","静まる","静まる"],"初期"],["鉄の目の盃",["燃える","滴る","輝く"],["燃える","滴る","輝く"],"小壺商人のバザー (グラディウス撃破後)"],["鉄の目の高杯",["燃える","静まる","無"],["燃える","燃える","静まる"],"鉄の目Chapter4達成"],["煤けた鉄の目の器",["滴る","輝く","輝く"],["滴る","輝く","輝く"],"コレクターの看板"],["封じられた鉄の目の器",["静まる","静まる","輝く"],["滴る","滴る","燃える"],"コレクターの看板"],["朽ちた鉄の目の盃",["滴る","滴る","静まる"],["滴る","滴る","静まる"],"コレクターの看板(DLCで追加)"],["忘れられた鉄の目の盃",["輝く","滴る","燃える"],["輝く","静まる","無"],"コレクターの看板(DLCで追加)"]],"レディ":[["レディの器",["燃える","滴る","滴る"],["燃える","滴る","滴る"],"初期"],["レディの盃",["輝く","輝く","静まる"],["輝く","輝く","静まる"],"小壺商人のバザー (グラディウス撃破後)"],["レディの高杯",["滴る","輝く","無"],["燃える","滴る","輝く"],"レディChapter5達成"],["煤けたレディの器",["燃える","燃える","静まる"],["燃える","燃える","静まる"],"コレクターの看板"],["封じられたレディの器",["滴る","滴る","燃える"],["静まる","静まる","輝く"],"コレクターの看板"],["朽ちたレディの盃",["滴る","静まる","静まる"],["滴る","静まる","静まる"],"コレクターの看板(DLCで追加)"],["忘れられたレディの盃",["静まる","輝く","輝く"],["燃える","静まる","無"],"コレクターの看板(DLCで追加)"]],"無頼漢":[["無頼漢の器",["燃える","静まる","静まる"],["燃える","静まる","静まる"],"初期"],["無頼漢の盃",["燃える","滴る","輝く"],["燃える","滴る","輝く"],"小壺商人のバザー (グラディウス撃破後)"],["無頼漢の高杯",["燃える","燃える","無"],["燃える","輝く","輝く"],"無頼漢Chapter4達成"],["煤けた無頼漢の器",["滴る","滴る","静まる"],["滴る","滴る","静まる"],"コレクターの看板"],["封じられた無頼漢の器",["静まる","静まる","燃える"],["輝く","滴る","滴る"],"コレクターの看板"],["朽ちた無頼漢の盃",["輝く","輝く","静まる"],["輝く","輝く","静まる"],"コレクターの看板(DLCで追加)"],["忘れられた無頼漢の盃",["輝く","滴る","燃える"],["燃える","静まる","無"],"コレクターの看板(DLCで追加)"]],"復讐者":[["復讐者の器",["滴る","滴る","輝く"],["滴る","滴る","輝く"],"初期"],["復讐者の盃",["燃える","燃える","静まる"],["燃える","燃える","静まる"],"小壺商人のバザー (グラディウス撃破後)"],["復讐者の高杯",["滴る","静まる","無"],["滴る","輝く","静まる"],"復讐者Chapter5達成"],["煤けた復讐者の器",["燃える","輝く","輝く"],["燃える","輝く","輝く"],"コレクターの看板"],["封じられた復讐者の器",["輝く","滴る","滴る"],["静まる","静まる","燃える"],"コレクターの看板"],["朽ちた復讐者の盃",["燃える","燃える","輝く"],["燃える","燃える","輝く"],"コレクターの看板(DLCで追加)"],["忘れられた復讐者の盃",["静まる","燃える","燃える"],["輝く","静まる","無"],"コレクターの看板(DLCで追加)"]],"隠者":[["隠者の器",["滴る","滴る","静まる"],["滴る","滴る","静まる"],"初期"],["隠者の盃",["燃える","滴る","輝く"],["燃える","滴る","輝く"],"小壺商人のバザー (グラディウス撃破後)"],["隠者の高杯",["輝く","静まる","無"],["滴る","静まる","静まる"],"隠者Chapter2達成"],["煤けた隠者の器",["燃える","燃える","輝く"],["燃える","燃える","輝く"],"コレクターの看板"],["封じられた隠者の器",["静まる","滴る","滴る"],["輝く","輝く","燃える"],"コレクターの看板"],["朽ちた隠者の盃",["燃える","燃える","滴る"],["燃える","燃える","滴る"],"コレクターの看板(DLCで追加)"],["忘れられた隠者の盃",["輝く","滴る","燃える"],["滴る","静まる","無"],"コレクターの看板(DLCで追加)"]],"執行者":[["執行者の器",["燃える","輝く","輝く"],["燃える","輝く","輝く"],"初期"],["執行者の盃",["燃える","滴る","静まる"],["燃える","滴る","静まる"],"小壺商人のバザー (グラディウス撃破後)"],["執行者の高杯",["滴る","輝く","無"],["輝く","輝く","静まる"],"執行者Chapter2達成"],["煤けた執行者の器",["燃える","燃える","滴る"],["燃える","燃える","滴る"],"コレクターの看板"],["封じられた執行者の器",["輝く","輝く","燃える"],["静まる","静まる","滴る"],"コレクターの看板"],["朽ちた執行者の盃",["燃える","燃える","輝く"],["燃える","燃える","輝く"],"コレクターの看板(DLCで追加)"],["忘れられた執行者の盃",["静まる","滴る","燃える"],["輝く","静まる","無"],"コレクターの看板(DLCで追加)"]],"学者":[["学者の器",["燃える","燃える","輝く"],["燃える","燃える","輝く"],"初期"],["学者の盃",["滴る","静まる","輝く"],["滴る","静まる","輝く"],"小壺商人のバザー(加入後)"],["学者の高杯",["燃える","滴る","無"],["燃える","輝く","輝く"],"学者Chapter3達成"],["煤けた学者の器",["滴る","静まる","静まる"],["滴る","静まる","静まる"],"コレクターの看板"],["封じられた学者の器",["輝く","燃える","燃える"],["静まる","滴る","滴る"],"コレクターの看板"],["朽ちた学者の盃",["滴る","滴る","静まる"],["滴る","滴る","静まる"],"コレクターの看板"],["忘れられた学者の盃",["輝く","静まる","滴る"],["燃える","静まる","無"],"コレクターの看板"]],"葬儀屋":[["葬儀屋の器",["滴る","静まる","静まる"],["滴る","静まる","静まる"],"初期"],["葬儀屋の盃",["燃える","輝く","輝く"],["燃える","輝く","輝く"],"小壺商人のバザー(加入後)"],["葬儀屋の高杯",["静まる","輝く","無"],["滴る","静まる","輝く"],"葬儀屋Chapter5達成"],["煤けた葬儀屋の器",["燃える","燃える","滴る"],["燃える","燃える","滴る"],"コレクターの看板"],["封じられた葬儀屋の器",["静まる","静まる","滴る"],["輝く","燃える","燃える"],"コレクターの看板"],["朽ちた葬儀屋の盃",["燃える","滴る","滴る"],["燃える","滴る","滴る"],"コレクターの看板"],["忘れられた葬儀屋の盃",["輝く","輝く","燃える"],["滴る","輝く","無"],"コレクターの看板"]]};
const CHALICE_NOTE = "※出典：神攻略Wiki（kamikouryaku.net）。左3枠＝通常スロット、右3枠＝深層スロット（深き夜クリア後に解放）。";

/* ---------- チップ ---------- */
// 盃の3スロット色を小さな丸で表示するスウォッチ（通常/深層の2段）
function ChaliceSwatch({ colors, deepColors }) {
  const renderDots = (arr) =>
    arr.map((c, i) => (
      <span
        key={i}
        className="chalice-dot"
        style={{ background: c === "無" ? "#4a4335" : (COLOR_STYLE[c] || COLOR_STYLE["固有"]).ring }}
        title={c}
      />
    ));
  return (
    <span className="chalice-swatch-wrap">
      <span className="chalice-swatch">{renderDots(colors)}</span>
      {deepColors && (
        <span className="chalice-swatch deep">{renderDots(deepColors)}</span>
      )}
    </span>
  );
}

// 盃選択用のカスタムドロップダウン（選択肢の時点で色スウォッチを表示するため<select>の代わりに使用）
function ChaliceListbox({ options, value, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`chalice-listbox${disabled ? " disabled" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="chalice-listbox-btn"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {current ? (
          <>
            <ChaliceSwatch colors={current.colors} deepColors={current.deepColors} />
            <span>{current.label}</span>
          </>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        <span className="chalice-listbox-caret">▾</span>
      </button>
      {open && !disabled && (
        <div className="chalice-listbox-menu">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              className={`chalice-listbox-item${o.value === value ? " active" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <ChaliceSwatch colors={o.colors} deepColors={o.deepColors} />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 汎用の検索付きドロップダウン（効果一覧からの選択などに使用）
function SearchableListbox({ options, placeholder, onSelect, buttonLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [options, q]);

  return (
    <div className="searchable-listbox" ref={wrapRef}>
      <button type="button" className="data-btn secondary" onClick={() => setOpen((v) => !v)}>
        {buttonLabel} ▾
      </button>
      {open && (
        <div className="searchable-listbox-menu">
          <input
            autoFocus
            className="search-input searchable-listbox-input"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="searchable-listbox-list">
            {filtered.length === 0 && <div className="searchable-listbox-empty">該当なし</div>}
            {filtered.slice(0, 300).map((o) => (
              <button
                type="button"
                key={o.value}
                className="searchable-listbox-item"
                onClick={() => { onSelect(o.value); setOpen(false); setQ(""); }}
              >
                {o.label}
                {o.count ? <span className="searchable-listbox-count">{o.count}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Android等、ネイティブのnumber inputに増減スピナーが出ない環境向けの
// タップ可能な＋／－ボタン付き数値入力
function NumberStepper({ value, onChange, step = 1, min = 0, className = "" }) {
  const clamp = (v) => Math.max(min, Math.round(v / step) * step * 100 / 100 || 0);
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(+(value + step).toFixed(2));
  return (
    <div className={`number-stepper ${className}`}>
      <button type="button" className="stepper-btn" onClick={dec} aria-label="減らす">−</button>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        className="number-input stepper-input"
        value={value}
        onChange={(e) => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
      />
      <button type="button" className="stepper-btn" onClick={inc} aria-label="増やす">＋</button>
    </div>
  );
}

function Chip({ active, onClick, children, colorRing }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderColor: active ? (colorRing || "#B9974A") : "#3A322A",
        background: active ? (colorRing ? `${colorRing}22` : "rgba(185,151,74,0.14)") : "transparent",
        color: active ? "#EFE6CC" : "#8C7F68",
      }}
      className="chip"
    >
      {children}
    </button>
  );
}

const PAGE_SIZE = 60;

/* ---------- インポート/エクスポート用ヘルパー ---------- */
// 様々な入力形式(コンパクト配列 / オブジェクト配列 / ラップ済みオブジェクト)を
// 内部で使うコンパクト行配列 [name,s1,d1,s2,d2,s3,d3,id] に正規化する
function normalizeImportedData(json) {
  let arr = json;
  if (arr && !Array.isArray(arr) && typeof arr === "object") {
    if (Array.isArray(arr.relics)) arr = arr.relics;
    else throw new Error("relics 配列が見つかりません");
  }
  if (!Array.isArray(arr)) throw new Error("配列形式のデータが必要です");
  if (arr.length === 0) return [];

  const first = arr[0];
  if (Array.isArray(first)) {
    // すでにコンパクト行形式
    return arr;
  }
  if (first && typeof first === "object") {
    // オブジェクト配列形式 (relic_name, skill1, skill1_demerit, ...) を変換
    return arr.map((o) => [
      o.relic_name ?? o.name ?? "",
      o.skill1 ?? (o.skills && o.skills[0] && o.skills[0].text) ?? "",
      o.skill1_demerit ?? (o.skills && o.skills[0] && o.skills[0].demerit) ?? "",
      o.skill2 ?? (o.skills && o.skills[1] && o.skills[1].text) ?? "",
      o.skill2_demerit ?? (o.skills && o.skills[1] && o.skills[1].demerit) ?? "",
      o.skill3 ?? (o.skills && o.skills[2] && o.skills[2].text) ?? "",
      o.skill3_demerit ?? (o.skills && o.skills[2] && o.skills[2].demerit) ?? "",
      o.item_id ?? o.id ?? "",
    ]);
  }
  throw new Error("認識できないデータ形式です");
}

// 内部のコンパクト行配列を、友人と共有しやすいオブジェクト形式に変換してエクスポートする
function toExportFormat(raw) {
  const relics = raw.map(([name, s1, d1, s2, d2, s3, d3, id]) => ({
    relic_name: name,
    skill1: s1 || "",
    skill1_demerit: d1 || "",
    skill2: s2 || "",
    skill2_demerit: d2 || "",
    skill3: s3 || "",
    skill3_demerit: d3 || "",
    item_id: id || "",
  }));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: relics.length,
    relics,
  };
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RelicVault() {
  const [slotFilter, setSlotFilter] = useState(new Set([1, 2, 3]));
  const [colorFilter, setColorFilter] = useState(new Set([...COLORS, "固有"]));
  const [depthFilter, setDepthFilter] = useState(new Set(["景色", "昏景"]));
  const [keyword, setKeyword] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [showObsoleteOnly, setShowObsoleteOnly] = useState(false);
  const [selectedEffects, setSelectedEffects] = useState([]); // [{value,label}]
  const [meta, setMeta] = useState({}); // { [id]: { fav: bool, tag: string } }
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loaded, setLoaded] = useState(false);

  /* 遺物データ本体（インポートで差し替え可能） */
  const [rawData, setRawData] = useState(DEFAULT_RAW);
  const [importMsg, setImportMsg] = useState("");
  const [importErr, setImportErr] = useState("");
  const [showDataPanel, setShowDataPanel] = useState(false);
  const fileInputRef = React.useRef(null);
  const settingsFileInputRef = React.useRef(null);

  /* 盃セレクター（通常/深層） */
  const [chaliceChar, setChaliceChar] = useState("");
  const [chaliceName, setChaliceName] = useState("");
  const [chaliceMode, setChaliceMode] = useState("normal"); // normal | deep

  /* ビルド枠（盃に実際に遺物を置く） */
  const [build, setBuild] = useState(null); // { char, name, mode, colors:[3], slots:[id|null,...] }

  /* 数値効果フィルタ */
  const [statCategory, setStatCategory] = useState("none"); // none | attack | stat | other | demerit
  const [statBase, setStatBase] = useState("all");
  const [statMin, setStatMin] = useState(0);
  const [statUsePercent, setStatUsePercent] = useState(false); // ％基準で絞り込み/並び替え

  /* 永続化：お気に入り・タグ・ビルド枠 */
  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get("relic-meta", false);
        if (res && res.value) setMeta(JSON.parse(res.value));
      } catch (e) {
        // 未保存キー。初期状態のまま
      }
      try {
        const res2 = await storage.get("relic-build", false);
        if (res2 && res2.value) setBuild(JSON.parse(res2.value));
      } catch (e) {
        // 未保存キー
      }
      try {
        const res3 = await storage.get("relic-rawdata", false);
        if (res3 && res3.value) {
          const parsed = JSON.parse(res3.value);
          const rows = normalizeImportedData(parsed);
          setRawData(rows); // 空配列（箱だけの状態）も含めてそのまま反映する
        }
      } catch (e) {
        // 未保存キー。デフォルトデータのまま
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  /* 遺物データのインポート/エクスポート */
  const handleImportFile = useCallback((file) => {
    setImportErr("");
    setImportMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        const rows = normalizeImportedData(json);
        if (!rows.length) throw new Error("遺物データが空です");
        setRawData(rows);
        storage.set("relic-rawdata", JSON.stringify(rows), false).catch(() => {});
        setImportMsg(`${rows.length.toLocaleString()} 件の遺物データを読み込みました`);
      } catch (e) {
        setImportErr(`読み込み失敗：${e.message || "ファイル形式を確認してください"}`);
      }
    };
    reader.onerror = () => setImportErr("ファイルの読み込みに失敗しました");
    reader.readAsText(file, "utf-8");
  }, []);

  // ファイル選択が使えない環境（アプリ内WebView等）向けに、貼り付けたJSONテキストから直接読み込む
  const [showPasteData, setShowPasteData] = useState(false);
  const [pasteDataText, setPasteDataText] = useState("");
  const handleImportPastedData = useCallback(() => {
    setImportErr("");
    setImportMsg("");
    try {
      const json = JSON.parse(pasteDataText);
      const rows = normalizeImportedData(json);
      if (!rows.length) throw new Error("遺物データが空です");
      setRawData(rows);
      storage.set("relic-rawdata", JSON.stringify(rows), false).catch(() => {});
      setImportMsg(`${rows.length.toLocaleString()} 件の遺物データを読み込みました`);
      setPasteDataText("");
      setShowPasteData(false);
    } catch (e) {
      setImportErr(`読み込み失敗：${e.message || "JSON形式を確認してください"}`);
    }
  }, [pasteDataText]);

  const handleExportData = useCallback(() => {
    downloadJson(`relics_export_${new Date().toISOString().slice(0, 10)}.json`, toExportFormat(rawData));
  }, [rawData]);

  /* window.confirmはアーティファクトのサンドボックスでブロックされることがあるため、
     画面内の確認ダイアログを自前で用意する */
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const askConfirm = (message, onConfirm) => setConfirmDialog({ message, onConfirm });
  const closeConfirm = () => setConfirmDialog(null);
  const runConfirm = () => {
    if (confirmDialog && confirmDialog.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog(null);
  };

  const handleResetData = useCallback(() => {
    setRawData(DEFAULT_RAW);
    storage.delete("relic-rawdata", false).catch(() => {});
    setImportMsg("初期データ（内蔵の遺物データ）に戻しました");
    setImportErr("");
  }, []);

  const handleClearData = useCallback(() => {
    askConfirm(
      "遺物データを全て削除して空の状態にします。よろしいですか？（お気に入り・タグ・ビルドは別データなので消えません）",
      () => {
        setRawData([]);
        storage.set("relic-rawdata", JSON.stringify([]), false).catch(() => {});
        setImportMsg("遺物データを空にしました（箱だけの状態）。JSONを読み込むと使えるようになります");
        setImportErr("");
      }
    );
  }, []);

  /* 個人設定（お気に入り・タグ・ビルド）のインポート/エクスポート */
  const handleExportSettings = useCallback(() => {
    downloadJson(`relicvault_settings_${new Date().toISOString().slice(0, 10)}.json`, {
      version: 1,
      exportedAt: new Date().toISOString(),
      meta,
      build,
    });
  }, [meta, build]);

  const applySettingsJson = (json) => {
    if (json.meta && typeof json.meta === "object") {
      setMeta(json.meta);
      storage.set("relic-meta", JSON.stringify(json.meta), false).catch(() => {});
    }
    if (json.build) {
      setBuild(json.build);
      storage.set("relic-build", JSON.stringify(json.build), false).catch(() => {});
    }
  };

  const handleImportSettingsFile = useCallback((file) => {
    setImportErr("");
    setImportMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        applySettingsJson(json);
        setImportMsg("個人設定を読み込みました");
      } catch (e) {
        setImportErr(`読み込み失敗：${e.message || "ファイル形式を確認してください"}`);
      }
    };
    reader.onerror = () => setImportErr("ファイルの読み込みに失敗しました");
    reader.readAsText(file, "utf-8");
  }, []);

  const [showPasteSettings, setShowPasteSettings] = useState(false);
  const [pasteSettingsText, setPasteSettingsText] = useState("");
  const handleImportPastedSettings = useCallback(() => {
    setImportErr("");
    setImportMsg("");
    try {
      const json = JSON.parse(pasteSettingsText);
      applySettingsJson(json);
      setImportMsg("個人設定を読み込みました");
      setPasteSettingsText("");
      setShowPasteSettings(false);
    } catch (e) {
      setImportErr(`読み込み失敗：${e.message || "JSON形式を確認してください"}`);
    }
  }, [pasteSettingsText]);

  const persist = useCallback((next) => {
    setMeta(next);
    storage.set("relic-meta", JSON.stringify(next), false).catch(() => {});
  }, []);

  const persistBuild = useCallback((next) => {
    setBuild(next);
    if (next) storage.set("relic-build", JSON.stringify(next), false).catch(() => {});
    else storage.delete("relic-build", false).catch(() => {});
  }, []);

  const toggleFav = (id) => {
    const cur = meta[id] || {};
    const next = { ...meta, [id]: { ...cur, fav: !cur.fav } };
    persist(next);
  };

  const setTag = (id, tag) => {
    const cur = meta[id] || {};
    const next = { ...meta, [id]: { ...cur, tag } };
    persist(next);
  };

  /* 遺物データの個別編集・削除 */
  const rawRowById = useMemo(() => {
    const map = new Map();
    rawData.forEach((row) => map.set(row[7], row));
    return map;
  }, [rawData]);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const startEdit = (id) => {
    const row = rawRowById.get(id);
    if (!row) return;
    const [name, s1, d1, s2, d2, s3, d3] = row;
    setEditDraft({
      name, skill1: s1 || "", demerit1: d1 || "",
      skill2: s2 || "", demerit2: d2 || "",
      skill3: s3 || "", demerit3: d3 || "",
    });
    setEditingId(id);
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const updateEditDraft = (field, value) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveEdit = () => {
    if (!editingId || !editDraft) return;
    const next = rawData.map((row) => {
      if (row[7] !== editingId) return row;
      return [
        editDraft.name, editDraft.skill1, editDraft.demerit1,
        editDraft.skill2, editDraft.demerit2,
        editDraft.skill3, editDraft.demerit3,
        row[7],
      ];
    });
    setRawData(next);
    storage.set("relic-rawdata", JSON.stringify(next), false).catch(() => {});
    setEditingId(null);
    setEditDraft(null);
  };

  const deleteRelic = (id) => {
    const row = rawRowById.get(id);
    const name = row ? row[0] : "この遺物";
    askConfirm(`「${name}」を削除します。よろしいですか？（元に戻せません）`, () => {
      const next = rawData.filter((row) => row[7] !== id);
      setRawData(next);
      storage.set("relic-rawdata", JSON.stringify(next), false).catch(() => {});
      if (meta[id]) {
        const nextMeta = { ...meta };
        delete nextMeta[id];
        persist(nextMeta);
      }
      if (build && build.slots.includes(id)) {
        const nextSlots = build.slots.map((s) => (s === id ? null : s));
        persistBuild({ ...build, slots: nextSlots });
      }
      if (editingId === id) { setEditingId(null); setEditDraft(null); }
    });
  };

  const toggleSetVal = (setState, val) => {
    setState((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [keyword, favOnly, statCategory, statBase, statMin, statUsePercent, showObsoleteOnly, selectedEffects]);
  useEffect(() => { setStatBase("all"); setStatUsePercent(false); }, [statCategory]);

  // AND検索: 全角/半角スペース区切りのトークンを全て満たす
  const kwTokens = useMemo(
    () => keyword.trim().toLowerCase().split(/[\s\u3000]+/).filter(Boolean),
    [keyword]
  );

  const getChaliceEntry = (charName, chaliceLabel) =>
    (CHALICES2[charName] || []).find(([n]) => n === chaliceLabel);

  const applyChaliceFilter = (charName, chaliceLabel, mode) => {
    if (!charName || !chaliceLabel) return;
    const entry = getChaliceEntry(charName, chaliceLabel);
    if (!entry) return;
    const rawSlots = mode === "deep" ? entry[2] : entry[1];
    const slots = rawSlots.filter((c) => c !== "無");
    // 「無」スロットのみの場合は全色許可、それ以外はスロットに現れる色のみに絞る
    const nextColor = slots.length > 0 ? new Set(slots) : new Set([...COLORS, "固有"]);
    setColorFilter(nextColor);
    setDepthFilter(mode === "deep" ? new Set(["昏景"]) : new Set(["景色"]));
    setVisibleCount(PAGE_SIZE);
  };

  const selectChalice = (charName, chaliceLabel) => {
    setChaliceChar(charName);
    setChaliceName(chaliceLabel);
    applyChaliceFilter(charName, chaliceLabel, chaliceMode);
  };

  const selectChaliceMode = (mode) => {
    setChaliceMode(mode);
    applyChaliceFilter(chaliceChar, chaliceName, mode);
  };

  /* ビルド枠 */
  const startBuild = () => {
    if (!chaliceChar || !chaliceName) return;
    const entry = getChaliceEntry(chaliceChar, chaliceName);
    if (!entry) return;
    const rawSlots = chaliceMode === "deep" ? entry[2] : entry[1];
    persistBuild({
      char: chaliceChar,
      name: chaliceName,
      mode: chaliceMode,
      colors: rawSlots,
      slots: [null, null, null],
    });
  };

  const clearBuild = () => { persistBuild(null); setBuildWarning(""); };

  const colorMatchesSlot = (slotColor, relicColor) =>
    slotColor === "無" || slotColor === relicColor;

  /* rawData（デフォルト or インポート済み）から派生データを再構築 */
  const RELICS = useMemo(() => buildRelics(rawData), [rawData]);
  const NUMERIC_STATS = useMemo(() => buildNumericStats(RELICS), [RELICS]);
  const NUMERIC_BASES = useMemo(() => buildNumericBases(NUMERIC_STATS), [NUMERIC_STATS]);
  const DEMERIT_BASES = useMemo(() => buildDemeritBases(RELICS), [RELICS]);
  const EFFECT_OPTIONS = useMemo(() => buildEffectOptions(RELICS), [RELICS]);
  const dominanceMap = useMemo(() => buildDominanceMap(RELICS), [RELICS]);

  const relicById = useMemo(() => {
    const map = new Map();
    RELICS.forEach((r) => map.set(r.id, r));
    return map;
  }, [RELICS]);

  const [buildWarning, setBuildWarning] = useState("");

  const addSelectedEffect = useCallback((value) => {
    const opt = EFFECT_OPTIONS.find((o) => o.value === value);
    if (!opt) return;
    setSelectedEffects((prev) => (prev.some((e) => e.value === value) ? prev : [...prev, opt]));
    setVisibleCount(PAGE_SIZE);
  }, [EFFECT_OPTIONS]);

  const removeSelectedEffect = (value) => {
    setSelectedEffects((prev) => prev.filter((e) => e.value !== value));
  };

  const assignToBuild = (relic) => {
    if (!build) return;
    const idx = build.slots.findIndex(
      (v, i) => v === null && colorMatchesSlot(build.colors[i], relic.effectiveColor)
    );
    if (idx === -1) return;
    if (build.slots.includes(relic.id)) {
      setBuildWarning(`「${relic.name}」は既にこのビルドの別スロットにセットされています。同じ遺物を重複してセットしようとしています。`);
    } else {
      setBuildWarning("");
    }
    const nextSlots = [...build.slots];
    nextSlots[idx] = relic.id;
    persistBuild({ ...build, slots: nextSlots });
  };

  const removeFromBuild = (idx) => {
    if (!build) return;
    const nextSlots = [...build.slots];
    nextSlots[idx] = null;
    persistBuild({ ...build, slots: nextSlots });
    setBuildWarning("");
  };

  // ビルドにセット中の遺物から数値効果（％等）を集計する
  const buildEffectsSummary = useMemo(() => {
    if (!build) return [];
    const map = new Map(); // key: base+category -> {base, unit, total, demerit:bool, items:[{relicName, value, pct}]}
    build.slots.forEach((relicId) => {
      if (!relicId) return;
      const relic = relicById.get(relicId);
      if (!relic) return;
      relic.skills.forEach((s) => {
        if (s.numeric) {
          const pct = getPercent(s.numeric.base, s.numeric.value, relic.depth);
          const key = `up:${s.numeric.base}`;
          const cur = map.get(key) || { base: s.numeric.base, unit: pct ? pct.unit : "", total: 0, demerit: false, items: [] };
          const addVal = pct ? pct.value : s.numeric.value;
          cur.total += addVal;
          cur.items.push({ relicName: relic.name, value: s.numeric.value, pct });
          map.set(key, cur);
        }
        if (s.demeritNumeric) {
          const key = `down:${s.demerit}`;
          const cur = map.get(key) || { base: s.demerit, unit: s.demeritNumeric.label, total: 0, demerit: true, items: [] };
          cur.total += s.demeritNumeric.value;
          cur.items.push({ relicName: relic.name, value: s.demeritNumeric.value, pct: null });
          map.set(key, cur);
        }
      });
    });
    return [...map.values()];
  }, [build, relicById]);

  const canAssign = (relic) =>
    build && build.slots.some((v, i) => v === null && colorMatchesSlot(build.colors[i], relic.effectiveColor));

  const findMatchingSkill = useCallback((r) => {
    if (statCategory === "none") return null;

    if (statCategory === "demerit") {
      let best = null;
      r.skills.forEach((s) => {
        if (!s.demeritNumeric) return;
        if (statBase !== "all" && s.demerit !== statBase) return;
        const mag = Math.abs(s.demeritNumeric.value);
        if (mag < statMin) return;
        if (!best || mag > Math.abs(best.value)) best = { ...s.demeritNumeric, sortKey: mag, base: s.demerit };
      });
      return best;
    }

    let best = null;
    r.skills.forEach((s) => {
      if (!s.numeric || s.numeric.category !== statCategory) return;
      if (statBase !== "all" && s.numeric.base !== statBase) return;
      const pct = statUsePercent ? getPercent(s.numeric.base, s.numeric.value, r.depth) : null;
      const sortKey = statUsePercent ? (pct ? pct.value : null) : s.numeric.value;
      if (statUsePercent && sortKey === null) return; // ％換算表がない項目は％モードでは対象外
      if (sortKey < statMin) return;
      if (!best || sortKey > best.sortKey) best = { ...s.numeric, sortKey, pct };
    });
    return best;
  }, [statCategory, statBase, statMin, statUsePercent]);

  const filtered = useMemo(() => {
    let list = RELICS.filter((r) => {
      if (!slotFilter.has(r.effectiveSlot > 3 ? 3 : r.effectiveSlot)) return false;
      if (!colorFilter.has(r.effectiveColor)) return false;
      if (!r.special && !depthFilter.has(r.depth)) return false;
      if (favOnly && !(meta[r.id] && meta[r.id].fav)) return false;
      if (showObsoleteOnly && !dominanceMap.has(r.id)) return false;
      if (selectedEffects.length) {
        const ids = new Set(r.skills.map((s) => skillIdentity(s)));
        if (!selectedEffects.every((e) => ids.has(e.value))) return false;
      }
      if (kwTokens.length) {
        const tag = ((meta[r.id] && meta[r.id].tag) || "").toLowerCase();
        const hit = kwTokens.every((t) => r.searchBlob.includes(t) || tag.includes(t));
        if (!hit) return false;
      }
      if (statCategory !== "none" && !findMatchingSkill(r)) return false;
      return true;
    });
    if (statCategory !== "none") {
      list = [...list].sort((a, b) => {
        const va = findMatchingSkill(a)?.sortKey ?? 0;
        const vb = findMatchingSkill(b)?.sortKey ?? 0;
        return vb - va;
      });
    }
    return list;
  }, [RELICS, slotFilter, colorFilter, depthFilter, favOnly, kwTokens, meta, statCategory, statBase, statMin, statUsePercent, findMatchingSkill, showObsoleteOnly, dominanceMap, selectedEffects]);

  const visible = filtered.slice(0, visibleCount);
  const statBaseOptions = statCategory === "demerit" ? DEMERIT_BASES : (statCategory !== "none" ? NUMERIC_BASES[statCategory] : []);
  const statBaseHasPercent = statCategory !== "none" && statCategory !== "demerit" && statBase !== "all" && !!PERCENT_MAP[statBase];

  return (
    <div className="vault-root">
      <FontLoader />
      <style>{GLOBAL_CSS}</style>

      <header className="vault-header">
        <div className="eyebrow">NIGHTREIGN &middot; RELIC ARCHIVE</div>
        <h1>遺物庫</h1>
        <div className="count-line">
          {loaded ? `${filtered.length.toLocaleString()} 件` : "読込中…"}
          <span className="count-total"> / 全 {RELICS.length.toLocaleString()} 件</span>
        </div>
        <button className="data-toggle-btn" onClick={() => setShowDataPanel((v) => !v)}>
          {showDataPanel ? "データ管理を閉じる ▲" : "遺物データ／設定の共有・読込 ▾"}
        </button>
      </header>

      {showDataPanel && (
        <div className="data-panel">
          <div className="panel-title">遺物データの管理（友人との共有用）</div>
          <div className="chalice-note" style={{ marginTop: 0 }}>
            「遺物データ」＝1935件などの遺物本体。「個人設定」＝お気に入り・タグ・ビルド枠。
            友人に渡すときは遺物データのJSONを送るだけでOK。友人はこの画面の「読み込む」からそのファイルを選ぶと、自分の環境にすぐ反映されます（自分のお気に入り等は別で保持されます）。
          </div>
          <div className="data-panel-row">
            <button className="data-btn" onClick={handleExportData}>
              遺物データを書き出す（.json）
            </button>
            <label htmlFor="relic-import-input" className="data-btn secondary file-label-btn">
              遺物データを読み込む（.json）
            </label>
            <button className="data-btn secondary" onClick={handleResetData}>
              初期データ（内蔵データ）に戻す
            </button>
            <button className="data-btn secondary danger" onClick={handleClearData}>
              空にする（箱だけの状態）
            </button>
          </div>
          <div className="chalice-note">
            「空にする」を押すと遺物データが0件になり、ツールが空の入れ物だけの状態になります。友人に配布するときや、自分の手持ちデータだけで作り直したいときに使えます。
          </div>
          <input
            id="relic-import-input"
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/plain,text/json"
            className="visually-hidden-file"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
          <div className="data-panel-row">
            <button className="data-btn secondary" onClick={() => setShowPasteData((v) => !v)}>
              {showPasteData ? "貼り付け欄を閉じる ▲" : "ファイルが開けない場合：JSONを貼り付けて読み込む ▾"}
            </button>
          </div>
          {showPasteData && (
            <div className="paste-import-box">
              <textarea
                className="paste-textarea"
                placeholder="遺物データのJSONの中身をここに貼り付け…"
                value={pasteDataText}
                onChange={(e) => setPasteDataText(e.target.value)}
              />
              <button className="data-btn" onClick={handleImportPastedData} disabled={!pasteDataText.trim()}>
                貼り付けた内容を読み込む
              </button>
            </div>
          )}
          <div className="data-panel-row">
            <button className="data-btn" onClick={handleExportSettings}>
              個人設定（お気に入り・タグ・ビルド）を書き出す
            </button>
            <label htmlFor="settings-import-input" className="data-btn secondary file-label-btn">
              個人設定を読み込む
            </label>
          </div>
          <input
            id="settings-import-input"
            ref={settingsFileInputRef}
            type="file"
            accept=".json,application/json,text/plain,text/json"
            className="visually-hidden-file"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) handleImportSettingsFile(f);
              e.target.value = "";
            }}
          />
          <div className="data-panel-row">
            <button className="data-btn secondary" onClick={() => setShowPasteSettings((v) => !v)}>
              {showPasteSettings ? "貼り付け欄を閉じる ▲" : "ファイルが開けない場合：JSONを貼り付けて読み込む ▾"}
            </button>
          </div>
          {showPasteSettings && (
            <div className="paste-import-box">
              <textarea
                className="paste-textarea"
                placeholder="個人設定のJSONの中身をここに貼り付け…"
                value={pasteSettingsText}
                onChange={(e) => setPasteSettingsText(e.target.value)}
              />
              <button className="data-btn" onClick={handleImportPastedSettings} disabled={!pasteSettingsText.trim()}>
                貼り付けた内容を読み込む
              </button>
            </div>
          )}
          {importMsg && <div className="data-msg">{importMsg}</div>}
          {importErr && <div className="data-err">{importErr}</div>}

        </div>
      )}

      <div className="filter-bar">
        <div className="filter-row">
          <span className="filter-label">スロット</span>
          {[3, 2, 1].map((n) => (
            <Chip key={n} active={slotFilter.has(n)} onClick={() => toggleSetVal(setSlotFilter, n)}>
              {"●".repeat(n)}
            </Chip>
          ))}
        </div>

        <div className="filter-row">
          <span className="filter-label">色</span>
          {[...COLORS, "固有"].map((c) => (
            <Chip
              key={c}
              active={colorFilter.has(c)}
              onClick={() => toggleSetVal(setColorFilter, c)}
              colorRing={COLOR_STYLE[c].ring}
            >
              {c}
            </Chip>
          ))}
        </div>

        <div className="filter-row">
          <span className="filter-label">深度</span>
          {["景色", "昏景"].map((d) => (
            <Chip key={d} active={depthFilter.has(d)} onClick={() => toggleSetVal(setDepthFilter, d)}>
              {d}
            </Chip>
          ))}
          <Chip active={favOnly} onClick={() => setFavOnly((v) => !v)} colorRing="#B9974A">
            <Star size={12} style={{ marginRight: 4, verticalAlign: -2 }} fill={favOnly ? "#B9974A" : "none"} />
            お気に入り
          </Chip>
          <Chip active={showObsoleteOnly} onClick={() => setShowObsoleteOnly((v) => !v)} colorRing="#B4553A">
            売却候補（上位互換あり）
          </Chip>
        </div>

        <div className="search-row">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="スキル・タグで検索（スペース区切りでAND　例: 出血 攻撃力）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && (
            <button className="clear-btn" onClick={() => setKeyword("")}>×</button>
          )}
          <SearchableListbox
            buttonLabel="効果一覧から選ぶ"
            placeholder="効果名で検索…"
            options={EFFECT_OPTIONS}
            onSelect={addSelectedEffect}
          />
        </div>
        {selectedEffects.length > 0 && (
          <div className="filter-row" style={{ marginTop: 8 }}>
            {selectedEffects.map((e) => (
              <span key={e.value} className="effect-chip">
                {e.label}
                <button type="button" onClick={() => removeSelectedEffect(e.value)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="chalice-bar">
        <div className="panel-title">盃（献器）から色を絞り込む・ビルドを組む</div>
        <div className="filter-row">
          <select
            className="select-input"
            value={chaliceChar}
            onChange={(e) => selectChalice(e.target.value, "")}
          >
            <option value="">キャラクターを選択…</option>
            {CHALICE_ORDER.filter((c) => CHALICES2[c]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChaliceListbox
            placeholder="盃を選択…"
            disabled={!chaliceChar}
            value={chaliceName}
            onChange={(v) => selectChalice(chaliceChar, v)}
            options={(CHALICES2[chaliceChar] || []).map(([n, normalSlots, deepSlots]) => ({
              value: n,
              label: n,
              colors: normalSlots,
              deepColors: deepSlots,
            }))}
          />
        </div>

        {chaliceName && (() => {
          const entry = getChaliceEntry(chaliceChar, chaliceName);
          if (!entry) return null;
          const [, normalSlots, deepSlots, method] = entry;
          return (
            <>
              <div className="filter-row">
                <Chip active={chaliceMode === "normal"} onClick={() => selectChaliceMode("normal")}>
                  <ChaliceSwatch colors={normalSlots} /> 通常スロット（{normalSlots.join("・")}）
                </Chip>
                <Chip active={chaliceMode === "deep"} onClick={() => selectChaliceMode("deep")} colorRing="#8B7EC8">
                  <ChaliceSwatch colors={deepSlots} /> 深層スロット（{deepSlots.join("・")}）
                </Chip>
              </div>
              <div className="chalice-info">
                入手方法：{method}　→ 上の「色」「深度」フィルタを自動調整しました
              </div>

              {!build && (
                <button className="build-start-btn" onClick={startBuild}>
                  この構成でビルドを組む
                </button>
              )}
            </>
          );
        })()}

        {build && (
          <div className="build-panel">
            <div className="build-title">
              {build.char}「{build.name}」の{build.mode === "deep" ? "深層" : "通常"}スロット
              <button className="build-clear-btn" onClick={clearBuild}>ビルドを解除</button>
            </div>
            {buildWarning && (
              <div className="build-warning">⚠ {buildWarning}</div>
            )}
            <div className="build-slots">
              {build.slots.map((relicId, i) => {
                const color = build.colors[i];
                const cs = COLOR_STYLE[color === "無" ? "固有" : color] || COLOR_STYLE["固有"];
                const relic = relicId ? relicById.get(relicId) : null;
                const isDup = relicId && build.slots.filter((v) => v === relicId).length > 1;
                return (
                  <div key={i} className="build-slot" style={{ borderColor: isDup ? "#B4553A" : cs.ring }}>
                    <div className="build-slot-color" style={{ color: cs.fg }}>{color}スロット</div>
                    {relic ? (
                      <>
                        <div className="build-slot-name" style={{ color: cs.fg }}>
                          {relic.name}
                          {isDup && <span className="dup-badge">重複</span>}
                        </div>
                        <ul className="build-slot-skills">
                          {relic.skills.map((s, si) => {
                            const pct = s.numeric ? getPercent(s.numeric.base, s.numeric.value, relic.depth) : null;
                            return (
                              <li key={si}>
                                {s.numeric ? s.numeric.base : s.text}
                                {s.numeric ? ` ${s.numeric.value === 0 ? "無印" : `+${s.numeric.value}`}${pct ? ` (${formatPercent(pct)})` : ""}` : ""}
                                {s.demeritNumeric ? `　→　${s.demerit}（${s.demeritNumeric.display}）` : ""}
                              </li>
                            );
                          })}
                        </ul>
                        <button className="build-slot-remove" onClick={() => removeFromBuild(i)}>外す</button>
                      </>
                    ) : (
                      <div className="build-slot-empty">空き － 遺物カードの「セット」から選択</div>
                    )}
                  </div>
                );
              })}
            </div>

            {buildEffectsSummary.length > 0 && (
              <div className="build-summary">
                <div className="build-summary-title">このビルドの合計上昇・低下（同種効果の単純合算）</div>
                <ul className="build-summary-list">
                  {buildEffectsSummary.map((e, i) => (
                    <li key={i} className={e.demerit ? "demerit" : "buff"}>
                      {e.base}：{e.demerit ? "" : "合計 "}{e.total > 0 && !e.demerit ? "+" : ""}{Math.round(e.total * 100) / 100}{e.unit}
                      {e.items.length > 1 && (
                        <span className="build-summary-detail">
                          （{e.items.map((it) => `${it.relicName}: ${it.pct ? formatPercent(it.pct) : it.value}`).join(" + ")}）
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="build-summary-note">
                  ※ ゲーム内の実際の加算式（乗算/加算の別）はスキルにより異なる場合があります。単純合計の目安としてご利用ください。
                </div>
              </div>
            )}
          </div>
        )}

        <div className="chalice-note">{CHALICE_NOTE}</div>
      </div>

      <div className="filter-bar">
        <div className="panel-title">数値効果で絞り込む（攻撃力・ステータス・デメリット）</div>
        <div className="filter-row">
          <span className="filter-label">種類</span>
          <Chip active={statCategory === "none"} onClick={() => setStatCategory("none")}>指定なし</Chip>
          <Chip active={statCategory === "attack"} onClick={() => setStatCategory("attack")} colorRing="#B4553A">攻撃力</Chip>
          <Chip active={statCategory === "stat"} onClick={() => setStatCategory("stat")} colorRing="#C9A227">ステータス</Chip>
          <Chip active={statCategory === "other"} onClick={() => setStatCategory("other")} colorRing="#5A6E8C">その他数値</Chip>
          <Chip active={statCategory === "demerit"} onClick={() => setStatCategory("demerit")} colorRing="#A85C4E">デメリット</Chip>
        </div>
        {statCategory !== "none" && (
          <div className="filter-row">
            <span className="filter-label">項目</span>
            <select className="select-input" value={statBase} onChange={(e) => setStatBase(e.target.value)}>
              <option value="all">すべて</option>
              {statBaseOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {statBaseHasPercent && (
              <Chip active={statUsePercent} onClick={() => { setStatUsePercent((v) => !v); setStatMin(0); }} colorRing="#B9974A">
                ％で判定
              </Chip>
            )}
            <span className="filter-label" style={{ width: "auto" }}>
              {statCategory === "demerit" ? "最低（絶対値）" : statUsePercent ? "最低％" : "最低段階"}
            </span>
            <NumberStepper
              value={statMin}
              min={0}
              step={statUsePercent ? 0.5 : 1}
              onChange={(v) => setStatMin(v)}
            />
            <span className="filter-label" style={{ width: "auto", color: "#6E6350" }}>
              以上（{statCategory === "demerit" ? "重い順" : "高い順"}に表示）
            </span>
          </div>
        )}
        {statCategory !== "none" && statCategory !== "demerit" && statBase !== "all" && rangeOf(NUMERIC_STATS, statCategory, statBase) && (
          <div className="chalice-info">
            「{statBase}」の所持データ内観測範囲：+{rangeOf(NUMERIC_STATS, statCategory, statBase).min}〜+{rangeOf(NUMERIC_STATS, statCategory, statBase).max}
            （{rangeOf(NUMERIC_STATS, statCategory, statBase).count}件）
            {statBaseHasPercent && PERCENT_MAP[statBase] && (
              <>　実際の効果量：{Object.entries((PERCENT_MAP[statBase].deep || PERCENT_MAP[statBase].normal))
                .map(([k, v]) => `${k === "0" ? "無印" : "+" + k}→${v}${PERCENT_MAP[statBase].unit}`).join(" / ")}</>
            )}
          </div>
        )}
        {statCategory === "demerit" && statBase !== "all" && DEMERIT_MAP[statBase] && (
          <div className="chalice-info">
            「{statBase}」の効果量：{getDemeritInfo(statBase).display}
          </div>
        )}
      </div>

      <main className="card-grid">
        {visible.length === 0 && loaded && (
          <div className="empty-state">
            条件に合う遺物が見つかりません。絞り込みを緩めてみてください。
          </div>
        )}
        {visible.map((r) => {
          const cs = COLOR_STYLE[r.effectiveColor] || COLOR_STYLE["固有"];
          const m = meta[r.id] || {};
          return (
            <article key={r.id} className="card" style={{ boxShadow: `inset 3px 0 0 ${cs.ring}` }}>
              <div className="card-top">
                <div className="dots" style={{ color: cs.fg }}>
                  {"●".repeat(r.effectiveSlot > 3 ? 3 : r.effectiveSlot || 1)}
                </div>
                <div className="badges">
                  {r.depth === "昏景" && (
                    <span className="depth-badge" title="深層の遺物">
                      <Moon size={11} /> 昏景
                    </span>
                  )}
                  <button className="fav-btn" onClick={() => toggleFav(r.id)}>
                    <Star size={16} fill={m.fav ? "#D6B94A" : "none"} color={m.fav ? "#D6B94A" : "#5A5142"} />
                  </button>
                </div>
              </div>

              <h2 className="card-name" style={{ color: cs.fg }}>{r.name}</h2>

              {editingId === r.id ? (
                <div className="edit-form">
                  <label className="edit-label">遺物名</label>
                  <input
                    className="edit-input name"
                    value={editDraft.name}
                    onChange={(e) => updateEditDraft("name", e.target.value)}
                  />
                  {[1, 2, 3].map((n) => (
                    <div className="edit-skill-block" key={n}>
                      <label className="edit-label">スキル{n}</label>
                      <input
                        className="edit-input"
                        placeholder={`スキル${n}（空欄可）`}
                        value={editDraft[`skill${n}`]}
                        onChange={(e) => updateEditDraft(`skill${n}`, e.target.value)}
                      />
                      <input
                        className="edit-input demerit"
                        placeholder="デメリット（あれば）"
                        value={editDraft[`demerit${n}`]}
                        onChange={(e) => updateEditDraft(`demerit${n}`, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="edit-actions">
                    <button className="data-btn" onClick={saveEdit}>保存</button>
                    <button className="data-btn secondary" onClick={cancelEdit}>キャンセル</button>
                    <button className="data-btn danger" onClick={() => deleteRelic(r.id)}>削除</button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="skill-list">
                    {r.skills.map((s, i) => {
                      const n = s.numeric;
                      const ns = n ? CATEGORY_STYLE[n.category] : null;
                      const range = n ? rangeOf(NUMERIC_STATS, n.category, n.base) : null;
                      const pct = n ? getPercent(n.base, n.value, r.depth) : null;
                      const dn = s.demeritNumeric;
                      return (
                        <li key={i}>
                          <span className="skill-text">
                            {n ? n.base : s.text}
                            {n && (
                              <span
                                className="numeric-badge"
                                style={{ color: ns.fg, background: ns.bg }}
                                title={CATEGORY_LABEL[n.category]}
                              >
                                {n.value === 0 ? "無印" : `+${n.value}`}{pct ? ` ${formatPercent(pct)}` : ""}
                              </span>
                            )}
                          </span>
                          {n && range && (
                            <div className="range-text">
                              所持データ内の観測範囲：{range.min === 0 ? "無印" : `+${range.min}`}〜+{range.max}（{range.count}件中）
                            </div>
                          )}
                          {s.demerit && (
                            <div className="demerit-text">
                              － {s.demerit}
                              {dn && <span className="demerit-badge">{dn.display}</span>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {dominanceMap.has(r.id) && (() => {
                    const supersede = dominanceMap.get(r.id);
                    const shown = supersede.slice(0, 2).map((x) => x.name).join("、");
                    const more = supersede.length - 2;
                    return (
                      <div className="dominance-badge">
                        ⚠ 同等以上の遺物あり：{shown}{more > 0 ? ` 他${more}件` : ""}
                      </div>
                    );
                  })()}

                  {canAssign(r) && (
                    <button className="assign-btn" onClick={() => assignToBuild(r)}>
                      ビルド枠にセット
                    </button>
                  )}

                  <input
                    className="tag-input"
                    placeholder="メモ・タグを追加…"
                    defaultValue={m.tag || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (m.tag || "")) setTag(r.id, e.target.value);
                    }}
                  />

                  <div className="card-edit-row">
                    <button className="card-edit-btn" onClick={() => startEdit(r.id)}>編集</button>
                    <button className="card-edit-btn danger" onClick={() => deleteRelic(r.id)}>削除</button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </main>

      {visibleCount < filtered.length && (
        <div className="load-more-wrap">
          <button className="load-more" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
            もっと見る（残り {(filtered.length - visibleCount).toLocaleString()} 件）
          </button>
        </div>
      )}

      {confirmDialog && (
        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">{confirmDialog.message}</div>
            <div className="confirm-actions">
              <button className="data-btn danger" onClick={runConfirm}>実行する</button>
              <button className="data-btn secondary" onClick={closeConfirm}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const GLOBAL_CSS = `
.vault-root {
  min-height: 100%;
  background: #16130F;
  background-image: radial-gradient(circle at 20% 0%, rgba(185,151,74,0.06), transparent 40%);
  color: #E8DFC9;
  font-family: 'Noto Serif JP', serif;
  padding: 28px 16px 60px;
  box-sizing: border-box;
}
.vault-header { text-align: center; margin-bottom: 22px; }
.eyebrow {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  letter-spacing: 0.22em;
  color: #8C7F68;
  margin-bottom: 6px;
}
.vault-header h1 {
  font-family: 'Shippori Mincho', serif;
  font-weight: 800;
  font-size: 34px;
  margin: 0;
  letter-spacing: 0.08em;
  color: #EFE6CC;
  text-shadow: 0 0 24px rgba(185,151,74,0.25);
}
.count-line {
  margin-top: 8px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 13px;
  color: #B9974A;
}
.count-total { color: #6E6350; }

.filter-bar {
  max-width: 880px;
  margin: 0 auto 28px;
  border: 1px solid #3A322A;
  border-radius: 10px;
  padding: 14px 16px;
  background: rgba(33,28,22,0.6);
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.filter-row:last-of-type { margin-bottom: 0; }
.filter-label {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  color: #6E6350;
  width: 52px;
  flex-shrink: 0;
}
.chip {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12.5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid #3A322A;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.4;
}
.chip:hover { border-color: #B9974A; }

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid #2B241C;
  padding-top: 12px;
  position: relative;
}

.chalice-bar {
  max-width: 880px;
  margin: 0 auto 18px;
  border: 1px solid #3A322A;
  border-radius: 10px;
  padding: 14px 16px;
  background: rgba(33,28,22,0.4);
}
.panel-title {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12.5px;
  color: #B9974A;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}
.select-input {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12.5px;
  background: #14100C;
  color: #E8DFC9;
  border: 1px solid #3A322A;
  border-radius: 6px;
  padding: 6px 8px;
  outline: none;
}
.select-input:disabled { color: #4A4636; }
.number-input {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12.5px;
  background: #14100C;
  color: #E8DFC9;
  border: 1px solid #3A322A;
  border-radius: 6px;
  padding: 6px 8px;
  width: 56px;
  outline: none;
}
.number-stepper {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid #3A322A;
  border-radius: 6px;
  overflow: hidden;
}
.stepper-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 15px;
  line-height: 1;
  background: #1B1712;
  color: #B9974A;
  border: none;
  width: 32px;
  cursor: pointer;
  touch-action: manipulation;
}
.stepper-btn:active { background: rgba(185,151,74,0.18); }
.stepper-input {
  border: none;
  border-left: 1px solid #3A322A;
  border-right: 1px solid #3A322A;
  border-radius: 0;
  width: 52px;
  text-align: center;
  -moz-appearance: textfield;
}
.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.chalice-info {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  color: #8FC49A;
  margin-top: 8px;
}
.chalice-note {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  color: #59503F;
  margin-top: 8px;
  line-height: 1.5;
}
.build-start-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  background: rgba(185,151,74,0.12);
  border: 1px solid #B9974A;
  color: #EFE6CC;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}
.build-panel {
  margin-top: 14px;
  border-top: 1px solid #2B241C;
  padding-top: 12px;
}
.build-title {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12.5px;
  color: #EFE6CC;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.build-clear-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  background: transparent;
  border: 1px solid #3A322A;
  color: #8C7F68;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}
.build-slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.build-slot {
  border: 1px dashed #3A322A;
  border-radius: 8px;
  padding: 10px 12px;
  background: #14100C;
  min-height: 84px;
}
.build-slot-color {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
}
.build-slot-name {
  font-family: 'Shippori Mincho', serif;
  font-weight: 800;
  font-size: 14px;
  margin-bottom: 4px;
}
.build-slot-skills {
  list-style: none;
  margin: 0 0 6px;
  padding: 0;
}
.build-slot-skills li {
  font-size: 11.5px;
  color: #B7AD94;
  line-height: 1.5;
}
.build-slot-empty {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  color: #45402F;
}
.build-slot-remove {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  background: transparent;
  border: 1px solid #3A322A;
  color: #A85C4E;
  padding: 3px 9px;
  border-radius: 999px;
  cursor: pointer;
  margin-top: 2px;
}
.dup-badge {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 9.5px;
  font-weight: 700;
  color: #F0D8D2;
  background: #B4553A;
  border-radius: 999px;
  padding: 1px 7px;
  margin-left: 6px;
  vertical-align: 2px;
}
.build-warning {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  color: #F0D8D2;
  background: rgba(180,85,58,0.18);
  border: 1px solid #B4553A;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
  line-height: 1.5;
}
.build-summary {
  margin-top: 14px;
  border-top: 1px solid #2B241C;
  padding-top: 12px;
}
.build-summary-title {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  color: #B9974A;
  margin-bottom: 8px;
}
.build-summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.build-summary-list li {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  line-height: 1.7;
}
.build-summary-list li.buff { color: #8FC49A; }
.build-summary-list li.demerit { color: #D98F8F; }
.build-summary-detail {
  font-size: 10.5px;
  color: #6E6350;
  margin-left: 6px;
}
.build-summary-note {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10px;
  color: #59503F;
  margin-top: 8px;
  line-height: 1.5;
}
.chalice-swatch-wrap {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  margin-right: 8px;
  vertical-align: middle;
}
.chalice-swatch {
  display: inline-flex;
  gap: 3px;
}
.chalice-swatch.deep {
  padding-left: 2px;
  position: relative;
}
.chalice-swatch.deep::before {
  content: "";
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #3A322A;
}
.chalice-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
}
.chalice-swatch.deep .chalice-dot {
  box-shadow: 0 0 0 1px rgba(139,126,200,0.7);
}
.searchable-listbox {
  position: relative;
  display: inline-block;
}
.searchable-listbox-menu {
  position: absolute;
  z-index: 25;
  top: calc(100% + 4px);
  left: 0;
  width: 320px;
  max-width: 80vw;
  background: #1B1712;
  border: 1px solid #3A322A;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.searchable-listbox-input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 6px;
}
.searchable-listbox-list {
  max-height: 280px;
  overflow-y: auto;
}
.searchable-listbox-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  color: #E8DFC9;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  padding: 7px 8px;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
}
.searchable-listbox-item:hover { background: rgba(185,151,74,0.12); }
.searchable-listbox-count {
  font-size: 10px;
  color: #6E6350;
  margin-left: 8px;
}
.searchable-listbox-empty {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  color: #6E6350;
  padding: 10px;
  text-align: center;
}
.effect-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  background: rgba(185,151,74,0.14);
  border: 1px solid #B9974A;
  color: #EFE6CC;
  padding: 5px 6px 5px 10px;
  border-radius: 999px;
}
.effect-chip button {
  background: transparent;
  border: none;
  color: #B9974A;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0 2px;
}
.dominance-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  color: #F0D8D2;
  background: rgba(180,85,58,0.22);
  border: 1px solid #B4553A;
  border-radius: 6px;
  padding: 6px 8px;
  margin-top: 8px;
  line-height: 1.5;
}
.chalice-listbox {
  position: relative;
  min-width: 200px;
}
.chalice-listbox.disabled { opacity: 0.5; }
.chalice-listbox-btn {
  width: 100%;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12.5px;
  background: #14100C;
  color: #E8DFC9;
  border: 1px solid #3A322A;
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.chalice-listbox-btn .placeholder { color: #6E6350; }
.chalice-listbox-caret { color: #6E6350; font-size: 10px; margin-left: 8px; }
.chalice-listbox-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  max-height: 260px;
  overflow-y: auto;
  background: #1B1712;
  border: 1px solid #3A322A;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.chalice-listbox-item {
  width: 100%;
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  color: #E8DFC9;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  padding: 7px 8px;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.chalice-listbox-item:hover { background: rgba(185,151,74,0.12); }
.chalice-listbox-item.active { background: rgba(185,151,74,0.2); color: #EFE6CC; }
.data-panel {
  margin: 0 0 16px;
  border: 1px solid #2B241C;
  border-radius: 10px;
  padding: 14px 16px;
  background: #1B1712;
}
.data-panel-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.data-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  background: rgba(185,151,74,0.10);
  border: 1px solid #B9974A;
  color: #EFE6CC;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.data-btn.secondary {
  background: transparent;
  border-color: #3A322A;
  color: #B7AD94;
}
.file-label-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.paste-import-box {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.paste-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  background: #0F0C09;
  border: 1px solid #3A322A;
  color: #E8DFC9;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  padding: 8px;
  border-radius: 6px;
  resize: vertical;
}
.data-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.data-btn.danger {
  border-color: #B4553A;
  color: #E0A99A;
}
.data-btn.danger:hover {
  background: rgba(180,85,58,0.14);
}
.visually-hidden-file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.data-msg {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  color: #8FC49A;
  margin-top: 8px;
}
.data-err {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  color: #D98F8F;
  margin-top: 8px;
}
.data-toggle-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  background: transparent;
  border: 1px solid #3A322A;
  color: #8C7F68;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  margin: 6px auto 0;
  display: block;
}
.assign-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  background: rgba(185,151,74,0.12);
  border: 1px solid #B9974A;
  color: #EFE6CC;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 8px;
}
.search-icon { color: #6E6350; flex-shrink: 0; }
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #E8DFC9;
  font-family: 'Noto Serif JP', serif;
  font-size: 14px;
}
.search-input::placeholder { color: #59503F; }
.clear-btn {
  background: transparent;
  border: none;
  color: #6E6350;
  font-size: 16px;
  cursor: pointer;
}

.card-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #6E6350;
  padding: 40px 0;
  font-size: 14px;
}
.card {
  background: #1C1712;
  border: 1px solid #2E2820;
  border-radius: 8px;
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.dots { font-size: 10px; letter-spacing: 2px; }
.badges { display: flex; align-items: center; gap: 8px; }
.depth-badge {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  color: #9C8FD0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(139,126,200,0.12);
  padding: 2px 7px;
  border-radius: 999px;
}
.fav-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
}
.card-name {
  font-family: 'Shippori Mincho', serif;
  font-weight: 800;
  font-size: 17px;
  margin: 0 0 10px;
  letter-spacing: 0.03em;
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.edit-label {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10px;
  color: #8C7F68;
  margin-top: 4px;
}
.edit-input {
  width: 100%;
  box-sizing: border-box;
  background: #0F0C09;
  border: 1px solid #3A322A;
  color: #E8DFC9;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 5px;
}
.edit-input.name {
  font-family: 'Shippori Mincho', serif;
  font-weight: 700;
  font-size: 14px;
  color: #EFE6CC;
}
.edit-input.demerit {
  color: #D98F8F;
  margin-top: 4px;
}
.edit-skill-block {
  border-top: 1px solid #2B241C;
  padding-top: 6px;
}
.edit-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.card-edit-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.card-edit-btn {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  background: transparent;
  border: 1px solid #3A322A;
  color: #8C7F68;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}
.card-edit-btn.danger {
  border-color: #6B3A2E;
  color: #C08A7D;
}
.card-edit-btn.danger:hover {
  background: rgba(180,85,58,0.14);
}
.skill-list {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  flex: 1;
}
.skill-list li {
  font-size: 13.5px;
  line-height: 1.55;
  padding: 7px 0;
  border-top: 1px solid #262019;
}
.skill-list li:first-child { border-top: none; }
.skill-text { color: #D8CDB2; }
.numeric-badge {
  display: inline-block;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-weight: 700;
  font-size: 11.5px;
  padding: 1px 7px;
  border-radius: 999px;
  margin-left: 6px;
  vertical-align: 1px;
}
.demerit-text {
  color: #A85C4E;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  margin-top: 3px;
}
.demerit-badge {
  display: inline-block;
  font-weight: 700;
  margin-left: 6px;
  color: #C97A6A;
}
.range-text {
  color: #6E6350;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  margin-top: 2px;
}
.tag-input {
  background: #14100C;
  border: 1px solid #2E2820;
  border-radius: 5px;
  padding: 6px 9px;
  font-size: 12px;
  color: #B9974A;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  outline: none;
}
.tag-input:focus { border-color: #B9974A; }
.tag-input::placeholder { color: #45402F; }

.load-more-wrap { text-align: center; margin-top: 26px; }
.load-more {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  background: transparent;
  border: 1px solid #B9974A;
  color: #B9974A;
  padding: 10px 22px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 0.05em;
}
.load-more:hover { background: rgba(185,151,74,0.1); }

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.confirm-box {
  background: #1B1712;
  border: 1px solid #3A322A;
  border-radius: 10px;
  padding: 20px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
}
.confirm-message {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 13px;
  color: #E8DFC9;
  line-height: 1.6;
  margin-bottom: 16px;
}
.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 480px) {
  .vault-header h1 { font-size: 26px; }
  .filter-label { width: 100%; margin-bottom: 2px; }
  .card-grid { grid-template-columns: 1fr; }
}
`;
