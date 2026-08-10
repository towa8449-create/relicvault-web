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


/* ---------- 効果量データ（出典：ユーザー提供の検証済みデータ 遺物効果量.xlsx） ----------
   name: 遺物スキル文言と完全一致する名称（+N付き）
   stackable: 重ね掛け可否（true/false/null=不明）
   calc: 計算方式（"乗算"|"加算"|null）
   amount: 実際の効果量（人が読める文字列）
   note: 補足・注意事項 */
const EFFECT_TABLE = [{"name":"最大HP上昇（通常遺物）","stackable":false,"calc":null,"amount":"最大HP+100","note":"生命力+との重複可　深層の遺物の同名効果とは別物"},{"name":"最大HP上昇（深層遺物）","stackable":true,"calc":"加算","amount":"固定値増加計算後のHP最大値の10％増加","note":"「最大HP上昇」「最大FP上昇」「最大スタミナ上昇」について 同名の通常の遺物効果とは別物。 上昇量は、通常の遺物効果は固定値だが、深層の遺物効果は最大値に対する割合。 通常の遺物効果と深層の遺物効果を同時に付けた場合、通常の遺物効果で上昇した最大値に対する割合で計算される。 通常の遺物効果は重ね掛け不可だが、深層の遺物効果のほうは重ね掛け可能。"},{"name":"最大FP上昇（通常遺物）","stackable":false,"calc":null,"amount":"最大FP+25","note":"精神力+との重複可　深層の遺物の同名効果とは別物"},{"name":"最大FP上昇（深層遺物）","stackable":true,"calc":"加算","amount":"固定値増加計算後のFP最大値の15％増加","note":"「最大HP上昇」「最大FP上昇」「最大スタミナ上昇」について 同名の通常の遺物効果とは別物。 上昇量は、通常の遺物効果は固定値だが、深層の遺物効果は最大値に対する割合。 通常の遺物効果と深層の遺物効果を同時に付けた場合、通常の遺物効果で上昇した最大値に対する割合で計算される。 通常の遺物効果は重ね掛け不可だが、深層の遺物効果のほうは重ね掛け可能。"},{"name":"最大スタミナ上昇（通常遺物）","stackable":false,"calc":null,"amount":"最大スタミナ+10","note":"持久力+との重複可　深層の遺物の同名効果とは別物"},{"name":"最大スタミナ上昇（深層遺物）","stackable":true,"calc":"加算","amount":"固定値増加計算後のスタミナ最大値12％増加","note":"「最大HP上昇」「最大FP上昇」「最大スタミナ上昇」について 同名の通常の遺物効果とは別物。 上昇量は、通常の遺物効果は固定値だが、深層の遺物効果は最大値に対する割合。 通常の遺物効果と深層の遺物効果を同時に付けた場合、通常の遺物効果で上昇した最大値に対する割合で計算される。 通常の遺物効果は重ね掛け不可だが、深層の遺物効果のほうは重ね掛け可能。"},{"name":"生命力+1","stackable":true,"calc":"加算","amount":"最大HP+20","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"生命力+2","stackable":true,"calc":"加算","amount":"最大HP+40","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"生命力+3","stackable":true,"calc":"加算","amount":"最大HP+60","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"精神力+1","stackable":true,"calc":"加算","amount":"最大FP+5","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"精神力+2","stackable":true,"calc":"加算","amount":"最大FP+10","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"精神力+3","stackable":true,"calc":"加算","amount":"最大FP+15","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"持久力+1","stackable":true,"calc":"加算","amount":"最大スタミナ+2","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"持久力+2","stackable":true,"calc":"加算","amount":"最大スタミナ+4","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"持久力+3","stackable":true,"calc":"加算","amount":"最大スタミナ+6","note":"増加量はキャラクターやレベルを問わず固定値"},{"name":"強靭度+1","stackable":true,"calc":"加算","amount":"強靭+5%","note":null},{"name":"強靭度+2","stackable":true,"calc":"加算","amount":"強靭+10%","note":null},{"name":"強靭度+3","stackable":true,"calc":"加算","amount":"強靭+15%","note":null},{"name":"魔術師塔の仕掛けが解除される度、最大FP上昇","stackable":false,"calc":"乗算","amount":"1か所につき最大FP+18%","note":"毎回乗算,永続"},{"name":"小砦の強敵を倒す度、取得ルーン増加、発見力上昇","stackable":false,"calc":"乗算","amount":"取得ルーン+5.5%","note":null},{"name":"大教会の強敵を倒す度、最大HP上昇","stackable":false,"calc":"乗算","amount":"最大HP+5%","note":null},{"name":"大野営地の強敵を倒す度、最大スタミナ上昇","stackable":false,"calc":"乗算","amount":"最大スタミナ+7.5%","note":null},{"name":"遺跡の強敵を倒す度、神秘上昇","stackable":false,"calc":"加算","amount":"神秘+4","note":null},{"name":"属性攻撃力上昇","stackable":true,"calc":"乗算","amount":"属性攻撃力+5%","note":null},{"name":"属性攻撃力上昇+1","stackable":true,"calc":"乗算","amount":"属性攻撃力+8%","note":null},{"name":"属性攻撃力上昇+2","stackable":true,"calc":"乗算","amount":"属性攻撃力+10%","note":null},{"name":"物理攻撃力上昇","stackable":true,"calc":"乗算","amount":"物理攻撃力+4%","note":null},{"name":"物理攻撃力上昇+1","stackable":true,"calc":"乗算","amount":"物理攻撃力+5%","note":null},{"name":"物理攻撃力上昇+2","stackable":true,"calc":"乗算","amount":"物理攻撃力+6%","note":null},{"name":"物理攻撃力上昇+3","stackable":true,"calc":"乗算","amount":"物理攻撃力+10.5%","note":null},{"name":"物理攻撃力上昇+4","stackable":true,"calc":"乗算","amount":"物理攻撃力+12%","note":null},{"name":"魔力攻撃力上昇","stackable":true,"calc":"乗算","amount":"魔力攻撃力+4%","note":null},{"name":"魔力攻撃力上昇+1","stackable":true,"calc":"乗算","amount":"魔力攻撃力+5%","note":null},{"name":"魔力攻撃力上昇+2","stackable":true,"calc":"乗算","amount":"魔力攻撃力+6%","note":null},{"name":"魔力攻撃力上昇+3","stackable":true,"calc":"乗算","amount":"魔力攻撃力+10.5%","note":null},{"name":"魔力攻撃力上昇+4","stackable":true,"calc":"乗算","amount":"魔力攻撃力+12%","note":null},{"name":"炎攻撃力上昇","stackable":true,"calc":"乗算","amount":"炎攻撃力+4%","note":null},{"name":"炎攻撃力上昇+1","stackable":true,"calc":"乗算","amount":"炎攻撃力+5%","note":null},{"name":"炎攻撃力上昇+2","stackable":true,"calc":"乗算","amount":"炎攻撃力+6%","note":null},{"name":"炎攻撃力上昇+3","stackable":true,"calc":"乗算","amount":"炎攻撃力+10.5%","note":null},{"name":"炎攻撃力上昇+4","stackable":true,"calc":"乗算","amount":"炎攻撃力+12%","note":null},{"name":"雷攻撃力上昇","stackable":true,"calc":"乗算","amount":"雷攻撃力+4%","note":null},{"name":"雷攻撃力上昇+1","stackable":true,"calc":"乗算","amount":"雷攻撃力+5%","note":null},{"name":"雷攻撃力上昇+2","stackable":true,"calc":"乗算","amount":"雷攻撃力+6%","note":null},{"name":"雷攻撃力上昇+3","stackable":true,"calc":"乗算","amount":"雷攻撃力+10.5%","note":null},{"name":"雷攻撃力上昇+4","stackable":true,"calc":"乗算","amount":"雷攻撃力+12%","note":null},{"name":"聖攻撃力上昇","stackable":true,"calc":"乗算","amount":"聖攻撃力+4%","note":null},{"name":"聖攻撃力上昇+1","stackable":true,"calc":"乗算","amount":"聖攻撃力+5%","note":null},{"name":"聖攻撃力上昇+2","stackable":true,"calc":"乗算","amount":"聖攻撃力+6%","note":null},{"name":"聖攻撃力上昇+3","stackable":true,"calc":"乗算","amount":"聖攻撃力+10.5%","note":null},{"name":"聖攻撃力上昇+4","stackable":true,"calc":"乗算","amount":"聖攻撃力+12%","note":null},{"name":"近接攻撃力上昇","stackable":true,"calc":"乗算","amount":"近接攻撃力+5%","note":null},{"name":"戦技攻撃力上昇","stackable":true,"calc":"乗算","amount":"戦技攻撃力+15%","note":null},{"name":"通常攻撃の1段目強化","stackable":true,"calc":"乗算","amount":"通常攻撃1段目+15%","note":"弓の通常攻撃も対象.対象外：強攻撃、タメ攻撃、ガード攻撃、大弓、クロスボウ、バリスタ"},{"name":"致命の一撃強化","stackable":true,"calc":"乗算","amount":"致命の一撃+17%","note":null},{"name":"致命の一撃強化+1","stackable":false,"calc":"乗算","amount":"致命の一撃+24%","note":null},{"name":"咆哮とブレス強化","stackable":true,"calc":"乗算","amount":"咆哮とブレス+15%","note":"隠者の混成魔法、執行者のアーツによる咆哮も対象"},{"name":"両手持ちの、体勢を崩す力上昇","stackable":true,"calc":"乗算","amount":"体勢を崩す力+5%","note":"射撃・魔術・祈祷全般無効。両手持ち操作で二刀持ちになる武器には無効。【執行者】スキルの「妖刀」にも有効だが、弾きには無効"},{"name":"二刀持ちの、体勢を崩す力上昇","stackable":true,"calc":"乗算","amount":"体勢を崩す力+5%","note":"射撃・魔術・祈祷全般無効。両手持ち操作で二刀持ちになる武器にも有効"},{"name":"武器の持ち替え時、物理攻撃力上昇","stackable":false,"calc":"乗算","amount":"物理攻撃力+10%","note":"武器の持ち替えから10秒。【執行者】スキル「妖刀」は持ち替えに該当しない"},{"name":"属性攻撃力が付加された時、属性攻撃力上昇","stackable":true,"calc":"乗算","amount":"属性攻撃力+10%","note":"武器、エンチャント、戦技、道具、アーツが対象。エンチャント以外の魔術・祈祷は対象外"},{"name":"攻撃を受けると攻撃力上昇","stackable":false,"calc":"乗算","amount":"攻撃力+15%（10秒）","note":"属性攻撃をガードした時の貫通ダメージでも発動。自傷ダメージや0以下の被ダメは発動しない。「夜巫女の霧」は他者からの攻撃扱いなので自己誘発可能"},{"name":"状態異常ゲージがある時、徐々に攻撃力上昇","stackable":false,"calc":"乗算","amount":"1スタックごとに攻撃力+3.8%（最大10スタック,最大約45%）","note":"最初に状態異常ゲージが出た瞬間、スタックを1にしつつタイマーを発動。以降、20秒ごとにゲージを確認し、ゲージがあればスタック数が1増加、なければ0になる"},{"name":"封牢の囚を倒す度、攻撃力上昇","stackable":false,"calc":"乗算","amount":"攻撃力：封牢の囚1体につき+5%（永続）","note":"魔術・祈祷・アイテムにも効果あり（杖の魔術補正・聖印の祈祷補正には反映されない）"},{"name":"夜の侵入者を倒す度、攻撃力上昇","stackable":false,"calc":"乗算","amount":"攻撃力：災域の罪人1体につき+7%（永続）","note":"魔術・祈祷・アイテムにも効果あり（杖の魔術補正・聖印の祈祷補正には反映されない）"},{"name":"ガードカウンター強化","stackable":true,"calc":"乗算","amount":"ガードカウンターの攻撃力+17%","note":null},{"name":"ガードカウンターに、自身の現在HPの一部を加える","stackable":false,"calc":"乗算","amount":"最大HPの5%をガードカウンターのダメージに追加","note":null},{"name":"脂アイテム使用時、追加で物理攻撃力上昇","stackable":false,"calc":"乗算","amount":"物理攻撃力+10%（約30秒）","note":"キャラクター自体に物理攻撃力上昇（魔術・祈祷には適用されない）のバフが掛かる。脂のエンチャントとは別の独立したバフなので、武器を切り替えて脂の効果が切れても継続する。脂アイテムであれば盾脂でも発動する。効果時間の長い竜傷脂・盾脂では遺物効果の方が先に切れる"},{"name":"投擲壺の攻撃力上昇","stackable":true,"calc":"乗算","amount":"投擲壺の攻撃力+約15%","note":"対象は毒壺、腐敗壺、眠り壺、誘い壺、獣誘いの壺以外の投擲壺"},{"name":"投擲ナイフの攻撃力上昇","stackable":true,"calc":"乗算","amount":"投擲ナイフの攻撃力+14%","note":"対象は骨の毒投げ矢、結晶投げ矢、スローイングダガー、ククリ、扇投暗器"},{"name":"輝石、重力石アイテムの攻撃力上昇","stackable":true,"calc":"乗算","amount":"輝石・重力石アイテムの攻撃力+15%","note":"対象は屑輝石、大きな屑輝石、カッコウの輝石、扇の重力石、塊の重力石"},{"name":"調香術強化","stackable":true,"calc":"乗算","amount":"火花の香りの攻撃力+14%","note":"対象は火花の香りのみ"},{"name":"スキルクールタイム軽減+1","stackable":true,"calc":"乗算","amount":"スキルクールタイム-約5%","note":"クールタイムの基本値はキャラクターによって異なる。"},{"name":"スキルクールタイム軽減+2","stackable":true,"calc":"乗算","amount":"スキルクールタイム-約7.5%","note":"クールタイムの基本値はキャラクターによって異なる。"},{"name":"スキルクールタイム軽減+3","stackable":true,"calc":"乗算","amount":"スキルクールタイム-約10%","note":"クールタイムの基本値はキャラクターによって異なる。"},{"name":"アーツゲージ自然蓄積+1","stackable":true,"calc":"乗算","amount":"毎秒のアーツゲージ自然蓄積量+約5%","note":"※1参照.敵対峙時に自然回復する蓄積量が増加する。遺物効果なしでの基本所要時間は約335秒。"},{"name":"アーツゲージ自然蓄積+2","stackable":true,"calc":"乗算","amount":"毎秒のアーツゲージ自然蓄積量+約7.5%","note":"敵対峙時に自然回復する蓄積量が増加する。遺物効果なしでの基本所要時間は約335秒。"},{"name":"アーツゲージ自然蓄積+3","stackable":true,"calc":"乗算","amount":"毎秒のアーツゲージ自然蓄積量+約10%","note":"敵対峙時に自然回復する蓄積量が増加する。遺物効果なしでの基本所要時間は約335秒。"},{"name":"敵を倒した時、アーツゲージ増加","stackable":false,"calc":"乗算","amount":"敵撃破時のアーツゲージ+約5%","note":"1体当たり自然回復で約16.75秒短縮相当。+1とは重ね掛け可能。クールタイムはなく、複数の敵を倒した場合もそれぞれの分だけ発動する。自分以外が倒した敵にも有効"},{"name":"敵を倒した時、アーツゲージ増加+1","stackable":false,"calc":"乗算","amount":"敵撃破時のアーツゲージ+約6.5%","note":"無印とは重ね掛け可能。クールタイムはなく、複数の敵を倒した場合もそれぞれの分だけ発動する。自分以外が倒した敵にも有効"},{"name":"致命の一撃で、アーツゲージ増加","stackable":false,"calc":"乗算","amount":"致命の一撃時のアーツゲージ+約5%","note":"1回あたり自然回復で約16.75秒短縮相当。+1とは重ね掛け可能。致命の一撃モーション開始時に固定5%加算され、その後、致命の一撃による通常のアーツゲージ蓄積が入る"},{"name":"致命の一撃で、アーツゲージ増加+1","stackable":false,"calc":"乗算","amount":"致命の一撃時のアーツゲージ+約6.5%","note":"無印とは重ね掛け可能。致命の一撃モーション開始時に固定5%加算され、その後、致命の一撃による通常のアーツゲージ蓄積が入る"},{"name":"ガード成功時、アーツゲージ増加","stackable":false,"calc":"乗算","amount":"ガード成功時のアーツゲージ+約1%","note":"1回あたり自然回復で約3.35秒短縮相当。+1とは重ね掛け可能。クールタイムはなく、連続攻撃をガードした場合もそれぞれの分だけ発動する。【執行者】スキルの弾きでも発動するが、ガードを崩された場合は発動しない"},{"name":"ガード成功時、アーツゲージ増加+1","stackable":false,"calc":"乗算","amount":"ガード成功時のアーツゲージ+約1.5%","note":"無印とは重ね掛け可能。クールタイムはなく、連続攻撃をガードした場合もそれぞれの分だけ発動する。【執行者】スキルの弾きでも発動するが、ガードを崩された場合は発動しない"},{"name":"魔術／祈祷、効果時間延長","stackable":false,"calc":"加算","amount":"効果時間+50%","note":"付帯効果や潜在する力の同効果と重複可(加算式)"},{"name":"物理カット率上昇","stackable":true,"calc":"乗算","amount":"物理属性カット率+8%","note":null},{"name":"物理カット率上昇+1","stackable":true,"calc":"乗算","amount":"物理属性カット率+10%","note":null},{"name":"物理カット率上昇+2","stackable":true,"calc":"乗算","amount":"物理属性カット率+13%","note":null},{"name":"属性カット率上昇","stackable":true,"calc":"乗算","amount":"属性カット率+7%","note":null},{"name":"属性カット率上昇+1","stackable":true,"calc":"乗算","amount":"属性カット率+12%","note":null},{"name":"属性カット率上昇+2","stackable":true,"calc":"乗算","amount":"属性カット率+14%","note":null},{"name":"魔力カット率上昇","stackable":true,"calc":"乗算","amount":"魔力属性カット率+10%","note":null},{"name":"魔力カット率上昇+1","stackable":true,"calc":"乗算","amount":"魔力属性カット率+16%","note":null},{"name":"魔力カット率上昇+2","stackable":true,"calc":"乗算","amount":"魔力属性カット率+18%","note":null},{"name":"炎カット率上昇","stackable":true,"calc":"乗算","amount":"炎属性カット率+10%","note":null},{"name":"炎カット率上昇+1","stackable":true,"calc":"乗算","amount":"炎属性カット率+16%","note":null},{"name":"炎カット率上昇+2","stackable":true,"calc":"乗算","amount":"炎属性カット率+18%","note":null},{"name":"雷カット率上昇","stackable":true,"calc":"乗算","amount":"雷属性カット率+10%","note":null},{"name":"雷カット率上昇+1","stackable":true,"calc":"乗算","amount":"雷属性カット率+16%","note":null},{"name":"雷カット率上昇+2","stackable":true,"calc":"乗算","amount":"雷属性カット率+18%","note":null},{"name":"聖カット率上昇","stackable":true,"calc":"乗算","amount":"聖属性カット率+10%","note":null},{"name":"聖カット率上昇+1","stackable":true,"calc":"乗算","amount":"聖属性カット率+16%","note":null},{"name":"聖カット率上昇+2","stackable":true,"calc":"乗算","amount":"聖属性カット率+18%","note":null},{"name":"HP低下時、カット率上昇","stackable":true,"calc":"乗算","amount":"全属性カット率+15%","note":"特殊効果には「物理カット率上昇」と出るが、実際には全属性のカット率が上昇.HP40%未満の状態でのみ発動.HP40%未満である限り永続"},{"name":"ダメージで吹き飛ばされた時、強靭度とカット率上昇","stackable":false,"calc":null,"amount":"全属性カット率+20%,強靭度+20%(20秒)","note":"ダメージの有無に関わらず盾受け時の吹き飛びでは発動しない.吹き飛ばし効果のある攻撃を受けても、戦技「我慢」などを使用して吹き飛ばなかった場合は効果が発動しない.無頼漢のスキル使用時のみ、吹き飛ばし効果のある攻撃を受けて吹き飛ばなかった場合にも発動"},{"name":"毒耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"毒耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"腐敗耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"腐敗耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"出血耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"出血耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"冷気耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"冷気耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"睡眠耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"睡眠耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"発狂耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"発狂耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"抗死耐性上昇","stackable":true,"calc":"加算","amount":"１つにつき耐性+75","note":"加算で計算"},{"name":"抗死耐性上昇+1","stackable":true,"calc":"加算","amount":"１つにつき耐性+110","note":"加算で計算"},{"name":"HP持続回復","stackable":true,"calc":"加算","amount":"毎秒2のHP回復","note":null},{"name":"HP低下時、周囲の味方を含めHPをゆっくりと回復","stackable":false,"calc":null,"amount":"毎秒([最大HPの0.5%]+1)HP回復(50秒)","note":"残りHPが40%以下になると、自身と周囲の味方にHP持続回復のバフが発動する。発動後はHPが40%以上になっても持続する"},{"name":"ガード成功時、HPを回復","stackable":false,"calc":null,"amount":"ガード成功時にHPを15回復","note":"クールタイムあり。【執行者】スキルの弾きでも発動する。潜在する力の同効果とは重複可能"},{"name":"刺突カウンター発生時、HP回復","stackable":false,"calc":"加算","amount":"刺突カウンター発生時に最大HPの2.5%分HP回復","note":"弓や投げ矢などの飛び道具でも発動する.※+値が違えば重複可"},{"name":"刺突カウンター発生時、HP回復+1","stackable":false,"calc":"加算","amount":"刺突カウンター発生時に最大HPの3.3%分HP回復","note":"弓や投げ矢などの飛び道具でも発動する.※+値が違えば重複可"},{"name":"ダメージを受けた直後、攻撃によりHPの一部を回復","stackable":false,"calc":"加算","amount":"被ダメージ直後の攻撃でHP回復+回復量の0%追加で回復","note":"※+値が違えば重複可.無印はリゲイン有効化のみのため無印との重複は無意味"},{"name":"ダメージを受けた直後、攻撃によりHPの一部を回復+1","stackable":false,"calc":"加算","amount":"被ダメージ直後の攻撃でHP回復+回復量の25%追加で回復","note":"※+値が違えば重複可.無印はリゲイン有効化のみのため無印との重複は無意味"},{"name":"ダメージを受けた直後、攻撃によりHPの一部を回復+2","stackable":false,"calc":"加算","amount":"被ダメージ直後の攻撃でHP回復+回復量の35%追加で回復","note":"※+値が違えば重複可.無印はリゲイン有効化のみのため無印との重複は無意味"},{"name":"苔薬などのアイテム使用でHP回復","stackable":false,"calc":"加算","amount":"対象アイテム使用時にHPを50回復","note":"※+値が違えば重複可.対象は苔薬7種、鳥脚2種、ゆで2種、亀首漬け、勇者の肉塊"},{"name":"苔薬などのアイテム使用でHP回復","stackable":false,"calc":"加算","amount":"対象アイテム使用時にHPを80回復","note":"※+値が違えば重複可.対象は苔薬7種、鳥脚2種、ゆで3種、亀首漬け、勇者の肉塊"},{"name":"聖杯瓶の回復量上昇","stackable":true,"calc":"乗算","amount":"聖杯瓶の回復量+10%","note":null},{"name":"周囲で腐敗状態の発生時、HP持続回復","stackable":false,"calc":null,"amount":"毎秒([最大HPの0.15%]+15)HP回復(15秒)","note":"周囲で腐敗状態が発生した時に発動する（計11回）"},{"name":"消費FP軽減","stackable":true,"calc":"乗算","amount":"消費FPより-7%","note":"重ね掛けた分だけ消費量に0.93を乗算. 小数点以下が0.23以上なら繰り上げ(0.23未満なら切り捨て)"},{"name":"FP持続回復","stackable":false,"calc":null,"amount":"5秒ごとにFPを1回復","note":null},{"name":"攻撃連続時、FP回復","stackable":null,"calc":null,"amount":"攻撃連続時に最大FPの5%分FP回復","note":"射撃・魔術・祈祷・飛び道具などは対象外。"},{"name":"発狂状態になると、FP持続回復","stackable":true,"calc":"加算","amount":"25秒間、毎秒FPを2ずつ回復（合計50FP回復）","note":"発狂時のFPダメージは免除されない。魔の夜と魔の暗き夜で重ね掛け可能（合計100回復）"},{"name":"攻撃命中時、スタミナ回復","stackable":false,"calc":"加算","amount":"攻撃命中ごとにスタミナを2回復","note":"魔術・祈祷・混成魔法以外のすべての攻撃で発動する。※+値が違えば重複可."},{"name":"攻撃命中時、スタミナ回復+1","stackable":false,"calc":"加算","amount":"攻撃命中ごとにスタミナを3回復","note":"魔術・祈祷・混成魔法以外のすべての攻撃で発動する。※+値が違えば重複可."},{"name":"致命の一撃で、スタミナ回復速度上昇","stackable":false,"calc":"乗算","amount":"致命の一撃時、15秒間スタミナ回復速度+約15%","note":"致命の一撃モーション開始時から付与される.※+値が違えば重複可."},{"name":"致命の一撃で、スタミナ回復速度上昇+1","stackable":false,"calc":"乗算","amount":"致命の一撃時、15秒間スタミナ回復速度+約25%","note":"致命の一撃モーション開始時から付与される.※+値が違えば重複可."},{"name":"致命の一撃で、ルーンを取得","stackable":false,"calc":null,"amount":"致命の一撃1回ごとに600ルーン取得","note":null},{"name":"武器の持ち替え時、いずれかの属性攻撃力を付加","stackable":false,"calc":null,"amount":"魔力・炎・雷・聖のいずれかの属性攻撃力+10（10秒）","note":"武器を切り替えた時に発動する。【執行者】スキル「妖刀」はエンチャントできない"},{"name":"被ダメージ時、腐敗の状態異常を付加","stackable":false,"calc":null,"amount":"右手武器に腐敗蓄積量+25（12.5秒）","note":"被ダメージ時に発動する"},{"name":"ガード中、敵に狙われやすくなる","stackable":false,"calc":null,"amount":"約0.5秒以上のガード継続で敵に狙われやすくなる","note":"盾・武器でのガード、ハイガード、ガード攻撃が対象。ガードが途切れると約4秒後に解除される。祈祷「シャブリリの叫び」と重ね掛け可能"},{"name":"ジェスチャー「あぐら」により、発狂が蓄積","stackable":true,"calc":null,"amount":"姿勢を戻すまで発狂を高速蓄積","note":"「あぐら」は小壺商人から購入できる。執行者LV15では、使用から蓄積開始まで約5秒、発症まで約1秒の合計約6秒"},{"name":"カット率低下時、稀に敵から受ける攻撃を無効化","stackable":false,"calc":null,"amount":"カット率低下中、確率で被ダメージを無効化（確率不明）","note":"常時発動型のカット率低下や、水場の雷カット率低下などの地形効果も対象。"},{"name":"毒状態の敵に対する攻撃を強化","stackable":false,"calc":"乗算","amount":"毒状態の敵への与ダメージ+約10%（20秒）","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"毒状態の敵に対する攻撃を強化+1","stackable":false,"calc":"乗算","amount":"毒状態の敵への与ダメージ+約16%（20秒）","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"毒状態の敵に対する攻撃を強化+2","stackable":false,"calc":"乗算","amount":"毒状態の敵への与ダメージ+約20%（20秒）","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"腐敗状態の敵に対する攻撃を強化","stackable":false,"calc":"乗算","amount":"腐敗状態の敵への与ダメージ+約10%","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"腐敗状態の敵に対する攻撃を強化+1","stackable":false,"calc":"乗算","amount":"腐敗状態の敵への与ダメージ+約16%","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"腐敗状態の敵に対する攻撃を強化+2","stackable":false,"calc":"乗算","amount":"腐敗状態の敵への与ダメージ+約20%","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"凍傷状態の敵に対する攻撃を強化","stackable":false,"calc":"乗算","amount":"凍傷状態の敵への与ダメージ+約10%","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"凍傷状態の敵に対する攻撃を強化+1","stackable":false,"calc":"乗算","amount":"凍傷状態の敵への与ダメージ+約16%","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"凍傷状態の敵に対する攻撃を強化+2","stackable":false,"calc":"乗算","amount":"凍傷状態の敵への与ダメージ+約20%","note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象"},{"name":"周囲で毒／腐敗状態の発生時、攻撃力上昇","stackable":false,"calc":"乗算","amount":"攻撃力+約12%（20秒）","note":"周囲で毒または腐敗状態が発生した時に発動する"},{"name":"周囲で発狂状態の発生時、攻撃力上昇","stackable":false,"calc":"乗算","amount":"攻撃力+約12%（20秒）","note":null},{"name":"周囲で発狂状態の発生時、攻撃力上昇+1","stackable":false,"calc":"乗算","amount":"攻撃力+約22%（20秒）","note":null},{"name":"周囲で凍傷状態の発生時、自身の姿を隠す","stackable":null,"calc":null,"amount":"敵から見えにくくなり、足音を完全に消す（約6秒）","note":"周囲で凍傷状態が発生した時に発動する"},{"name":"自身と味方の取得ルーン増加","stackable":true,"calc":"加算","amount":"自身と味方の取得ルーン+3.5%","note":null},{"name":"自身を除く、周囲の味方のスタミナ回復速度上昇","stackable":false,"calc":null,"amount":"周囲の味方のスタミナ回復速度+4/秒","note":"自身は対象外。効果範囲はローリング約3回分"},{"name":"聖杯瓶の回復を、周囲の味方に分配","stackable":false,"calc":null,"amount":"自身の聖杯瓶回復量-10%、味方は最大HPの30%回復","note":"復讐者の霊体も対象。効果範囲はローリング約4回分。聖杯瓶の回復量上昇は自身と分配先に各自の効果を適用。ゆっくり回復も分配され、その場合は自身が最大HPの80%、味方が最大HPの40%を回復する。ゆっくり回復時は本効果の-10%を含む聖杯瓶回復量の増減を受けない"},{"name":"敵を倒した時、自身を除く周囲の味方のHPを回復","stackable":false,"calc":null,"amount":"敵撃破ごとに周囲の味方のHPを20回復","note":"自身は対象外。自分以外が敵を倒した場合も発動"},{"name":"アイテムの効果が周囲の味方にも発動","stackable":false,"calc":null,"amount":"食物系アイテムの効果を周囲の味方にも付与","note":"調香瓶・霊薬のバフ、脂系エンチャントは対象外。効果範囲はローリング約4回分。使用モーションが長くなるが、苔薬と星光の欠片は変化しない。星光の欠片による味方のFP回復量は最大FPの30%（通常60%）"},{"name":"○○の攻撃力上昇","stackable":true,"calc":"乗算","amount":"対象武器の与ダメージ+9%（弓は6%）","note":"物理・属性攻撃力ではなく与ダメージが上昇する。対象武器種：短剣・直剣・大剣・特大剣・刺剣・重刺剣・曲剣・大曲剣・刀・両刃剣・斧・大斧・槌・フレイル・大槌・特大武器・槍・大槍・斧槍・鎌・鞭・拳・爪・弓"},{"name":"○○の攻撃でHP回復","stackable":false,"calc":null,"amount":"対象武器の攻撃時にHPを15回復","note":"クールタイムは約1秒。対象武器種：短剣・直剣・大剣・特大剣・刺剣・重刺剣・曲剣・大曲剣・刀・両刃剣・斧・大斧・槌・フレイル・大槌・特大武器・槍・大槍・斧槍・鎌・鞭・拳・爪・弓"},{"name":"○○の攻撃でFP回復","stackable":false,"calc":null,"amount":"対象武器の攻撃時にFPを2回復","note":"クールタイムは約1秒。対象武器種：短剣・直剣・大剣・特大剣・刺剣・重刺剣・曲剣・大曲剣・刀・両刃剣・斧・大斧・槌・フレイル・大槌・特大武器・槍・大槍・斧槍・鎌・鞭・拳・爪・弓"},{"name":"○○の武器種を3つ以上装備していると攻撃力上昇","stackable":false,"calc":"乗算","amount":"与ダメージ+20%（弓は10%）","note":"条件の武器種以外の攻撃にも適用される。異なる武器種の効果は重ね掛け可能。対象武器種：短剣・直剣・大剣・特大剣・刺剣・重刺剣・曲剣・大曲剣・刀・両刃剣・斧・大斧・槌・フレイル・大槌・特大武器・槍・大槍・斧槍・鎌・鞭・拳・爪・弓"},{"name":"○○の武器種を3つ以上装備していると最大HP上昇","stackable":false,"calc":"加算","amount":"最大HP+200","note":"対象武器種：小盾・中盾・大盾。異なる武器種の効果は重ね掛け可能"},{"name":"○○の武器種を3つ以上装備していると最大FP上昇","stackable":false,"calc":"加算","amount":"最大FP+50","note":"対象武器種：杖・聖印。異なる武器種の効果は重ね掛け可能"}];

/* ---------- 攻撃力系スキルの「対象プール」データ（出典：ユーザー提供 calc_data.json の DAMAGE_MAP）
   同じtargetを持つスキル同士が同じ強化枠を共有する（ビルド計算のグループ化に使用） ---------- */
const DAMAGE_TABLE = {"近接攻撃力上昇":{"target":"近接攻撃力上昇","pct":5.0,"stacks":true},"戦技攻撃力上昇":{"target":"戦技攻撃力上昇","pct":15.0,"stacks":true},"通常攻撃の1段目強化":{"target":"通常攻撃の1段目強化","pct":15.0,"stacks":true},"致命の一撃強化":{"target":"致命の一撃強化","pct":17.0,"stacks":true},"致命の一撃強化+1":{"target":"致命の一撃強化+1","pct":24.0,"stacks":true},"咆哮とブレス強化":{"target":"咆哮とブレス強化","pct":15.0,"stacks":true},"武器の持ち替え時、物理攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"属性攻撃力が付加された時、属性攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":true},"攻撃を受けると攻撃力上昇":{"target":"すべての攻撃を強化","pct":15.0,"stacks":false},"輝剣の魔術を強化":{"target":"輝剣の魔術を強化","pct":12.0,"stacks":true},"石掘りの魔術を強化":{"target":"石掘りの魔術を強化","pct":12.0,"stacks":true},"カーリアの剣の魔術を強化":{"target":"カーリアの剣の魔術を強化","pct":12.0,"stacks":true},"不可視の魔術を強化":{"target":"不可視の魔術を強化","pct":12.0,"stacks":true},"結晶人の魔術を強化":{"target":"結晶人の魔術を強化","pct":12.0,"stacks":true},"重力の魔術を強化":{"target":"重力の魔術を強化","pct":12.0,"stacks":true},"茨の魔術を強化":{"target":"茨の魔術を強化","pct":12.0,"stacks":true},"黄金律原理主義の祈祷を強化":{"target":"黄金律原理主義の祈祷を強化","pct":12.0,"stacks":true},"王都古竜信仰の祈祷を強化":{"target":"王都古竜信仰の祈祷を強化","pct":12.0,"stacks":true},"巨人の火の祈祷を強化":{"target":"巨人の火の祈祷を強化","pct":12.0,"stacks":true},"神狩りの祈祷を強化":{"target":"神狩りの祈祷を強化","pct":12.0,"stacks":true},"獣の祈祷を強化":{"target":"獣の祈祷を強化","pct":12.0,"stacks":true},"狂い火の祈祷を強化":{"target":"狂い火の祈祷を強化","pct":12.0,"stacks":true},"竜餐の祈祷を強化":{"target":"竜餐の祈祷を強化","pct":12.0,"stacks":true},"周囲で毒／腐敗状態の発生時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":12.0,"stacks":false},"【鉄の目】アーツ発動後、刺突カウンター強化":{"target":"刺突カウンターを強化","pct":20.0,"stacks":false},"【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"【復讐者】ファミリーと共闘中の間、自身を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"【陰者】アーツ発動時、自身が出血状態になり、攻撃力上昇":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"【陰者】属性痕を集めた時、「魔術の地」が発動":{"target":"魔力攻撃力を強化","pct":22.5,"stacks":false},"【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下":{"target":"妖刀の攻撃を強化","pct":35.0,"stacks":false},"【葬儀屋】アーツ発動時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":18.0,"stacks":false},"【葬儀屋】連撃の最終攻撃命中時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"短剣の攻撃力上昇":{"target":"短剣の攻撃力上昇","pct":9.0,"stacks":true},"直剣の攻撃力上昇":{"target":"直剣の攻撃力上昇","pct":9.0,"stacks":true},"大剣の攻撃力上昇":{"target":"大剣の攻撃力上昇","pct":9.0,"stacks":true},"特大剣の攻撃力上昇":{"target":"特大剣の攻撃力上昇","pct":9.0,"stacks":true},"刺剣の攻撃力上昇":{"target":"刺剣の攻撃力上昇","pct":9.0,"stacks":true},"重刺剣の攻撃力上昇":{"target":"重刺剣の攻撃力上昇","pct":9.0,"stacks":true},"曲剣の攻撃力上昇":{"target":"曲剣の攻撃力上昇","pct":9.0,"stacks":true},"大曲剣の攻撃力上昇":{"target":"大曲剣の攻撃力上昇","pct":9.0,"stacks":true},"刀の攻撃力上昇":{"target":"刀の攻撃力上昇","pct":9.0,"stacks":true},"両刃剣の攻撃力上昇":{"target":"両刃剣の攻撃力上昇","pct":9.0,"stacks":true},"斧の攻撃力上昇":{"target":"斧の攻撃力上昇","pct":9.0,"stacks":true},"大斧の攻撃力上昇":{"target":"大斧の攻撃力上昇","pct":9.0,"stacks":true},"槌の攻撃力上昇":{"target":"槌の攻撃力上昇","pct":9.0,"stacks":true},"フレイルの攻撃力上昇":{"target":"フレイルの攻撃力上昇","pct":9.0,"stacks":true},"大槌の攻撃力上昇":{"target":"大槌の攻撃力上昇","pct":9.0,"stacks":true},"特大武器の攻撃力上昇":{"target":"特大武器の攻撃力上昇","pct":9.0,"stacks":true},"槍の攻撃力上昇":{"target":"槍の攻撃力上昇","pct":9.0,"stacks":true},"大槍の攻撃力上昇":{"target":"大槍の攻撃力上昇","pct":9.0,"stacks":true},"斧槍の攻撃力上昇":{"target":"斧槍の攻撃力上昇","pct":9.0,"stacks":true},"鎌の攻撃力上昇":{"target":"鎌の攻撃力上昇","pct":9.0,"stacks":true},"鞭の攻撃力上昇":{"target":"鞭の攻撃力上昇","pct":9.0,"stacks":true},"拳の攻撃力上昇":{"target":"拳の攻撃力上昇","pct":9.0,"stacks":true},"爪の攻撃力上昇":{"target":"爪の攻撃力上昇","pct":9.0,"stacks":true},"弓の攻撃力上昇":{"target":"弓の攻撃力上昇","pct":6.0,"stacks":true},"短剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"直剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"特大剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"刺剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"重刺剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"曲剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大曲剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"刀の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"両刃剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"斧の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大斧の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"槌の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"フレイルの武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大槌の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"特大武器の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"槍の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大槍の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"斧槍の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"鎌の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"鞭の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"拳の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"爪の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"弓の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"属性攻撃力上昇":{"target":"属性攻撃力上昇","pct":5.0,"stacks":true},"属性攻撃力上昇+1":{"target":"属性攻撃力上昇","pct":8.0,"stacks":true},"属性攻撃力上昇+2":{"target":"属性攻撃力上昇","pct":10.0,"stacks":true},"物理攻撃力上昇":{"target":"物理攻撃力上昇","pct":4.0,"stacks":true},"物理攻撃力上昇+1":{"target":"物理攻撃力上昇","pct":5.0,"stacks":true},"物理攻撃力上昇+2":{"target":"物理攻撃力上昇","pct":6.0,"stacks":true},"物理攻撃力上昇+3":{"target":"物理攻撃力上昇","pct":10.5,"stacks":true},"物理攻撃力上昇+4":{"target":"物理攻撃力上昇","pct":12.0,"stacks":true},"魔力攻撃力上昇":{"target":"魔力攻撃力上昇","pct":4.0,"stacks":true},"魔力攻撃力上昇+1":{"target":"魔力攻撃力上昇","pct":5.0,"stacks":true},"魔力攻撃力上昇+2":{"target":"魔力攻撃力上昇","pct":6.0,"stacks":true},"魔力攻撃力上昇+3":{"target":"魔力攻撃力上昇","pct":10.5,"stacks":true},"魔力攻撃力上昇+4":{"target":"魔力攻撃力上昇","pct":12.0,"stacks":true},"炎攻撃力上昇":{"target":"炎攻撃力上昇","pct":4.0,"stacks":true},"炎攻撃力上昇+1":{"target":"炎攻撃力上昇","pct":5.0,"stacks":true},"炎攻撃力上昇+2":{"target":"炎攻撃力上昇","pct":6.0,"stacks":true},"炎攻撃力上昇+3":{"target":"炎攻撃力上昇","pct":10.5,"stacks":true},"炎攻撃力上昇+4":{"target":"炎攻撃力上昇","pct":12.0,"stacks":true},"雷攻撃力上昇":{"target":"雷攻撃力上昇","pct":4.0,"stacks":true},"雷攻撃力上昇+1":{"target":"雷攻撃力上昇","pct":5.0,"stacks":true},"雷攻撃力上昇+2":{"target":"雷攻撃力上昇","pct":6.0,"stacks":true},"雷攻撃力上昇+3":{"target":"雷攻撃力上昇","pct":10.5,"stacks":true},"雷攻撃力上昇+4":{"target":"雷攻撃力上昇","pct":12.0,"stacks":true},"聖攻撃力上昇":{"target":"聖攻撃力上昇","pct":4.0,"stacks":true},"聖攻撃力上昇+1":{"target":"聖攻撃力上昇","pct":5.0,"stacks":true},"聖攻撃力上昇+2":{"target":"聖攻撃力上昇","pct":6.0,"stacks":true},"聖攻撃力上昇+3":{"target":"聖攻撃力上昇","pct":10.5,"stacks":true},"聖攻撃力上昇+4":{"target":"聖攻撃力上昇","pct":12.0,"stacks":true},"魔術強化":{"target":"魔術強化","pct":5.0,"stacks":true},"魔術強化+1":{"target":"魔術強化","pct":8.5,"stacks":true},"魔術強化+2":{"target":"魔術強化","pct":10.0,"stacks":true},"祈祷強化":{"target":"祈祷強化","pct":5.0,"stacks":true},"祈祷強化+1":{"target":"祈祷強化","pct":8.5,"stacks":true},"祈祷強化+2":{"target":"祈祷強化","pct":10.0,"stacks":true},"ガードカウンター強化":{"target":"ガードカウンター強化","pct":17.0,"stacks":true},"ガードカウンター強化+1":{"target":"ガードカウンター強化","pct":25.0,"stacks":true},"ガードカウンター強化+2":{"target":"ガードカウンター強化","pct":29.0,"stacks":true},"脂アイテム使用時、追加で物理攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"脂アイテム使用時、追加で物理攻撃力上昇+1":{"target":"すべての攻撃を強化","pct":17.0,"stacks":false},"脂アイテム使用時、追加で物理攻撃力上昇+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"投擲壺の攻撃力上昇":{"target":"投擲壺の攻撃力上昇","pct":15.0,"stacks":true},"投擲壺の攻撃力上昇+1":{"target":"投擲壺の攻撃力上昇","pct":30.0,"stacks":true},"投擲ナイフの攻撃力上昇":{"target":"投擲ナイフの攻撃力上昇","pct":15.0,"stacks":true},"投擲ナイフの攻撃力上昇+1":{"target":"投擲ナイフの攻撃力上昇","pct":30.0,"stacks":true},"輝石、重力石アイテムの攻撃力上昇":{"target":"輝石、重力石アイテムの攻撃力上昇","pct":15.0,"stacks":true},"輝石、重力石アイテムの攻撃力上昇+1":{"target":"輝石、重力石アイテムの攻撃力上昇","pct":30.0,"stacks":true},"調香術強化":{"target":"調香術強化","pct":14.0,"stacks":true},"調香術強化+1":{"target":"調香術強化","pct":30.0,"stacks":true},"毒状態の敵に対する攻撃を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"毒状態の敵に対する攻撃を強化+1":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"毒状態の敵に対する攻撃を強化+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"腐敗状態の敵に対する攻撃を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"腐敗状態の敵に対する攻撃を強化+1":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"腐敗状態の敵に対する攻撃を強化+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"凍傷状態の敵に対する攻撃を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"凍傷状態の敵に対する攻撃を強化+1":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"凍傷状態の敵に対する攻撃を強化+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"周囲で睡眠状態の発生時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":12.0,"stacks":false},"周囲で睡眠状態の発生時、攻撃力上昇+1":{"target":"すべての攻撃を強化","pct":22.0,"stacks":false},"周囲で発狂状態の発生時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":12.0,"stacks":false},"周囲で発狂状態の発生時、攻撃力上昇+1":{"target":"すべての攻撃を強化","pct":22.0,"stacks":false}};

const EFFECT_BY_NAME = new Map(EFFECT_TABLE.map((e) => [e.name, e]));

// "○○の攻撃力上昇" のような武器種ワイルドカード行を、実際の遺物スキル名にフォールバック適用するための規則
const WILDCARD_RULES = [
  { test: /^(.+)の攻撃力上昇$/, template: "○○の攻撃力上昇" },
  { test: /^(.+)の攻撃でHP回復$/, template: "○○の攻撃でHP回復" },
  { test: /^(.+)の攻撃でFP回復$/, template: "○○の攻撃でFP回復" },
  { test: /^(.+)の武器種を3つ以上装備していると攻撃力上昇$/, template: "○○の武器種を3つ以上装備していると攻撃力上昇" },
  { test: /^(.+)の武器種を3つ以上装備していると最大HP上昇$/, template: "○○の武器種を3つ以上装備していると最大HP上昇" },
  { test: /^(.+)の武器種を3つ以上装備していると最大FP上昇$/, template: "○○の武器種を3つ以上装備していると最大FP上昇" },
];

function lookupEffectEntry(fullText) {
  if (EFFECT_BY_NAME.has(fullText)) return EFFECT_BY_NAME.get(fullText);
  for (const rule of WILDCARD_RULES) {
    if (rule.test.test(fullText) && !EFFECT_BY_NAME.has(fullText)) {
      const tmpl = EFFECT_BY_NAME.get(rule.template);
      if (tmpl) return tmpl;
    }
  }
  return null;
}

// amount文字列（例："物理攻撃力+4%"、"最大HP+20"）から先頭の数値とその単位を抜き出す
function parseAmountNumber(amountStr) {
  if (!amountStr) return null;
  const pctMatch = amountStr.match(/([+\-]?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) return { value: parseFloat(pctMatch[1]), unit: "%" };
  const numMatch = amountStr.match(/\+(\d+(?:\.\d+)?)/);
  if (numMatch) return { value: parseFloat(numMatch[1]), unit: "" };
  return null;
}

// 無印(値0)スキルの検出: 効果量データ or 旧テーブルに載っている基礎名と完全一致するなら「無印=最低ランク」として扱う
function parseBareNumeric(text) {
  if (!EFFECT_BY_NAME.has(text) && !PERCENT_MAP[text]) return null;
  return { base: text, value: 0, category: categoryOf(text) };
}

function getPercent(base, value, depth) {
  const fullText = value === 0 ? base : `${base}+${value}`;

  // 優先1：検証済み効果量データ（遺物効果量.xlsx由来）
  const entry = lookupEffectEntry(fullText);
  if (entry) {
    const parsed = parseAmountNumber(entry.amount);
    return {
      value: parsed ? parsed.value : null,
      unit: parsed ? parsed.unit : "",
      text: entry.amount,
      note: entry.note,
      stackable: entry.stackable,
      calc: entry.calc,
    };
  }

  // フォールバック：旧テーブル（神攻略Wiki由来）
  const legacy = PERCENT_MAP[base];
  if (!legacy) return null;
  const mode = depth === "昏景" ? "deep" : "normal";
  const table = legacy[mode] || legacy.deep || legacy.normal;
  if (!table) return null;
  const v = table[String(value)];
  if (v === undefined) return null;
  return { value: v, unit: legacy.unit };
}

// ビルド合算用：スキルが属する「強化枠」の情報を返す（同じ枠のスキル同士が重ね掛け対象）
function getGroupInfo(base, value) {
  const fullText = value === 0 ? base : `${base}+${value}`;

  // 優先1：calc_data.json由来のダメージ計算枠データ（target・重ね掛け可否が明確）
  const dmg = DAMAGE_TABLE[fullText];
  if (dmg) {
    return { target: dmg.target, type: "mult", pct: dmg.pct, stackable: dmg.stacks };
  }

  // 優先2：効果量データから乗算/加算を判定
  const entry = lookupEffectEntry(fullText);
  if (entry && entry.calc) {
    const parsed = parseAmountNumber(entry.amount);
    if (parsed) {
      return {
        // entry.nameはワイルドカード一致時「○○の...」テンプレ名になるため、
        // 異なる武器種などの「別名」スキル同士が同じ枠として正しく合算される
        target: entry.name,
        type: entry.calc === "乗算" ? "mult" : "add",
        pct: entry.calc === "乗算" ? parsed.value : null,
        amount: entry.calc === "加算" ? parsed.value : null,
        unit: parsed.unit,
        stackable: entry.stackable,
      };
    }
  }
  return null;
}

// 「一時的・条件付き」効果の判定（脂アイテム使用時、状態異常の敵に対して、等）
// 常時効果と区別してビルド集計を分けて表示するために使用
const CONDITIONAL_KEYWORDS = [
  "使用時", "発生時", "受けると", "倒した時", "成功時", "命中時", "低下時",
  "被弾", "被ダメージ", "直後", "状態の敵に対する", "状態になると",
  "モーション開始時", "周囲で", "持ち替え時", "連続時",
];
const DURATION_RE = /[（(]\s*約?\s*\d+(?:\.\d+)?\s*秒/;

function isConditionalEffect(fullText, entry) {
  const amount = entry ? entry.amount || "" : "";
  if (DURATION_RE.test(amount)) return true;
  return CONDITIONAL_KEYWORDS.some((kw) => fullText.includes(kw) || amount.includes(kw));
}

function formatPercent(p) {
  if (!p) return null;
  if (p.text) return `＝${p.text}`;
  if (p.unit === "%") return `＝${p.value}%`;
  if (p.unit === "") return `＝${p.value}`;
  if (p.unit && p.unit.endsWith("+")) return `＝${p.unit}${p.value}`;
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
    const [name, s1, d1, s2, d2, s3, d3, id, note] = row;
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
    const searchBlob = (name + " " + (note || "") + " " + skills.map(s => s.text + " " + s.demerit).join(" ")).toLowerCase();
    return { id, name, note: note || "", skills, ...meta, effectiveSlot, effectiveColor, searchBlob };
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
      o.note ?? "",
    ]);
  }
  throw new Error("認識できないデータ形式です");
}

// 内部のコンパクト行配列を、友人と共有しやすいオブジェクト形式に変換してエクスポートする
function toExportFormat(raw) {
  const relics = raw.map(([name, s1, d1, s2, d2, s3, d3, id, note]) => ({
    relic_name: name,
    skill1: s1 || "",
    skill1_demerit: d1 || "",
    skill2: s2 || "",
    skill2_demerit: d2 || "",
    skill3: s3 || "",
    skill3_demerit: d3 || "",
    item_id: id || "",
    note: note || "",
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

  /* 遺物データの個別編集・削除 */
  const rawRowById = useMemo(() => {
    const map = new Map();
    rawData.forEach((row) => map.set(row[7], row));
    return map;
  }, [rawData]);

  // メモ（コメント）は個人設定ではなく、遺物データ本体（JSONのnote項目）に保存する
  const updateNote = (id, note) => {
    const next = rawData.map((row) => (row[7] === id ? [...row.slice(0, 8), note] : row));
    setRawData(next);
    storage.set("relic-rawdata", JSON.stringify(next), false).catch(() => {});
  };

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const startEdit = (id) => {
    const row = rawRowById.get(id);
    if (!row) return;
    const [name, s1, d1, s2, d2, s3, d3, , note] = row;
    setEditDraft({
      name, skill1: s1 || "", demerit1: d1 || "",
      skill2: s2 || "", demerit2: d2 || "",
      skill3: s3 || "", demerit3: d3 || "",
      note: note || "",
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
        editDraft.note,
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
    if (!build) return { permanent: [], conditional: [] };
    const nameGroups = new Map(); // 同名スキルごとにまとめる（stackable判定はここに適用）
    const demeritMap = new Map();

    build.slots.forEach((relicId) => {
      if (!relicId) return;
      const relic = relicById.get(relicId);
      if (!relic) return;
      relic.skills.forEach((s) => {
        if (s.numeric) {
          const fullText = s.numeric.value === 0 ? s.numeric.base : `${s.numeric.base}+${s.numeric.value}`;
          const gi = getGroupInfo(s.numeric.base, s.numeric.value);
          const pct = getPercent(s.numeric.base, s.numeric.value, relic.depth);
          const entryForClassify = lookupEffectEntry(fullText);
          const conditional = isConditionalEffect(fullText, entryForClassify);
          const display = pct ? formatPercent(pct) : (s.numeric.value === 0 ? "無印" : `+${s.numeric.value}`);
          const cur = nameGroups.get(fullText) || {
            name: fullText,
            target: gi ? gi.target : `目安:${s.numeric.base}`,
            type: gi ? gi.type : "unknown",
            unit: gi ? (gi.unit || (gi.type === "mult" ? "%" : "")) : (pct ? pct.unit : ""),
            stackable: gi ? gi.stackable : null,
            conditional,
            values: [],
            entries: [],
          };
          cur.values.push(gi ? (gi.type === "mult" ? gi.pct : gi.amount) : (pct ? pct.value : s.numeric.value));
          cur.entries.push({ relicName: relic.name, display });
          nameGroups.set(fullText, cur);
        }
        if (s.demeritNumeric) {
          const key = s.demerit;
          const cur = demeritMap.get(key) || { base: s.demerit, unit: s.demeritNumeric.label, total: 0, items: [] };
          cur.total += s.demeritNumeric.value;
          cur.items.push({ relicName: relic.name, value: s.demeritNumeric.value });
          demeritMap.set(key, cur);
        }
      });
    });

    // ステップ1：同名スキルの重ね掛け判定（stackable:falseなら1回分のみ、trueなら重ね掛けで合成）
    const nameContribs = [...nameGroups.values()].map((ng) => {
      const nums = ng.values.filter((v) => typeof v === "number");
      let contrib;
      if (ng.type === "mult") {
        contrib = ng.stackable === false
          ? (nums.length ? Math.max(...nums) : 0)
          // 複利で倍率を合成した後、％に戻す（target段階でも同じ「％」の土俵で扱うため）
          : (nums.reduce((mult, v) => mult * (1 + v / 100), 1) - 1) * 100;
      } else {
        contrib = ng.stackable === false
          ? (nums.length ? Math.max(...nums) : 0)
          : nums.reduce((a, b) => a + b, 0);
      }
      return { ...ng, contrib };
    });

    // ステップ2：同じtarget（強化枠）を共有する「別名」スキル同士は常に重ね掛けする
    // 常時効果と条件付き効果は別々に集計する（常時効果の合計 → 発動中はさらに+X%、という形で見せるため）
    function aggregate(list) {
      const targetGroups = new Map();
      list.forEach((ng) => {
        const cur = targetGroups.get(ng.target) || { target: ng.target, type: ng.type, unit: ng.unit, names: [], entries: [] };
        cur.names.push(ng);
        cur.entries.push(...ng.entries);
        targetGroups.set(ng.target, cur);
      });
      const out = [];
      targetGroups.forEach((g) => {
        let totalLabel;
        if (g.type === "mult") {
          let totalMult = 1;
          g.names.forEach((ng) => { totalMult *= 1 + ng.contrib / 100; });
          const totalPct = Math.round((totalMult - 1) * 10000) / 100;
          totalLabel = `${totalPct >= 0 ? "+" : ""}${totalPct}%`;
        } else if (g.type === "add") {
          const total = Math.round(g.names.reduce((a, ng) => a + ng.contrib, 0) * 100) / 100;
          totalLabel = `${total >= 0 ? "+" : ""}${total}${g.unit}`;
        } else {
          const total = Math.round(g.names.reduce((a, ng) => a + ng.contrib, 0) * 100) / 100;
          totalLabel = `${total >= 0 ? "+" : ""}${total}${g.unit}（目安）`;
        }
        out.push({ target: g.target.replace(/^目安:/, ""), totalLabel, entries: g.entries, demerit: false });
      });
      return out;
    }

    const permanent = aggregate(nameContribs.filter((ng) => !ng.conditional));
    const conditional = aggregate(nameContribs.filter((ng) => ng.conditional));

    demeritMap.forEach((d) => {
      permanent.push({
        target: d.base,
        totalLabel: `${d.total > 0 ? "+" : ""}${d.total}${d.unit}`,
        entries: d.items.map((it) => ({ relicName: it.relicName, display: `${it.value}${d.unit}` })),
        demerit: true,
      });
    });
    return { permanent, conditional };
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
        // r.searchBlobには遺物名・スキル・note（コメント）が含まれる
        const hit = kwTokens.every((t) => r.searchBlob.includes(t));
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

            {(buildEffectsSummary.permanent.length > 0 || buildEffectsSummary.conditional.length > 0) && (
              <div className="build-summary">
                <div className="build-summary-title">常時効果の合計（検証済みデータに基づく重ね掛け計算）</div>
                {buildEffectsSummary.permanent.length > 0 ? (
                  <ul className="build-summary-list">
                    {buildEffectsSummary.permanent.map((e, i) => (
                      <li key={i} className={e.demerit ? "demerit" : "buff"}>
                        {e.target}：{e.demerit ? "" : "合計 "}{e.totalLabel}
                        {e.entries.length > 1 && (
                          <span className="build-summary-detail">
                            （{e.entries.map((it) => `${it.relicName}: ${it.display}`).join(" + ")}）
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="build-summary-empty">常時発動する数値効果はありません</div>
                )}

                {buildEffectsSummary.conditional.length > 0 && (
                  <>
                    <div className="build-summary-title conditional">条件付き効果（発動中はこの分が上乗せされます）</div>
                    <ul className="build-summary-list">
                      {buildEffectsSummary.conditional.map((e, i) => (
                        <li key={i} className="conditional">
                          {e.target}：発動中 {e.totalLabel}
                          {e.entries.length > 1 && (
                            <span className="build-summary-detail">
                              （{e.entries.map((it) => `${it.relicName}: ${it.display}`).join(" + ")}）
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="build-summary-note">
                  ※「（目安）」表記があるものは重ね掛けルールのデータが無いため単純合算した参考値です。それ以外は検証データに基づき、同名スキルは重ね掛け不可なら1回分のみ・可能なら複利で合成し、別名スキル同士（同じ強化枠を共有するもの）は常に重ね掛けして計算しています。条件付き効果は「脂アイテム使用時」「特定の状態異常の敵に対して」など発動条件がある間だけ乗る追加分です。
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
                  <label className="edit-label">メモ（note）</label>
                  <input
                    className="edit-input"
                    placeholder="メモ（空欄可）"
                    value={editDraft.note}
                    onChange={(e) => updateEditDraft("note", e.target.value)}
                  />
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
                                {n.value === 0 ? "無印" : `+${n.value}`}
                              </span>
                            )}
                          </span>
                          {n && pct && pct.text && (
                            <div className="effect-amount-text" title={pct.note || undefined}>
                              {pct.text}
                              {pct.note && <span className="effect-amount-note-mark">※</span>}
                            </div>
                          )}
                          {n && pct && !pct.text && pct.value !== null && (
                            <div className="effect-amount-text">{formatPercent(pct)}</div>
                          )}
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
                    placeholder="メモを追加…（JSONのnote項目に保存されます）"
                    defaultValue={r.note || ""}
                    key={`${r.id}:${r.note}`}
                    onBlur={(e) => {
                      if (e.target.value !== (r.note || "")) updateNote(r.id, e.target.value);
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
.build-summary-title.conditional {
  margin-top: 14px;
  color: #C99A5C;
}
.build-summary-empty {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11.5px;
  color: #6E6350;
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
.build-summary-list li.conditional { color: #C99A5C; }
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
.effect-amount-text {
  color: #8FB5A8;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  margin-top: 2px;
  line-height: 1.4;
}
.effect-amount-note-mark {
  color: #B9974A;
  margin-left: 3px;
  cursor: help;
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
