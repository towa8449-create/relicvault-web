import React, { useState, useMemo, useEffect, useCallback } from "react";
import { storage } from "./storage.js";
import { Star, Search, Moon, Trash2 } from "lucide-react";

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

/* 特殊アイテム（ストーリー・イベント入手の固有遺物）データベース：日本語名 -> {色, スキル一覧, 英語名}
   ※「獣の夜」等、Night/Dark Nightで日本語表記が同名になるものは色を確定できないため未収録 */
const SPECIAL_ITEMS_DB = {"忌み鬼の呪物":{"color":"滴る","skills":["武器の持ち替え時、物理攻撃力上昇","投擲ナイフの攻撃力上昇","生命力+1"]},"古びた懐中時計":{"color":"静まる","skills":["攻撃連続時、FP回復","技量+3"]},"薄汚れたフレーム":{"color":"滴る","skills":["攻撃を受けると攻撃力上昇","信仰+3"]},"にび色の砥石":{"color":"燃える","skills":["【追跡者】スキル使用時、通常攻撃で炎を纏った追撃を行う（大剣のみ）","物理攻撃力上昇"]},"銀の雫":{"color":"燃える","skills":["【追跡者】アビリティ発動時、アーツゲージ増加","アーツゲージ自然蓄積+3","神秘+3"]},"追跡者の耳飾り":{"color":"燃える","skills":["【追跡者】アーツ発動時、周囲を延焼","【追跡者】スキルの使用回数+1","攻撃命中時、スタミナ回復"]},"石の杭":{"color":"燃える","skills":["【守護者】スキルの持続時間延長","スキルクールタイム軽減+3"]},"三冊目の本":{"color":"燃える","skills":["【守護者】斧槍タメ攻撃時、つむじ風が発生","斧槍の攻撃でHP回復"]},"魔女のブローチ":{"color":"滴る","skills":["【守護者】アーツ発動時、周囲の味方HPを徐々に回復"]},"割れた封蝋":{"color":"輝く","skills":["【鉄の目】弱点の持続時間を延長させる","致命の一撃で、ルーンを取得"]},"聖律の刃":{"color":"輝く","skills":["【鉄の目】アーツ発動後、刺突カウンター強化","出撃時の武器に聖攻撃力を付加","弓の攻撃力上昇"]},"金色の露":{"color":"輝く","skills":["【レディ】スキルのダメージ上昇","属性攻撃力が付加された時、属性攻撃力上昇"]},"頭冠のメダル":{"color":"静まる","skills":["【レディ】短剣による攻撃連続時、周囲の敵に、直近の出来事を再演","短剣の攻撃力上昇"]},"祝福された鉄貨":{"color":"静まる","skills":["【レディ】アーツ発動中、敵撃破で攻撃力上昇","HP持続回復","生命力+3"]},"ちぎれた組み紐":{"color":"滴る","skills":["【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇","筋力+3"]},"黒爪の首飾り":{"color":"輝く","skills":["トーテム・ステラの周囲で敵を倒した時、HP回復","敵を倒した時、アーツゲージ増加","強靭度+3"]},"小さな化粧道具":{"color":"滴る","skills":["【復讐者】ファミリーと共闘中の間、自身を強化","自身と味方の取得ルーン増加"]},"古びたミニアチュール":{"color":"滴る","skills":["【復讐者】アーツ発動時、霊炎の爆発を発生","【復讐者】アーツ発動時、自身のHPと引き換えに周囲の味方のHPを全回復","敵を倒した時、アーツゲージ増加"]},"夜の痕跡":{"color":"静まる","skills":["【隠者】属性痕を集めた時、「魔術の地」が発動","魔力攻撃力上昇+2"]},"骨のような石":{"color":"静まる","skills":["【隠者】アーツ発動時、最大HP上昇","【隠者】アーツ発動時、自身が出血状態になり、攻撃力上昇","知力+3"]},"祝福された花":{"color":"静まる","skills":["【執行者】スキル中、妖刀が解放状態になるとHP回復","技量+3"]},"黄金の萌芽":{"color":"燃える","skills":["【執行者】アーツ発動中、咆哮でHP回復","HP低下時、周囲の味方を含めHPをゆっくりと回復","ガード成功時、HP回復"]},"清浄の雫":{"color":"燃える","skills":["【学者】アーツでリンクした敵対象に、継続ダメージ","敵を倒した時、アーツゲージ増加","属性カット率上昇"]},"記録「後継者へ」":{"color":"輝く","skills":["【学者】スキルの進捗率の低下を抑制","【学者】スキル使用時、対象に含まれた味方の攻撃力上昇","スキルクールタイム軽減+3"]},"片眼鏡の革袋":{"color":"滴る","skills":["【葬儀屋】祈祷を使用して、自身に補助効果発生時物理攻撃力上昇","魔術/祈祷、効果時間延長","物理攻撃力+2"]},"ガラスの首飾り":{"color":"静まる","skills":["【葬儀屋】アーツ発動時、攻撃力上昇","攻撃連続時、攻撃力上昇","アーツゲージ自然蓄積+3"]},"獣の夜":{"color":"静まる","skills":["攻撃命中時、スタミナ回復+1","出撃時の武器に炎攻撃力を付加"]},"爵の夜":{"color":"滴る","skills":["致命の一撃強化+1","致命の一撃で、アーツゲージ増加","致命の一撃で、スタミナ回復速度上昇"]},"識の夜":{"color":"輝く","skills":["最大FP上昇","出撃時の武器に毒の状態異常を付加","周囲で毒／腐敗状態の発生時、攻撃力上昇"]},"深海の夜":{"color":"燃える","skills":["最大HP上昇","聖杯瓶の回復を、周囲の味方に分配","アイテムの効果が周囲の味方にも発動"]},"魔の夜":{"color":"燃える","skills":["出撃中、ショップでの購入に必要なルーンが大割引","ジェスチャー「あぐら」により、発狂が蓄積","発狂状態になると、FP持続回復"]},"狩人の夜":{"color":"静まる","skills":["最大スタミナ上昇","ガードカウンターに、自身の現在HPの一部を加える","刺突カウンター発生時、HP回復"]},"霞の夜":{"color":"輝く","skills":["周囲で凍傷状態の発生時、自身の姿を隠す","出撃時の武器の戦技を「冷気の霧」にする","※適用可能な武器種のみ","凍傷状態の敵に対する攻撃を強化"]},"王の夜":{"color":"滴る","skills":["武器の持ち替え時、いずれかの属性攻撃力を付加","属性攻撃力が付加された時、属性攻撃力上昇","武器の持ち替え時、物理攻撃力上昇"]},"安寧者の遺志":{"color":"滴る","skills":["近接攻撃力上昇","戦技攻撃力上昇","FP持続回復"]},"瓦礫の夜":{"color":"燃える","skills":["状態異常ゲージがある時、徐々に攻撃力上昇","被ダメージ時、腐敗の状態異常を付加","周囲で腐敗状態の発生時、HP持続回復"]},"獣の暗き夜":{"color":"輝く","skills":["攻撃命中時、スタミナ回復+1","攻撃を受けると攻撃力上昇","炎攻撃力上昇+2"]},"爵の暗き夜":{"color":"燃える","skills":["致命の一撃強化+1","致命の一撃強化","致命の一撃で、ルーンを取得"]},"識の暗き夜":{"color":"静まる","skills":["最大FP上昇","攻撃連続時、FP回復","魔術師塔の仕掛けが解除される度、最大FP上昇"]},"深海の暗き夜":{"color":"滴る","skills":["最大HP上昇","HP持続回復","HP低下時、周囲の味方を含めHPをゆっくりと回復"]},"魔の暗き夜":{"color":"滴る","skills":["攻撃を受けると攻撃力上昇","ジェスチャー「あぐら」により、発狂が蓄積","発狂状態になると、FP持続回復"]},"狩人の暗き夜":{"color":"輝く","skills":["最大スタミナ上昇","属性攻撃力が付加された時、属性攻撃力上昇","敵を倒した時、アーツゲージ増加"]},"霞の暗き夜":{"color":"静まる","skills":["周囲で凍傷状態の発生時、自身の姿を隠す","出撃時の武器に冷気の状態異常を付加","物理カット率上昇"]},"砕けた魔女のブローチ":{"color":"滴る","skills":["【守護者】アーツ発動時、周囲の味方HPを徐々に回復","【守護者】アビリティ発動中、ガード成功時、衝撃波が発生","生命力+3"]},"安寧の意志":{"color":"燃える","skills":["近接攻撃力上昇","戦技攻撃力上昇","カット率低下時、稀に敵から受ける攻撃を無効化"]}};

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
  else { special = true; depth = "景色"; } // 固有遺物は深度を持たないため、通常遺物の「景色」と同等として扱う

  // 固有遺物として認識できなかった場合、既知の特殊アイテムDBから色を補完する
  if (special && !color) {
    const known = SPECIAL_ITEMS_DB[name];
    if (known) color = known.color;
  }
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
// デメリットはEFFECT_TABLEには含めていない（別データのため）。Excel上の掲載順だけここに保持する
const DEMERIT_SORT_ORDER = ["生命力と神秘が低下","筋力と知力が低下","技量と信仰が低下","知力と技量が低下","信仰と筋力が低下","取得ルーン減少","HP持続減少","すべての状態異常耐性低下","聖杯瓶使用時、カット率低下","回避直後、カット率低下","回避連続時、カット率低下","被ダメージ時、毒を蓄積","被ダメージ時、腐敗を蓄積","被ダメージ時、出血を蓄積","被ダメージ時、冷気を蓄積","被ダメージ時、睡眠を蓄積","被ダメージ時、発狂を蓄積","被ダメージ時、死を蓄積","聖杯瓶の回復量低下","アーツゲージ蓄積鈍化","HP最大未満時、攻撃力低下","HP最大未満時、毒が蓄積","HP最大未満時、腐敗が蓄積","瀕死時、最大HP低下"];
// 条件付き効果の「発動条件」を、実プレイ上ほぼ同じ瞬間として扱えるグループにまとめたもの。
// 同じグループの条件同士だけを合算して表示する（例：「敵を倒した時」と「致命の一撃時」は別グループなので合算しない）
const CONDITION_GROUP = {"魔術師塔が解除される度":"魔術師塔","小砦の強敵を倒す度":"小砦","大教会の強敵を倒す度":"大教会","大野営地の強敵を倒す度":"大野営地","遺跡の強敵を倒す度":"遺跡","両手持ち時":"両手持ち","二刀持ち時":"二刀持ち","武器持ち替え時":"武器持ち替え時","属性攻撃力が付加された時":"付与","攻撃を受けた時":"被ダメ","状態異常ゲージがある時":"自らが状態異常時","封牢の囚を倒す度":"封牢","夜の侵入者を倒す度":"夜侵入","脂アイテム使用時":"付与","敵を倒した時":"敵倒","致命の一撃時":"致命","ガード成功時":"ガード","HP低下時":"被ダメ","ダメージで吹き飛ばされた時":"被ダメ","刺突カウンター時":"刺突","被ダメージ直後の攻撃時":"被ダメ","対象アイテム使用時":"アイテム","周囲で腐敗発生時":"腐敗発生時","攻撃連続時":"連続攻撃時","発狂時":"自らが発狂時","攻撃命中時":"攻撃時","被ダメージ時":"被ダメ","ガード中":"ガード","あぐら時":"あぐら","カット率低下時":"被ダメ","毒状態の敵に対して攻撃":"敵を毒にしたとき","腐敗状態の敵に対して攻撃":"敵を腐敗にしたとき","凍傷状態の敵に対して攻撃":"敵を凍傷にしたとき","周囲で毒,腐敗発生時":"毒発生時","周囲で凍傷発生時":"凍傷発生時","周囲で睡眠発生時":"睡眠発生時","周囲で発狂発狂時":"発狂発生時","アビリティ発動時":"追跡者のアビリティ発動時"};
function conditionGroupOf(condition) {
  if (!condition) return "";
  return CONDITION_GROUP[condition] || condition; // 未登録の条件は条件文そのものをグループとして扱う（誤って合算しない安全側）
}



/* ---------- 効果量データ（出典：ユーザー提供の検証済みデータ 遺物効果量.xlsx） ----------
   name: 遺物スキル文言と完全一致する名称（+N付き）
   stackable: 重ね掛け可否（true/false/null=不明）
   calc: 計算方式（"乗算"|"加算"|null）
   amount: 実際の効果量（人が読める文字列）
   note: 補足・注意事項 */
const EFFECT_TABLE = [{"name":"最大HP上昇","amount":"最大HP+100","calc":"加算","stackable":false,"target":"最大HP","conditional":false,"condition":null,"importance":10,"note":"「最大HP上昇（通常遺物）」を参照（要：深層版との出し分け対応）","tags":["HP","生存"],"occurrence":null,"sortOrder":0,"category":"能力値"},{"name":"最大FP上昇","amount":"最大FP+25","calc":"加算","stackable":false,"target":"最大FP","conditional":false,"condition":null,"importance":10,"note":"「最大FP上昇（通常遺物）」を参照（要：深層版との出し分け対応）","tags":["FP","魔術","祈祷","隠者","レディ","復讐者","葬儀屋","戦技"],"occurrence":null,"sortOrder":1,"category":"能力値"},{"name":"最大スタミナ上昇","amount":"最大スタミナ+10","calc":"加算","stackable":false,"target":"最大スタミナ","conditional":false,"condition":null,"importance":10,"note":"「最大スタミナ上昇（通常遺物）」を参照（要：深層版との出し分け対応）","tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":null,"sortOrder":2,"category":"能力値"},{"name":"最大HP上昇（通常遺物）","amount":"最大HP+100","calc":"加算","stackable":false,"target":"最大HP","conditional":false,"condition":"-","importance":10,"note":"生命力+との重複可　深層の遺物の同名効果とは別物","tags":["HP","生存"],"occurrence":"通常のみ","sortOrder":3,"category":"能力値"},{"name":"最大FP上昇（通常遺物）","amount":"最大FP+25","calc":"加算","stackable":false,"target":"最大FP","conditional":false,"condition":"-","importance":10,"note":"精神力+との重複可　深層の遺物の同名効果とは別物","tags":["FP","魔術","祈祷","隠者","レディ","復讐者","葬儀屋","戦技"],"occurrence":"通常のみ","sortOrder":4,"category":"能力値"},{"name":"最大スタミナ上昇（通常遺物）","amount":"最大スタミナ+10","calc":"加算","stackable":false,"target":"最大スタミナ","conditional":false,"condition":"-","importance":10,"note":"持久力+との重複可　深層の遺物の同名効果とは別物","tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":"通常のみ","sortOrder":5,"category":"能力値"},{"name":"最大HP上昇（深層遺物）","amount":"条件のない固定値増加計算後のHP最大値の10％増加","calc":"加算","stackable":true,"target":"最大HP","conditional":false,"condition":"-","importance":10,"note":"「最大HP上昇」「最大FP上昇」「最大スタミナ上昇」について 同名の通常の遺物効果とは別物。 上昇量は、通常の遺物効果は固定値だが、深層の遺物効果は最大値に対する割合。 通常の遺物効果と深層の遺物効果を同時に付けた場合、通常の遺物効果で上昇した最大値に対する割合で計算される。 通常の遺物効果は重ね掛け不可だが、深層の遺物効果のほうは重ね掛け可能。","tags":["HP","生存"],"occurrence":"深層のみ","sortOrder":6,"category":"能力値"},{"name":"最大FP上昇（深層遺物）","amount":"条件のない固定値増加計算後のFP最大値の15％増加","calc":"加算","stackable":true,"target":"最大FP","conditional":false,"condition":"-","importance":10,"note":"「最大HP上昇」「最大FP上昇」「最大スタミナ上昇」について 同名の通常の遺物効果とは別物。 上昇量は、通常の遺物効果は固定値だが、深層の遺物効果は最大値に対する割合。 通常の遺物効果と深層の遺物効果を同時に付けた場合、通常の遺物効果で上昇した最大値に対する割合で計算される。 通常の遺物効果は重ね掛け不可だが、深層の遺物効果のほうは重ね掛け可能。","tags":["FP","魔術","祈祷","隠者","レディ","復讐者","葬儀屋","戦技"],"occurrence":"深層のみ","sortOrder":7,"category":"能力値"},{"name":"最大スタミナ上昇（深層遺物）","amount":"条件のない固定値増加計算後のスタミナ最大値12％増加","calc":"加算","stackable":true,"target":"最大スタミナ","conditional":false,"condition":"-","importance":10,"note":"「最大HP上昇」「最大FP上昇」「最大スタミナ上昇」について 同名の通常の遺物効果とは別物。 上昇量は、通常の遺物効果は固定値だが、深層の遺物効果は最大値に対する割合。 通常の遺物効果と深層の遺物効果を同時に付けた場合、通常の遺物効果で上昇した最大値に対する割合で計算される。 通常の遺物効果は重ね掛け不可だが、深層の遺物効果のほうは重ね掛け可能。","tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":"深層のみ","sortOrder":8,"category":"能力値"},{"name":"生命力+1","amount":"最大HP+20","calc":"加算","stackable":true,"target":"最大HP","conditional":false,"condition":"-","importance":6,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["HP","生存"],"occurrence":"通常のみ","sortOrder":9,"category":"能力値"},{"name":"生命力+2","amount":"最大HP+40","calc":"加算","stackable":true,"target":"最大HP","conditional":false,"condition":"-","importance":8,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["HP","生存"],"occurrence":"通常のみ","sortOrder":10,"category":"能力値"},{"name":"生命力+3","amount":"最大HP+60","calc":"加算","stackable":true,"target":"最大HP","conditional":false,"condition":"-","importance":10,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["HP","生存"],"occurrence":"通常のみ","sortOrder":11,"category":"能力値"},{"name":"精神力+1","amount":"最大FP+5","calc":"加算","stackable":true,"target":"最大FP","conditional":false,"condition":"-","importance":6,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["FP","魔術","祈祷","戦技","隠者","レディ","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":12,"category":"能力値"},{"name":"精神力+2","amount":"最大FP+10","calc":"加算","stackable":true,"target":"最大FP","conditional":false,"condition":"-","importance":7,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["FP","魔術","祈祷","戦技","隠者","レディ","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":13,"category":"能力値"},{"name":"精神力+3","amount":"最大FP+15","calc":"加算","stackable":true,"target":"最大FP","conditional":false,"condition":"-","importance":8,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["FP","魔術","祈祷","戦技","隠者","レディ","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":14,"category":"能力値"},{"name":"持久力+1","amount":"最大スタミナ+2","calc":"加算","stackable":true,"target":"最大スタミナ","conditional":false,"condition":"-","importance":3,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":"通常のみ","sortOrder":15,"category":"能力値"},{"name":"持久力+2","amount":"最大スタミナ+4","calc":"加算","stackable":true,"target":"最大スタミナ","conditional":false,"condition":"-","importance":4,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":"通常のみ","sortOrder":16,"category":"能力値"},{"name":"持久力+3","amount":"最大スタミナ+6","calc":"加算","stackable":true,"target":"最大スタミナ","conditional":false,"condition":"-","importance":6,"note":"増加量はキャラクターやレベルを問わず固定値","tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":"通常のみ","sortOrder":17,"category":"能力値"},{"name":"筋力+1","amount":null,"calc":"加算","stackable":true,"target":"筋力","conditional":false,"condition":"-","importance":1,"note":null,"tags":["筋力","無頼漢","追跡者","葬儀屋"],"occurrence":"通常のみ","sortOrder":18,"category":"能力値"},{"name":"筋力+2","amount":null,"calc":"加算","stackable":true,"target":"筋力","conditional":false,"condition":"-","importance":2,"note":null,"tags":["筋力","無頼漢","追跡者","葬儀屋"],"occurrence":"通常のみ","sortOrder":19,"category":"能力値"},{"name":"筋力+3","amount":null,"calc":"加算","stackable":true,"target":"筋力","conditional":false,"condition":"-","importance":3,"note":null,"tags":["筋力","無頼漢","追跡者","葬儀屋"],"occurrence":"通常のみ","sortOrder":20,"category":"能力値"},{"name":"技量+1","amount":null,"calc":"加算","stackable":true,"target":"技量","conditional":false,"condition":"-","importance":1,"note":null,"tags":["技量","レディ","鉄の目","神秘"],"occurrence":"通常のみ","sortOrder":21,"category":"能力値"},{"name":"技量+2","amount":null,"calc":"加算","stackable":true,"target":"技量","conditional":false,"condition":"-","importance":2,"note":null,"tags":["技量","レディ","鉄の目","神秘"],"occurrence":"通常のみ","sortOrder":22,"category":"能力値"},{"name":"技量+3","amount":null,"calc":"加算","stackable":true,"target":"技量","conditional":false,"condition":"-","importance":3,"note":null,"tags":["技量","レディ","鉄の目","神秘"],"occurrence":"通常のみ","sortOrder":23,"category":"能力値"},{"name":"知力+1","amount":null,"calc":"加算","stackable":true,"target":"知力","conditional":false,"condition":"-","importance":1,"note":null,"tags":["FP","魔術","隠者","レディ"],"occurrence":"通常のみ","sortOrder":24,"category":"能力値"},{"name":"知力+2","amount":null,"calc":"加算","stackable":true,"target":"知力","conditional":false,"condition":"-","importance":2,"note":null,"tags":["FP","魔術","隠者","レディ"],"occurrence":"通常のみ","sortOrder":25,"category":"能力値"},{"name":"知力+3","amount":null,"calc":"加算","stackable":true,"target":"知力","conditional":false,"condition":"-","importance":3,"note":null,"tags":["FP","魔術","隠者","レディ"],"occurrence":"通常のみ","sortOrder":26,"category":"能力値"},{"name":"信仰+1","amount":null,"calc":"加算","stackable":true,"target":"信仰","conditional":false,"condition":"-","importance":1,"note":"信仰+3で信仰補正武器の攻撃力が12上がる","tags":["FP","祈祷","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":27,"category":"能力値"},{"name":"信仰+2","amount":null,"calc":"加算","stackable":true,"target":"信仰","conditional":false,"condition":"-","importance":2,"note":null,"tags":["FP","祈祷","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":28,"category":"能力値"},{"name":"信仰+3","amount":null,"calc":"加算","stackable":true,"target":"信仰","conditional":false,"condition":"-","importance":3,"note":null,"tags":["FP","祈祷","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":29,"category":"能力値"},{"name":"神秘+1","amount":null,"calc":"加算","stackable":true,"target":"神秘","conditional":false,"condition":"-","importance":1,"note":null,"tags":["神秘","技量","近接","レディ","鉄の目"],"occurrence":"通常のみ","sortOrder":30,"category":"能力値"},{"name":"神秘+2","amount":null,"calc":"加算","stackable":true,"target":"神秘","conditional":false,"condition":"-","importance":2,"note":null,"tags":["神秘","技量","近接","レディ","鉄の目"],"occurrence":"通常のみ","sortOrder":31,"category":"能力値"},{"name":"神秘+3","amount":null,"calc":"加算","stackable":true,"target":"神秘","conditional":false,"condition":"-","importance":3,"note":null,"tags":["神秘","技量","近接","レディ","鉄の目"],"occurrence":"通常のみ","sortOrder":32,"category":"能力値"},{"name":"強靭度+1","amount":"強靭+5%","calc":"加算","stackable":true,"target":"強靭度","conditional":false,"condition":"-","importance":1,"note":null,"tags":["強靭","筋力","近接","無頼漢","追跡者","葬儀屋","執行者"],"occurrence":"両方あり","sortOrder":33,"category":"能力値"},{"name":"強靭度+2","amount":"強靭+10%","calc":"加算","stackable":true,"target":"強靭度","conditional":false,"condition":"-","importance":2,"note":null,"tags":["強靭","筋力","近接","無頼漢","追跡者","葬儀屋","執行者"],"occurrence":"両方あり","sortOrder":34,"category":"能力値"},{"name":"強靭度+3","amount":"強靭+15%","calc":"加算","stackable":true,"target":"強靭度","conditional":false,"condition":"-","importance":3,"note":null,"tags":["強靭","筋力","近接","無頼漢","追跡者","葬儀屋","執行者"],"occurrence":"両方あり","sortOrder":35,"category":"能力値"},{"name":"魔術師塔の仕掛けが解除される度、最大FP上昇","amount":"1か所につき最大FP+18%","calc":"乗算","stackable":false,"target":"最大FP","conditional":true,"condition":"魔術師塔が解除される度","importance":10,"note":"毎回乗算,永続","tags":["FP","魔術","戦技","祈祷","隠者","レディ","復讐者","葬儀屋"],"occurrence":"通常のみ","sortOrder":36,"category":"能力値"},{"name":"小砦の強敵を倒す度、取得ルーン増加、発見力上昇","amount":"強敵を倒す度、取得ルーン+5.5%","calc":"乗算","stackable":false,"target":"取得ルーン,発見力","conditional":true,"condition":"小砦の強敵を倒す度","importance":6,"note":null,"tags":["発見力","復讐者","葬儀屋","学者"],"occurrence":"深層のみ","sortOrder":37,"category":"能力値"},{"name":"大教会の強敵を倒す度、最大HP上昇","amount":"強敵を倒す度、最大HP+5%","calc":"乗算","stackable":false,"target":"最大HP","conditional":true,"condition":"大教会の強敵を倒す度","importance":10,"note":null,"tags":["HP","生存"],"occurrence":"深層のみ","sortOrder":38,"category":"能力値"},{"name":"大野営地の強敵を倒す度、最大スタミナ上昇","amount":"強敵を倒す度、最大スタミナ+7.5%","calc":"乗算","stackable":false,"target":"最大スタミナ","conditional":true,"condition":"大野営地の強敵を倒す度","importance":8,"note":null,"tags":["スタミナ","攻撃連続","近接","リゲイン"],"occurrence":"深層のみ","sortOrder":39,"category":"能力値"},{"name":"遺跡の強敵を倒す度、神秘上昇","amount":"強敵を倒すたび神秘+4","calc":"加算","stackable":false,"target":"神秘","conditional":true,"condition":"遺跡の強敵を倒す度","importance":7,"note":null,"tags":["神秘","技量","近接","レディ","鉄の目","学者"],"occurrence":"深層のみ","sortOrder":40,"category":"能力値"},{"name":"物理攻撃力上昇","amount":"物理攻撃力+4%","calc":"乗算","stackable":true,"target":"物理攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["物理攻撃","妖刀","近接"],"occurrence":"両方あり","sortOrder":41,"category":"攻撃力"},{"name":"物理攻撃力上昇+1","amount":"物理攻撃力+5%","calc":"乗算","stackable":true,"target":"物理攻撃力","conditional":false,"condition":"-","importance":5,"note":null,"tags":["物理攻撃","妖刀","近接"],"occurrence":"両方あり","sortOrder":42,"category":"攻撃力"},{"name":"物理攻撃力上昇+2","amount":"物理攻撃力+6%","calc":"乗算","stackable":true,"target":"物理攻撃力","conditional":false,"condition":"-","importance":8,"note":null,"tags":["物理攻撃","妖刀","近接"],"occurrence":"両方あり","sortOrder":43,"category":"攻撃力"},{"name":"物理攻撃力上昇+3","amount":"物理攻撃力+10.5%","calc":"乗算","stackable":true,"target":"物理攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["物理攻撃","妖刀","近接"],"occurrence":"深層のみ","sortOrder":44,"category":"攻撃力"},{"name":"物理攻撃力上昇+4","amount":"物理攻撃力+12%","calc":"乗算","stackable":true,"target":"物理攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["物理攻撃","妖刀","近接"],"occurrence":"深層のみ","sortOrder":45,"category":"攻撃力"},{"name":"属性攻撃力上昇","amount":"属性攻撃力+5%","calc":"乗算","stackable":true,"target":"属性攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["属性攻撃"],"occurrence":"深層のみ","sortOrder":46,"category":"攻撃力"},{"name":"属性攻撃力上昇+1","amount":"属性攻撃力+8%","calc":"乗算","stackable":true,"target":"属性攻撃力","conditional":false,"condition":"-","importance":8,"note":null,"tags":["属性攻撃"],"occurrence":"深層のみ","sortOrder":47,"category":"攻撃力"},{"name":"属性攻撃力上昇+2","amount":"属性攻撃力+10%","calc":"乗算","stackable":true,"target":"属性攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["属性攻撃"],"occurrence":"深層のみ","sortOrder":48,"category":"攻撃力"},{"name":"魔力攻撃力上昇","amount":"魔力攻撃力+4%","calc":"乗算","stackable":true,"target":"魔力攻撃力","conditional":false,"condition":"-","importance":3,"note":null,"tags":["魔力攻撃","魔術","隠者","レディ"],"occurrence":"両方あり","sortOrder":49,"category":"攻撃力"},{"name":"魔力攻撃力上昇+1","amount":"魔力攻撃力+5%","calc":"乗算","stackable":true,"target":"魔力攻撃力","conditional":false,"condition":"-","importance":5,"note":null,"tags":["魔力攻撃","魔術","隠者","レディ"],"occurrence":"両方あり","sortOrder":50,"category":"攻撃力"},{"name":"魔力攻撃力上昇+2","amount":"魔力攻撃力+6%","calc":"乗算","stackable":true,"target":"魔力攻撃力","conditional":false,"condition":"-","importance":8,"note":null,"tags":["魔力攻撃","魔術","隠者","レディ"],"occurrence":"両方あり","sortOrder":51,"category":"攻撃力"},{"name":"魔力攻撃力上昇+3","amount":"魔力攻撃力+10.5%","calc":"乗算","stackable":true,"target":"魔力攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["魔力攻撃","魔術","隠者","レディ"],"occurrence":"深層のみ","sortOrder":52,"category":"攻撃力"},{"name":"魔力攻撃力上昇+4","amount":"魔力攻撃力+12%","calc":"乗算","stackable":true,"target":"魔力攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["魔力攻撃","魔術","隠者","レディ"],"occurrence":"深層のみ","sortOrder":53,"category":"攻撃力"},{"name":"炎攻撃力上昇","amount":"炎攻撃力+4%","calc":"乗算","stackable":true,"target":"炎攻撃力","conditional":false,"condition":"-","importance":3,"note":null,"tags":["炎攻撃"],"occurrence":"両方あり","sortOrder":54,"category":"攻撃力"},{"name":"炎攻撃力上昇+1","amount":"炎攻撃力+5%","calc":"乗算","stackable":true,"target":"炎攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["炎攻撃"],"occurrence":"両方あり","sortOrder":55,"category":"攻撃力"},{"name":"炎攻撃力上昇+2","amount":"炎攻撃力+6%","calc":"乗算","stackable":true,"target":"炎攻撃力","conditional":false,"condition":"-","importance":8,"note":null,"tags":["炎攻撃"],"occurrence":"両方あり","sortOrder":56,"category":"攻撃力"},{"name":"炎攻撃力上昇+3","amount":"炎攻撃力+10.5%","calc":"乗算","stackable":true,"target":"炎攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["炎攻撃"],"occurrence":"深層のみ","sortOrder":57,"category":"攻撃力"},{"name":"炎攻撃力上昇+4","amount":"炎攻撃力+12%","calc":"乗算","stackable":true,"target":"炎攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["炎攻撃"],"occurrence":"深層のみ","sortOrder":58,"category":"攻撃力"},{"name":"雷攻撃力上昇","amount":"雷攻撃力+4%","calc":"乗算","stackable":true,"target":"雷攻撃力","conditional":false,"condition":"-","importance":3,"note":null,"tags":["雷攻撃"],"occurrence":"両方あり","sortOrder":59,"category":"攻撃力"},{"name":"雷攻撃力上昇+1","amount":"雷攻撃力+5%","calc":"乗算","stackable":true,"target":"雷攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["雷攻撃"],"occurrence":"両方あり","sortOrder":60,"category":"攻撃力"},{"name":"雷攻撃力上昇+2","amount":"雷攻撃力+6%","calc":"乗算","stackable":true,"target":"雷攻撃力","conditional":false,"condition":"-","importance":8,"note":null,"tags":["雷攻撃"],"occurrence":"両方あり","sortOrder":61,"category":"攻撃力"},{"name":"雷攻撃力上昇+3","amount":"雷攻撃力+10.5%","calc":"乗算","stackable":true,"target":"雷攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["雷攻撃"],"occurrence":"深層のみ","sortOrder":62,"category":"攻撃力"},{"name":"雷攻撃力上昇+4","amount":"雷攻撃力+12%","calc":"乗算","stackable":true,"target":"雷攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["雷攻撃"],"occurrence":"深層のみ","sortOrder":63,"category":"攻撃力"},{"name":"聖攻撃力上昇","amount":"聖攻撃力+4%","calc":"乗算","stackable":true,"target":"聖攻撃力","conditional":false,"condition":"-","importance":3,"note":null,"tags":["聖攻撃"],"occurrence":"両方あり","sortOrder":64,"category":"攻撃力"},{"name":"聖攻撃力上昇+1","amount":"聖攻撃力+5%","calc":"乗算","stackable":true,"target":"聖攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["聖攻撃"],"occurrence":"両方あり","sortOrder":65,"category":"攻撃力"},{"name":"聖攻撃力上昇+2","amount":"聖攻撃力+6%","calc":"乗算","stackable":true,"target":"聖攻撃力","conditional":false,"condition":"-","importance":8,"note":null,"tags":["聖攻撃"],"occurrence":"両方あり","sortOrder":66,"category":"攻撃力"},{"name":"聖攻撃力上昇+3","amount":"聖攻撃力+10.5%","calc":"乗算","stackable":true,"target":"聖攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["聖攻撃"],"occurrence":"深層のみ","sortOrder":67,"category":"攻撃力"},{"name":"聖攻撃力上昇+4","amount":"聖攻撃力+12%","calc":"乗算","stackable":true,"target":"聖攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["聖攻撃"],"occurrence":"深層のみ","sortOrder":68,"category":"攻撃力"},{"name":"近接攻撃力上昇","amount":"近接攻撃力+5%","calc":"乗算","stackable":true,"target":"近接攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["近接"],"occurrence":"通常のみ","sortOrder":69,"category":"攻撃力"},{"name":"戦技攻撃力上昇","amount":"戦技攻撃力+15%","calc":"乗算","stackable":true,"target":"戦技攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["戦技","妖刀"],"occurrence":"通常のみ","sortOrder":70,"category":"攻撃力"},{"name":"通常攻撃の1段目強化","amount":"通常攻撃1段目+15%","calc":"乗算","stackable":true,"target":"通常攻撃の1段目","conditional":false,"condition":"-","importance":10,"note":"弓の通常攻撃も対象.\n対象外：強攻撃、タメ攻撃、ガード攻撃、大弓、クロスボウ、バリスタ","tags":["近接","弓"],"occurrence":"両方あり","sortOrder":71,"category":"攻撃力"},{"name":"致命の一撃強化","amount":"致命の一撃の攻撃力+17%","calc":"乗算","stackable":true,"target":"致命の一撃の攻撃力","conditional":false,"condition":"-","importance":5,"note":null,"tags":["致命","近接","妖刀"],"occurrence":"両方あり","sortOrder":72,"category":"攻撃力"},{"name":"致命の一撃強化+1","amount":"致命の一撃の攻撃力+24%","calc":"乗算","stackable":true,"target":"致命の一撃の攻撃力","conditional":false,"condition":"-","importance":6,"note":null,"tags":["致命","近接","妖刀"],"occurrence":"両方あり","sortOrder":73,"category":"攻撃力"},{"name":"魔術強化","amount":"魔術強化+5.0%","calc":"乗算","stackable":true,"target":"魔術強化","conditional":false,"condition":"-","importance":5,"note":null,"tags":["魔術","魔力攻撃","FP"],"occurrence":"深層のみ","sortOrder":74,"category":"攻撃力"},{"name":"魔術強化+1","amount":"魔術強化+8.5%","calc":"乗算","stackable":true,"target":"魔術強化","conditional":false,"condition":"-","importance":8,"note":null,"tags":["魔術","魔力攻撃","FP"],"occurrence":"深層のみ","sortOrder":75,"category":"攻撃力"},{"name":"魔術強化+2","amount":"魔術強化+10.0%","calc":"乗算","stackable":true,"target":"魔術強化","conditional":false,"condition":"-","importance":9,"note":null,"tags":["魔術","魔力攻撃","FP"],"occurrence":"深層のみ","sortOrder":76,"category":"攻撃力"},{"name":"祈祷強化","amount":"祈祷強化+5.0%","calc":"乗算","stackable":true,"target":"祈祷強化","conditional":false,"condition":"-","importance":5,"note":null,"tags":["祈祷","FP"],"occurrence":"深層のみ","sortOrder":77,"category":"攻撃力"},{"name":"祈祷強化+1","amount":"祈祷強化+8.5%","calc":"乗算","stackable":true,"target":"祈祷強化","conditional":false,"condition":"-","importance":8,"note":null,"tags":["祈祷","FP"],"occurrence":"深層のみ","sortOrder":78,"category":"攻撃力"},{"name":"祈祷強化+2","amount":"祈祷強化+10.0%","calc":"乗算","stackable":true,"target":"祈祷強化","conditional":false,"condition":"-","importance":9,"note":null,"tags":["祈祷","FP"],"occurrence":"深層のみ","sortOrder":79,"category":"攻撃力"},{"name":"咆哮とブレス強化","amount":"咆哮とブレス+15%","calc":"乗算","stackable":true,"target":"咆哮とブレスの攻撃力","conditional":false,"condition":"-","importance":7,"note":"隠者の混成魔法、執行者のアーツによる咆哮も対象","tags":["咆哮","ブレス","祈祷","戦技"],"occurrence":"通常のみ","sortOrder":80,"category":"攻撃力"},{"name":"両手持ちの、体勢を崩す力上昇","amount":"体勢を崩す力+5%","calc":"乗算","stackable":true,"target":"体勢を崩す力","conditional":true,"condition":"両手持ち時","importance":4,"note":"射撃・魔術・祈祷全般無効。両手持ち操作で二刀持ちになる武器には無効。【執行者】スキルの「妖刀」にも有効だが、弾きには無効","tags":["体制崩し","筋力","妖刀"],"occurrence":"通常のみ","sortOrder":81,"category":"攻撃力"},{"name":"二刀持ちの、体勢を崩す力上昇","amount":"体勢を崩す力+5%","calc":"乗算","stackable":true,"target":"体勢を崩す力","conditional":true,"condition":"二刀持ち時","importance":4,"note":"射撃・魔術・祈祷全般無効。両手持ち操作で二刀持ちになる武器にも有効","tags":["体制崩し","筋力","二刀"],"occurrence":"通常のみ","sortOrder":82,"category":"攻撃力"},{"name":"武器の持ち替え時、物理攻撃力上昇","amount":"物理攻撃力+10%","calc":"乗算","stackable":false,"target":"物理攻撃力","conditional":true,"condition":"武器持ち替え時","importance":7,"note":"武器の持ち替えから10秒。【執行者】スキル「妖刀」は持ち替えに該当しない","tags":["物理攻撃","近接","弓"],"occurrence":"通常のみ","sortOrder":83,"category":"攻撃力"},{"name":"属性攻撃力が付加された時、属性攻撃力上昇","amount":"属性攻撃力+10%","calc":"乗算","stackable":true,"target":"属性攻撃力","conditional":true,"condition":"属性攻撃力が付加された時","importance":8,"note":"武器、エンチャント、戦技、道具、アーツが対象。エンチャント以外の魔術・祈祷は対象外","tags":["属性攻撃","近接","脂"],"occurrence":"通常のみ","sortOrder":84,"category":"攻撃力"},{"name":"攻撃を受けると攻撃力上昇","amount":"攻撃力+15%（10秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"攻撃を受けた時","importance":6,"note":"属性攻撃をガードした時の貫通ダメージでも発動。自傷ダメージや0以下の被ダメは発動しない。「夜巫女の霧」は他者からの攻撃扱いなので自己誘発可能","tags":["被ダメージ","近接","リゲイン"],"occurrence":"通常のみ","sortOrder":85,"category":"攻撃力"},{"name":"状態異常ゲージがある時、徐々に攻撃力上昇","amount":"1スタックごとに攻撃力+3.8%（最大10スタック,最大約45%）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"状態異常ゲージがある時","importance":7,"note":"最初に状態異常ゲージが出た瞬間、スタックを1にしつつタイマーを発動。以降、20秒ごとにゲージを確認し、ゲージがあればスタック数が1増加、なければ0になる","tags":["近接","神秘","状態異常"],"occurrence":"通常のみ","sortOrder":86,"category":"攻撃力"},{"name":"封牢の囚を倒す度、攻撃力上昇","amount":"封牢の囚1体につき攻撃力+5%（永続）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"封牢の囚を倒す度","importance":10,"note":"魔術・祈祷・アイテムにも効果あり（杖の魔術補正・聖印の祈祷補正には反映されない）","tags":["封牢"],"occurrence":"通常のみ","sortOrder":87,"category":"攻撃力"},{"name":"夜の侵入者を倒す度、攻撃力上昇","amount":"災域の罪人1体につき攻撃力+7%（永続）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"夜の侵入者を倒す度","importance":10,"note":"魔術・祈祷・アイテムにも効果あり（杖の魔術補正・聖印の祈祷補正には反映されない）","tags":[],"occurrence":"通常のみ","sortOrder":88,"category":"攻撃力"},{"name":"ガードカウンター強化","amount":"ガードカウンターの攻撃力+17%","calc":"乗算","stackable":true,"target":"ガードカウンターの攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["ガードカウンター","ガード"],"occurrence":"両方あり","sortOrder":89,"category":"攻撃力"},{"name":"ガードカウンター強化+1","amount":"ガードカウンター強化+25%","calc":"乗算","stackable":true,"target":"ガードカウンターの攻撃力","conditional":false,"condition":"-","importance":6,"note":null,"tags":["ガードカウンター","ガード"],"occurrence":"深層のみ","sortOrder":90,"category":"攻撃力"},{"name":"ガードカウンター強化+2","amount":"ガードカウンター強化+29%","calc":"乗算","stackable":true,"target":"ガードカウンターの攻撃力","conditional":false,"condition":"-","importance":9,"note":null,"tags":["ガードカウンター","ガード"],"occurrence":"深層のみ","sortOrder":91,"category":"攻撃力"},{"name":"ガードカウンターに、自身の現在HPの一部を加える","amount":"最大HPの5%をガードカウンターのダメージに追加","calc":"乗算","stackable":false,"target":"ガードカウンターの攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["ガードカウンター","ガード"],"occurrence":"両方あり","sortOrder":92,"category":"攻撃力"},{"name":"脂アイテム使用時、追加で物理攻撃力上昇","amount":"物理攻撃力+10%（約30秒）","calc":"乗算","stackable":false,"target":"物理攻撃力","conditional":true,"condition":"脂アイテム使用時","importance":7,"note":"キャラクター自体に物理攻撃力上昇（魔術・祈祷には適用されない）のバフが掛かる。脂のエンチャントとは別の独立したバフなので、武器を切り替えて脂の効果が切れても継続する。脂アイテムであれば盾脂でも発動する。効果時間の長い竜傷脂・盾脂では遺物効果の方が先に切れる","tags":["脂","アイテム","物理攻撃"],"occurrence":"両方あり","sortOrder":93,"category":"攻撃力"},{"name":"脂アイテム使用時、追加で物理攻撃力上昇+1","amount":"物理攻撃力+17%（約30秒）","calc":"乗算","stackable":false,"target":"物理攻撃力","conditional":true,"condition":"脂アイテム使用時","importance":8,"note":null,"tags":["脂","アイテム","物理攻撃"],"occurrence":"深層のみ","sortOrder":94,"category":"攻撃力"},{"name":"脂アイテム使用時、追加で物理攻撃力上昇+2","amount":"物理攻撃力+20%（約30秒）","calc":"乗算","stackable":false,"target":"物理攻撃力","conditional":true,"condition":"脂アイテム使用時","importance":9,"note":null,"tags":["脂","アイテム","物理攻撃"],"occurrence":"深層のみ","sortOrder":95,"category":"攻撃力"},{"name":"投擲壺の攻撃力上昇","amount":"投擲壺の攻撃力+約15%","calc":"乗算","stackable":true,"target":"投擲壺の攻撃力","conditional":false,"condition":"-","importance":8,"note":"対象は毒壺、腐敗壺、眠り壺、誘い壺、獣誘いの壺以外の投擲壺","tags":["壺","アイテム"],"occurrence":"両方あり","sortOrder":96,"category":"攻撃力"},{"name":"投擲壺の攻撃力上昇+1","amount":"投擲壺の攻撃力+30.0%","calc":"乗算","stackable":true,"target":"投擲壺の攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["壺","アイテム"],"occurrence":"深層のみ","sortOrder":97,"category":"攻撃力"},{"name":"投擲ナイフの攻撃力上昇","amount":"投擲ナイフの攻撃力+14%","calc":"乗算","stackable":true,"target":"投擲ナイフの攻撃力","conditional":false,"condition":"-","importance":8,"note":"対象は骨の毒投げ矢、結晶投げ矢、スローイングダガー、ククリ、扇投暗器","tags":["ナイフ","アイテム"],"occurrence":"両方あり","sortOrder":98,"category":"攻撃力"},{"name":"投擲ナイフの攻撃力上昇+1","amount":"投擲ナイフの攻撃力+30.0%","calc":"乗算","stackable":true,"target":"投擲ナイフの攻撃力","conditional":false,"condition":"-","importance":10,"note":null,"tags":["ナイフ","アイテム"],"occurrence":"深層のみ","sortOrder":99,"category":"攻撃力"},{"name":"輝石、重力石アイテムの攻撃力上昇","amount":"輝石・重力石アイテムの攻撃力+15%","calc":"乗算","stackable":true,"target":"輝石、重力石アイテムの攻撃力","conditional":false,"condition":"-","importance":3,"note":"対象は屑輝石、大きな屑輝石、カッコウの輝石、扇の重力石、塊の重力石","tags":["石","アイテム"],"occurrence":"両方あり","sortOrder":100,"category":"攻撃力"},{"name":"輝石、重力石アイテムの攻撃力上昇+1","amount":"輝石、重力石アイテムの攻撃力+30.0%","calc":"乗算","stackable":true,"target":"輝石、重力石アイテムの攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["石","アイテム"],"occurrence":"深層のみ","sortOrder":101,"category":"攻撃力"},{"name":"調香術強化","amount":"火花の香りの攻撃力+14%","calc":"乗算","stackable":true,"target":"火花の香りの攻撃力","conditional":false,"condition":"-","importance":1,"note":"対象は火花の香りのみ","tags":["調香術","火花の香り","アイテム"],"occurrence":"両方あり","sortOrder":102,"category":"攻撃力"},{"name":"調香術強化+1","amount":"火花の香りの攻撃力+30.0%","calc":"乗算","stackable":true,"target":"火花の香りの攻撃力","conditional":false,"condition":"-","importance":4,"note":null,"tags":["調香術","火花の香り","アイテム"],"occurrence":"深層のみ","sortOrder":103,"category":"攻撃力"},{"name":"スキルクールタイム軽減+1","amount":"スキルクールタイム-約5%","calc":"乗算","stackable":true,"target":"スキルクールタイム","conditional":false,"condition":"-","importance":4,"note":"クールタイムの基本値はキャラクターによって異なる。","tags":["スキル","スキルリキャスト"],"occurrence":"通常のみ","sortOrder":104,"category":"スキル/アーツ"},{"name":"スキルクールタイム軽減+2","amount":"スキルクールタイム-約7.5%","calc":"乗算","stackable":true,"target":"スキルクールタイム","conditional":false,"condition":"-","importance":5,"note":"クールタイムの基本値はキャラクターによって異なる。","tags":["スキル","スキルリキャスト"],"occurrence":"通常のみ","sortOrder":105,"category":"スキル/アーツ"},{"name":"スキルクールタイム軽減+3","amount":"スキルクールタイム-約10%","calc":"乗算","stackable":true,"target":"スキルクールタイム","conditional":false,"condition":"-","importance":6,"note":"クールタイムの基本値はキャラクターによって異なる。","tags":["スキル","スキルリキャスト"],"occurrence":"通常のみ","sortOrder":106,"category":"スキル/アーツ"},{"name":"アーツゲージ自然蓄積+1","amount":"毎秒のアーツゲージ自然蓄積量+約5%","calc":"乗算","stackable":true,"target":"アーツゲージ自然蓄積量","conditional":false,"condition":"-","importance":7,"note":"※1参照.敵対峙時に自然回復する蓄積量が増加する。遺物効果なしでの基本所要時間は約335秒。","tags":["アーツ"],"occurrence":"通常のみ","sortOrder":107,"category":"スキル/アーツ"},{"name":"アーツゲージ自然蓄積+2","amount":"毎秒のアーツゲージ自然蓄積量+約7.5%","calc":"乗算","stackable":true,"target":"アーツゲージ自然蓄積量","conditional":false,"condition":"-","importance":8,"note":"敵対峙時に自然回復する蓄積量が増加する。遺物効果なしでの基本所要時間は約335秒。","tags":["アーツ"],"occurrence":"通常のみ","sortOrder":108,"category":"スキル/アーツ"},{"name":"アーツゲージ自然蓄積+3","amount":"毎秒のアーツゲージ自然蓄積量+約10%","calc":"乗算","stackable":true,"target":"アーツゲージ自然蓄積量","conditional":false,"condition":"-","importance":9,"note":"敵対峙時に自然回復する蓄積量が増加する。遺物効果なしでの基本所要時間は約335秒。","tags":["アーツ"],"occurrence":"通常のみ","sortOrder":109,"category":"スキル/アーツ"},{"name":"敵を倒した時、アーツゲージ増加","amount":"敵撃破時のアーツゲージ+約5%","calc":"乗算","stackable":false,"target":"アーツゲージ","conditional":true,"condition":"敵を倒した時","importance":5,"note":"1体当たり自然回復で約16.75秒短縮相当。+1とは重ね掛け可能。クールタイムはなく、複数の敵を倒した場合もそれぞれの分だけ発動する。自分以外が倒した敵にも有効","tags":["敵を倒した時","アーツ"],"occurrence":"両方あり","sortOrder":110,"category":"スキル/アーツ"},{"name":"敵を倒した時、アーツゲージ増加+1","amount":"敵撃破時のアーツゲージ+約6.5%","calc":"乗算","stackable":false,"target":"アーツゲージ","conditional":true,"condition":"敵を倒した時","importance":8,"note":"無印とは重ね掛け可能。クールタイムはなく、複数の敵を倒した場合もそれぞれの分だけ発動する。自分以外が倒した敵にも有効","tags":["敵を倒した時","アーツ"],"occurrence":"深層のみ","sortOrder":111,"category":"スキル/アーツ"},{"name":"致命の一撃で、アーツゲージ増加","amount":"アーツゲージ+約5%","calc":"乗算","stackable":false,"target":"アーツゲージ","conditional":true,"condition":"致命の一撃時","importance":3,"note":"1回あたり自然回復で約16.75秒短縮相当。+1とは重ね掛け可能。致命の一撃モーション開始時に固定5%加算され、その後、致命の一撃による通常のアーツゲージ蓄積が入る","tags":["致命","アーツ","妖刀","近接"],"occurrence":"両方あり","sortOrder":112,"category":"スキル/アーツ"},{"name":"致命の一撃で、アーツゲージ増加+1","amount":"アーツゲージ+約6.5%","calc":"乗算","stackable":false,"target":"アーツゲージ","conditional":true,"condition":"致命の一撃時","importance":4,"note":"無印とは重ね掛け可能。致命の一撃モーション開始時に固定5%加算され、その後、致命の一撃による通常のアーツゲージ蓄積が入る","tags":["致命","アーツ","妖刀","近接"],"occurrence":"深層のみ","sortOrder":113,"category":"スキル/アーツ"},{"name":"ガード成功時、アーツゲージ増加","amount":"アーツゲージ+約1%","calc":"乗算","stackable":false,"target":"アーツゲージ","conditional":true,"condition":"ガード成功時","importance":7,"note":"1回あたり自然回復で約3.35秒短縮相当。+1とは重ね掛け可能。クールタイムはなく、連続攻撃をガードした場合もそれぞれの分だけ発動する。【執行者】スキルの弾きでも発動するが、ガードを崩された場合は発動しない","tags":["ガード","アーツ","守護者"],"occurrence":"両方あり","sortOrder":114,"category":"スキル/アーツ"},{"name":"ガード成功時、アーツゲージ増加+1","amount":"アーツゲージ+約1.5%","calc":"乗算","stackable":false,"target":"アーツゲージ","conditional":true,"condition":"ガード成功時","importance":8,"note":"無印とは重ね掛け可能。クールタイムはなく、連続攻撃をガードした場合もそれぞれの分だけ発動する。【執行者】スキルの弾きでも発動するが、ガードを崩された場合は発動しない","tags":["ガード","アーツ","守護者"],"occurrence":"深層のみ","sortOrder":115,"category":"スキル/アーツ"},{"name":"魔術/祈祷、効果時間延長","amount":"効果時間+50%","calc":"加算","stackable":false,"target":"魔術/祈祷、効果時間","conditional":false,"condition":"-","importance":2,"note":"付帯効果や潜在する力の同効果と重複可(加算式)","tags":["魔術","祈祷","FP"],"occurrence":"通常のみ","sortOrder":116,"category":"魔術/祈祷"},{"name":"輝剣の魔術を強化","amount":"輝剣の魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"輝剣の魔術を強化","conditional":false,"condition":"-","importance":6,"note":null,"tags":["魔術","FP","輝剣","魔力攻撃"],"occurrence":"両方あり","sortOrder":117,"category":"魔術/祈祷"},{"name":"石掘りの魔術を強化","amount":"石掘りの魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"石掘りの魔術を強化","conditional":false,"condition":"-","importance":2,"note":null,"tags":["魔術","FP","魔力攻撃","石堀"],"occurrence":"両方あり","sortOrder":118,"category":"魔術/祈祷"},{"name":"カーリアの剣の魔術を強化","amount":"カーリアの剣の魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"カーリアの剣の魔術を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["魔術","FP","魔力攻撃","カーリア"],"occurrence":"両方あり","sortOrder":119,"category":"魔術/祈祷"},{"name":"不可視の魔術を強化","amount":"不可視の魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"不可視の魔術を強化","conditional":false,"condition":"-","importance":6,"note":null,"tags":["魔術","FP","魔力攻撃","不可視の魔術"],"occurrence":"両方あり","sortOrder":120,"category":"魔術/祈祷"},{"name":"結晶人の魔術を強化","amount":"結晶人の魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"結晶人の魔術を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["魔術","FP","魔力攻撃","結晶"],"occurrence":"両方あり","sortOrder":121,"category":"魔術/祈祷"},{"name":"重力の魔術を強化","amount":"重力の魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"重力の魔術を強化","conditional":false,"condition":"-","importance":6,"note":null,"tags":["魔術","FP","魔力攻撃","重力"],"occurrence":"両方あり","sortOrder":122,"category":"魔術/祈祷"},{"name":"茨の魔術を強化","amount":"茨の魔術を強化+12.0%","calc":"乗算","stackable":true,"target":"茨の魔術を強化","conditional":false,"condition":"-","importance":2,"note":null,"tags":["魔術","FP","茨","神秘","出血","出血耐性"],"occurrence":"両方あり","sortOrder":123,"category":"魔術/祈祷"},{"name":"黄金律原理主義の祈祷を強化","amount":"黄金律原理主義の祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"黄金律原理主義の祈祷を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["祈祷","FP","聖攻撃","黄金律"],"occurrence":"両方あり","sortOrder":124,"category":"魔術/祈祷"},{"name":"王都古竜信仰の祈祷を強化","amount":"王都古竜信仰の祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"王都古竜信仰の祈祷を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["祈祷","FP","雷攻撃","王都古竜"],"occurrence":"両方あり","sortOrder":125,"category":"魔術/祈祷"},{"name":"巨人の火の祈祷を強化","amount":"巨人の火の祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"巨人の火の祈祷を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["祈祷","FP","炎攻撃","巨人の火"],"occurrence":"両方あり","sortOrder":126,"category":"魔術/祈祷"},{"name":"神狩りの祈祷を強化","amount":"神狩りの祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"神狩りの祈祷を強化","conditional":false,"condition":"-","importance":3,"note":null,"tags":["祈祷","FP","炎攻撃","神狩り"],"occurrence":"両方あり","sortOrder":127,"category":"魔術/祈祷"},{"name":"獣の祈祷を強化","amount":"獣の祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"獣の祈祷を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["祈祷","FP","物理攻撃","獣爪"],"occurrence":"両方あり","sortOrder":128,"category":"魔術/祈祷"},{"name":"狂い火の祈祷を強化","amount":"狂い火の祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"狂い火の祈祷を強化","conditional":false,"condition":"-","importance":10,"note":null,"tags":["祈祷","FP","炎攻撃","神秘","発狂","発狂耐性"],"occurrence":"両方あり","sortOrder":129,"category":"魔術/祈祷"},{"name":"竜餐の祈祷を強化","amount":"竜餐の祈祷を強化+12.0%","calc":"乗算","stackable":true,"target":"竜餐の祈祷を強化","conditional":false,"condition":"-","importance":3,"note":null,"tags":["祈祷","FP","物理攻撃","魔力攻撃","竜餐"],"occurrence":"両方あり","sortOrder":130,"category":"魔術/祈祷"},{"name":"物理カット率上昇","amount":"物理属性カット率+8%","calc":"乗算","stackable":true,"target":"物理カット率","conditional":false,"condition":"-","importance":1,"note":null,"tags":["カット","物理カット"],"occurrence":"通常のみ","sortOrder":131,"category":"カット率"},{"name":"物理カット率上昇+1","amount":"物理属性カット率+10%","calc":"乗算","stackable":true,"target":"物理カット率","conditional":false,"condition":"-","importance":2,"note":null,"tags":["カット","物理カット"],"occurrence":"深層のみ","sortOrder":132,"category":"カット率"},{"name":"物理カット率上昇+2","amount":"物理属性カット率+13%","calc":"乗算","stackable":true,"target":"物理カット率","conditional":false,"condition":"-","importance":3,"note":null,"tags":["カット","物理カット"],"occurrence":"深層のみ","sortOrder":133,"category":"カット率"},{"name":"属性カット率上昇","amount":"属性カット率+7%","calc":"乗算","stackable":true,"target":"属性カット率","conditional":false,"condition":"-","importance":1,"note":null,"tags":["カット","属性カット"],"occurrence":"両方あり","sortOrder":134,"category":"カット率"},{"name":"属性カット率上昇+1","amount":"属性カット率+12%","calc":"乗算","stackable":true,"target":"属性カット率","conditional":false,"condition":"-","importance":2,"note":null,"tags":["カット","属性カット"],"occurrence":"深層のみ","sortOrder":135,"category":"カット率"},{"name":"属性カット率上昇+2","amount":"属性カット率+14%","calc":"乗算","stackable":true,"target":"属性カット率","conditional":false,"condition":"-","importance":3,"note":null,"tags":["カット","属性カット"],"occurrence":"深層のみ","sortOrder":136,"category":"カット率"},{"name":"魔力カット率上昇","amount":"魔力属性カット率+10%","calc":"乗算","stackable":true,"target":"魔力カット率","conditional":false,"condition":"-","importance":1,"note":null,"tags":["カット","魔力カット","グノスター","マリス"],"occurrence":"両方あり","sortOrder":137,"category":"カット率"},{"name":"魔力カット率上昇+1","amount":"魔力属性カット率+16%","calc":"乗算","stackable":true,"target":"魔力カット率","conditional":false,"condition":"-","importance":2,"note":null,"tags":["カット","魔力カット","グノスター","マリス"],"occurrence":"深層のみ","sortOrder":138,"category":"カット率"},{"name":"魔力カット率上昇+2","amount":"魔力属性カット率+18%","calc":"乗算","stackable":true,"target":"魔力カット率","conditional":false,"condition":"-","importance":3,"note":null,"tags":["カット","魔力カット","グノスター","マリス"],"occurrence":"深層のみ","sortOrder":139,"category":"カット率"},{"name":"炎カット率上昇","amount":"炎属性カット率+10%","calc":"乗算","stackable":true,"target":"炎カット率","conditional":false,"condition":"-","importance":1,"note":null,"tags":["カット","炎カット","グラディウス"],"occurrence":"両方あり","sortOrder":140,"category":"カット率"},{"name":"炎カット率上昇+1","amount":"炎属性カット率+16%","calc":"乗算","stackable":true,"target":"炎カット率","conditional":false,"condition":"-","importance":2,"note":null,"tags":["カット","炎カット","グラディウス"],"occurrence":"深層のみ","sortOrder":141,"category":"カット率"},{"name":"炎カット率上昇+2","amount":"炎属性カット率+18%","calc":"乗算","stackable":true,"target":"炎カット率","conditional":false,"condition":"-","importance":3,"note":null,"tags":["カット","炎カット","グラディウス"],"occurrence":"深層のみ","sortOrder":142,"category":"カット率"},{"name":"雷カット率上昇","amount":"雷属性カット率+10%","calc":"乗算","stackable":true,"target":"雷カット率","conditional":false,"condition":"-","importance":1,"note":null,"tags":["カット","雷カット","フルゴール"],"occurrence":"両方あり","sortOrder":143,"category":"カット率"},{"name":"雷カット率上昇+1","amount":"雷属性カット率+16%","calc":"乗算","stackable":true,"target":"雷カット率","conditional":false,"condition":"-","importance":2,"note":null,"tags":["カット","雷カット","フルゴール"],"occurrence":"深層のみ","sortOrder":144,"category":"カット率"},{"name":"雷カット率上昇+2","amount":"雷属性カット率+18%","calc":"乗算","stackable":true,"target":"雷カット率","conditional":false,"condition":"-","importance":3,"note":null,"tags":["カット","雷カット","フルゴール"],"occurrence":"深層のみ","sortOrder":145,"category":"カット率"},{"name":"聖カット率上昇","amount":"聖属性カット率+10%","calc":"乗算","stackable":true,"target":"聖カット率","conditional":false,"condition":"-","importance":1,"note":null,"tags":["カット","聖カット","リブラ"],"occurrence":"両方あり","sortOrder":146,"category":"カット率"},{"name":"聖カット率上昇+1","amount":"聖属性カット率+16%","calc":"乗算","stackable":true,"target":"聖カット率","conditional":false,"condition":"-","importance":2,"note":null,"tags":["カット","聖カット","リブラ"],"occurrence":"深層のみ","sortOrder":147,"category":"カット率"},{"name":"聖カット率上昇+2","amount":"聖属性カット率+18%","calc":"乗算","stackable":true,"target":"聖カット率","conditional":false,"condition":"-","importance":3,"note":null,"tags":["カット","聖カット","リブラ"],"occurrence":"深層のみ","sortOrder":148,"category":"カット率"},{"name":"HP低下時、カット率上昇","amount":"全属性カット率+15%","calc":"乗算","stackable":true,"target":"全属性カット率","conditional":true,"condition":"HP低下時","importance":4,"note":"特殊効果には「物理カット率上昇」と出るが、実際には全属性のカット率が上昇.HP40%未満の状態でのみ発動.HP40%未満である限り永続","tags":["低下時","カット"],"occurrence":"両方あり","sortOrder":149,"category":"カット率"},{"name":"ダメージで吹き飛ばされた時、強靭度とカット率上昇","amount":"全属性カット率+20%,強靭度+20%(20秒)","calc":"カット率：乗算\n強靭度：加算","stackable":false,"target":"全属性カット率,強靭度","conditional":true,"condition":"ダメージで吹き飛ばされた時","importance":4,"note":"ダメージの有無に関わらず盾受け時の吹き飛びでは発動しない.吹き飛ばし効果のある攻撃を受けても、戦技「我慢」などを使用して吹き飛ばなかった場合は効果が発動しない.無頼漢のスキル使用時のみ、吹き飛ばし効果のある攻撃を受けて吹き飛ばなかった場合にも発動","tags":["カット","強靭","被ダメージ"],"occurrence":"両方あり","sortOrder":150,"category":"カット率"},{"name":"毒耐性上昇","amount":"毒耐性+75","calc":"加算","stackable":true,"target":"毒耐性","conditional":false,"condition":"-","importance":1,"note":"加算で計算","tags":["状態異常耐性","毒耐性","グノスター"],"occurrence":"両方あり","sortOrder":151,"category":"状態異常耐性"},{"name":"毒耐性上昇+1","amount":"毒耐性+110","calc":"加算","stackable":true,"target":"毒耐性","conditional":false,"condition":"-","importance":2,"note":"加算で計算","tags":["状態異常耐性","毒耐性","グノスター"],"occurrence":"深層のみ","sortOrder":152,"category":"状態異常耐性"},{"name":"腐敗耐性上昇","amount":"腐敗耐性+75","calc":"加算","stackable":true,"target":"腐敗耐性","conditional":false,"condition":"-","importance":1,"note":"加算で計算","tags":["状態異常耐性","腐敗耐性","ストラゲス"],"occurrence":"両方あり","sortOrder":153,"category":"状態異常耐性"},{"name":"腐敗耐性上昇+1","amount":"腐敗耐性+110","calc":"加算","stackable":true,"target":"腐敗耐性","conditional":false,"condition":"-","importance":2,"note":"加算で計算","tags":["状態異常耐性","腐敗耐性","ストラゲス"],"occurrence":"深層のみ","sortOrder":154,"category":"状態異常耐性"},{"name":"出血耐性上昇","amount":"出血耐性+75","calc":"加算","stackable":true,"target":"出血耐性","conditional":false,"condition":"-","importance":3,"note":"加算で計算","tags":["状態異常耐性","出血耐性","エデレ"],"occurrence":"両方あり","sortOrder":155,"category":"状態異常耐性"},{"name":"出血耐性上昇+1","amount":"出血耐性+110","calc":"加算","stackable":true,"target":"出血耐性","conditional":false,"condition":"-","importance":3,"note":"加算で計算","tags":["状態異常耐性","出血耐性","エデレ"],"occurrence":"深層のみ","sortOrder":156,"category":"状態異常耐性"},{"name":"冷気耐性上昇","amount":"冷気耐性+75","calc":"加算","stackable":true,"target":"冷気耐性","conditional":false,"condition":"-","importance":1,"note":"加算で計算","tags":["状態異常耐性","冷気耐性","カリゴ"],"occurrence":"両方あり","sortOrder":157,"category":"状態異常耐性"},{"name":"冷気耐性上昇+1","amount":"冷気耐性+110","calc":"加算","stackable":true,"target":"冷気耐性","conditional":false,"condition":"-","importance":2,"note":"加算で計算","tags":["状態異常耐性","冷気耐性","カリゴ"],"occurrence":"深層のみ","sortOrder":158,"category":"状態異常耐性"},{"name":"睡眠耐性上昇","amount":"睡眠耐性+75","calc":"加算","stackable":true,"target":"睡眠耐性","conditional":false,"condition":"-","importance":3,"note":"加算で計算","tags":["状態異常耐性","睡眠耐性","マリス"],"occurrence":"両方あり","sortOrder":159,"category":"状態異常耐性"},{"name":"睡眠耐性上昇+1","amount":"睡眠耐性+110","calc":"加算","stackable":true,"target":"睡眠耐性","conditional":false,"condition":"-","importance":3,"note":"加算で計算","tags":["状態異常耐性","睡眠耐性","マリス"],"occurrence":"深層のみ","sortOrder":160,"category":"状態異常耐性"},{"name":"発狂耐性上昇","amount":"発狂耐性+75","calc":"加算","stackable":true,"target":"発狂耐性","conditional":false,"condition":"-","importance":1,"note":"加算で計算","tags":["状態異常耐性","発狂耐性","リブラ"],"occurrence":"両方あり","sortOrder":161,"category":"状態異常耐性"},{"name":"発狂耐性上昇+1","amount":"発狂耐性+110","calc":"加算","stackable":true,"target":"発狂耐性","conditional":false,"condition":"-","importance":2,"note":"加算で計算","tags":["状態異常耐性","発狂耐性","リブラ"],"occurrence":"深層のみ","sortOrder":162,"category":"状態異常耐性"},{"name":"抗死耐性上昇","amount":"抗死耐性+75","calc":"加算","stackable":true,"target":"抗死耐性","conditional":false,"condition":"-","importance":1,"note":"加算で計算","tags":["状態異常耐性","抗死耐性"],"occurrence":"両方あり","sortOrder":163,"category":"状態異常耐性"},{"name":"抗死耐性上昇+1","amount":"抗死耐性+110","calc":"加算","stackable":true,"target":"抗死耐性","conditional":false,"condition":"-","importance":2,"note":"加算で計算","tags":["状態異常耐性","抗死耐性"],"occurrence":"深層のみ","sortOrder":164,"category":"状態異常耐性"},{"name":"HP持続回復","amount":"毎秒2のHP回復","calc":"加算","stackable":true,"target":"HP","conditional":false,"condition":"-","importance":7,"note":null,"tags":["HP","リゲイン","生存"],"occurrence":"通常のみ","sortOrder":165,"category":"回復"},{"name":"HP低下時、周囲の味方を含めHPをゆっくりと回復","amount":"毎秒([最大HPの0.5%]+1)HP回復(50秒)","calc":"計算しない","stackable":false,"target":"HP","conditional":true,"condition":"HP低下時","importance":6,"note":"残りHP40%以下時、自身と周囲の味方にHP持続回復。発動後はHPが40%以上になっても持続","tags":["HP","低下時","リゲイン","味方"],"occurrence":"両方あり","sortOrder":166,"category":"回復"},{"name":"ガード成功時、HP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"ガード成功時","importance":7,"note":"クールタイムあり。【執行者】スキルの弾きでも発動する。潜在する力の同効果とは重複可能","tags":["HP","ガード","リゲイン"],"occurrence":"両方あり","sortOrder":167,"category":"回復"},{"name":"刺突カウンター発生時、HP回復","amount":"最大HPの2.5%分HP回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"刺突カウンター時","importance":4,"note":"弓や投げ矢などの飛び道具でも発動する.※+値が違えば重複可","tags":["HP","刺突カウンター","リゲイン"],"occurrence":"両方あり","sortOrder":168,"category":"回復"},{"name":"刺突カウンター発生時、HP回復+1","amount":"最大HPの3.3%分HP回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"刺突カウンター時","importance":5,"note":"弓や投げ矢などの飛び道具でも発動する.※+値が違えば重複可","tags":["HP","刺突カウンター","リゲイン"],"occurrence":"深層のみ","sortOrder":169,"category":"回復"},{"name":"ダメージを受けた直後、攻撃によりHPの一部を回復","amount":"HP回復+回復量の0%追加で回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"被ダメージ直後の攻撃時","importance":5,"note":"※+値が違えば重複可.無印はリゲイン有効化のみのため無印との重複は無意味","tags":["HP","被ダメージ","リゲイン"],"occurrence":"両方あり","sortOrder":170,"category":"回復"},{"name":"ダメージを受けた直後、攻撃によりHPの一部を回復+1","amount":"HP回復+回復量の25%追加で回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"被ダメージ直後の攻撃時","importance":6,"note":"※+値が違えば重複可.無印はリゲイン有効化のみのため無印との重複は無意味","tags":["HP","被ダメージ","リゲイン"],"occurrence":"深層のみ","sortOrder":171,"category":"回復"},{"name":"ダメージを受けた直後、攻撃によりHPの一部を回復+2","amount":"HP回復+回復量の35%追加で回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"被ダメージ直後の攻撃時","importance":10,"note":"※+値が違えば重複可.無印はリゲイン有効化のみのため無印との重複は無意味","tags":["HP","被ダメージ","リゲイン"],"occurrence":"深層のみ","sortOrder":172,"category":"回復"},{"name":"苔薬などのアイテム使用でHP回復","amount":"HPを50回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"対象アイテム使用時","importance":4,"note":"※+値が違えば重複可.対象は苔薬7種、鳥脚2種、ゆで2種、亀首漬け、勇者の肉塊","tags":["HP","アイテム","リゲイン"],"occurrence":"両方あり","sortOrder":173,"category":"回復"},{"name":"苔薬などのアイテム使用でHP回復+1","amount":"HPを80回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"対象アイテム使用時","importance":5,"note":"※+値が違えば重複可.対象は苔薬7種、鳥脚2種、ゆで3種、亀首漬け、勇者の肉塊","tags":["HP","アイテム","リゲイン"],"occurrence":"深層のみ","sortOrder":174,"category":"回復"},{"name":"周囲で腐敗状態の発生時、HP持続回復","amount":"毎秒([最大HPの0.15%]+15)HP回復(15秒)","calc":"計算しない","stackable":false,"target":"HP","conditional":true,"condition":"周囲で腐敗発生時","importance":4,"note":"周囲で腐敗状態が発生した時に発動する（計11回）","tags":["HP","腐敗","リゲイン","ストラゲス"],"occurrence":"通常のみ","sortOrder":175,"category":"回復"},{"name":"聖杯瓶の回復量上昇","amount":"聖杯瓶の回復量+10%","calc":"乗算","stackable":true,"target":"聖杯瓶の回復量","conditional":false,"condition":"-","importance":6,"note":null,"tags":["HP","聖杯瓶","リゲイン"],"occurrence":"深層のみ","sortOrder":176,"category":"回復"},{"name":"消費FP軽減","amount":"消費FPより-7%","calc":"乗算","stackable":true,"target":"消費FP","conditional":false,"condition":"-","importance":10,"note":"重ね掛けた分だけ消費量に0.93を乗算. 小数点以下が0.23以上なら繰り上げ(0.23未満なら切り捨て)","tags":["FP","魔術","祈祷","戦技"],"occurrence":"深層のみ","sortOrder":177,"category":"回復"},{"name":"FP持続回復","amount":"5秒ごとにFPを1回復","calc":"加算","stackable":false,"target":"FP","conditional":false,"condition":"-","importance":5,"note":null,"tags":["FP","魔術","祈祷"],"occurrence":"通常のみ","sortOrder":178,"category":"回復"},{"name":"攻撃連続時、FP回復","amount":"最大FPの5%分FP回復","calc":"計算しない","stackable":null,"target":"FP","conditional":true,"condition":"攻撃連続時","importance":7,"note":"射撃・魔術・祈祷・飛び道具などは対象外。/射撃・魔術・祈祷・飛び道具などは対象外。","tags":["FP","攻撃連続","近接","曲剣"],"occurrence":"通常のみ","sortOrder":179,"category":"回復"},{"name":"発狂状態になると、FP持続回復","amount":"25秒間、毎秒FPを2ずつ回復（合計50FP回復）","calc":"加算","stackable":true,"target":"FP","conditional":true,"condition":"発狂時","importance":1,"note":"発狂時のFPダメージは免除されない。魔の夜と魔の暗き夜で重ね掛け可能（合計100回復）","tags":["FP","発狂","リブラ"],"occurrence":"通常のみ","sortOrder":180,"category":"回復"},{"name":"攻撃命中時、スタミナ回復","amount":"スタミナを2回復","calc":"加算","stackable":false,"target":"スタミナ","conditional":true,"condition":"攻撃命中時","importance":6,"note":"魔術・祈祷・混成魔法以外のすべての攻撃で発動する。※+値が違えば重複可.","tags":["スタミナ","近接","攻撃連続","リゲイン"],"occurrence":"両方あり","sortOrder":181,"category":"回復"},{"name":"攻撃命中時、スタミナ回復+1","amount":"スタミナを3回復","calc":"加算","stackable":false,"target":"スタミナ","conditional":true,"condition":"攻撃命中時","importance":5,"note":"魔術・祈祷・混成魔法以外のすべての攻撃で発動する。※+値が違えば重複可.","tags":["スタミナ","近接","攻撃連続","リゲイン"],"occurrence":"両方あり","sortOrder":182,"category":"回復"},{"name":"致命の一撃で、スタミナ回復速度上昇","amount":"15秒間スタミナ回復速度+約15%","calc":"乗算","stackable":false,"target":"スタミナ回復速度","conditional":true,"condition":"致命の一撃時","importance":4,"note":"致命の一撃モーション開始時から付与される.※+値が違えば重複可.","tags":["スタミナ","致命","リゲイン"],"occurrence":"両方あり","sortOrder":183,"category":"回復"},{"name":"致命の一撃で、スタミナ回復速度上昇+1","amount":"15秒間スタミナ回復速度+約25%","calc":"乗算","stackable":false,"target":"スタミナ回復速度","conditional":true,"condition":"致命の一撃時","importance":4,"note":"致命の一撃モーション開始時から付与される.※+値が違えば重複可.","tags":["スタミナ","致命","リゲイン"],"occurrence":"深層のみ","sortOrder":184,"category":"回復"},{"name":"致命の一撃で、ルーンを取得","amount":"600ルーン取得（1回ごと）","calc":"加算","stackable":false,"target":"ルーン","conditional":true,"condition":"致命の一撃時","importance":4,"note":null,"tags":["致命","ルーン"],"occurrence":"両方あり","sortOrder":185,"category":"アクション"},{"name":"武器の持ち替え時、いずれかの属性攻撃力を付加","amount":"魔力・炎・雷・聖のいずれかの属性攻撃力+10（10秒）","calc":"乗算","stackable":false,"target":"いずれかの攻撃力","conditional":true,"condition":"武器持ち替え時","importance":3,"note":"武器を切り替えた時に発動する。【執行者】スキル「妖刀」はエンチャントできない","tags":["属性攻撃","持ち替え"],"occurrence":"通常のみ","sortOrder":186,"category":"アクション"},{"name":"被ダメージ時、腐敗の状態異常を付加","amount":"右手武器に腐敗蓄積量+25（12.5秒）","calc":"加算","stackable":false,"target":"右手武器の腐敗蓄積量","conditional":true,"condition":"被ダメージ時","importance":7,"note":"被ダメージ時に発動する","tags":["被ダメージ","腐敗","神秘"],"occurrence":"通常のみ","sortOrder":187,"category":"アクション"},{"name":"ガード中、敵に狙われやすくなる","amount":"約0.5秒以上のガード継続で敵に狙われやすくなる","calc":"計算しない","stackable":false,"target":"狙われやすさ","conditional":true,"condition":"ガード中","importance":5,"note":"盾・武器でのガード、ハイガード、ガード攻撃が対象。ガードが途切れると約4秒後に解除される。祈祷「シャブリリの叫び」と重ね掛け可能","tags":["ガード","狙われやすさ"],"occurrence":"両方あり","sortOrder":188,"category":"アクション"},{"name":"ジェスチャー「あぐら」により、発狂が蓄積","amount":"姿勢を戻すまで発狂を高速蓄積","calc":"計算しない","stackable":true,"target":"発狂蓄積量","conditional":true,"condition":"あぐら時","importance":1,"note":"「あぐら」は小壺商人から購入できる。執行者LV15では、使用から蓄積開始まで約5秒、発症まで約1秒の合計約6秒","tags":["あぐら","発狂"],"occurrence":"通常のみ","sortOrder":189,"category":"アクション"},{"name":"カット率低下時、稀に敵から受ける攻撃を無効化","amount":"確率で被ダメージを無効化","calc":"計算しない","stackable":false,"target":"まれに敵の攻撃無効化","conditional":true,"condition":"カット率低下時","importance":10,"note":"常時発動型のカット率低下や、水場の雷カット率低下などの地形効果も対象。","tags":["カット","低下時"],"occurrence":"通常のみ","sortOrder":190,"category":"アクション"},{"name":"毒状態の敵に対する攻撃を強化","amount":"攻撃力+10%（20秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"毒状態の敵に対して攻撃","importance":8,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","毒","状態異常","鉄の目","エデレ"],"occurrence":"両方あり","sortOrder":191,"category":"アクション"},{"name":"毒状態の敵に対する攻撃を強化+1","amount":"攻撃力+16%（20秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"毒状態の敵に対して攻撃","importance":9,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","毒","状態異常","鉄の目","エデレ"],"occurrence":"深層のみ","sortOrder":192,"category":"アクション"},{"name":"毒状態の敵に対する攻撃を強化+2","amount":"攻撃力+20%（20秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"毒状態の敵に対して攻撃","importance":10,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","毒","状態異常","鉄の目","エデレ"],"occurrence":"深層のみ","sortOrder":193,"category":"アクション"},{"name":"腐敗状態の敵に対する攻撃を強化","amount":"攻撃力+10%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"腐敗状態の敵に対して攻撃","importance":4,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","腐敗","状態異常"],"occurrence":"両方あり","sortOrder":194,"category":"アクション"},{"name":"腐敗状態の敵に対する攻撃を強化+1","amount":"攻撃力+16%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"腐敗状態の敵に対して攻撃","importance":4,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","腐敗","状態異常"],"occurrence":"深層のみ","sortOrder":195,"category":"アクション"},{"name":"腐敗状態の敵に対する攻撃を強化+2","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"腐敗状態の敵に対して攻撃","importance":5,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","腐敗","状態異常"],"occurrence":"深層のみ","sortOrder":196,"category":"アクション"},{"name":"凍傷状態の敵に対する攻撃を強化","amount":"攻撃力+10%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"凍傷状態の敵に対して攻撃","importance":6,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","冷気","状態異常","鉄の目"],"occurrence":"両方あり","sortOrder":197,"category":"アクション"},{"name":"凍傷状態の敵に対する攻撃を強化+1","amount":"攻撃力+16%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"凍傷状態の敵に対して攻撃","importance":7,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","冷気","状態異常","鉄の目"],"occurrence":"深層のみ","sortOrder":198,"category":"アクション"},{"name":"凍傷状態の敵に対する攻撃を強化+2","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"凍傷状態の敵に対して攻撃","importance":8,"note":"※+値が違えば重複可.魔術・祈祷や属性攻撃も対象","tags":["近接","冷気","状態異常","鉄の目"],"occurrence":"深層のみ","sortOrder":199,"category":"アクション"},{"name":"周囲で毒/腐敗状態の発生時、攻撃力上昇","amount":"攻撃力+12%（20秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"周囲で毒,腐敗発生時","importance":7,"note":"周囲で毒または腐敗状態が発生した時に発動する","tags":["近接","毒","腐敗","状態異常","ストラゲス"],"occurrence":"通常のみ","sortOrder":200,"category":"アクション"},{"name":"周囲で凍傷状態の発生時、自身の姿を隠す","amount":"敵から見えにくくなり、足音を完全に消す（約6秒）","calc":"計算しない","stackable":false,"target":"-","conditional":true,"condition":"周囲で凍傷発生時","importance":8,"note":"周囲で凍傷状態が発生した時に発動する","tags":["冷気","状態異常","隠密","カリゴ"],"occurrence":"通常のみ","sortOrder":201,"category":"アクション"},{"name":"周囲で睡眠状態の発生時、攻撃力上昇","amount":"攻撃力+12.0%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"周囲で睡眠発生時","importance":1,"note":null,"tags":["睡眠","状態異常","マリス"],"occurrence":"両方あり","sortOrder":202,"category":"アクション"},{"name":"周囲で睡眠状態の発生時、攻撃力上昇+1","amount":"攻撃力+22.0%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"周囲で睡眠発生時","importance":2,"note":null,"tags":["睡眠","状態異常","マリス"],"occurrence":"深層のみ","sortOrder":203,"category":"アクション"},{"name":"周囲で発狂状態の発生時、攻撃力上昇","amount":"攻撃力+約12%（20秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"周囲で発狂発狂時","importance":4,"note":null,"tags":["発狂","状態異常","リブラ"],"occurrence":"両方あり","sortOrder":204,"category":"アクション"},{"name":"周囲で発狂状態の発生時、攻撃力上昇+1","amount":"攻撃力+約22%（20秒）","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"周囲で発狂発狂時","importance":5,"note":null,"tags":["発狂","状態異常","リブラ"],"occurrence":"深層のみ","sortOrder":205,"category":"アクション"},{"name":"出撃時の武器の戦技を「我慢」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["戦技","ガード"],"occurrence":"通常のみ","sortOrder":206,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「クイックステップ」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["戦技","回避"],"occurrence":"通常のみ","sortOrder":207,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「嵐脚」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["戦技","近接"],"occurrence":"通常のみ","sortOrder":208,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「デターミネーション」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["戦技","バフ"],"occurrence":"通常のみ","sortOrder":209,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「輝剣の円陣」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["戦技","魔力攻撃"],"occurrence":"通常のみ","sortOrder":210,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「グラビタス」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["戦技","魔力攻撃"],"occurrence":"通常のみ","sortOrder":211,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「炎撃」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":9,"note":null,"tags":["戦技","炎攻撃","カリゴ"],"occurrence":"通常のみ","sortOrder":212,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「溶岩噴火」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","炎攻撃","カリゴ"],"occurrence":"通常のみ","sortOrder":213,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「落雷」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["戦技","雷攻撃","フルゴール"],"occurrence":"通常のみ","sortOrder":214,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「雷撃斬」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["戦技","雷攻撃","フルゴール"],"occurrence":"通常のみ","sortOrder":215,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「聖なる刃」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","聖攻撃","グラディウス"],"occurrence":"通常のみ","sortOrder":216,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「祈りの一撃」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","聖攻撃","グラディウス"],"occurrence":"通常のみ","sortOrder":217,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「毒の霧」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","毒","神秘","エデレ"],"occurrence":"通常のみ","sortOrder":218,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「毒蛾は二度舞う」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","毒","神秘","エデレ"],"occurrence":"通常のみ","sortOrder":219,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「血の刃」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","出血","神秘"],"occurrence":"通常のみ","sortOrder":220,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「切腹」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["戦技","出血","神秘"],"occurrence":"通常のみ","sortOrder":221,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「冷気の霧」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["戦技","冷気","神秘"],"occurrence":"通常のみ","sortOrder":222,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「霜踏み」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["戦技","冷気","神秘"],"occurrence":"通常のみ","sortOrder":223,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「白い影の誘い」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["戦技","隠密"],"occurrence":"通常のみ","sortOrder":224,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器の戦技を「アローレイン」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["戦技","弓","遠隔"],"occurrence":"通常のみ","sortOrder":225,"category":"出撃時の武器（戦技）"},{"name":"出撃時の武器に魔力攻撃力を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["魔力攻撃"],"occurrence":"通常のみ","sortOrder":226,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器に炎攻撃力を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["炎攻撃"],"occurrence":"通常のみ","sortOrder":227,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器に雷攻撃力を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["雷攻撃"],"occurrence":"通常のみ","sortOrder":228,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器に聖攻撃力を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["聖攻撃"],"occurrence":"通常のみ","sortOrder":229,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器に毒の状態異常を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["毒"],"occurrence":"通常のみ","sortOrder":230,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器に出血の状態異常を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["出血"],"occurrence":"通常のみ","sortOrder":231,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器に冷気の状態異常を付加","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["冷気"],"occurrence":"通常のみ","sortOrder":232,"category":"出撃時の武器（付加）"},{"name":"出撃時の武器の魔術を「魔術の輝剣」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["魔術","FP","魔力攻撃","輝剣"],"occurrence":"通常のみ","sortOrder":233,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の魔術を「カーリアの大剣」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["魔術","FP","魔力攻撃","カーリア"],"occurrence":"通常のみ","sortOrder":234,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の魔術を「夜のつぶて」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["魔術","FP","魔力攻撃","不可視"],"occurrence":"通常のみ","sortOrder":235,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の魔術を「溶岩弾」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["魔術","FP","炎攻撃"],"occurrence":"通常のみ","sortOrder":236,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の魔術を「罰の茨」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["魔術","FP","出血","神秘","茨","出血耐性"],"occurrence":"通常のみ","sortOrder":237,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の祈祷を「黄金の怒り」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["祈祷","FP","聖攻撃","黄金律","グラディウス"],"occurrence":"通常のみ","sortOrder":238,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の祈祷を「雷の槍」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["祈祷","FP","雷攻撃","王都古竜","フルゴール","マリス"],"occurrence":"通常のみ","sortOrder":239,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の祈祷を「火よ！」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["祈祷","FP","炎攻撃","巨人の火","神狩り"],"occurrence":"通常のみ","sortOrder":240,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の祈祷を「獣爪」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["祈祷","FP","物理攻撃","獣爪"],"occurrence":"通常のみ","sortOrder":241,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時の武器の祈祷を「竜炎」にする","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["祈祷","FP","炎攻撃","竜餐"],"occurrence":"通常のみ","sortOrder":242,"category":"出撃時の武器（魔術/祈祷）"},{"name":"出撃時に「星光の欠片」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["FP","アイテム"],"occurrence":"通常のみ","sortOrder":243,"category":"出撃時のアイテム"},{"name":"出撃時に「火炎壺」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["炎攻撃","アイテム","壺"],"occurrence":"通常のみ","sortOrder":244,"category":"出撃時のアイテム"},{"name":"出撃時に「魔力壺」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["アイテム","壺"],"occurrence":"通常のみ","sortOrder":245,"category":"出撃時のアイテム"},{"name":"出撃時に「雷壺」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["アイテム","壺"],"occurrence":"通常のみ","sortOrder":246,"category":"出撃時のアイテム"},{"name":"出撃時に「聖水壺」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["アイテム","壺"],"occurrence":"通常のみ","sortOrder":247,"category":"出撃時のアイテム"},{"name":"出撃時に「骨の毒投げ矢」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["毒","アイテム","ナイフ"],"occurrence":"通常のみ","sortOrder":248,"category":"出撃時のアイテム"},{"name":"出撃時に「結晶投げ矢」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["アイテム","ナイフ"],"occurrence":"通常のみ","sortOrder":249,"category":"出撃時のアイテム"},{"name":"出撃時に「スローイングダガー」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["物理攻撃","アイテム","ナイフ"],"occurrence":"通常のみ","sortOrder":250,"category":"出撃時のアイテム"},{"name":"出撃時に「屑輝石」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["魔力攻撃","アイテム","石"],"occurrence":"通常のみ","sortOrder":251,"category":"出撃時のアイテム"},{"name":"出撃時に「塊の重力石」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["魔力攻撃","アイテム","石"],"occurrence":"通常のみ","sortOrder":252,"category":"出撃時のアイテム"},{"name":"出撃時に「誘惑の枝」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["アイテム","誘惑の枝"],"occurrence":"通常のみ","sortOrder":253,"category":"出撃時のアイテム"},{"name":"出撃時に「火花の香り」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["炎攻撃","アイテム","調香術"],"occurrence":"深層のみ","sortOrder":254,"category":"出撃時のアイテム"},{"name":"出撃時に「毒の噴霧」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["毒","アイテム"],"occurrence":"深層のみ","sortOrder":255,"category":"出撃時のアイテム"},{"name":"出撃時に「鉄壺の香薬」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["カット","アイテム"],"occurrence":"深層のみ","sortOrder":256,"category":"出撃時のアイテム"},{"name":"出撃時に「高揚の香り」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":9,"note":null,"tags":["バフ","アイテム"],"occurrence":"深層のみ","sortOrder":257,"category":"出撃時のアイテム"},{"name":"出撃時に「酸の噴霧」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["カット","アイテム"],"occurrence":"深層のみ","sortOrder":258,"category":"出撃時のアイテム"},{"name":"出撃時に「狂熱の香薬」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["近接","アイテム"],"occurrence":"深層のみ","sortOrder":259,"category":"出撃時のアイテム"},{"name":"出撃時に「呪霊喚びの鈴」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["魔力攻撃","FP","アイテム"],"occurrence":"通常のみ","sortOrder":260,"category":"出撃時のアイテム"},{"name":"出撃時に「火脂」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["炎攻撃","アイテム","脂"],"occurrence":"通常のみ","sortOrder":261,"category":"出撃時のアイテム"},{"name":"出撃時に「魔力脂」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["魔力攻撃","アイテム","脂"],"occurrence":"通常のみ","sortOrder":262,"category":"出撃時のアイテム"},{"name":"出撃時に「雷脂」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["雷攻撃","アイテム","脂"],"occurrence":"通常のみ","sortOrder":263,"category":"出撃時のアイテム"},{"name":"出撃時に「聖脂」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["聖攻撃","アイテム","脂"],"occurrence":"通常のみ","sortOrder":264,"category":"出撃時のアイテム"},{"name":"出撃時に「盾脂」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["ガード","アイテム","脂"],"occurrence":"通常のみ","sortOrder":265,"category":"出撃時のアイテム"},{"name":"出撃時に「小さなポーチ」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["アイテム","ポーチ"],"occurrence":"両方あり","sortOrder":266,"category":"出撃時のアイテム"},{"name":"出撃時に「石剣の鍵」を持つ","amount":"記載しない","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["アイテム","封牢"],"occurrence":"両方あり","sortOrder":267,"category":"出撃時のアイテム"},{"name":"出撃時に「緋色の結晶雫」を持つ","amount":"最大HPの70%回復","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","HP"],"occurrence":"深層のみ","sortOrder":268,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「緋溢れの結晶雫」を持つ","amount":"最大HP1.2倍（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","HP"],"occurrence":"深層のみ","sortOrder":269,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「緋湧きの結晶雫」を持つ","amount":"毎秒7ずつHP回復（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","HP"],"occurrence":"深層のみ","sortOrder":270,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「青色の結晶雫」を持つ","amount":"FPを全回復","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","FP","魔術","祈祷"],"occurrence":"深層のみ","sortOrder":271,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「緑溢れの結晶雫」を持つ","amount":"最大スタミナ15%増加（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","スタミナ","リゲイン"],"occurrence":"深層のみ","sortOrder":272,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「緑湧きの結晶雫」を持つ","amount":"毎秒15ずつスタミナ回復","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","スタミナ","リゲイン"],"occurrence":"深層のみ","sortOrder":273,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「真珠色の硬雫」を持つ","amount":"被ダメージ15%カット","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","カット"],"occurrence":"深層のみ","sortOrder":274,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「斑彩色の硬雫」を持つ","amount":"状態異常耐性上昇（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","状態異常耐性"],"occurrence":"深層のみ","sortOrder":275,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「鉛色の硬雫」を持つ","amount":"怯まなくなる（10秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["出撃時アイテム","結晶雫","強靭"],"occurrence":"深層のみ","sortOrder":276,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「魔力纏いの割れ雫」を持つ","amount":"魔力攻撃力+20%（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","魔力攻撃"],"occurrence":"深層のみ","sortOrder":277,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「炎纏いの割れ雫」を持つ","amount":"炎攻撃力+20%（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","炎攻撃"],"occurrence":"深層のみ","sortOrder":278,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「雷纏いの割れ雫」を持つ","amount":"雷攻撃力+20%（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","雷攻撃"],"occurrence":"深層のみ","sortOrder":279,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「聖纏いの割れ雫」を持つ","amount":"聖攻撃力+20%（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","聖攻撃"],"occurrence":"深層のみ","sortOrder":280,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「岩棘の割れ雫」を持つ","amount":"強靭削り+30%（30秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","体勢崩し"],"occurrence":"深層のみ","sortOrder":281,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「大棘の割れ雫」を持つ","amount":"溜め攻撃+15%","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":"魔術/祈祷/戦技には効果なし","tags":["出撃時アイテム","結晶雫","溜め攻撃"],"occurrence":"深層のみ","sortOrder":282,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「連棘の割れ雫」を持つ","amount":"攻撃連続時、3段階（9%,13%,20%）で攻撃力増加","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["出撃時アイテム","結晶雫","攻撃連続"],"occurrence":"深層のみ","sortOrder":283,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「細枝の割れ雫」を持つ","amount":"死亡時ルーンを落とさず、レベルダウンも回避（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":3,"note":"蘇生ゲージ増加あり","tags":["出撃時アイテム","結晶雫","ルーン"],"occurrence":"深層のみ","sortOrder":284,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「風の結晶雫」を持つ","amount":"回避性能上昇、被ダメージ10%上昇","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["出撃時アイテム","結晶雫","回避"],"occurrence":"深層のみ","sortOrder":285,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「緋色の泡雫」を持つ","amount":"HP20%未満時、1度だけHP30%回復（180秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["出撃時アイテム","結晶雫","HP","低下時"],"occurrence":"深層のみ","sortOrder":286,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「緋色渦の泡雫」を持つ","amount":"属性ダメージ無効化、最大HPの5%を毎秒回復（15秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":8,"note":"物理ダメージは無効化できず、通常通りダメージを受ける。\n物理を含む複合属性攻撃の場合、属性部分のダメージ無効化、物理部分のダメージは通常通り受ける。","tags":["出撃時アイテム","結晶雫","HP","被ダメージ"],"occurrence":"深層のみ","sortOrder":287,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「真珠色の泡雫」を持つ","amount":"1度だけ被ダメージ90%カット（120秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","カット","生存"],"occurrence":"深層のみ","sortOrder":288,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「青色の秘雫」を持つ","amount":"すべてのFP消費がゼロになる（15秒）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["出撃時アイテム","結晶雫","カット","生存"],"occurrence":"深層のみ","sortOrder":289,"category":"出撃時のアイテム（結晶の雫）"},{"name":"出撃時に「破裂した結晶雫」を持つ","amount":"3秒後に自爆（900ダメージ）。（被ダメージ300）","calc":"計算しない","stackable":true,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["出撃時アイテム","結晶雫"],"occurrence":"深層のみ","sortOrder":290,"category":"出撃時のアイテム（結晶の雫）"},{"name":"埋もれ宝の位置を地図に表示","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["マップ","探索"],"occurrence":"両方あり","sortOrder":291,"category":"マップ環境"},{"name":"出撃中、ショップでの購入に必要なルーンが割引","amount":"10%割引（割引併用28%引き）","calc":"加算","stackable":false,"target":"割引ルーン","conditional":false,"condition":"-","importance":4,"note":null,"tags":["ルーン","ショップ"],"occurrence":"両方あり","sortOrder":292,"category":"マップ環境"},{"name":"出撃中、ショップでの購入に必要なルーンが大割引","amount":"20%割引（割引併用28%引き）","calc":"加算","stackable":false,"target":"割引ルーン","conditional":false,"condition":"-","importance":5,"note":null,"tags":["ルーン","ショップ"],"occurrence":"両方あり","sortOrder":293,"category":"マップ環境"},{"name":"自身と味方の取得ルーン増加","amount":"自身と味方の取得ルーン+3.5%","calc":"加算","stackable":true,"target":"自身と味方の取得ルーン","conditional":false,"condition":"-","importance":6,"note":null,"tags":["ルーン","味方"],"occurrence":"両方あり","sortOrder":294,"category":"チームメンバー"},{"name":"自身を除く、周囲の味方のスタミナ回復速度上昇","amount":"周囲の味方のスタミナ回復速度+4/秒","calc":"計算しない","stackable":false,"target":"周囲の味方のスタミナ回復速度","conditional":false,"condition":"-","importance":6,"note":"自身は対象外。効果範囲はローリング約3回分","tags":["スタミナ","味方","リゲイン"],"occurrence":"両方あり","sortOrder":295,"category":"チームメンバー"},{"name":"聖杯瓶の回復を、周囲の味方に分配","amount":"自身の聖杯瓶回復量-10%、味方は最大HPの30%回復","calc":"計算しない","stackable":false,"target":"聖杯瓶の回復量","conditional":false,"condition":"-","importance":7,"note":"復讐者の霊体も対象。効果範囲はローリング約4回分。聖杯瓶の回復量上昇は自身と分配先に各自の効果を適用。ゆっくり回復も分配され、その場合は自身が最大HPの80%、味方が最大HPの40%を回復する。ゆっくり回復時は本効果の-10%を含む聖杯瓶回復量の増減を受けない","tags":["聖杯瓶","味方","リゲイン"],"occurrence":"両方あり","sortOrder":296,"category":"チームメンバー"},{"name":"敵を倒した時、自身を除く周囲の味方のHPを回復","amount":"敵撃破ごとに周囲の味方のHPを20回復","calc":"計算しない","stackable":false,"target":"-","conditional":true,"condition":"敵を倒した時","importance":8,"note":"自身は対象外。自分以外が敵を倒した場合も発動","tags":["HP","味方","敵を倒した時"],"occurrence":"両方あり","sortOrder":297,"category":"チームメンバー"},{"name":"アイテムの効果が周囲の味方にも発動","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":"調香瓶・霊薬のバフ、脂系エンチャントは対象外。効果範囲はローリング約4回分。使用モーションが長くなるが、苔薬と星光の欠片は変化しない。星光の欠片による味方のFP回復量は最大FPの30%（通常60%）","tags":["アイテム","味方"],"occurrence":"両方あり","sortOrder":298,"category":"チームメンバー"},{"name":"【追跡者】アビリティ発動時、アーツゲージ増加","amount":"アビリティ回避発動後、アーツ+30％","calc":null,"stackable":false,"target":"アーツゲージ","conditional":true,"condition":"アビリティ発動時","importance":10,"note":null,"tags":[],"occurrence":"通常のみ","sortOrder":299,"category":"追跡者"},{"name":"【追跡者】スキル使用時、通常攻撃で炎を纏った追撃を行う（大剣のみ）","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["追跡者","炎攻撃","大剣"],"occurrence":"通常のみ","sortOrder":300,"category":"追跡者"},{"name":"【追跡者】スキルの使用回数+1","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["追跡者","スキル回数"],"occurrence":"通常のみ","sortOrder":301,"category":"追跡者"},{"name":"【追跡者】アーツ発動時、周囲を延焼","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["追跡者","炎攻撃","アーツ"],"occurrence":"通常のみ","sortOrder":302,"category":"追跡者"},{"name":"【追跡者】精神力上昇、生命力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["追跡者","FP","HP"],"occurrence":"両方あり","sortOrder":303,"category":"追跡者"},{"name":"【追跡者】知力/信仰上昇、筋力/技量低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["追跡者","知力","信仰","筋力","技量"],"occurrence":"両方あり","sortOrder":304,"category":"追跡者"},{"name":"【追跡者】スキルに、出血の状態異常を付加","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["追跡者","出血"],"occurrence":"通常のみ","sortOrder":305,"category":"追跡者"},{"name":"【守護者】アビリティ発動中、ガード成功時、衝撃波が発生","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","ガード"],"occurrence":"通常のみ","sortOrder":306,"category":"守護者"},{"name":"【守護者】スキルの持続時間延長","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","スキル"],"occurrence":"通常のみ","sortOrder":307,"category":"守護者"},{"name":"【守護者】アーツ発動時、周囲の味方HPを徐々に回復","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","HP","味方","リゲイン","アーツ"],"occurrence":"通常のみ","sortOrder":308,"category":"守護者"},{"name":"【守護者】斧槍タメ攻撃時、つむじ風が発生","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","斧槍"],"occurrence":"通常のみ","sortOrder":309,"category":"守護者"},{"name":"【守護者】筋力/技量上昇、生命力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","筋力","技量","HP"],"occurrence":"両方あり","sortOrder":310,"category":"守護者"},{"name":"【守護者】精神力/信仰上昇、生命力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","FP","信仰","HP"],"occurrence":"両方あり","sortOrder":311,"category":"守護者"},{"name":"【守護者】スキル使用時、周囲の味方のカット率上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["守護者","カット","味方"],"occurrence":"深層のみ","sortOrder":312,"category":"守護者"},{"name":"【鉄の目】スキルの使用回数+1","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","スキル回数"],"occurrence":"通常のみ","sortOrder":313,"category":"鉄の目"},{"name":"【鉄の目】アーツのタメ発動時、毒の状態異常を付加","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","毒","アーツ"],"occurrence":"通常のみ","sortOrder":314,"category":"鉄の目"},{"name":"【鉄の目】アーツ発動後、刺突カウンター強化","amount":"刺突カウンターを強化+20.0%","calc":"乗算","stackable":false,"target":"刺突カウンターを強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","刺突カウンター","アーツ"],"occurrence":"通常のみ","sortOrder":315,"category":"鉄の目"},{"name":"【鉄の目】弱点の持続時間を延長させる","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","弱点"],"occurrence":"通常のみ","sortOrder":316,"category":"鉄の目"},{"name":"【鉄の目】生命力/筋力上昇、技量低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","HP","筋力","技量"],"occurrence":"両方あり","sortOrder":317,"category":"鉄の目"},{"name":"【鉄の目】神秘上昇、技量低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","神秘","技量"],"occurrence":"両方あり","sortOrder":318,"category":"鉄の目"},{"name":"【鉄の目】スキルに毒の状態異常を付加して毒状態の敵に大ダメージ","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["鉄の目","毒"],"occurrence":"通常のみ","sortOrder":319,"category":"鉄の目"},{"name":"【レディ】スキルのダメージ上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","魔術","魔力攻撃","カーリア","結晶","短剣","アーツ","生存"],"occurrence":"通常のみ","sortOrder":320,"category":"レディ"},{"name":"【レディ】アーツ発動中、敵撃破で攻撃力上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","魔術","魔力攻撃","カーリア","結晶","短剣","アーツ","生存"],"occurrence":"通常のみ","sortOrder":321,"category":"レディ"},{"name":"【レディ】短剣による最終攻撃命中時、周囲の敵に、直近の出来事を再演","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","魔術","魔力攻撃","カーリア","結晶","短剣","アーツ","生存"],"occurrence":"通常のみ","sortOrder":322,"category":"レディ"},{"name":"【レディ】背後からの致命の一撃後、自身の姿を見え難くし、足音を消す","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","魔術","魔力攻撃","カーリア","結晶","短剣","アーツ","生存","致命","隠密"],"occurrence":"通常のみ","sortOrder":323,"category":"レディ"},{"name":"【レディ】生命力/筋力上昇、精神力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","短剣","アーツ","生存","筋力"],"occurrence":"両方あり","sortOrder":324,"category":"レディ"},{"name":"【レディ】精神力/信仰上昇、知力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","短剣","アーツ","生存","祈祷"],"occurrence":"両方あり","sortOrder":325,"category":"レディ"},{"name":"【レディ】スキル使用時、僅かに無敵","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["レディ","スキル","HP","FP","技量","攻撃連続","魔術","魔力攻撃","カーリア","結晶","短剣","アーツ","生存"],"occurrence":"深層のみ","sortOrder":326,"category":"レディ"},{"name":"【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇","amount":"すべての攻撃を強化+10.0%","calc":"乗算","stackable":false,"target":"すべての攻撃を強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["無頼漢","被ダメージ","スタミナ","筋力","強靭","低下時","リゲイン","攻撃連続","体制崩し"],"occurrence":"通常のみ","sortOrder":327,"category":"無頼漢"},{"name":"【無頼漢】アーツの効果時間延長","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["無頼漢","アーツ"],"occurrence":"通常のみ","sortOrder":328,"category":"無頼漢"},{"name":"トーテム・ステラの周囲で敵を倒した時、HP回復","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":4,"note":null,"tags":["無頼漢","HP","リゲイン"],"occurrence":"通常のみ","sortOrder":329,"category":"無頼漢"},{"name":"トーテム・ステラの周囲で、強靭度上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":6,"note":null,"tags":["無頼漢","強靭"],"occurrence":"通常のみ","sortOrder":330,"category":"無頼漢"},{"name":"【無頼漢】精神力/知力上昇、生命力/持久力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["無頼漢","FP","知力","HP","スタミナ"],"occurrence":"両方あり","sortOrder":331,"category":"無頼漢"},{"name":"【無頼漢】神秘上昇、生命力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["無頼漢","神秘","HP"],"occurrence":"両方あり","sortOrder":332,"category":"無頼漢"},{"name":"【無頼漢】スキル命中時、敵の攻撃力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["無頼漢","スキル"],"occurrence":"深層のみ","sortOrder":333,"category":"無頼漢"},{"name":"【復讐者】アーツ発動時、霊炎の爆発を発生","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","炎攻撃","アーツ"],"occurrence":"通常のみ","sortOrder":334,"category":"復讐者"},{"name":"【復讐者】アーツ発動時、自身のHPと引き換えに周囲の味方のHPを全回復","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","HP","味方","リゲイン","アーツ"],"occurrence":"通常のみ","sortOrder":335,"category":"復讐者"},{"name":"【復讐者】アーツ発動時、ファミリーと味方を強化","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","味方","アーツ"],"occurrence":"通常のみ","sortOrder":336,"category":"復讐者"},{"name":"【復讐者】ファミリーと共闘中の間、自身を強化","amount":"すべての攻撃を強化+10.0%","calc":"乗算","stackable":false,"target":"すべての攻撃を強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","召喚","バフ"],"occurrence":"通常のみ","sortOrder":337,"category":"復讐者"},{"name":"【復讐者】生命力/持久力上昇、精神力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","HP","スタミナ","FP"],"occurrence":"両方あり","sortOrder":338,"category":"復讐者"},{"name":"【復讐者】筋力上昇、信仰低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","筋力","信仰"],"occurrence":"両方あり","sortOrder":339,"category":"復讐者"},{"name":"【復讐者】アビリティ発動時、最大FP上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["復讐者","FP"],"occurrence":"深層のみ","sortOrder":340,"category":"復讐者"},{"name":"【隠者】アーツ発動時、自身が出血状態になり、攻撃力上昇","amount":"すべての攻撃を強化+16.0%","calc":"乗算","stackable":false,"target":"すべての攻撃を強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["隠者","HP","FP","魔術","魔力攻撃","カーリア","結晶","アーツ","出血"],"occurrence":"通常のみ","sortOrder":341,"category":"隠者"},{"name":"【隠者】アーツ発動時、最大HP上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["隠者","HP","FP","魔術","魔力攻撃","カーリア","結晶","アーツ","生存"],"occurrence":"通常のみ","sortOrder":342,"category":"隠者"},{"name":"【隠者】属性痕を集めた時、「魔術の地」が発動","amount":"魔力攻撃力を強化+22.5%","calc":"乗算","stackable":false,"target":"魔力攻撃力を強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["隠者","HP","FP","魔術","魔力攻撃","カーリア","結晶","アーツ"],"occurrence":"通常のみ","sortOrder":343,"category":"隠者"},{"name":"【隠者】生命力/持久力/技量上昇、知力/信仰低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["隠者","HP","FP","魔術","魔力攻撃","カーリア","結晶","アーツ","出血"],"occurrence":"両方あり","sortOrder":344,"category":"隠者"},{"name":"【隠者】知力/信仰上昇、精神力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["隠者","HP","FP","魔術","魔力攻撃","カーリア","結晶","アーツ","祈祷"],"occurrence":"両方あり","sortOrder":345,"category":"隠者"},{"name":"【隠者】属性痕を集めた時、対応する属性カット率上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["隠者","HP","FP","魔術","魔力攻撃","カーリア","結晶","アーツ"],"occurrence":"深層のみ","sortOrder":346,"category":"隠者"},{"name":"【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下","amount":"妖刀の攻撃力+35.0%","calc":"乗算","stackable":false,"target":"妖刀の攻撃力","conditional":false,"condition":null,"importance":10,"note":null,"tags":["執行者","技神","刀","曲剣","二刀","妖刀","ガード","両手持ち","連続時","神秘","状態異常","近接","スタミナ","カット","アーツ","リゲイン","咆哮"],"occurrence":"通常のみ","sortOrder":347,"category":"執行者"},{"name":"【執行者】スキル中、妖刀が解放状態になるとHP回復","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["執行者","技神","刀","曲剣","二刀","妖刀","ガード","両手持ち","連続時","神秘","状態異常","近接","スタミナ","カット","アーツ","リゲイン","咆哮"],"occurrence":"通常のみ","sortOrder":348,"category":"執行者"},{"name":"【執行者】アーツ発動中、咆哮でHP回復","amount":null,"calc":null,"stackable":false,"target":null,"conditional":true,"condition":null,"importance":10,"note":null,"tags":["執行者","技神","刀","曲剣","二刀","妖刀","ガード","両手持ち","連続時","神秘","状態異常","近接","スタミナ","カット","アーツ","リゲイン","咆哮"],"occurrence":"通常のみ","sortOrder":349,"category":"執行者"},{"name":"【執行者】生命力/持久力上昇、神秘低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["執行者","技神","刀","曲剣","二刀","妖刀","ガード","両手持ち","連続時","神秘","状態異常","近接","スタミナ","カット","アーツ","リゲイン","咆哮"],"occurrence":"両方あり","sortOrder":350,"category":"執行者"},{"name":"【執行者】技量/神秘上昇、生命力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["執行者","技神","刀","曲剣","二刀","妖刀","ガード","両手持ち","連続時","神秘","状態異常","近接","スタミナ","カット","アーツ","リゲイン","咆哮"],"occurrence":"両方あり","sortOrder":351,"category":"執行者"},{"name":"【執行者】アビリティ発動時、HPをゆっくりと回復","amount":"毎秒最大HP×0.0025+3の回復（60秒）","calc":null,"stackable":false,"target":"アビリティ発動時","conditional":true,"condition":null,"importance":10,"note":null,"tags":["執行者","技神","刀","曲剣","二刀","妖刀","ガード","両手持ち","連続時","神秘","状態異常","近接","スタミナ","カット","アーツ","リゲイン","咆哮"],"occurrence":"深層のみ","sortOrder":352,"category":"執行者"},{"name":"【学者】スキルの進捗率の低下を抑制","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["学者#HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン#アーツ","スキル"],"occurrence":"通常のみ","sortOrder":353,"category":"学者"},{"name":"【学者】スキル使用時、対象に含まれた味方の攻撃力上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["学者#HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン#アーツ","スキル"],"occurrence":"通常のみ","sortOrder":354,"category":"学者"},{"name":"【学者】スキルによる標本が増える度、ルーンを取得","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["学者#HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン#アーツ","スキル"],"occurrence":"通常のみ","sortOrder":355,"category":"学者"},{"name":"【学者】アーツでリンクした敵対象に、継続ダメージ","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["学者#HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン#アーツ","スキル"],"occurrence":"通常のみ","sortOrder":356,"category":"学者"},{"name":"【学者】精神力上昇、生命力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["技神学者","学者","HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン#アーツ","スキル","FP"],"occurrence":"深層のみ","sortOrder":357,"category":"学者"},{"name":"【学者】持久力/技量上昇、知力/神秘低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["学者#HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン#アーツ","スキル","スタミナ"],"occurrence":"深層のみ","sortOrder":358,"category":"学者"},{"name":"【学者】スキルを自身に使用時、FP消費軽減","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["学者#HP","神秘","技量","状態異常","アイテム","ポーチ","味方","敵を倒したとき","ルーン","アーツ","スキル","FP"],"occurrence":"深層のみ","sortOrder":359,"category":"学者"},{"name":"【葬儀屋】アーツ発動時、攻撃力上昇","amount":"すべての攻撃を強化+18.0%","calc":"乗算","stackable":false,"target":"すべての攻撃を強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","近接","アーツ"],"occurrence":"通常のみ","sortOrder":360,"category":"葬儀屋"},{"name":"【葬儀屋】アーツ発動時、触れた味方のHP回復","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","HP","味方","リゲイン","アーツ"],"occurrence":"通常のみ","sortOrder":361,"category":"葬儀屋"},{"name":"【葬儀屋】連撃の最終攻撃命中時、攻撃力上昇","amount":"すべての攻撃を強化+16.0%","calc":"乗算","stackable":false,"target":"すべての攻撃を強化","conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","近接","攻撃連続"],"occurrence":"通常のみ","sortOrder":362,"category":"葬儀屋"},{"name":"【葬儀屋】祈祷を使用して、自身に補助効果発生時物理攻撃力上昇","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","祈祷","物理攻撃"],"occurrence":"通常のみ","sortOrder":363,"category":"葬儀屋"},{"name":"【葬儀屋】技量上昇、生命力/信仰低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","技量","HP","信仰"],"occurrence":"両方あり","sortOrder":364,"category":"葬儀屋"},{"name":"【葬儀屋】精神力/信仰上昇、筋力低下","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","FP","信仰","筋力"],"occurrence":"両方あり","sortOrder":365,"category":"葬儀屋"},{"name":"【葬儀屋】アーツ発動後、スキル再使用可能","amount":null,"calc":null,"stackable":false,"target":null,"conditional":false,"condition":null,"importance":10,"note":null,"tags":["葬儀屋","アーツ","スキル"],"occurrence":"深層のみ","sortOrder":366,"category":"葬儀屋"},{"name":"短剣の攻撃力上昇","amount":"短剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"短剣の攻撃力","conditional":true,"condition":"短剣の攻撃時","importance":8,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["短剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":367,"category":"武器：短剣"},{"name":"短剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"短剣の攻撃時","importance":6,"note":"クールタイムは約1秒。","tags":["短剣","近接","HP"],"occurrence":"両方あり","sortOrder":368,"category":"武器：短剣"},{"name":"短剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"短剣の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["短剣","近接","FP"],"occurrence":"両方あり","sortOrder":369,"category":"武器：短剣"},{"name":"短剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"短剣を3つ以上所持時","importance":9,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["短剣","近接","近接攻撃"],"occurrence":"両方あり","sortOrder":370,"category":"武器：短剣"},{"name":"潜在する力から、短剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["短剣","発見力"],"occurrence":"両方あり","sortOrder":371,"category":"武器：短剣"},{"name":"直剣の攻撃力上昇","amount":"直剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"直剣の攻撃力","conditional":true,"condition":"直剣の攻撃時","importance":6,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["直剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":372,"category":"武器：直剣"},{"name":"直剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"直剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["直剣","近接","HP"],"occurrence":"両方あり","sortOrder":373,"category":"武器：直剣"},{"name":"直剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"直剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["直剣","近接","FP"],"occurrence":"両方あり","sortOrder":374,"category":"武器：直剣"},{"name":"直剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"直剣を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["直剣","近接","近接攻撃"],"occurrence":"両方あり","sortOrder":375,"category":"武器：直剣"},{"name":"潜在する力から、直剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["直剣","発見力","探索"],"occurrence":"両方あり","sortOrder":376,"category":"武器：直剣"},{"name":"大剣の攻撃力上昇","amount":"大剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"大剣の攻撃力","conditional":true,"condition":"大剣の攻撃時","importance":8,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["大剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":377,"category":"武器：大剣"},{"name":"大剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"大剣の攻撃時","importance":6,"note":"クールタイムは約1秒。","tags":["大剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":378,"category":"武器：大剣"},{"name":"大剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"大剣の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["大剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":379,"category":"武器：大剣"},{"name":"大剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"大剣を3つ以上所持時","importance":9,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["大剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":380,"category":"武器：大剣"},{"name":"潜在する力から、大剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["大剣","発見力","探索"],"occurrence":"両方あり","sortOrder":381,"category":"武器：大剣"},{"name":"特大剣の攻撃力上昇","amount":"特大剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"特大剣の攻撃力","conditional":true,"condition":"特大剣の攻撃時","importance":7,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["特大剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":382,"category":"武器：特大剣"},{"name":"特大剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"特大剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["特大剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":383,"category":"武器：特大剣"},{"name":"特大剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"特大剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["特大剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":384,"category":"武器：特大剣"},{"name":"特大剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"特大剣を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["特大剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":385,"category":"武器：特大剣"},{"name":"潜在する力から、特大剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["特大剣","発見力","探索"],"occurrence":"両方あり","sortOrder":386,"category":"武器：特大剣"},{"name":"刺剣の攻撃力上昇","amount":"刺剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"刺剣の攻撃力","conditional":true,"condition":"刺剣の攻撃時","importance":6,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["刺剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":387,"category":"武器：刺剣"},{"name":"刺剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"刺剣の攻撃時","importance":6,"note":"クールタイムは約1秒。","tags":["刺剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":388,"category":"武器：刺剣"},{"name":"刺剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"刺剣の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["刺剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":389,"category":"武器：刺剣"},{"name":"刺剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"刺剣を3つ以上所持時","importance":9,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["刺剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":390,"category":"武器：刺剣"},{"name":"潜在する力から、刺剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["刺剣","発見力","探索"],"occurrence":"両方あり","sortOrder":391,"category":"武器：刺剣"},{"name":"重刺剣の攻撃力上昇","amount":"重刺剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"重刺剣の攻撃力","conditional":true,"condition":"重刺剣の攻撃時","importance":5,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["重刺剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":392,"category":"武器：重刺剣"},{"name":"重刺剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"重刺剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["重刺剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":393,"category":"武器：重刺剣"},{"name":"重刺剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"重刺剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["重刺剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":394,"category":"武器：重刺剣"},{"name":"重刺剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"重刺剣を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["重刺剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":395,"category":"武器：重刺剣"},{"name":"潜在する力から、重刺剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["重刺剣","発見力","探索"],"occurrence":"両方あり","sortOrder":396,"category":"武器：重刺剣"},{"name":"曲剣の攻撃力上昇","amount":"曲剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"曲剣の攻撃力","conditional":true,"condition":"曲剣の攻撃時","importance":8,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["曲剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":397,"category":"武器：曲剣"},{"name":"曲剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"曲剣の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["曲剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":398,"category":"武器：曲剣"},{"name":"曲剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"曲剣の攻撃時","importance":6,"note":"クールタイムは約1秒。","tags":["曲剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":399,"category":"武器：曲剣"},{"name":"曲剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"曲剣を3つ以上所持時","importance":9,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["曲剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":400,"category":"武器：曲剣"},{"name":"潜在する力から、曲剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["曲剣","発見力","探索"],"occurrence":"両方あり","sortOrder":401,"category":"武器：曲剣"},{"name":"大曲剣の攻撃力上昇","amount":"大曲剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"大曲剣の攻撃力","conditional":true,"condition":"大曲剣の攻撃時","importance":6,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["大曲剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":402,"category":"武器：大曲剣"},{"name":"大曲剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"大曲剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["大曲剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":403,"category":"武器：大曲剣"},{"name":"大曲剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"大曲剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["大曲剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":404,"category":"武器：大曲剣"},{"name":"大曲剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"大曲剣を3つ以上所持時","importance":6,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["大曲剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":405,"category":"武器：大曲剣"},{"name":"潜在する力から、大曲剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["大曲剣","発見力","探索"],"occurrence":"両方あり","sortOrder":406,"category":"武器：大曲剣"},{"name":"刀の攻撃力上昇","amount":"刀攻撃力+9%","calc":"乗算","stackable":false,"target":"刀の攻撃力","conditional":true,"condition":"刀の攻撃時","importance":10,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["刀","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":407,"category":"武器：刀"},{"name":"刀の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"刀の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["刀","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":408,"category":"武器：刀"},{"name":"刀の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"刀の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["刀","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":409,"category":"武器：刀"},{"name":"刀の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"刀を3つ以上所持時","importance":9,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["刀","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":410,"category":"武器：刀"},{"name":"潜在する力から、刀を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["刀","発見力","探索"],"occurrence":"両方あり","sortOrder":411,"category":"武器：刀"},{"name":"両刃剣の攻撃力上昇","amount":"両刃剣の攻撃力+9%","calc":"乗算","stackable":false,"target":"両刃剣の攻撃力","conditional":true,"condition":"両刃剣の攻撃時","importance":3,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["両刃剣","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":412,"category":"武器：両刃剣"},{"name":"両刃剣の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"両刃剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["両刃剣","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":413,"category":"武器：両刃剣"},{"name":"両刃剣の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"両刃剣の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["両刃剣","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":414,"category":"武器：両刃剣"},{"name":"両刃剣の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"両刃剣を3つ以上所持時","importance":3,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["両刃剣","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":415,"category":"武器：両刃剣"},{"name":"潜在する力から、両刃剣を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["両刃剣","発見力","探索"],"occurrence":"両方あり","sortOrder":416,"category":"武器：両刃剣"},{"name":"斧の攻撃力上昇","amount":"斧の攻撃力+9%","calc":"乗算","stackable":false,"target":"斧の攻撃力","conditional":true,"condition":"斧の攻撃時","importance":7,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["斧","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":417,"category":"武器：斧"},{"name":"斧の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"斧の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["斧","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":418,"category":"武器：斧"},{"name":"斧の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"斧の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["斧","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":419,"category":"武器：斧"},{"name":"斧の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"斧を3つ以上所持時","importance":6,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["斧","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":420,"category":"武器：斧"},{"name":"潜在する力から、斧を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["斧","発見力","探索"],"occurrence":"両方あり","sortOrder":421,"category":"武器：斧"},{"name":"大斧の攻撃力上昇","amount":"大斧の攻撃力+9%","calc":"乗算","stackable":false,"target":"大斧の攻撃力","conditional":true,"condition":"大斧の攻撃時","importance":3,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["大斧","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":422,"category":"武器：大斧"},{"name":"大斧の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"大斧の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["大斧","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":423,"category":"武器：大斧"},{"name":"大斧の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"大斧の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["大斧","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":424,"category":"武器：大斧"},{"name":"大斧の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"大斧を3つ以上所持時","importance":1,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["大斧","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":425,"category":"武器：大斧"},{"name":"潜在する力から、大斧を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["大斧","発見力","探索"],"occurrence":"両方あり","sortOrder":426,"category":"武器：大斧"},{"name":"槌の攻撃力上昇","amount":"槌の攻撃力+9%","calc":"乗算","stackable":false,"target":"槌の攻撃力","conditional":true,"condition":"槌の攻撃時","importance":6,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["槌","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":427,"category":"武器：槌"},{"name":"槌の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"槌の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["槌","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":428,"category":"武器：槌"},{"name":"槌の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"槌の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["槌","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":429,"category":"武器：槌"},{"name":"槌の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"槌を3つ以上所持時","importance":6,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["槌","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":430,"category":"武器：槌"},{"name":"潜在する力から、槌を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["槌","発見力","探索"],"occurrence":"両方あり","sortOrder":431,"category":"武器：槌"},{"name":"フレイルの攻撃力上昇","amount":"フレイルの攻撃力+9%","calc":"乗算","stackable":false,"target":"フレイルの攻撃力","conditional":true,"condition":"フレイルの攻撃時","importance":1,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["フレイル","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":432,"category":"武器：フレイル"},{"name":"フレイルの攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"フレイルの攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["フレイル","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":433,"category":"武器：フレイル"},{"name":"フレイルの攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"フレイルの攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["フレイル","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":434,"category":"武器：フレイル"},{"name":"フレイルの武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"フレイルを3つ以上所持時","importance":1,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["フレイル","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":435,"category":"武器：フレイル"},{"name":"潜在する力から、フレイルを見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["フレイル","発見力","探索"],"occurrence":"両方あり","sortOrder":436,"category":"武器：フレイル"},{"name":"大槌の攻撃力上昇","amount":"大槌の攻撃力+9%","calc":"乗算","stackable":false,"target":"大槌の攻撃力","conditional":true,"condition":"大槌の攻撃時","importance":7,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["大槌","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":437,"category":"武器：大槌"},{"name":"大槌の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"大槌の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["大槌","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":438,"category":"武器：大槌"},{"name":"大槌の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"大槌の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["大槌","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":439,"category":"武器：大槌"},{"name":"大槌の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"大槌を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["大槌","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":440,"category":"武器：大槌"},{"name":"潜在する力から、大槌を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":6,"note":null,"tags":["大槌","発見力","探索"],"occurrence":"両方あり","sortOrder":441,"category":"武器：大槌"},{"name":"特大武器の攻撃力上昇","amount":"特大武器攻撃力+9%","calc":"乗算","stackable":false,"target":"特大武器の攻撃力","conditional":true,"condition":"特大武器の攻撃時","importance":10,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["特大武器","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":442,"category":"武器：特大武器"},{"name":"特大武器の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"特大武器の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["特大武器","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":443,"category":"武器：特大武器"},{"name":"特大武器の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"特大武器の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["特大武器","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":444,"category":"武器：特大武器"},{"name":"特大武器の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"特大武器を3つ以上所持時","importance":10,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["特大武器","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":445,"category":"武器：特大武器"},{"name":"潜在する力から、特大武器を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["特大武器","発見力","探索"],"occurrence":"両方あり","sortOrder":446,"category":"武器：特大武器"},{"name":"槍の攻撃力上昇","amount":"槍の攻撃力+9%","calc":"乗算","stackable":false,"target":"槍の攻撃力","conditional":true,"condition":"槍の攻撃時","importance":3,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["槍","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":447,"category":"武器：槍"},{"name":"槍の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"槍の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["槍","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":448,"category":"武器：槍"},{"name":"槍の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"槍の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["槍","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":449,"category":"武器：槍"},{"name":"槍の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"槍を3つ以上所持時","importance":2,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["槍","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":450,"category":"武器：槍"},{"name":"潜在する力から、槍を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["槍","発見力","探索"],"occurrence":"両方あり","sortOrder":451,"category":"武器：槍"},{"name":"大槍の攻撃力上昇","amount":"大槍攻撃力+9%","calc":"乗算","stackable":false,"target":"大槍の攻撃力","conditional":true,"condition":"大槍の攻撃時","importance":8,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["大槍","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":452,"category":"武器：大槍"},{"name":"大槍の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"大槍の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["大槍","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":453,"category":"武器：大槍"},{"name":"大槍の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"大槍の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["大槍","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":454,"category":"武器：大槍"},{"name":"大槍の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"大槍を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["大槍","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":455,"category":"武器：大槍"},{"name":"潜在する力から、大槍を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["大槍","発見力","探索"],"occurrence":"両方あり","sortOrder":456,"category":"武器：大槍"},{"name":"斧槍の攻撃力上昇","amount":"斧槍攻撃力+9%","calc":"乗算","stackable":false,"target":"斧槍の攻撃力","conditional":true,"condition":"斧槍の攻撃時","importance":9,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["斧槍","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":457,"category":"武器：斧槍"},{"name":"斧槍の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"斧槍の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["斧槍","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":458,"category":"武器：斧槍"},{"name":"斧槍の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"斧槍の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["斧槍","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":459,"category":"武器：斧槍"},{"name":"斧槍の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"斧槍を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["斧槍","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":460,"category":"武器：斧槍"},{"name":"潜在する力から、斧槍を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":3,"note":null,"tags":["斧槍","発見力","探索"],"occurrence":"両方あり","sortOrder":461,"category":"武器：斧槍"},{"name":"鎌の攻撃力上昇","amount":"鎌の攻撃力+9%","calc":"乗算","stackable":false,"target":"鎌の攻撃力","conditional":true,"condition":"鎌の攻撃時","importance":8,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["鎌","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":462,"category":"武器：鎌"},{"name":"鎌の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"鎌の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["鎌","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":463,"category":"武器：鎌"},{"name":"鎌の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"鎌の攻撃時","importance":9,"note":"クールタイムは約1秒。","tags":["鎌","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":464,"category":"武器：鎌"},{"name":"鎌の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"鎌を3つ以上所持時","importance":10,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["鎌","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":465,"category":"武器：鎌"},{"name":"潜在する力から、鎌を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":9,"note":null,"tags":["鎌","発見力","探索"],"occurrence":"両方あり","sortOrder":466,"category":"武器：鎌"},{"name":"鞭の攻撃力上昇","amount":"鞭の攻撃力+9%","calc":"乗算","stackable":false,"target":"鞭の攻撃力","conditional":true,"condition":"鞭の攻撃時","importance":4,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["鞭","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":467,"category":"武器：鞭"},{"name":"鞭の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"鞭の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["鞭","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":468,"category":"武器：鞭"},{"name":"鞭の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"鞭の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["鞭","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":469,"category":"武器：鞭"},{"name":"鞭の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"鞭を3つ以上所持時","importance":2,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["鞭","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":470,"category":"武器：鞭"},{"name":"潜在する力から、鞭を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":4,"note":null,"tags":["鞭","発見力","探索"],"occurrence":"両方あり","sortOrder":471,"category":"武器：鞭"},{"name":"拳の攻撃力上昇","amount":"拳攻撃力+9%","calc":"乗算","stackable":false,"target":"拳の攻撃力","conditional":true,"condition":"拳の攻撃時","importance":8,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["拳","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":472,"category":"武器：拳"},{"name":"拳の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"拳の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["拳","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":473,"category":"武器：拳"},{"name":"拳の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"拳の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["拳","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":474,"category":"武器：拳"},{"name":"拳の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"拳を3つ以上所持時","importance":8,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["拳","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":475,"category":"武器：拳"},{"name":"潜在する力から、拳を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["拳","発見力","探索"],"occurrence":"両方あり","sortOrder":476,"category":"武器：拳"},{"name":"爪の攻撃力上昇","amount":"爪の攻撃力+9%","calc":"乗算","stackable":false,"target":"爪の攻撃力","conditional":true,"condition":"爪の攻撃時","importance":6,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["爪","近接","物理攻撃"],"occurrence":"両方あり","sortOrder":477,"category":"武器：爪"},{"name":"爪の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"爪の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["爪","近接","HP","リゲイン"],"occurrence":"両方あり","sortOrder":478,"category":"武器：爪"},{"name":"爪の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"爪の攻撃時","importance":5,"note":"クールタイムは約1秒。","tags":["爪","近接","FP","リゲイン"],"occurrence":"両方あり","sortOrder":479,"category":"武器：爪"},{"name":"爪の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+20%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"爪を3つ以上所持時","importance":3,"note":"条件の武器種以外の攻撃にも適用される。","tags":["爪","近接","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":480,"category":"武器：爪"},{"name":"潜在する力から、爪を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["爪","発見力","探索"],"occurrence":"両方あり","sortOrder":481,"category":"武器：爪"},{"name":"弓の攻撃力上昇","amount":"弓攻撃力+6%","calc":"乗算","stackable":false,"target":"弓の攻撃力","conditional":true,"condition":"弓の攻撃時","importance":9,"note":"物理・属性攻撃力ではなく与ダメージが上昇する。","tags":["弓","遠隔","物理攻撃"],"occurrence":"両方あり","sortOrder":482,"category":"武器：弓"},{"name":"弓の攻撃でHP回復","amount":"HPを15回復","calc":"加算","stackable":false,"target":"HP","conditional":true,"condition":"弓の攻撃時","importance":8,"note":"クールタイムは約1秒。","tags":["弓","遠隔","HP","リゲイン"],"occurrence":"両方あり","sortOrder":483,"category":"武器：弓"},{"name":"弓の攻撃でFP回復","amount":"FPを2回復","calc":"加算","stackable":false,"target":"FP","conditional":true,"condition":"弓の攻撃時","importance":9,"note":"クールタイムは約1秒。","tags":["弓","遠隔","FP","リゲイン"],"occurrence":"両方あり","sortOrder":484,"category":"武器：弓"},{"name":"弓の武器種を3つ以上装備していると攻撃力上昇","amount":"攻撃力+10%","calc":"乗算","stackable":false,"target":"攻撃力","conditional":true,"condition":"弓を3つ以上所持時","importance":10,"note":"条件の武器種以外の攻撃にも適用。異なる武器種は重ね掛け可能。","tags":["弓","遠隔","3つ以上装備","近接攻撃"],"occurrence":"両方あり","sortOrder":485,"category":"武器：弓"},{"name":"潜在する力から、弓を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":7,"note":null,"tags":["弓","発見力","探索"],"occurrence":"両方あり","sortOrder":486,"category":"武器：弓"},{"name":"潜在する力から、大弓を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["大弓","発見力","探索"],"occurrence":"両方あり","sortOrder":487,"category":"武器：大弓"},{"name":"潜在する力から、クロスボウを見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":8,"note":null,"tags":["クロスボウ","発見力","探索"],"occurrence":"両方あり","sortOrder":488,"category":"武器：クロスボウ"},{"name":"潜在する力から、バリスタを見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":2,"note":null,"tags":["バリスタ","発見力","探索"],"occurrence":"両方あり","sortOrder":489,"category":"武器：バリスタ"},{"name":"小盾の武器種を3つ以上装備していると最大HP上昇","amount":"最大HP+200","calc":"加算","stackable":false,"target":"最大HP","conditional":true,"condition":"小盾を3つ以上所持時","importance":4,"note":"対象武器種：小盾・中盾・大盾。異なる武器種の効果は重ね掛け可能","tags":["小盾","盾","ガード","HP","3つ以上装備"],"occurrence":"両方あり","sortOrder":490,"category":"武器：小盾"},{"name":"潜在する力から、小盾を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":5,"note":null,"tags":["小盾","発見力","探索"],"occurrence":"両方あり","sortOrder":491,"category":"武器：小盾"},{"name":"中盾の武器種を3つ以上装備していると最大HP上昇","amount":"最大HP+200","calc":"加算","stackable":false,"target":"最大HP","conditional":true,"condition":"中盾を3つ以上所持時","importance":1,"note":"対象武器種：小盾・中盾・大盾。異なる武器種の効果は重ね掛け可能","tags":["中盾","盾","ガード","HP","3つ以上装備"],"occurrence":"両方あり","sortOrder":492,"category":"武器：中盾"},{"name":"潜在する力から、中盾を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":1,"note":null,"tags":["中盾","発見力","探索"],"occurrence":"両方あり","sortOrder":493,"category":"武器：中盾"},{"name":"大盾の武器種を3つ以上装備していると最大HP上昇","amount":"最大HP+200","calc":"加算","stackable":false,"target":"最大HP","conditional":true,"condition":"大盾を3つ以上所持時","importance":7,"note":"対象武器種：小盾・中盾・大盾。異なる武器種の効果は重ね掛け可能","tags":["大盾","盾","ガード","HP","3つ以上装備"],"occurrence":"両方あり","sortOrder":494,"category":"武器：大盾"},{"name":"潜在する力から、大盾を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["大盾","発見力","探索"],"occurrence":"両方あり","sortOrder":495,"category":"武器：大盾"},{"name":"杖の武器種を3つ以上装備していると最大FP上昇","amount":"最大FP+50","calc":"加算","stackable":false,"target":"最大FP","conditional":true,"condition":"杖を3つ以上所持時","importance":9,"note":"対象武器種：杖・聖印。異なる武器種の効果は重ね掛け可能","tags":["杖","魔術","FP"],"occurrence":"両方あり","sortOrder":496,"category":"武器：杖"},{"name":"潜在する力から、杖を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":10,"note":null,"tags":["FP","杖","発見力","探索"],"occurrence":"両方あり","sortOrder":497,"category":"武器：杖"},{"name":"聖印の武器種を3つ以上装備していると最大FP上昇","amount":"最大FP+50","calc":"加算","stackable":false,"target":"最大FP","conditional":true,"condition":"聖印を3つ以上所持時","importance":9,"note":"対象武器種：杖・聖印。異なる武器種の効果は重ね掛け可能","tags":["聖印","祈祷","FP","3つ以上装備"],"occurrence":"両方あり","sortOrder":498,"category":"武器：聖印"},{"name":"潜在する力から、聖印を見つけやすくなる","amount":"記載しない","calc":"計算しない","stackable":false,"target":"-","conditional":false,"condition":"-","importance":9,"note":null,"tags":["聖印","発見力","探索"],"occurrence":"両方あり","sortOrder":499,"category":"武器：聖印"}];

/* ---------- 攻撃力系スキルの「対象プール」データ（出典：ユーザー提供 calc_data.json の DAMAGE_MAP）
   同じtargetを持つスキル同士が同じ強化枠を共有する（ビルド計算のグループ化に使用） ---------- */
const DAMAGE_TABLE = {"近接攻撃力上昇":{"target":"近接攻撃力上昇","pct":5.0,"stacks":true},"戦技攻撃力上昇":{"target":"戦技攻撃力上昇","pct":15.0,"stacks":true},"通常攻撃の1段目強化":{"target":"通常攻撃の1段目強化","pct":15.0,"stacks":true},"致命の一撃強化":{"target":"致命の一撃強化","pct":17.0,"stacks":true},"致命の一撃強化+1":{"target":"致命の一撃強化+1","pct":24.0,"stacks":true},"咆哮とブレス強化":{"target":"咆哮とブレス強化","pct":15.0,"stacks":true},"武器の持ち替え時、物理攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"属性攻撃力が付加された時、属性攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":true},"攻撃を受けると攻撃力上昇":{"target":"すべての攻撃を強化","pct":15.0,"stacks":false},"輝剣の魔術を強化":{"target":"輝剣の魔術を強化","pct":12.0,"stacks":true},"石掘りの魔術を強化":{"target":"石掘りの魔術を強化","pct":12.0,"stacks":true},"カーリアの剣の魔術を強化":{"target":"カーリアの剣の魔術を強化","pct":12.0,"stacks":true},"不可視の魔術を強化":{"target":"不可視の魔術を強化","pct":12.0,"stacks":true},"結晶人の魔術を強化":{"target":"結晶人の魔術を強化","pct":12.0,"stacks":true},"重力の魔術を強化":{"target":"重力の魔術を強化","pct":12.0,"stacks":true},"茨の魔術を強化":{"target":"茨の魔術を強化","pct":12.0,"stacks":true},"黄金律原理主義の祈祷を強化":{"target":"黄金律原理主義の祈祷を強化","pct":12.0,"stacks":true},"王都古竜信仰の祈祷を強化":{"target":"王都古竜信仰の祈祷を強化","pct":12.0,"stacks":true},"巨人の火の祈祷を強化":{"target":"巨人の火の祈祷を強化","pct":12.0,"stacks":true},"神狩りの祈祷を強化":{"target":"神狩りの祈祷を強化","pct":12.0,"stacks":true},"獣の祈祷を強化":{"target":"獣の祈祷を強化","pct":12.0,"stacks":true},"狂い火の祈祷を強化":{"target":"狂い火の祈祷を強化","pct":12.0,"stacks":true},"竜餐の祈祷を強化":{"target":"竜餐の祈祷を強化","pct":12.0,"stacks":true},"周囲で毒／腐敗状態の発生時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":12.0,"stacks":false},"【鉄の目】アーツ発動後、刺突カウンター強化":{"target":"刺突カウンターを強化","pct":20.0,"stacks":false},"【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"【復讐者】ファミリーと共闘中の間、自身を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"【陰者】アーツ発動時、自身が出血状態になり、攻撃力上昇":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"【陰者】属性痕を集めた時、「魔術の地」が発動":{"target":"魔力攻撃力を強化","pct":22.5,"stacks":false},"【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下":{"target":"妖刀の攻撃を強化","pct":35.0,"stacks":false},"【葬儀屋】アーツ発動時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":18.0,"stacks":false},"【葬儀屋】連撃の最終攻撃命中時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"短剣の攻撃力上昇":{"target":"短剣の攻撃力上昇","pct":9.0,"stacks":true},"直剣の攻撃力上昇":{"target":"直剣の攻撃力上昇","pct":9.0,"stacks":true},"大剣の攻撃力上昇":{"target":"大剣の攻撃力上昇","pct":9.0,"stacks":true},"特大剣の攻撃力上昇":{"target":"特大剣の攻撃力上昇","pct":9.0,"stacks":true},"刺剣の攻撃力上昇":{"target":"刺剣の攻撃力上昇","pct":9.0,"stacks":true},"重刺剣の攻撃力上昇":{"target":"重刺剣の攻撃力上昇","pct":9.0,"stacks":true},"曲剣の攻撃力上昇":{"target":"曲剣の攻撃力上昇","pct":9.0,"stacks":true},"大曲剣の攻撃力上昇":{"target":"大曲剣の攻撃力上昇","pct":9.0,"stacks":true},"刀の攻撃力上昇":{"target":"刀の攻撃力上昇","pct":9.0,"stacks":true},"両刃剣の攻撃力上昇":{"target":"両刃剣の攻撃力上昇","pct":9.0,"stacks":true},"斧の攻撃力上昇":{"target":"斧の攻撃力上昇","pct":9.0,"stacks":true},"大斧の攻撃力上昇":{"target":"大斧の攻撃力上昇","pct":9.0,"stacks":true},"槌の攻撃力上昇":{"target":"槌の攻撃力上昇","pct":9.0,"stacks":true},"フレイルの攻撃力上昇":{"target":"フレイルの攻撃力上昇","pct":9.0,"stacks":true},"大槌の攻撃力上昇":{"target":"大槌の攻撃力上昇","pct":9.0,"stacks":true},"特大武器の攻撃力上昇":{"target":"特大武器の攻撃力上昇","pct":9.0,"stacks":true},"槍の攻撃力上昇":{"target":"槍の攻撃力上昇","pct":9.0,"stacks":true},"大槍の攻撃力上昇":{"target":"大槍の攻撃力上昇","pct":9.0,"stacks":true},"斧槍の攻撃力上昇":{"target":"斧槍の攻撃力上昇","pct":9.0,"stacks":true},"鎌の攻撃力上昇":{"target":"鎌の攻撃力上昇","pct":9.0,"stacks":true},"鞭の攻撃力上昇":{"target":"鞭の攻撃力上昇","pct":9.0,"stacks":true},"拳の攻撃力上昇":{"target":"拳の攻撃力上昇","pct":9.0,"stacks":true},"爪の攻撃力上昇":{"target":"爪の攻撃力上昇","pct":9.0,"stacks":true},"弓の攻撃力上昇":{"target":"弓の攻撃力上昇","pct":6.0,"stacks":true},"短剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"直剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"特大剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"刺剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"重刺剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"曲剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大曲剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"刀の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"両刃剣の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"斧の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大斧の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"槌の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"フレイルの武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大槌の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"特大武器の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"槍の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"大槍の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"斧槍の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"鎌の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"鞭の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"拳の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"爪の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"弓の武器種を3つ以上装備していると攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"属性攻撃力上昇":{"target":"属性攻撃力上昇","pct":5.0,"stacks":true},"属性攻撃力上昇+1":{"target":"属性攻撃力上昇","pct":8.0,"stacks":true},"属性攻撃力上昇+2":{"target":"属性攻撃力上昇","pct":10.0,"stacks":true},"物理攻撃力上昇":{"target":"物理攻撃力上昇","pct":4.0,"stacks":true},"物理攻撃力上昇+1":{"target":"物理攻撃力上昇","pct":5.0,"stacks":true},"物理攻撃力上昇+2":{"target":"物理攻撃力上昇","pct":6.0,"stacks":true},"物理攻撃力上昇+3":{"target":"物理攻撃力上昇","pct":10.5,"stacks":true},"物理攻撃力上昇+4":{"target":"物理攻撃力上昇","pct":12.0,"stacks":true},"魔力攻撃力上昇":{"target":"魔力攻撃力上昇","pct":4.0,"stacks":true},"魔力攻撃力上昇+1":{"target":"魔力攻撃力上昇","pct":5.0,"stacks":true},"魔力攻撃力上昇+2":{"target":"魔力攻撃力上昇","pct":6.0,"stacks":true},"魔力攻撃力上昇+3":{"target":"魔力攻撃力上昇","pct":10.5,"stacks":true},"魔力攻撃力上昇+4":{"target":"魔力攻撃力上昇","pct":12.0,"stacks":true},"炎攻撃力上昇":{"target":"炎攻撃力上昇","pct":4.0,"stacks":true},"炎攻撃力上昇+1":{"target":"炎攻撃力上昇","pct":5.0,"stacks":true},"炎攻撃力上昇+2":{"target":"炎攻撃力上昇","pct":6.0,"stacks":true},"炎攻撃力上昇+3":{"target":"炎攻撃力上昇","pct":10.5,"stacks":true},"炎攻撃力上昇+4":{"target":"炎攻撃力上昇","pct":12.0,"stacks":true},"雷攻撃力上昇":{"target":"雷攻撃力上昇","pct":4.0,"stacks":true},"雷攻撃力上昇+1":{"target":"雷攻撃力上昇","pct":5.0,"stacks":true},"雷攻撃力上昇+2":{"target":"雷攻撃力上昇","pct":6.0,"stacks":true},"雷攻撃力上昇+3":{"target":"雷攻撃力上昇","pct":10.5,"stacks":true},"雷攻撃力上昇+4":{"target":"雷攻撃力上昇","pct":12.0,"stacks":true},"聖攻撃力上昇":{"target":"聖攻撃力上昇","pct":4.0,"stacks":true},"聖攻撃力上昇+1":{"target":"聖攻撃力上昇","pct":5.0,"stacks":true},"聖攻撃力上昇+2":{"target":"聖攻撃力上昇","pct":6.0,"stacks":true},"聖攻撃力上昇+3":{"target":"聖攻撃力上昇","pct":10.5,"stacks":true},"聖攻撃力上昇+4":{"target":"聖攻撃力上昇","pct":12.0,"stacks":true},"魔術強化":{"target":"魔術強化","pct":5.0,"stacks":true},"魔術強化+1":{"target":"魔術強化","pct":8.5,"stacks":true},"魔術強化+2":{"target":"魔術強化","pct":10.0,"stacks":true},"祈祷強化":{"target":"祈祷強化","pct":5.0,"stacks":true},"祈祷強化+1":{"target":"祈祷強化","pct":8.5,"stacks":true},"祈祷強化+2":{"target":"祈祷強化","pct":10.0,"stacks":true},"ガードカウンター強化":{"target":"ガードカウンター強化","pct":17.0,"stacks":true},"ガードカウンター強化+1":{"target":"ガードカウンター強化","pct":25.0,"stacks":true},"ガードカウンター強化+2":{"target":"ガードカウンター強化","pct":29.0,"stacks":true},"脂アイテム使用時、追加で物理攻撃力上昇":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"脂アイテム使用時、追加で物理攻撃力上昇+1":{"target":"すべての攻撃を強化","pct":17.0,"stacks":false},"脂アイテム使用時、追加で物理攻撃力上昇+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"投擲壺の攻撃力上昇":{"target":"投擲壺の攻撃力上昇","pct":15.0,"stacks":true},"投擲壺の攻撃力上昇+1":{"target":"投擲壺の攻撃力上昇","pct":30.0,"stacks":true},"投擲ナイフの攻撃力上昇":{"target":"投擲ナイフの攻撃力上昇","pct":15.0,"stacks":true},"投擲ナイフの攻撃力上昇+1":{"target":"投擲ナイフの攻撃力上昇","pct":30.0,"stacks":true},"輝石、重力石アイテムの攻撃力上昇":{"target":"輝石、重力石アイテムの攻撃力上昇","pct":15.0,"stacks":true},"輝石、重力石アイテムの攻撃力上昇+1":{"target":"輝石、重力石アイテムの攻撃力上昇","pct":30.0,"stacks":true},"調香術強化":{"target":"調香術強化","pct":14.0,"stacks":true},"調香術強化+1":{"target":"調香術強化","pct":30.0,"stacks":true},"毒状態の敵に対する攻撃を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"毒状態の敵に対する攻撃を強化+1":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"毒状態の敵に対する攻撃を強化+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"腐敗状態の敵に対する攻撃を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"腐敗状態の敵に対する攻撃を強化+1":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"腐敗状態の敵に対する攻撃を強化+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"凍傷状態の敵に対する攻撃を強化":{"target":"すべての攻撃を強化","pct":10.0,"stacks":false},"凍傷状態の敵に対する攻撃を強化+1":{"target":"すべての攻撃を強化","pct":16.0,"stacks":false},"凍傷状態の敵に対する攻撃を強化+2":{"target":"すべての攻撃を強化","pct":20.0,"stacks":false},"周囲で睡眠状態の発生時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":12.0,"stacks":false},"周囲で睡眠状態の発生時、攻撃力上昇+1":{"target":"すべての攻撃を強化","pct":22.0,"stacks":false},"周囲で発狂状態の発生時、攻撃力上昇":{"target":"すべての攻撃を強化","pct":12.0,"stacks":false},"周囲で発狂状態の発生時、攻撃力上昇+1":{"target":"すべての攻撃を強化","pct":22.0,"stacks":false}};

const EFFECT_BY_NAME = new Map(EFFECT_TABLE.map((e) => [e.name, e]));

// Excel（マスター一覧）上での並び順を再現するための基礎名ごとの最小sortOrder
const EFFECT_BASE_SORT_ORDER = new Map();
EFFECT_TABLE.forEach((e) => {
  const m = e.name.match(/^(.+?)[+＋]\d+$/);
  const base = m ? m[1] : e.name;
  const cur = EFFECT_BASE_SORT_ORDER.get(base);
  if (cur === undefined || e.sortOrder < cur) EFFECT_BASE_SORT_ORDER.set(base, e.sortOrder);
});
function excelSortOrder(identity) {
  if (identity.startsWith("N:")) {
    const base = identity.slice(2);
    const order = EFFECT_BASE_SORT_ORDER.get(base);
    return order === undefined ? Infinity : order;
  }
  const text = identity.slice(2);
  const entry = EFFECT_BY_NAME.get(text);
  return entry ? entry.sortOrder : Infinity;
}


// 最新の効果量データでは武器種ごとの行がすべて具体的に用意されているため、
// ワイルドカード（○○の...）による名寄せは不要（完全一致のみで足りる）
function lookupEffectEntry(fullText) {
  return EFFECT_BY_NAME.get(fullText) || null;
}

// 単体重要度（1〜10、5が標準）：原本データを既定値とし、ユーザー調整があればそちらを優先する
const DEFAULT_IMPORTANCE = 5;
function getBaseImportance(fullText) {
  const entry = EFFECT_BY_NAME.get(fullText);
  return entry && typeof entry.importance === "number" ? entry.importance : DEFAULT_IMPORTANCE;
}
function getEffectiveImportance(fullText, overrides) {
  const v = overrides ? overrides[fullText] : undefined;
  return typeof v === "number" ? v : getBaseImportance(fullText);
}

// amount文字列（例："物理攻撃力+4%"、"最大HP+20"）から先頭の数値とその単位を抜き出す
function parseAmountNumber(amountStr) {
  if (!amountStr) return null;
  const pctMatch = amountStr.match(/([+\-]?\d+(?:\.\d+)?)\s*[%％]/);
  if (pctMatch) return { value: parseFloat(pctMatch[1]), unit: "%" };
  const numMatch = amountStr.match(/\+(\d+(?:\.\d+)?)/);
  if (numMatch) return { value: parseFloat(numMatch[1]), unit: "" };
  // フォールバック：「HPを15回復」のように、+記号の無い固定値表記も拾う
  const woMatch = amountStr.match(/を(\d+(?:\.\d+)?)/);
  if (woMatch) return { value: parseFloat(woMatch[1]), unit: "" };
  const noMatch = amountStr.match(/(\d+(?:\.\d+)?)の/);
  if (noMatch) return { value: parseFloat(noMatch[1]), unit: "" };
  const runeMatch = amountStr.match(/(\d+(?:\.\d+)?)ルーン/);
  if (runeMatch) return { value: parseFloat(runeMatch[1]), unit: "" };
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
      condition: entry.condition,
      conditional: !!entry.conditional,
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
// getGroupInfo は常に「配列」を返す（複合効果=1スキルが複数の別ステータスを同時に強化する場合に対応するため）。
// 通常は要素1つ、計算不可能なものは空配列。
function getGroupInfo(base, value) {
  const fullText = value === 0 ? base : `${base}+${value}`;

  // 優先1：calc_data.json由来のダメージ計算枠データ（target・重ね掛け可否がより精密）
  const dmg = DAMAGE_TABLE[fullText];
  if (dmg) {
    return [{ target: dmg.target, type: "mult", pct: dmg.pct, stackable: dmg.stacks }];
  }

  // 優先2：効果量データ（強化枠(target)列を直接信頼して使用）
  const entry = lookupEffectEntry(fullText);
  if (!entry || !entry.calc) return [];

  // 複合効果：calcが「ラベル：乗算\nラベル：加算」のように複数行の場合、
  // amountも「,」区切りで同じ順番に対応していると仮定して分解する
  if (entry.calc.includes("\n")) {
    const calcParts = entry.calc.split("\n").map((s) => s.trim()).filter(Boolean);
    const amountParts = entry.amount.split(",").map((s) => s.trim());
    const out = [];
    calcParts.forEach((part, i) => {
      const m = part.match(/^(.+?)[：:]\s*(乗算|加算)$/);
      if (!m) return;
      const [, label, calcType] = m;
      const amtStr = amountParts[i] || amountParts[0] || "";
      const parsed = parseAmountNumber(amtStr);
      if (!parsed) return;
      out.push({
        target: label,
        type: calcType === "乗算" ? "mult" : "add",
        pct: calcType === "乗算" ? parsed.value : null,
        amount: calcType === "加算" ? parsed.value : null,
        unit: parsed.unit,
        stackable: entry.stackable,
      });
    });
    return out;
  }

  // 通常の単一効果（計算方式が厳密に「乗算」「加算」のときのみ集計対象にする。
  // 「計算しない」「未設定」などはここで弾かれ、カード上の表示のみに留まる）
  if (entry.calc !== "乗算" && entry.calc !== "加算") return [];

  const parsed = parseAmountNumber(entry.amount);
  if (!parsed) return [];

  return [{
    target: entry.target || base,
    type: entry.calc === "乗算" ? "mult" : "add",
    pct: entry.calc === "乗算" ? parsed.value : null,
    amount: entry.calc === "加算" ? parsed.value : null,
    unit: parsed.unit,
    stackable: entry.stackable,
  }];
}

// 常時/条件付きの判定は、検証済みデータ（xlsxの「常時/条件付き」列）をそのまま信頼する
function isConditionalEffect(fullText, entry) {
  if (entry) return !!entry.conditional;
  return false;
}

// 「持続発動」＝発動後、一定時間バフが持続するタイプ（効果量に秒数表記があるもの）
const DURATION_RE = /[（(]\s*約?\s*\d+(?:\.\d+)?\s*秒/;
function isDurationEffect(entry) {
  const amount = entry ? entry.amount || "" : "";
  return DURATION_RE.test(amount);
}
// 持続発動効果の秒数を取り出す（例："〜(5秒)" -> "5"）
function extractDurationSeconds(entry) {
  const amount = entry ? entry.amount || "" : "";
  const m = amount.match(/[（(]\s*約?\s*(\d+(?:\.\d+)?)\s*秒/);
  return m ? m[1] : null;
}

function formatPercent(p) {
  if (!p) return null;
  if (p.text && p.text !== "記載しない") return `＝${p.text}`;
  if (p.text === "記載しない") return null;
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

// 数値スキルは「基礎名+tier」、それ以外はテキストそのものを、効果量データ・重要度データの検索キーとして使う
function skillFullText(s) {
  return s.numeric ? (s.numeric.value === 0 ? s.numeric.base : `${s.numeric.base}+${s.numeric.value}`) : s.text;
}

// 既知の表記ゆれ（全角/半角の違いなど）をExcel（マスター一覧）側の正式表記に統一する
const SKILL_TEXT_ALIASES = {
  "ガード成功時、アーツゲージを蓄積": "ガード成功時、アーツゲージ増加",
  "ガード成功時、アーツゲージを蓄積+1": "ガード成功時、アーツゲージ増加+1",
  "魔術/祈祷、効果時間延長": "魔術／祈祷、効果時間延長",
  "周囲で毒/腐敗状態の発生時、攻撃力上昇": "周囲で毒／腐敗状態の発生時、攻撃力上昇",
  "陰者": "隠者",
  "ガード成功時、HPを回復": "ガード成功時、HP回復",
  "【守護者】アーツ発動時、周囲の味方のHPを徐々に回復": "【守護者】アーツ発動時、周囲の味方HPを徐々に回復",
  "【レディ】短剣による連撃の最終攻撃命中時、周囲の敵に、直近の出来事を再演": "【レディ】短剣による最終攻撃命中時、周囲の敵に、直近の出来事を再演",
  "【レディ】短剣による連撃の最終攻撃命中時周囲の敵に、直近の出来事を再演": "【レディ】短剣による最終攻撃命中時、周囲の敵に、直近の出来事を再演",
};

// 遺物データ側のスキル表記（改行混入や表記ゆれ）を、Excel（マスター一覧）の正式表記に正規化する
function normalizeSkillText(text) {
  if (!text) return text;
  let t = text;
  // 改行が混ざっている場合：直後が「※」の注記なら切り捨てる。
  // それ以外は改行位置で句読点が失われていることがあるため、「、」で繋いだ場合とそのまま繋いだ場合の
  // 両方を試し、マスター一覧に実在する方を優先する
  if (t.includes("\n")) {
    const parts = t.split("\n");
    if (parts[1] && parts[1].startsWith("※")) {
      t = parts[0];
    } else {
      const joinedComma = parts.join("、");
      const joinedPlain = parts.join("");
      t = EFFECT_BY_NAME.has(joinedComma) ? joinedComma : joinedPlain;
    }
  }
  if (SKILL_TEXT_ALIASES[t]) return SKILL_TEXT_ALIASES[t];
  // 「陰者」はキャラ名としてどの位置に出ても「隠者」に補正する
  if (t.includes("陰者")) t = t.replace(/陰者/g, "隠者");
  return t;
}

// rawDataの行配列を [name,s1,d1,s2,d2,s3,d3,id,note,fav,sell] の11要素に揃える（旧形式の短い行にも対応）
function padRow(row) {
  const r = [...row];
  while (r.length < 11) {
    r.push(r.length === 8 ? "" : false);
  }
  return r;
}

function buildRelics(raw) {
  return raw.map((row) => {
    const [name, s1, d1, s2, d2, s3, d3, id, note, fav, sell] = row;
    const meta = parseRelic(name);
    const skills = [
      s1 ? { text: normalizeSkillText(s1), demerit: normalizeSkillText(d1) } : null,
      s2 ? { text: normalizeSkillText(s2), demerit: normalizeSkillText(d2) } : null,
      s3 ? { text: normalizeSkillText(s3), demerit: normalizeSkillText(d3) } : null,
    ]
      .filter(Boolean)
      .map((s) => ({
        ...s,
        numeric: parseNumeric(s.text) || parseBareNumeric(s.text),
        demeritNumeric: s.demerit ? getDemeritInfo(s.demerit) : null,
      }))
      .map((s) => ({ ...s, importanceKey: skillFullText(s) }));
    const effectiveSlot = meta.slot ?? skills.length;
    // 固有遺物でも、特殊アイテムDBで色が判明していればその色を使う（ビルドの色マッチ判定に使えるようにするため）
    const effectiveColor = meta.color || "固有";
    const searchBlob = (name + " " + (note || "") + " " + skills.map(s => s.text + " " + s.demerit).join(" ")).toLowerCase().replace(/＋/g, "+");
    return {
      id, name, note: note || "", fav: !!fav, sell: !!sell,
      skills, ...meta, effectiveSlot, effectiveColor, searchBlob,
    };
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
    // Excel（マスター一覧）上の掲載順に合わせる
    return keys.sort((a, b) => excelSortOrder(`N:${a}`) - excelSortOrder(`N:${b}`) || a.localeCompare(b, "ja"));
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
  return [...set].sort((a, b) => {
    const ia = DEMERIT_SORT_ORDER.indexOf(a);
    const ib = DEMERIT_SORT_ORDER.indexOf(b);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib) || a.localeCompare(b, "ja");
  });
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
    .sort((a, b) => excelSortOrder(a.value) - excelSortOrder(b.value) || a.label.localeCompare(b.label, "ja"));
}

// マスター一覧（EFFECT_TABLE）全体から、tierを除いた基礎名の一覧を作る（自動生成の効果選択肢用。所持していないものも含む）
// 並び順はExcel（マスター一覧）上での並びに合わせる
function buildMasterEffectOptions(relics) {
  const owned = new Map();
  relics.forEach((r) => r.skills.forEach((s) => {
    const key = skillIdentity(s);
    owned.set(key, (owned.get(key) || 0) + 1);
  }));
  const bases = new Map(); // base -> true
  EFFECT_TABLE.forEach((e) => {
    const m = e.name.match(/^(.+?)[+＋]\d+$/);
    const base = m ? m[1] : e.name;
    bases.set(base, true);
  });
  return [...bases.keys()]
    .map((base) => ({ value: `N:${base}`, label: base, count: owned.get(`N:${base}`) || 0 }))
    .sort((a, b) => excelSortOrder(a.value) - excelSortOrder(b.value));
}


/* baseの各スキルがcandのどのスキルにマッチするかを判定する共通ヘルパー
   （数値は同等以上、デメリットはbaseにないものを新たに持たない、という基準） */
function matchSkills(cand, base) {
  const used = new Array(cand.skills.length).fill(false);
  const baseMatched = new Array(base.skills.length).fill(false);
  base.skills.forEach((sb, bi) => {
    const idKey = skillIdentity(sb);
    for (let i = 0; i < cand.skills.length; i++) {
      if (used[i]) continue;
      const sc = cand.skills[i];
      if (skillIdentity(sc) !== idKey) continue;
      if (sb.numeric && (!sc.numeric || sc.numeric.value < sb.numeric.value)) continue;
      if (!sb.demerit) {
        if (sc.demerit) continue;
      } else if (sc.demerit) {
        if (sc.demerit === sb.demerit) {
          if (sb.demeritNumeric && sc.demeritNumeric &&
              Math.abs(sc.demeritNumeric.value) > Math.abs(sb.demeritNumeric.value)) continue;
        } else {
          continue;
        }
      }
      used[i] = true;
      baseMatched[bi] = true;
      break;
    }
  });
  return { used, baseMatched };
}

/* 「完全上位互換」判定：candが baseの全効果を同等以上でカバーし、
   candの持つデメリットが baseにない/より軽いものを除いて存在しない場合 true
   ※ビルド配置は色（と深度）だけが条件でスキル数（スロット数）の制限は無いため、スロット数は比較条件に含めない */
function dominatesOrEqual(cand, base) {
  if (cand.effectiveColor !== base.effectiveColor) return false;
  if (cand.depth !== base.depth) return false;

  const { used, baseMatched } = matchSkills(cand, base);
  if (!baseMatched.every(Boolean)) return false;

  for (let i = 0; i < cand.skills.length; i++) {
    if (!used[i] && cand.skills[i].demerit) return false; // 余剰スキルに新たなデメリットがあれば不可
  }
  return true;
}

/* 「部分的上位互換」判定：色・深度が同じで、
   candがbaseのスキルを一部（全部ではなく）含み、かつ
   お互いの「非共有スキル」の単体重要度合計を比べてcandの方が高い場合 true */
function partiallyDominates(cand, base, overrides) {
  if (cand.effectiveColor !== base.effectiveColor) return false;
  if (cand.depth !== base.depth) return false;

  const { used, baseMatched } = matchSkills(cand, base);
  const matchedCount = baseMatched.filter(Boolean).length;
  if (matchedCount === 0 || matchedCount === base.skills.length) return false; // 無関係 or 完全一致(別関数の担当)

  const candOtherImportance = cand.skills.reduce(
    (sum, s, i) => (used[i] ? sum : sum + getEffectiveImportance(s.importanceKey, overrides)), 0
  );
  const baseOtherImportance = base.skills.reduce(
    (sum, s, i) => (baseMatched[i] ? sum : sum + getEffectiveImportance(s.importanceKey, overrides)), 0
  );
  return candOtherImportance > baseOtherImportance;
}


/* 「唯一の供給源」保護：色・深度が同じグループ内で、あるスキル（tier無視の基礎名）について、
   ・最大tier（+の数）の保有者数が閾値（重ね掛け可能なら3、不可なら1）を超える場合：保護を解除する
     （トップtierだけで供給が十分足りているため）
   ・それ以外の場合：tierが高い方から順に、閾値の枚数に達するまで保護する
     （同tier内で選びきれない場合は、そのtier内の単体重要度が高い方を優先する）
   スロット数（スキル数）は判定に使わない（ビルド配置は色・深度だけが条件のため）。
   ※重ね掛け可能なスキルは、同tierの遺物が複数あれば同時装備で二重に効果が乗るため、
     「他の1枚に完全上位互換で飲み込まれているかどうか」は保護の可否に関係しない
     （その遺物固有のtierがスタック合計に必要なら、たとえ他のスキル構成で見劣りしても保護対象になる）。
   戻り値：{ protectedIds: Set, reasons: Map<relicId, [{base, groupLabel}]> } */
function computeProtectedIds(groups, overrides) {
  const protectedIds = new Set();
  const reasons = new Map();
  groups.forEach((group, groupKey) => {
    const groupLabel = `${group[0].effectiveColor}${group[0].depth}`; // 例：「燃える景色」
    const bySkill = new Map(); // 基礎名(tier無視) -> Map(relicId -> {tier, importanceKey})
    const stackableOf = new Map(); // 基礎名 -> stackable(true/false/null)
    group.forEach((r) => {
      r.skills.forEach((s) => {
        const base = s.numeric ? s.numeric.base : s.text;
        const tierValue = s.numeric ? s.numeric.value : 0;
        if (!bySkill.has(base)) bySkill.set(base, new Map());
        const byRelic = bySkill.get(base);
        const cur = byRelic.get(r.id);
        if (!cur || tierValue > cur.tier) byRelic.set(r.id, { tier: tierValue, importanceKey: s.importanceKey });
        if (!stackableOf.has(base)) {
          // DAMAGE_TABLE（攻撃力系の重ね掛けデータ、より精密）を優先し、無ければ効果量データを見る
          const dmg = DAMAGE_TABLE[s.importanceKey];
          if (dmg) {
            stackableOf.set(base, dmg.stacks);
          } else {
            const entry = lookupEffectEntry(s.importanceKey);
            stackableOf.set(base, entry ? entry.stackable : null);
          }
        }
      });
    });

    bySkill.forEach((byRelic, base) => {
      const neededMax = stackableOf.get(base) === true ? 3 : 1;

      // tierごとにグルーピングし、tierが高い順に並べる
      const byTier = new Map(); // tier -> [{id, importanceKey}]
      byRelic.forEach(({ tier, importanceKey }, id) => {
        if (!byTier.has(tier)) byTier.set(tier, []);
        byTier.get(tier).push({ id, importanceKey });
      });
      const tiersDesc = [...byTier.keys()].sort((a, b) => b - a);

      // 最大tierの保有者数が閾値を超えていたら、そのスキルによる保護は無し
      const maxTierCount = byTier.get(tiersDesc[0]).length;
      if (maxTierCount > neededMax) return;

      // tierが高い方から、閾値の枚数に達するまで保護対象を積み上げる
      // （同tier内で選びきれない場合は単体重要度が高い方を優先）
      const idsToProtect = [];
      let remaining = neededMax;
      for (const tier of tiersDesc) {
        if (remaining <= 0) break;
        const candidates = byTier.get(tier);
        if (candidates.length <= remaining) {
          candidates.forEach((c) => idsToProtect.push(c.id));
          remaining -= candidates.length;
        } else {
          const sorted = [...candidates].sort(
            (a, b) => getEffectiveImportance(b.importanceKey, overrides) - getEffectiveImportance(a.importanceKey, overrides)
          );
          sorted.slice(0, remaining).forEach((c) => idsToProtect.push(c.id));
          remaining = 0;
        }
      }

      idsToProtect.forEach((id) => {
        protectedIds.add(id);
        if (!reasons.has(id)) reasons.set(id, []);
        reasons.get(id).push({ base, groupLabel });
      });
    });
  });

  return { protectedIds, reasons };
}

/* 全遺物に対して「これを上回る遺物」の一覧を作る（完全上位互換／上位互換の両方） */
function buildDominanceMap(relics, overrides) {
  const groups = new Map();
  relics.forEach((r) => {
    if (r.sell) return; // 売却フラグ済みの遺物は上位互換の計算対象から除外する
    const key = `${r.effectiveColor}|${r.depth}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  // グループ分けを1回だけ行い、保護判定と上位互換判定の両方で使い回す（以前は同じ計算を二重に行っていた）
  const { protectedIds, reasons: protectionReasons } = computeProtectedIds(groups, overrides);

  const map = new Map(); // id -> [{id,type:'full'|'partial',skills:[skillText,...]}]
  groups.forEach((group) => {
    for (const base of group) {
      if (protectedIds.has(base.id)) continue; // 唯一の供給源として保護（売却候補にはしない）
      const supersededBy = [];
      for (const cand of group) {
        if (cand.id === base.id) continue;
        const skills = cand.skills.map((s) => s.text);
        if (dominatesOrEqual(cand, base)) {
          supersededBy.push({ id: cand.id, type: "full", skills });
        } else if (partiallyDominates(cand, base, overrides)) {
          supersededBy.push({ id: cand.id, type: "partial", skills });
        }
      }
      if (supersededBy.length) {
        supersededBy.sort((a, b) => (a.type === b.type ? 0 : a.type === "full" ? -1 : 1));
        map.set(base.id, supersededBy);
      }
    }
  });
  return { map, protectionReasons };
}



/* ---------- 盃（献器）データ：色スロット構成（通常/深層） 出典：神攻略Wiki(kamikouryaku.net) ---------- */
const CHALICE_ORDER = ["追跡者", "守護者", "鉄の目", "レディ", "無頼漢", "復讐者", "隠者", "執行者", "学者", "葬儀屋"];

/* 初期武器変更系（戦技/魔術/祈祷）の、キャラごとの使用可否データ
   ※印（自キャラの元々の初期戦技と同じ）は実質効果が無いため、使用可能リストには含めない */
const GEKI_AVAILABLE = {
  "我慢": ["追跡者","守護者","レディ","復讐者","執行者","学者","葬儀屋"], // 無頼漢は※(初期戦技のため)
  "クイックステップ": ["追跡者","守護者","レディ","無頼漢","復讐者","執行者","学者","葬儀屋"],
  "嵐脚": ["追跡者","守護者","レディ","無頼漢","復讐者","執行者","学者","葬儀屋"],
  "デターミネーション": ["追跡者","守護者","レディ","無頼漢","復讐者","執行者","学者","葬儀屋"],
  "輝剣の円陣": ["追跡者","守護者","レディ","執行者","学者"],
  "グラビタス": ["追跡者","守護者","無頼漢","執行者","学者","葬儀屋"],
  "炎撃": ["追跡者","守護者","レディ","復讐者","執行者","学者","葬儀屋"],
  "溶岩噴火": ["追跡者","無頼漢"],
  "落雷": ["追跡者","守護者","レディ","無頼漢","復讐者","執行者","学者","葬儀屋"],
  "雷撃斬": ["追跡者","レディ","無頼漢","執行者","学者","葬儀屋"],
  "聖なる刃": ["追跡者","守護者","レディ","無頼漢","執行者","学者","葬儀屋"],
  "祈りの一撃": ["無頼漢"], // 葬儀屋は※(初期戦技のため)
  "毒の霧": ["追跡者","守護者","レディ","無頼漢","執行者","学者","葬儀屋"],
  "毒蛾は二度舞う": ["レディ","執行者","学者"],
  "血の刃": ["レディ","執行者","学者"],
  "切腹": ["追跡者","守護者","執行者","学者"],
  "冷気の霧": ["追跡者","守護者","レディ","無頼漢","執行者","学者","葬儀屋"],
  "霜踏み": ["追跡者","守護者","レディ","無頼漢","復讐者","執行者","学者","葬儀屋"],
  "白い影の誘い": ["追跡者","守護者","レディ","無頼漢","執行者","学者","葬儀屋"], // 復讐者は※(初期戦技のため)
  "アローレイン": ["鉄の目"],
};
const MAJUTSU_CHAR = "隠者";
const KITOU_CHAR = "復讐者";
const FUKA_EXCLUDED_CHAR = "隠者"; // 武器の付加の枠は隠者以外の全キャラが使える

// あるスキルが、指定キャラのビルドで実際に効果を発揮するか判定する
function isSkillUsableByChar(skillText, charName) {
  let m = skillText.match(/^出撃時の武器の戦技を「(.+)」にする$/);
  if (m) return (GEKI_AVAILABLE[m[1]] || []).includes(charName);
  m = skillText.match(/^出撃時の武器の魔術を「(.+)」にする$/);
  if (m) return charName === MAJUTSU_CHAR;
  m = skillText.match(/^出撃時の武器の祈祷を「(.+)」にする$/);
  if (m) return charName === KITOU_CHAR;
  if (/^出撃時の武器に.+を付加$/.test(skillText)) return charName !== FUKA_EXCLUDED_CHAR;
  m = skillText.match(/^【(.+?)】/);
  if (m) return m[1] === charName;
  return true;
}

// スキルが「初期戦技/魔術/祈祷/武器付加変更」カテゴリのどれに属するか
// （4つの枠はそれぞれ独立しており、同じ枠の中でだけ左のスロットが優先され右は無効になる）
function weaponChangeCategory(skillText) {
  if (/^出撃時の武器の戦技を「.+」にする$/.test(skillText)) return "戦技";
  if (/^出撃時の武器の魔術を「.+」にする$/.test(skillText)) return "魔術";
  if (/^出撃時の武器の祈祷を「.+」にする$/.test(skillText)) return "祈祷";
  if (/^出撃時の武器に.+を付加$/.test(skillText)) return "付加";
  if (/^潜在する力から、.+を見つけやすくなる$/.test(skillText)) return "探索";
  return null;
}

// 「キャラ専用効果とキャラ非対応の出撃時変更が同居」判定：
// 【キャラX】専用スキルと、Xが使えない戦技/魔術/祈祷/付加変更スキルが同じ遺物にある場合、
// どのキャラで使っても必ず片方が発動しない（ゲームルール上、恒久的に確定した不噛み合い）。
function hasCharMismatchCombo(relic) {
  const texts = relic.skills.map((s) => skillFullText(s));
  for (const t of texts) {
    const m = t.match(/^【(.+?)】/);
    if (!m) continue;
    const owner = m[1];
    for (const t2 of texts) {
      if (t2 === t) continue;
      if (!weaponChangeCategory(t2)) continue;
      if (!isSkillUsableByChar(t2, owner)) return true;
    }
  }
  return false;
}

// あるスキルの「同一スキル名の重ね掛け」可否を調べる（DAMAGE_TABLEを優先、無ければ効果量データを見る）
function lookupStackable(skillText) {
  const dmg = DAMAGE_TABLE[skillText];
  if (dmg) return dmg.stacks;
  const entry = lookupEffectEntry(skillText);
  return entry ? entry.stackable : null;
}

// ビルド内（左スロットから順）で、各遺物の各スキルが実際に発動するかどうかを判定する。
// ・対象キャラでない【キャラ名】スキルは常に不発動
// ・戦技/魔術/祈祷/付加/探索の5枠は、同じ枠が既に左のスロットにあれば不発動
// ・重ね掛け不可のスキルは、完全一致する同名スキルが既に左のスロットにあれば不発動
function computeBuildActiveFlags(orderedRelics, chaliceChar) {
  const usedCategory = new Set();
  const usedNonStackable = new Set();
  return orderedRelics.map((relic) => relic.skills.map((s) => {
    const skillText = skillFullText(s);
    if (chaliceChar && !isSkillUsableByChar(skillText, chaliceChar)) return false;
    const category = weaponChangeCategory(skillText);
    if (category) {
      if (usedCategory.has(category)) return false;
      usedCategory.add(category);
      return true;
    }
    if (lookupStackable(skillText) === false) {
      if (usedNonStackable.has(skillText)) return false;
      usedNonStackable.add(skillText);
    }
    return true;
  }));
}


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
    const t = q.trim().toLowerCase().replace(/＋/g, "+");
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().replace(/＋/g, "+").includes(t));
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
      !!o.fav,
      !!(o.sell ?? o.sell_flag),
    ]);
  }
  throw new Error("認識できないデータ形式です");
}

// 内部のコンパクト行配列を、友人と共有しやすいオブジェクト形式に変換してエクスポートする
function toExportFormat(raw) {
  const relics = raw.map(([name, s1, d1, s2, d2, s3, d3, id, note, fav, sell]) => ({
    relic_name: name,
    skill1: s1 || "",
    skill1_demerit: d1 || "",
    skill2: s2 || "",
    skill2_demerit: d2 || "",
    skill3: s3 || "",
    skill3_demerit: d3 || "",
    item_id: id || "",
    note: note || "",
    fav: !!fav,
    sell: !!sell,
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

// 書き出しファイル名用：日本時間（JST, UTC+9固定）で "YYYY-MM-DD_HHmm" を返す
function jstTimestamp() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTCに+9時間してJST時刻として扱う
  const y = jst.getUTCFullYear();
  const mo = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const mi = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}_${h}${mi}`;
}

export default function RelicVault() {
  const [slotFilter, setSlotFilter] = useState(new Set());
  const [colorFilter, setColorFilter] = useState(new Set());
  const [depthFilter, setDepthFilter] = useState(new Set());
  const [keyword, setKeyword] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [sellOnly, setSellOnly] = useState(false);
  const [showObsoleteOnly, setShowObsoleteOnly] = useState(false);
  const [showCharMismatchOnly, setShowCharMismatchOnly] = useState(false);
  const [importanceMin, setImportanceMin] = useState(""); // ""=指定なし
  const [importanceMax, setImportanceMax] = useState("");
  const [selectedEffects, setSelectedEffects] = useState([]); // [{value,label}]
  const [reviewRelicId, setReviewRelicId] = useState(null); // 審査中の候補遺物（ステップ3）
  const [reviewSkillIndex, setReviewSkillIndex] = useState(0); // 審査中、今見ているスキルの番号
  const [importanceOverrides, setImportanceOverrides] = useState({}); // { [skillFullText]: number(1-10) } ユーザー調整分のみ
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loaded, setLoaded] = useState(false);

  /* 遺物データ本体（インポートで差し替え可能） */
  const [rawData, setRawData] = useState(DEFAULT_RAW);
  const [importMsg, setImportMsg] = useState("");
  const [importErr, setImportErr] = useState("");
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [showImportancePanel, setShowImportancePanel] = useState(false);
  const [importanceSearch, setImportanceSearch] = useState("");
  const fileInputRef = React.useRef(null);
  const settingsFileInputRef = React.useRef(null);

  /* 盃セレクター */
  const [chaliceChar, setChaliceChar] = useState("");
  const [chaliceName, setChaliceName] = useState("");
  const [activeBuildId, setActiveBuildId] = useState(null);

  /* ビルド枠（盃に実際に遺物を置く）：キャラ×盃ごとに、名前付きビルドを最大5個保持する */
  const [builds, setBuilds] = useState({}); // { [charName]: { [chaliceName]: [ {id,name,colors:[6],depths:[6],slots:[id|null×6]}, ... 最大5 ] } }
  const buildList = (chaliceChar && chaliceName && builds[chaliceChar] && builds[chaliceChar][chaliceName]) || [];
  const build = buildList.find((b) => b.id === activeBuildId) || null;

  /* 数値効果フィルタ */
  const [statCategory, setStatCategory] = useState("none"); // none | attack | stat | other | demerit
  const [statBase, setStatBase] = useState("all");
  const [statMin, setStatMin] = useState(0);
  const [statUsePercent, setStatUsePercent] = useState(false); // ％基準で絞り込み/並び替え

  /* 永続化：ビルド枠・重要度調整・遺物データ本体 */
  useEffect(() => {
    (async () => {
      let legacyMeta = null;
      try {
        const res = await storage.get("relic-meta", false);
        if (res && res.value) legacyMeta = JSON.parse(res.value); // 旧形式（お気に入りが個人設定側にあった名残）
      } catch (e) {
        // 未保存キー。初期状態のまま
      }
      try {
        const res2 = await storage.get("relic-builds", false);
        if (res2 && res2.value) setBuilds(migrateBuildsShape(JSON.parse(res2.value)));
      } catch (e) {
        // 未保存キー
      }
      try {
        const res2b = await storage.get("relic-importance-overrides", false);
        if (res2b && res2b.value) setImportanceOverrides(JSON.parse(res2b.value));
      } catch (e) {
        // 未保存キー
      }
      try {
        const res3 = await storage.get("relic-rawdata", false);
        if (res3 && res3.value) {
          const parsed = JSON.parse(res3.value);
          let rows = normalizeImportedData(parsed);
          // 旧形式のお気に入り（relic-meta）が残っていれば、遺物データ側に一度だけ取り込む
          if (legacyMeta) {
            rows = rows.map((row) => {
              const m = legacyMeta[row[7]];
              if (m && m.fav) {
                const r = padRow(row);
                r[9] = true;
                return r;
              }
              return row;
            });
            storage.set("relic-rawdata", JSON.stringify(rows), false).catch(() => {});
            storage.delete("relic-meta", false).catch(() => {});
          }
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
    downloadJson(`relics_export_${jstTimestamp()}.json`, toExportFormat(rawData));
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

  /* 個人設定（ビルド・重要度調整）のインポート/エクスポート
     ※お気に入り・売却フラグ・メモは遺物データ本体（JSON）側で管理するため、ここには含めない */
  const handleExportSettings = useCallback(() => {
    downloadJson(`relicvault_settings_${jstTimestamp()}.json`, {
      version: 4,
      exportedAt: new Date().toISOString(),
      builds,
      importanceOverrides,
    });
  }, [builds, importanceOverrides]);

  // 旧形式（キャラ→単一ビルド、3スロットのみ）を新形式（キャラ→盃→名前付きビルド配列、6スロット）に変換する
  const migrateBuildsShape = (raw) => {
    const out = {};
    Object.entries(raw || {}).forEach(([charName, val]) => {
      if (val && typeof val === "object" && !Array.isArray(val) && val.slots && !Object.values(val).some((v) => Array.isArray(v))) {
        // 旧形式：{char, name, mode, colors:[3], slots:[3]}
        const chaliceLabel = val.name;
        const entry = getChaliceEntry(charName, chaliceLabel);
        const colors = entry ? [...entry[1], ...entry[2]] : (val.mode === "deep" ? ["無","無","無",...val.colors] : [...val.colors,"無","無","無"]);
        const depths = ["景色","景色","景色","昏景","昏景","昏景"];
        const slots = val.mode === "deep" ? [null, null, null, ...val.slots] : [...val.slots, null, null, null];
        out[charName] = { [chaliceLabel]: [{ id: genId(), name: chaliceLabel, colors, depths, slots }] };
      } else if (val && typeof val === "object") {
        // 既に新形式（盃→配列）とみなす
        out[charName] = val;
      }
    });
    return out;
  };

  const applySettingsJson = (json) => {
    if (json.builds && typeof json.builds === "object") {
      setBuilds(migrateBuildsShape(json.builds));
      storage.set("relic-builds", JSON.stringify(migrateBuildsShape(json.builds)), false).catch(() => {});
    } else if (json.build && json.build.char) {
      // 旧形式（キャラクター共通の単一ビルド）との互換用：該当キャラのビルドとして取り込む
      const next = migrateBuildsShape({ [json.build.char]: json.build });
      setBuilds(next);
      storage.set("relic-builds", JSON.stringify(next), false).catch(() => {});
    }
    if (json.importanceOverrides && typeof json.importanceOverrides === "object") {
      setImportanceOverrides(json.importanceOverrides);
      storage.set("relic-importance-overrides", JSON.stringify(json.importanceOverrides), false).catch(() => {});
    }
    // 旧形式（version 3以前）のお気に入りは、遺物データ側にその場で取り込む
    if (json.meta && typeof json.meta === "object") {
      setRawData((prev) => {
        const next = prev.map((row) => {
          const m = json.meta[row[7]];
          if (m && m.fav) {
            const r = padRow(row);
            r[9] = true;
            return r;
          }
          return row;
        });
        storage.set("relic-rawdata", JSON.stringify(next), false).catch(() => {});
        return next;
      });
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

  // 新しい配列全体を丸ごと保存する（キャラ×盃単位で最大5個の名前付きビルドを管理）
  const persistBuildList = useCallback((charName, chaliceLabel, nextList) => {
    setBuilds((prev) => {
      const updated = { ...prev };
      const forChar = { ...(updated[charName] || {}) };
      if (nextList && nextList.length) forChar[chaliceLabel] = nextList;
      else delete forChar[chaliceLabel];
      if (Object.keys(forChar).length) updated[charName] = forChar;
      else delete updated[charName];
      storage.set("relic-builds", JSON.stringify(updated), false).catch(() => {});
      return updated;
    });
  }, []);

  // 現在アクティブな1件のビルドだけを更新する
  const persistBuild = useCallback((charName, chaliceLabel, buildId, updater) => {
    setBuilds((prev) => {
      const updated = { ...prev };
      const forChar = { ...(updated[charName] || {}) };
      const list = [...(forChar[chaliceLabel] || [])];
      const idx = list.findIndex((b) => b.id === buildId);
      if (idx === -1) return prev;
      const nextBuild = updater(list[idx]);
      if (nextBuild === null) list.splice(idx, 1);
      else list[idx] = nextBuild;
      if (list.length) forChar[chaliceLabel] = list;
      else delete forChar[chaliceLabel];
      if (Object.keys(forChar).length) updated[charName] = forChar;
      else delete updated[charName];
      storage.set("relic-builds", JSON.stringify(updated), false).catch(() => {});
      return updated;
    });
  }, []);

  // 単体重要度のユーザー調整（未調整のスキルはキー自体を持たず、原本値をそのまま使う）
  const setImportanceOverride = useCallback((skillKey, value) => {
    setImportanceOverrides((prev) => {
      const next = { ...prev };
      if (value === null) delete next[skillKey];
      else next[skillKey] = value;
      storage.set("relic-importance-overrides", JSON.stringify(next), false).catch(() => {});
      return next;
    });
  }, []);

  const resetAllImportanceOverrides = useCallback(() => {
    setImportanceOverrides({});
    storage.set("relic-importance-overrides", JSON.stringify({}), false).catch(() => {});
  }, []);

  // お気に入り・売却フラグ・メモは、個人設定ではなく遺物データ本体（JSON）に保存する
  const toggleFav = (id) => {
    const next = rawData.map((row) => {
      if (row[7] !== id) return row;
      const r = padRow(row);
      r[9] = !r[9];
      return r;
    });
    setRawData(next);
    storage.set("relic-rawdata", JSON.stringify(next), false).catch(() => {});
  };

  const toggleSell = (id) => {
    const next = rawData.map((row) => {
      if (row[7] !== id) return row;
      const r = padRow(row);
      r[10] = !r[10];
      return r;
    });
    setRawData(next);
    storage.set("relic-rawdata", JSON.stringify(next), false).catch(() => {});
  };

  /* 遺物データの個別編集・削除 */
  const rawRowById = useMemo(() => {
    const map = new Map();
    rawData.forEach((row) => map.set(row[7], row));
    return map;
  }, [rawData]);

  const updateNote = (id, note) => {
    const next = rawData.map((row) => {
      if (row[7] !== id) return row;
      const r = padRow(row);
      r[8] = note;
      return r;
    });
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
      const old = padRow(row);
      return [
        editDraft.name, editDraft.skill1, editDraft.demerit1,
        editDraft.skill2, editDraft.demerit2,
        editDraft.skill3, editDraft.demerit3,
        row[7],
        editDraft.note,
        old[9], old[10], // お気に入り・売却フラグは編集フォームの対象外なのでそのまま保持
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
      setBuilds((prev) => {
        let changed = false;
        const updated = {};
        Object.entries(prev).forEach(([charName, byChalice]) => {
          const nextByChalice = {};
          Object.entries(byChalice).forEach(([chaliceLabel, list]) => {
            nextByChalice[chaliceLabel] = list.map((b) => {
              if (!b.slots.includes(id)) return b;
              changed = true;
              return { ...b, slots: b.slots.map((s) => (s === id ? null : s)) };
            });
          });
          updated[charName] = nextByChalice;
        });
        if (changed) storage.set("relic-builds", JSON.stringify(updated), false).catch(() => {});
        return changed ? updated : prev;
      });
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

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [keyword, favOnly, sellOnly, statCategory, statBase, statMin, statUsePercent, showObsoleteOnly, showCharMismatchOnly, selectedEffects]);
  useEffect(() => { setStatBase("all"); setStatUsePercent(false); }, [statCategory]);

  // AND検索: 全角/半角スペース区切りのトークンを全て満たす
  const kwTokens = useMemo(
    () => keyword.trim().toLowerCase().replace(/＋/g, "+").split(/[\s\u3000]+/).filter(Boolean),
    [keyword]
  );

  const getChaliceEntry = (charName, chaliceLabel) =>
    (CHALICES2[charName] || []).find(([n]) => n === chaliceLabel) ||
    (CHALICES2["共通"] || []).find(([n]) => n === chaliceLabel);

  const genId = () => (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const applyChaliceFilter = (charName, chaliceLabel) => {
    if (!charName || !chaliceLabel) return;
    const entry = getChaliceEntry(charName, chaliceLabel);
    if (!entry) return;
    // 通常・深層どちらの色も、このビルド(6枠)で使う可能性があるので合わせて絞り込む
    const slots = [...entry[1], ...entry[2]].filter((c) => c !== "無");
    const nextColor = slots.length > 0 ? new Set(slots) : new Set();
    setColorFilter(nextColor);
    setVisibleCount(PAGE_SIZE);
  };

  const selectChalice = (charName, chaliceLabel) => {
    setChaliceChar(charName);
    setChaliceName(chaliceLabel);
    setActiveBuildId(null);
    applyChaliceFilter(charName, chaliceLabel);
  };

  /* ビルド枠：キャラ×盃ごとに名前付きビルドを最大5個まで */
  const MAX_BUILDS_PER_CHALICE = 5;

  const createBuild = (name) => {
    if (!chaliceChar || !chaliceName) return;
    if (buildList.length >= MAX_BUILDS_PER_CHALICE) {
      setBuildWarning(`1つの盃につきビルドは最大${MAX_BUILDS_PER_CHALICE}個までです。`);
      return;
    }
    const entry = getChaliceEntry(chaliceChar, chaliceName);
    if (!entry) return;
    const [, normalSlots, deepSlots] = entry;
    const newBuild = {
      id: genId(),
      name: name && name.trim() ? name.trim() : `ビルド${buildList.length + 1}`,
      colors: [...normalSlots, ...deepSlots],
      depths: ["景色", "景色", "景色", "昏景", "昏景", "昏景"],
      slots: [null, null, null, null, null, null],
    };
    persistBuildList(chaliceChar, chaliceName, [...buildList, newBuild]);
    setActiveBuildId(newBuild.id);
    setBuildWarning("");
  };

  const selectBuild = (buildId) => { setActiveBuildId(buildId); setBuildWarning(""); };

  const renameBuild = (buildId, newName) => {
    if (!newName || !newName.trim()) return;
    persistBuild(chaliceChar, chaliceName, buildId, (b) => ({ ...b, name: newName.trim() }));
  };

  const duplicateBuild = (buildId) => {
    const src = buildList.find((b) => b.id === buildId);
    if (!src) return;
    if (buildList.length >= MAX_BUILDS_PER_CHALICE) {
      setBuildWarning(`1つの盃につきビルドは最大${MAX_BUILDS_PER_CHALICE}個までです。`);
      return;
    }
    const copy = { ...src, id: genId(), name: `${src.name}のコピー`, slots: [...src.slots] };
    persistBuildList(chaliceChar, chaliceName, [...buildList, copy]);
    setActiveBuildId(copy.id);
  };

  const deleteBuild = (buildId) => {
    persistBuildList(chaliceChar, chaliceName, buildList.filter((b) => b.id !== buildId));
    if (activeBuildId === buildId) setActiveBuildId(null);
    setBuildWarning("");
  };

  const clearBuildSlots = () => {
    if (!build) return;
    persistBuild(chaliceChar, chaliceName, build.id, (b) => ({ ...b, slots: [null, null, null, null, null, null] }));
    setBuildWarning("");
  };

  const colorMatchesSlot = (slotColor, relicColor) =>
    slotColor === "無" || slotColor === relicColor;

  // 色に加えて深度（通常/深層）も一致するか。固有遺物は「景色」（通常）扱いなので通常の判定式のままでよい
  const slotAcceptsRelic = (b, slotIndex, relic) =>
    colorMatchesSlot(b.colors[slotIndex], relic.effectiveColor) && relic.depth === b.depths[slotIndex];

  /* rawData（デフォルト or インポート済み）から派生データを再構築 */
  const RELICS = useMemo(() => buildRelics(rawData), [rawData]);
  const NUMERIC_STATS = useMemo(() => buildNumericStats(RELICS), [RELICS]);
  const NUMERIC_BASES = useMemo(() => buildNumericBases(NUMERIC_STATS), [NUMERIC_STATS]);
  const DEMERIT_BASES = useMemo(() => buildDemeritBases(RELICS), [RELICS]);
  const EFFECT_OPTIONS = useMemo(() => buildEffectOptions(RELICS), [RELICS]);
  const MASTER_EFFECT_OPTIONS = useMemo(() => buildMasterEffectOptions(RELICS), [RELICS]);

  // 自動生成の効果選択肢：マスター一覧(Excel)全件から、今のキャラで実際に効果を発揮するものだけに絞る
  // （所持していないスキルも選択肢に出す。自動生成時に該当遺物が無ければそのスロットは空欄のまま）
  const [autoFillTarget, setAutoFillTarget] = useState("");

  const autoFillOptions = useMemo(() => {
    if (!chaliceChar) return [];
    return MASTER_EFFECT_OPTIONS.filter((o) => isSkillUsableByChar(o.value.slice(2), chaliceChar));
  }, [MASTER_EFFECT_OPTIONS, chaliceChar]);


  const { map: dominanceMap, protectionReasons } = useMemo(() => buildDominanceMap(RELICS, importanceOverrides), [RELICS, importanceOverrides]);

  const relicById = useMemo(() => {
    const map = new Map();
    RELICS.forEach((r) => map.set(r.id, r));
    return map;
  }, [RELICS]);

  // 審査パネル（ステップ3）：候補遺物の「他のスキル」を1つずつ表示し、そのスキルごとの代替候補を出す
  const reviewData = useMemo(() => {
    if (!reviewRelicId) return null;
    const relic = relicById.get(reviewRelicId);
    if (!relic) return null;
    // カードから直接「審査」を始めるので、アンカー除外はせず全スキルを1つずつ確認する
    const otherSkills = relic.skills;
    if (otherSkills.length === 0) return { relic, otherSkills: [], currentSkill: null, alternatives: [] };
    const idx = Math.min(reviewSkillIndex, otherSkills.length - 1);
    const currentSkill = otherSkills[idx];
    const currentBase = currentSkill.numeric ? currentSkill.numeric.base : currentSkill.text;
    const currentTier = currentSkill.numeric ? currentSkill.numeric.value : 0;
    // 同じ色・深度で、このスキルを候補以上のtierで持つ、他の遺物を探す
    const alternatives = RELICS.filter((r) => {
      if (r.id === relic.id || r.sell) return false;
      if (r.effectiveColor !== relic.effectiveColor || r.depth !== relic.depth) return false;
      return r.skills.some((s) => {
        const base = s.numeric ? s.numeric.base : s.text;
        const tier = s.numeric ? s.numeric.value : 0;
        return base === currentBase && tier >= currentTier;
      });
    }).sort((a, b) => {
      const ta = a.skills.find((s) => (s.numeric ? s.numeric.base : s.text) === currentBase);
      const tb = b.skills.find((s) => (s.numeric ? s.numeric.base : s.text) === currentBase);
      const va = ta && ta.numeric ? ta.numeric.value : 0;
      const vb = tb && tb.numeric ? tb.numeric.value : 0;
      return vb - va;
    }).slice(0, 5);
    return { relic, otherSkills, idx, currentSkill, currentBase, alternatives };
  }, [reviewRelicId, reviewSkillIndex, relicById, RELICS]);

  // 遺物ごとの合計重要度（スキル単体重要度の合計。ユーザー調整があればそちらを優先）
  const relicImportanceMap = useMemo(() => {
    const map = new Map();
    RELICS.forEach((r) => {
      const total = r.skills.reduce((sum, s) => sum + getEffectiveImportance(s.importanceKey, importanceOverrides), 0);
      map.set(r.id, total);
    });
    return map;
  }, [RELICS, importanceOverrides]);

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
    if (build.slots.includes(relic.id)) {
      setBuildWarning(`「${relic.name}」は既にこのビルドの別スロットにセットされています。同じ遺物を複数スロットにセットすることはできません。`);
      return;
    }
    const idx = build.slots.findIndex((v, i) => v === null && slotAcceptsRelic(build, i, relic));
    if (idx === -1) return;
    setBuildWarning("");
    const nextSlots = [...build.slots];
    nextSlots[idx] = relic.id;
    persistBuild(chaliceChar, chaliceName, build.id, (b) => ({ ...b, slots: nextSlots }));
  };

  const removeFromBuild = (idx) => {
    if (!build) return;
    const nextSlots = [...build.slots];
    nextSlots[idx] = null;
    persistBuild(chaliceChar, chaliceName, build.id, (b) => ({ ...b, slots: nextSlots }));
    setBuildWarning("");
  };

  // 指定した効果（スキル基礎名）に対する、その遺物の最大貢献値を数値化する
  const effectContribution = (relic, targetBase) => {
    let best = 0;
    relic.skills.forEach((s) => {
      const key = s.numeric ? s.numeric.base : s.text;
      if (key !== targetBase) return;
      const pct = s.numeric ? getPercent(s.numeric.base, s.numeric.value, relic.depth) : null;
      const val = pct && pct.value !== null ? pct.value : (s.numeric ? s.numeric.value : 1);
      if (val > best) best = val;
    });
    return best;
  };

  const relicHasSkillKey = (relic, key) => relic.skills.some((s) => (s.numeric ? s.numeric.base : s.text) === key);
  const relicHasCategory = (relic, category) =>
    relic.skills.some((s) => weaponChangeCategory(s.numeric ? s.numeric.base : s.text) === category);

  // 6スロット分の空き枠だけを、指定効果への貢献が高い順に貪欲法で埋める。
  // ・同一スキル名が重ね掛け不可な場合は1つ置いたらそれ以上は置かない
  // ・初期戦技/魔術/祈祷変更は「左側のスロットが優先され右は無効」になるため、
  //   　既に左側に同カテゴリの効果がある場合はそれより右には置かない（1つ置けば十分）
  function greedyFillSlots(colors, depths, initialSlots, targetBase, category, stackable) {
    const usedIds = new Set(initialSlots.filter(Boolean));
    const nextSlots = [...initialSlots];
    const alreadyHasTarget = initialSlots.some((id) => id && relicHasSkillKey(relicById.get(id), targetBase));
    const earliestCategoryIndex = category
      ? initialSlots.findIndex((id) => id && relicById.get(id) && relicHasCategory(relicById.get(id), category))
      : -1;
    let placedNew = false;
    if ((!stackable && alreadyHasTarget) || (category && earliestCategoryIndex !== -1)) {
      return { slots: nextSlots, placed: false, blocked: true };
    }
    for (let i = 0; i < nextSlots.length; i++) {
      if (nextSlots[i]) continue;
      if (!stackable && (alreadyHasTarget || placedNew)) break; // 重ね掛け不可なら1つで十分
      if (category && placedNew) break; // カテゴリ系も1つ置けば十分（右側は無効になるため）
      let bestRelic = null, bestVal = 0;
      RELICS.forEach((r) => {
        if (r.sell || usedIds.has(r.id)) return;
        if (colors[i] !== "無" && colors[i] !== r.effectiveColor) return;
        if (!r.special && r.depth !== depths[i]) return;
        const val = effectContribution(r, targetBase);
        if (val > bestVal) { bestVal = val; bestRelic = r; }
      });
      if (bestRelic) {
        nextSlots[i] = bestRelic.id;
        usedIds.add(bestRelic.id);
        placedNew = true;
      }
    }
    return { slots: nextSlots, placed: placedNew, blocked: false };
  }

  // 貪欲法による自動ビルド生成：今選んでいるビルドの空き枠だけを埋める（手動セット済みの枠はそのまま）
  const autoFillBuild = (targetIdentity) => {
    if (!build || !targetIdentity) return;
    if (!targetIdentity.startsWith("N:")) {
      setBuildWarning("この効果は数値化できないため、自動生成の対象にできません。");
      return;
    }
    const targetBase = targetIdentity.slice(2);
    const category = weaponChangeCategory(targetBase);
    const entry = lookupEffectEntry(targetBase);
    const stackable = entry ? entry.stackable !== false : true;

    const result = greedyFillSlots(build.colors, build.depths, build.slots, targetBase, category, stackable);
    if (result.blocked) {
      setBuildWarning("このスキルは既にこのビルド内で発動済みのため、追加のセットは行いませんでした。");
      return;
    }
    if (!result.placed) {
      setBuildWarning("条件に合う空き枠・遺物が見つかりませんでした。");
      return;
    }
    persistBuild(chaliceChar, chaliceName, build.id, (b) => ({ ...b, slots: result.slots }));
    setBuildWarning("");
  };

  // 盃も含めて自動選択する：そのキャラが使える全ての盃を試し、指定効果を一番伸ばせる盃でビルドを新規作成する
  const autoBuildAcrossChalices = (targetIdentity) => {
    if (!chaliceChar || !targetIdentity || !targetIdentity.startsWith("N:")) return;
    const targetBase = targetIdentity.slice(2);
    const category = weaponChangeCategory(targetBase);
    const entry = lookupEffectEntry(targetBase);
    const stackable = entry ? entry.stackable !== false : true;

    const chaliceOptions = [...(CHALICES2[chaliceChar] || []), ...(CHALICES2["共通"] || [])];
    let best = null; // { name, colors, depths, slots, score }
    chaliceOptions.forEach(([name, normalSlots, deepSlots]) => {
      const colors = [...normalSlots, ...deepSlots];
      const depths = ["景色", "景色", "景色", "昏景", "昏景", "昏景"];
      const result = greedyFillSlots(colors, depths, [null, null, null, null, null, null], targetBase, category, stackable);
      const score = result.slots.reduce((sum, id) => (id ? sum + effectContribution(relicById.get(id), targetBase) : sum), 0);
      if (score > 0 && (!best || score > best.score)) {
        best = { name, colors, depths, slots: result.slots, score };
      }
    });

    if (!best) {
      setBuildWarning("この効果を伸ばせる盃・遺物の組み合わせが見つかりませんでした。");
      return;
    }
    const existingList = (builds[chaliceChar] && builds[chaliceChar][best.name]) || [];
    if (existingList.length >= MAX_BUILDS_PER_CHALICE) {
      setBuildWarning(`一番良さそうな盃「${best.name}」は既にビルドが${MAX_BUILDS_PER_CHALICE}個あるため、新規作成できませんでした。その盃を開いて空きを作ってから再度お試しください。`);
      return;
    }
    const newBuild = {
      id: genId(),
      name: `自動生成：${targetBase.slice(0, 12)}`,
      colors: best.colors,
      depths: best.depths,
      slots: best.slots,
    };
    persistBuildList(chaliceChar, best.name, [...existingList, newBuild]);
    setChaliceName(best.name);
    setActiveBuildId(newBuild.id);
    applyChaliceFilter(chaliceChar, best.name);
    setBuildWarning("");
  };

  // ビルドにセット中の遺物から数値効果（％等）を集計する
  // ビルド内で各スロット・各スキルが実際に発動するか（左スロット優先・キャラ一致・重ね掛け可否を考慮）
  const buildActiveFlags = useMemo(() => {
    if (!build) return [];
    const orderedRelics = build.slots.map((id) => (id ? relicById.get(id) : null));
    // null（空き枠）はスキップしつつ、後で元のslotIndexへ戻せるようにインデックス対応を保持
    const nonNull = [];
    const indexMap = [];
    orderedRelics.forEach((r, i) => { if (r) { nonNull.push(r); indexMap.push(i); } });
    const flagsList = computeBuildActiveFlags(nonNull, chaliceChar);
    const bySlot = new Array(build.slots.length).fill(null);
    indexMap.forEach((slotIdx, i) => { bySlot[slotIdx] = flagsList[i]; });
    return bySlot; // bySlot[slotIndex] = [true/false, ...] または null（空き枠）
  }, [build, relicById, chaliceChar]);

// 汎用ターゲット表記のゆれ（旧「攻撃力」「カット率」/新「すべての攻撃力」「全属性カット率」）を統一する
function normalizeAttackCutTarget(target) {
  if (target === "攻撃力") return "すべての攻撃力";
  if (target === "カット率") return "全属性カット率";
  return target;
}

// 「すべての攻撃力／カット率」→「属性攻撃力／属性カット率」→「具体的な属性」という入れ子構造を畳み込む。
// 具体的なターゲット行がある場合は、そこに上位の汎用倍率を掛け合わせて表示する。
// 具体的な行が無い場合（汎用バフだけが単独である場合）はそのまま残す。
const ATTACK_ALL_GENERIC = "すべての攻撃力";
const ATTACK_ATTR_GENERIC = "属性攻撃力";
const ATTACK_SPECIFIC_ATTR = new Set(["魔力攻撃力", "炎攻撃力", "雷攻撃力", "聖攻撃力"]);
const ATTACK_SPECIFIC_PHYS = "物理攻撃力";
const CUT_ALL_GENERIC = "全属性カット率";
const CUT_ATTR_GENERIC = "属性カット率";
const CUT_SPECIFIC_ATTR = new Set(["魔力カット率", "炎カット率", "雷カット率", "聖カット率"]);
const CUT_SPECIFIC_PHYS = "物理カット率";

function foldGenericLayers(rows) {
  const byTarget = new Map(rows.map((r) => [r.target, r]));
  const usedAsGeneric = new Set();

  function fold(allGenericName, attrGenericName, specificAttrSet, specificPhysName) {
    const allGenericRow = byTarget.get(allGenericName);
    const attrGenericRow = byTarget.get(attrGenericName);
    const specificTargets = [...byTarget.keys()].filter((t) => t === specificPhysName || specificAttrSet.has(t));
    specificTargets.forEach((t) => {
      const row = byTarget.get(t);
      if (row.type !== "mult") return; // 乗算以外（加算等）は畳み込み対象外
      let mult = row.multiplier;
      if (allGenericRow && allGenericRow.type === "mult") { mult *= allGenericRow.multiplier; usedAsGeneric.add(allGenericName); }
      if (specificAttrSet.has(t) && attrGenericRow && attrGenericRow.type === "mult") { mult *= attrGenericRow.multiplier; usedAsGeneric.add(attrGenericName); }
      const pct = Math.round((mult - 1) * 10000) / 100;
      row.multiplier = mult;
      row.totalLabel = `${pct >= 0 ? "+" : ""}${pct}%`;
      row.foldedFrom = [
        allGenericRow && usedAsGeneric.has(allGenericName) ? allGenericName : null,
        specificAttrSet.has(t) && attrGenericRow && usedAsGeneric.has(attrGenericName) ? attrGenericName : null,
      ].filter(Boolean);
    });
  }
  fold(ATTACK_ALL_GENERIC, ATTACK_ATTR_GENERIC, ATTACK_SPECIFIC_ATTR, ATTACK_SPECIFIC_PHYS);
  fold(CUT_ALL_GENERIC, CUT_ATTR_GENERIC, CUT_SPECIFIC_ATTR, CUT_SPECIFIC_PHYS);

  // 具体的な行に畳み込めた汎用行は、単独表示から除外する（畳み込めなかった汎用行はそのまま残す）
  return rows.filter((r) => !usedAsGeneric.has(r.target));
}

  const buildEffectsSummary = useMemo(() => {
    if (!build) return { permanent: [], conditionalCalc: [] };
    const nameGroups = new Map(); // (fullText + "::" + target) ごとにまとめる（複合効果は同じスキルが複数targetに分かれるため）
    const demeritMap = new Map();

    build.slots.forEach((relicId, slotIdx) => {
      if (!relicId) return;
      const relic = relicById.get(relicId);
      if (!relic) return;
      const flags = buildActiveFlags[slotIdx] || relic.skills.map(() => true);
      relic.skills.forEach((s, si) => {
        if (!flags[si]) return; // 発動しないスキルは集計から除外
        if (s.numeric) {
          const fullText = s.numeric.value === 0 ? s.numeric.base : `${s.numeric.base}+${s.numeric.value}`;
          const giList = getGroupInfo(s.numeric.base, s.numeric.value); // 配列（複合効果は複数要素）
          const pct = getPercent(s.numeric.base, s.numeric.value, relic.depth);
          const entryForClassify = lookupEffectEntry(fullText);
          const conditional = isConditionalEffect(fullText, entryForClassify);
          const duration = isDurationEffect(entryForClassify);
          const display = pct ? formatPercent(pct) : (s.numeric.value === 0 ? "" : `+${s.numeric.value}`);

          if (giList.length === 0) return; // 計算方式未確定/「計算しない」→ ビルド集計には出さず、カード表示のみに留める

          giList.forEach((gi) => {
            const target = normalizeAttackCutTarget(gi.target);
            const key = `${fullText}::${target}`;
            const cur = nameGroups.get(key) || {
              name: fullText,
              target,
              type: gi.type,
              unit: gi.unit || (gi.type === "mult" ? "%" : ""),
              stackable: gi.stackable,
              conditional,
              duration,
              durationSeconds: duration ? extractDurationSeconds(entryForClassify) : null,
              condition: entryForClassify ? entryForClassify.condition : null,
              values: [],
              entries: [],
            };
            cur.values.push(gi.type === "mult" ? gi.pct : gi.amount);
            cur.entries.push({ relicName: relic.name, display });
            nameGroups.set(key, cur);
          });
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

    // ステップ2：同じtarget（強化枠）かつ同じ「発動条件グループ」を共有するスキル同士だけ重ね掛けする
    // （例：「敵を倒した時」と「致命の一撃時」はtargetが同じでも別グループなので合算しない）
    function aggregate(list) {
      const targetGroups = new Map();
      list.forEach((ng) => {
        const groupKey = `${ng.target}::${ng.condition ? conditionGroupOf(ng.condition) : ""}`;
        const cur = targetGroups.get(groupKey) || {
          target: ng.target, type: ng.type, unit: ng.unit, names: [], entries: [], conditions: new Set(),
          isDuration: false, durationSeconds: null, skillName: null,
        };
        cur.names.push(ng);
        cur.entries.push(...ng.entries);
        if (ng.condition) cur.conditions.add(ng.condition);
        if (ng.duration) {
          cur.isDuration = true;
          if (!cur.durationSeconds) cur.durationSeconds = ng.durationSeconds;
          if (!cur.skillName) cur.skillName = ng.name;
        }
        targetGroups.set(groupKey, cur);
      });
      const out = [];
      targetGroups.forEach((g) => {
        let totalLabel;
        let multiplier = 1;
        if (g.type === "mult") {
          let totalMult = 1;
          g.names.forEach((ng) => { totalMult *= 1 + ng.contrib / 100; });
          const totalPct = Math.round((totalMult - 1) * 10000) / 100;
          totalLabel = `${totalPct >= 0 ? "+" : ""}${totalPct}%`;
          multiplier = totalMult;
        } else {
          const total = Math.round(g.names.reduce((a, ng) => a + ng.contrib, 0) * 100) / 100;
          totalLabel = `${total >= 0 ? "+" : ""}${total}${g.unit}`;
        }
        out.push({
          target: g.target, totalLabel, entries: g.entries, type: g.type, multiplier,
          condition: [...g.conditions].join(" / ") || null,
          conditionGroup: g.names[0] && g.names[0].condition ? conditionGroupOf(g.names[0].condition) : "",
          demerit: false,
          isDuration: g.isDuration, durationSeconds: g.durationSeconds, skillName: g.skillName,
        });
      });
      return out;
    }

    // 2分割：常時／条件付き（持続発動＝一定時間バフも条件付きの一種としてまとめて扱う）
    const permanentContribs = nameContribs.filter((ng) => !ng.conditional);
    const conditionalCalcContribs = nameContribs.filter((ng) => ng.conditional);

    // 「すべての攻撃力／カット率」→「属性攻撃力／属性カット率」→「具体的な属性」の畳み込みは、
    // targetごとに常に1行しかない「常時」側だけに適用する（条件付き側は条件グループごとに行が分かれるため対象外）
    const permanent = foldGenericLayers(aggregate(permanentContribs));
    const conditionalCalc = aggregate(conditionalCalcContribs);

    demeritMap.forEach((d) => {
      permanent.push({
        target: d.base,
        totalLabel: `${d.total > 0 ? "+" : ""}${d.total}${d.unit}`,
        entries: d.items.map((it) => ({ relicName: it.relicName, display: `${it.value}${d.unit}` })),
        demerit: true,
      });
    });
    return { permanent, conditionalCalc };
  }, [build, relicById]);

  const canAssign = (relic) =>
    build &&
    !build.slots.includes(relic.id) &&
    build.slots.some((v, i) => v === null && slotAcceptsRelic(build, i, relic));

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
      // フィルタは「何も選択されていない＝すべて表示」。ONにしたものだけに絞り込む
      if (slotFilter.size > 0 && !slotFilter.has(r.effectiveSlot > 3 ? 3 : r.effectiveSlot)) return false;
      if (colorFilter.size > 0 && !colorFilter.has(r.effectiveColor)) return false;
      if (depthFilter.size > 0 && !r.special && !depthFilter.has(r.depth)) return false;
      if (favOnly && !r.fav) return false;
      if (sellOnly && !r.sell) return false;
      if (showObsoleteOnly && !dominanceMap.has(r.id)) return false;
      if (showCharMismatchOnly && !hasCharMismatchCombo(r)) return false;
      if (importanceMin !== "" && relicImportanceMap.get(r.id) < Number(importanceMin)) return false;
      if (importanceMax !== "" && relicImportanceMap.get(r.id) > Number(importanceMax)) return false;
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
    } else if (selectedEffects.length === 1) {
      // スキルを1つだけ選んでいる時（審査フローのステップ2）：そのスキルのtierが低い順（弱い方から）に並べる
      const target = selectedEffects[0].value;
      const tierOf = (r) => {
        const s = r.skills.find((sk) => skillIdentity(sk) === target);
        return s && s.numeric ? s.numeric.value : 0;
      };
      list = [...list].sort((a, b) => tierOf(a) - tierOf(b) || (relicImportanceMap.get(a.id) - relicImportanceMap.get(b.id)));
    }
    return list;
  }, [RELICS, slotFilter, colorFilter, depthFilter, favOnly, sellOnly, kwTokens, statCategory, statBase, statMin, statUsePercent, findMatchingSkill, showObsoleteOnly, dominanceMap, showCharMismatchOnly, selectedEffects, importanceMin, importanceMax, relicImportanceMap]);

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
        <button className="data-toggle-btn" onClick={() => setShowImportancePanel((v) => !v)}>
          {showImportancePanel ? "重要度の調整を閉じる ▲" : "スキルの単体重要度を調整 ▾"}
        </button>
      </header>

      {showImportancePanel && (
        <div className="data-panel">
          <div className="panel-title">スキルの単体重要度（1〜10、5が標準）を調整</div>
          <div className="chalice-note" style={{ marginTop: 0 }}>
            各スキルの「単体としての重要度」を自分の好みで上書きできます。未調整のものは原本の数値（下の薄い数字）がそのまま使われます。ここでの調整は個人設定として保存され、遺物カードの「重要度」表示・上位互換判定・重要度での絞り込みすべてに反映されます。
          </div>
          <div className="data-panel-row">
            <input
              className="importance-search-input"
              placeholder="スキル名で検索…"
              value={importanceSearch}
              onChange={(e) => setImportanceSearch(e.target.value)}
            />
            <button className="data-btn secondary danger" onClick={resetAllImportanceOverrides}>
              すべての調整をリセット
            </button>
          </div>
          <div className="importance-adjust-list">
            {EFFECT_TABLE
              .filter((e) => !importanceSearch.trim() || e.name.includes(importanceSearch.trim()))
              .map((e) => {
                const override = importanceOverrides[e.name];
                const effective = typeof override === "number" ? override : e.importance;
                return (
                  <div className="importance-adjust-row" key={e.name}>
                    <span className="importance-adjust-name">{e.name}</span>
                    <span className="importance-adjust-original">原本：{e.importance}</span>
                    <input
                      type="number" min={1} max={10} className="importance-adjust-input"
                      value={effective}
                      onChange={(ev) => {
                        const v = ev.target.value === "" ? null : Math.max(1, Math.min(10, Number(ev.target.value)));
                        setImportanceOverride(e.name, v === e.importance ? null : v);
                      }}
                    />
                    {typeof override === "number" && (
                      <button className="importance-adjust-reset" onClick={() => setImportanceOverride(e.name, null)}>
                        既定値に戻す
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
          <Chip active={showCharMismatchOnly} onClick={() => setShowCharMismatchOnly((v) => !v)} colorRing="#C99A5C">
            キャラ専用効果とキャラ非対応の出撃時変更が同居
          </Chip>
          <Chip active={sellOnly} onClick={() => setSellOnly((v) => !v)} colorRing="#B4553A">
            <Trash2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
            売却フラグ済み
          </Chip>
        </div>

        <div className="filter-row">
          <span className="filter-label">重要度</span>
          <input
            type="number" min={1} max={30} className="importance-range-input"
            placeholder="以上" value={importanceMin}
            onChange={(e) => setImportanceMin(e.target.value)}
          />
          <span className="importance-range-sep">〜</span>
          <input
            type="number" min={1} max={30} className="importance-range-input"
            placeholder="以下" value={importanceMax}
            onChange={(e) => setImportanceMax(e.target.value)}
          />
          {(importanceMin !== "" || importanceMax !== "") && (
            <button className="importance-range-clear" onClick={() => { setImportanceMin(""); setImportanceMax(""); }}>
              クリア
            </button>
          )}
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
        {selectedEffects.length === 1 && (
          <div className="review-step-hint">
            ステップ2：このスキルの保有者を弱い順に並べています。一番弱い遺物から「この遺物を審査」を押すと、その遺物の全スキルを1つずつ確認できます。
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
            options={[...(CHALICES2[chaliceChar] || []), ...(CHALICES2["共通"] || [])].map(([n, normalSlots, deepSlots]) => ({
              value: n,
              label: n,
              colors: normalSlots,
              deepColors: deepSlots,
            }))}
          />
        </div>

        {chaliceChar && (
          <>
            <div className="auto-fill-row">
              <SearchableListbox
                placeholder="スキル名で検索…"
                buttonLabel={autoFillTarget ? (autoFillOptions.find((o) => o.value === autoFillTarget)?.label || "効果を選択…") : "自動生成する効果を選択…"}
                onSelect={(v) => setAutoFillTarget(v)}
                options={autoFillOptions.map((o) => ({ value: o.value, label: `${o.label}（所持${o.count}件）` }))}
              />
              <button
                className="build-start-btn"
                disabled={!autoFillTarget}
                onClick={() => autoBuildAcrossChalices(autoFillTarget)}
              >
                盃も含めて自動選択・新規ビルド作成
              </button>
            </div>
            <div className="chalice-note" style={{ marginTop: 0 }}>
              選択肢は「{chaliceChar}」で実際に効果を発揮するスキルだけに絞っています（マスター一覧全件が対象、所持0件のものは自動生成時にそのスロットが空欄のまま残ります）。{chaliceChar}が使える盃の中から、この効果を一番伸ばせるものを自動で選んで新しいビルドを作ります。
            </div>
          </>
        )}

        {chaliceName && (() => {
          const entry = getChaliceEntry(chaliceChar, chaliceName);
          if (!entry) return null;
          const [, normalSlots, deepSlots] = entry;
          return (
            <>
              <div className="filter-row">
                <ChaliceSwatch colors={normalSlots} /> 通常スロット（{normalSlots.join("・")}）
                <span style={{ width: 10, display: "inline-block" }} />
                <ChaliceSwatch colors={deepSlots} /> 深層スロット（{deepSlots.join("・")}）
              </div>

              <div className="build-list-row">
                {buildList.map((b) => (
                  <button
                    key={b.id}
                    className={`build-tab${activeBuildId === b.id ? " active" : ""}`}
                    onClick={() => selectBuild(b.id)}
                  >
                    {b.name}（{b.slots.filter(Boolean).length}/6）
                  </button>
                ))}
                {buildList.length < MAX_BUILDS_PER_CHALICE && (
                  <button className="build-tab new" onClick={() => createBuild(`ビルド${buildList.length + 1}`)}>
                    ＋ 新規ビルド
                  </button>
                )}
              </div>
              {buildList.length === 0 && (
                <div className="chalice-note">この盃にはまだビルドがありません。「＋ 新規ビルド」から作成してください（最大{MAX_BUILDS_PER_CHALICE}個）。</div>
              )}
            </>
          );
        })()}

        {build && (
          <div className="build-panel">
            <div className="build-title">
              <input
                className="build-name-input"
                defaultValue={build.name}
                key={build.id}
                onBlur={(e) => { if (e.target.value !== build.name) renameBuild(build.id, e.target.value); }}
              />
              <div className="build-title-actions">
                <button className="build-clear-btn" onClick={() => duplicateBuild(build.id)}>複製</button>
                <button className="build-clear-btn" onClick={clearBuildSlots}>空にする</button>
                <button className="build-clear-btn danger" onClick={() => askConfirm(`「${build.name}」を削除します。よろしいですか？`, () => deleteBuild(build.id))}>削除</button>
              </div>
            </div>

            <div className="auto-fill-row">
              <button
                className="build-start-btn"
                disabled={!autoFillTarget}
                onClick={() => autoFillBuild(autoFillTarget)}
              >
                このビルドの空き枠だけを自動で埋める（{autoFillTarget ? autoFillOptions.find((o) => o.value === autoFillTarget)?.label || "" : "上で効果を選択してください"}）
              </button>
            </div>

            {buildWarning && (
              <div className="build-warning">⚠ {buildWarning}</div>
            )}
            <div className="build-slots">
              {build.slots.map((relicId, i) => {
                const color = build.colors[i];
                const depthLabel = build.depths[i];
                const cs = COLOR_STYLE[color === "無" ? "固有" : color] || COLOR_STYLE["固有"];
                const relic = relicId ? relicById.get(relicId) : null;
                const isDup = relicId && build.slots.filter((v) => v === relicId).length > 1;
                return (
                  <div key={i} className="build-slot" style={{ borderColor: isDup ? "#B4553A" : cs.ring }}>
                    <div className="build-slot-color" style={{ color: cs.fg }}>{color}スロット（{depthLabel}）</div>
                    {relic ? (
                      <>
                        <div className="build-slot-name" style={{ color: cs.fg }}>
                          {relic.name}
                          {isDup && <span className="dup-badge">重複</span>}
                        </div>
                        <ul className="build-slot-skills">
                          {relic.skills.map((s, si) => {
                            const pct = s.numeric ? getPercent(s.numeric.base, s.numeric.value, relic.depth) : null;
                            const flags = buildActiveFlags[i];
                            const inactive = flags ? !flags[si] : false;
                            return (
                              <li key={si} className={inactive ? "skill-inactive" : ""} title={inactive ? "このスキルは発動しません（対象外のキャラ、同じ枠の左側が優先、または重ね掛け不可で既にセット済み）" : undefined}>
                                {s.numeric ? s.numeric.base : s.text}
                                {s.numeric ? `${s.numeric.value > 0 ? ` +${s.numeric.value}` : ""}${pct && formatPercent(pct) ? ` (${formatPercent(pct)})` : ""}` : ""}
                                {s.demeritNumeric ? `　→　${s.demerit}（${s.demeritNumeric.display}）` : ""}
                                {inactive && <span className="skill-inactive-mark"> ※不発動</span>}
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

            {(buildEffectsSummary.permanent.length > 0 || buildEffectsSummary.conditionalCalc.length > 0) && (
              <div className="build-summary">
                <div className="build-summary-title">常時効果の合計</div>
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
                        {e.foldedFrom && e.foldedFrom.length > 0 && (
                          <span className="build-summary-detail"> ※{e.foldedFrom.join("・")}の汎用バフを乗算込み</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="build-summary-empty">常時発動する数値効果はありません</div>
                )}

                {buildEffectsSummary.conditionalCalc.length > 0 && (
                  <>
                    <div className="build-summary-title conditional">条件付き効果（発動中はこの分が上乗せされます）</div>
                    <ul className="build-summary-list">
                      {buildEffectsSummary.conditionalCalc.map((e, i) => (
                        <li key={i} className="conditional">
                          {e.isDuration
                            ? `${e.skillName}〈${e.target}〉（${e.durationSeconds || "?"}秒）${e.totalLabel}`
                            : (e.condition ? `${e.condition}、${e.target}${e.totalLabel}` : `${e.target}${e.totalLabel}`)}
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
                  ※重ね掛け計算ができない効果（計算方式未確定・単発の特殊効果など）は、この合計には含めず各遺物カード側に効果量をそのまま表示しています。同名スキルは重ね掛け不可なら1回分のみ・可能なら複利で合成し、別名スキル同士（同じ強化枠を共有するもの）は常に重ね掛けして計算しています。
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
            <SearchableListbox
              buttonLabel={statBase === "all" ? "項目を選択（すべて）" : statBase}
              placeholder="項目名で検索…"
              options={[{ value: "all", label: "すべて" }, ...statBaseOptions.map((b) => ({ value: b, label: b }))]}
              onSelect={(v) => setStatBase(v)}
            />
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
        {statCategory !== "none" && statCategory !== "demerit" && statBase !== "all" && statBaseHasPercent && PERCENT_MAP[statBase] && (
          <div className="chalice-info">
            実際の効果量：{Object.entries((PERCENT_MAP[statBase].deep || PERCENT_MAP[statBase].normal))
              .map(([k, v]) => `${k === "0" ? "" : "+" + k}→${v}${PERCENT_MAP[statBase].unit}`).join(" / ")}
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
          const isReviewing = reviewRelicId === r.id;
          return (
            <article
              key={r.id}
              className={`card${r.sell ? " sell-flagged" : ""}${isReviewing ? " reviewing" : ""}`}
              style={{ boxShadow: `inset 3px 0 0 ${cs.ring}` }}
            >
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
                  <button
                    className={`sell-btn${r.sell ? " active" : ""}`}
                    onClick={() => toggleSell(r.id)}
                    title={r.sell ? "売却フラグを解除" : "売却候補としてフラグを付ける"}
                  >
                    <Trash2 size={15} />
                  </button>
                  <button className="fav-btn" onClick={() => toggleFav(r.id)}>
                    <Star size={16} fill={r.fav ? "#D6B94A" : "none"} color={r.fav ? "#D6B94A" : "#5A5142"} />
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
                      const pct = n ? getPercent(n.base, n.value, r.depth) : null;
                      const dn = s.demeritNumeric;
                      return (
                        <li key={i}>
                          <span className="skill-text">
                            {n ? n.base : s.text}
                            {n && n.value > 0 && (
                              <span
                                className="numeric-badge"
                                style={{ color: ns.fg, background: ns.bg }}
                                title={CATEGORY_LABEL[n.category]}
                              >
                                +{n.value}
                              </span>
                            )}
                          </span>
                          {n && pct && pct.text && pct.text !== "記載しない" && (
                            <div className="effect-amount-text" title={pct.note || undefined}>
                              {pct.text}
                              {pct.note && <span className="effect-amount-note-mark">※</span>}
                            </div>
                          )}
                          {(() => {
                            const reasons = protectionReasons.get(r.id);
                            if (!reasons) return null;
                            const skillBase = n ? n.base : s.text;
                            const hit = reasons.find((rr) => rr.base === skillBase);
                            if (!hit) return null;
                            return <div className="protection-note">※{hit.groupLabel}で保護あり</div>;
                          })()}
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
                    const hasFull = supersede.some((x) => x.type === "full");
                    const label = hasFull ? "完全上位互換あり。" : "上位互換あり";
                    const shown = supersede.slice(0, 2).map((x) => {
                      const skillsText = x.skills.join("／");
                      return x.type === "partial" ? `[${skillsText}]（部分）` : `[${skillsText}]`;
                    }).join("、");
                    const more = supersede.length - 2;
                    return (
                      <div className="dominance-badge">
                        ⚠ {label}：{shown}{more > 0 ? ` 他${more}件` : ""}
                      </div>
                    );
                  })()}

                  <div className="importance-badge" title="このカードのスキル単体重要度の合計">
                    重要度：{relicImportanceMap.get(r.id)}
                  </div>

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
                    <button
                      className="card-edit-btn review"
                      onClick={() => { setReviewRelicId(isReviewing ? null : r.id); setReviewSkillIndex(0); }}
                    >
                      {isReviewing ? "審査を終了" : "この遺物を審査"}
                    </button>
                  </div>

                  {isReviewing && reviewData && (
                    <div className="review-panel-inline">
                      {reviewData.otherSkills.length === 0 ? (
                        <div className="chalice-note">この遺物には審査対象のスキルがありません。</div>
                      ) : (
                        <>
                          <div className="review-panel-progress">
                            スキル {reviewData.idx + 1} / {reviewData.otherSkills.length} 件目を確認中
                          </div>
                          <div className="review-panel-skill">
                            対象：{reviewData.currentSkill.numeric ? reviewData.currentSkill.numeric.base : reviewData.currentSkill.text}
                            {reviewData.currentSkill.numeric && reviewData.currentSkill.numeric.value > 0 ? ` +${reviewData.currentSkill.numeric.value}` : ""}
                          </div>
                          {reviewData.alternatives.length > 0 ? (
                            <ul className="review-panel-list">
                              {reviewData.alternatives.map((alt) => (
                                <li key={alt.id}>
                                  {alt.name}：{alt.skills.map((s) => s.numeric ? `${s.numeric.base}${s.numeric.value > 0 ? `+${s.numeric.value}` : ""}` : s.text).join(" / ")}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="chalice-note">同じ色・深度で、同等以上のtierを持つ他の遺物は見つかりませんでした。この効果に関しては唯一無二の可能性があります。</div>
                          )}
                          {reviewData.idx < reviewData.otherSkills.length - 1 ? (
                            <button className="build-start-btn" onClick={() => setReviewSkillIndex((v) => v + 1)}>
                              次のスキルへ
                            </button>
                          ) : (
                            <div className="chalice-note">全スキルを確認しました。最終判断（お気に入り・売却フラグ・メモ）はご自身で行ってください。</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
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
.build-clear-btn.danger { border-color: #B4553A; color: #D98F8F; }
.build-list-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.build-tab {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  background: rgba(185,151,74,0.06);
  border: 1px solid #3A322A;
  color: #B9AD91;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.build-tab.active {
  background: rgba(185,151,74,0.20);
  border-color: #B9974A;
  color: #EFE6CC;
}
.build-tab.new {
  border-style: dashed;
  color: #8C7F68;
}
.build-name-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid #3A322A;
  color: #EFE6CC;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 13px;
  font-weight: 700;
  padding: 2px 4px;
  outline: none;
  flex: 1;
  min-width: 100px;
}
.build-name-input:focus { border-color: #B9974A; }
.build-title-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.auto-fill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.auto-fill-row .build-start-btn {
  margin-top: 0;
}
.auto-fill-row .build-start-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
.build-slot-skills li.skill-inactive {
  color: #5A5142;
  opacity: 0.6;
}
.skill-inactive-mark {
  color: #8C6A4A;
  font-size: 10.5px;
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
  color: #B389D9;
}
.build-summary-title.duration {
  margin-top: 14px;
  color: #7FB4D9;
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
.build-summary-list li.conditional { color: #D6B87A; }
.build-summary-list li.duration { color: #7FB4D9; }
.build-summary-detail {
  font-size: 10.5px;
  color: #6E6350;
  margin-left: 6px;
}
.build-summary-condition {
  display: block;
  font-size: 10.5px;
  color: #8A8067;
  margin-bottom: 1px;
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
.importance-search-input {
  flex: 1;
  min-width: 160px;
  background: #14100C;
  border: 1px solid #2E2820;
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 12px;
  color: #B9974A;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  outline: none;
}
.importance-search-input:focus { border-color: #B9974A; }
.importance-adjust-list {
  margin-top: 12px;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid #2B241C;
  border-radius: 8px;
}
.importance-adjust-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-bottom: 1px solid #241F18;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
}
.importance-adjust-row:last-child { border-bottom: none; }
.importance-adjust-name {
  flex: 1;
  color: #D8CBB0;
}
.importance-adjust-original {
  color: #5A5142;
  font-size: 10.5px;
  white-space: nowrap;
}
.importance-adjust-input {
  width: 50px;
  background: #14100C;
  border: 1px solid #2E2820;
  border-radius: 5px;
  padding: 4px 6px;
  font-size: 12px;
  color: #B9974A;
  text-align: center;
  outline: none;
}
.importance-adjust-input:focus { border-color: #B9974A; }
.importance-adjust-reset {
  background: none;
  border: 1px solid #2E2820;
  border-radius: 5px;
  color: #8A8067;
  font-size: 10.5px;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Zen Kaku Gothic New', sans-serif;
}
.importance-adjust-reset:hover { border-color: #B9974A; color: #B9974A; }
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
  padding: 14px 16px 34px;
  display: flex;
  flex-direction: column;
  position: relative;
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
.sell-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  color: #5A5142;
}
.sell-btn:hover { color: #D98F8F; }
.sell-btn.active { color: #D98F8F; }
.card.sell-flagged {
  opacity: 0.55;
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
.card-edit-btn.review {
  border-color: #7FA9C9;
  color: #7FA9C9;
}
.review-step-hint {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  color: #7FA9C9;
  margin-top: 8px;
}
/* 審査中のカードは、内容が読みやすいようグリッドの横幅いっぱいに広げる（通常のブロック要素として展開するだけで、
   固定位置や画面切り替えを使わないため、スマホのビューポート挙動に左右されにくい） */
.card.reviewing {
  grid-column: 1 / -1;
}
.review-panel-inline {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(185,151,74,0.08);
  border: 1px solid rgba(185,151,74,0.4);
}
.review-panel-progress {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  color: #8C7F68;
  margin-bottom: 4px;
}
.review-panel-skill {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 13px;
  color: #EFE6CC;
  margin-bottom: 8px;
}
.review-panel-list {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
}
.review-panel-list li {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 12px;
  color: #B7AD94;
  line-height: 1.7;
  padding: 4px 0;
  border-bottom: 1px solid rgba(185,151,74,0.15);
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
.effect-condition-label {
  color: #C99A5C;
}
.effect-amount-sep {
  color: #45402F;
}
.effect-amount-value {
  color: #8FB5A8;
}
.effect-amount-note-mark {
  color: #B9974A;
  margin-left: 3px;
  cursor: help;
}
.protection-note {
  color: #7FA9C9;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 10.5px;
  margin-top: 1px;
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

.importance-range-input {
  width: 64px;
  background: #14100C;
  border: 1px solid #2E2820;
  border-radius: 5px;
  padding: 6px 8px;
  font-size: 12px;
  color: #B9974A;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  outline: none;
}
.importance-range-input:focus { border-color: #B9974A; }
.importance-range-input::placeholder { color: #45402F; }
.importance-range-sep { color: #6E6350; font-size: 12px; }
.importance-range-clear {
  background: none;
  border: 1px solid #2E2820;
  border-radius: 5px;
  color: #8A8067;
  font-size: 11px;
  padding: 5px 9px;
  cursor: pointer;
  font-family: 'Zen Kaku Gothic New', sans-serif;
}
.importance-range-clear:hover { border-color: #B9974A; color: #B9974A; }

.importance-badge {
  position: absolute;
  bottom: 10px;
  right: 12px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 11px;
  color: #8A8067;
  background: #14100C;
  border: 1px solid #2E2820;
  border-radius: 5px;
  padding: 2px 7px;
}


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
