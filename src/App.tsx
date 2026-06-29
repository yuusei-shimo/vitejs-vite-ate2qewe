import { useState } from "react";

const dummyData = [
  {
    id: 1,
    name: "経営学概論",
    professor: "田中 誠一",
    department: "経営学部",
    credits: 2,
    difficulty: 2,
    dropout: 8,
    attendance: "自由（でも期末に影響）",
    homework: "なし",
    testType: "持ち込み可・選択式",
    pastTest: "毎年ほぼ同じ傾向。教科書p.30〜60を中心に。",
    comments: [
      { year: "24年度", text: "出席取らないけど最終レポートがけっこうキツい。テーマは毎年変わる。" },
      { year: "23年度", text: "授業自体は面白い。過去問やれば余裕で単位取れます。" },
      { year: "23年度", text: "先生は優しいけどレポート採点は厳し目。2000字以上はちゃんと書いて。" },
    ],
    tags: ["楽単", "持ち込み可", "出席自由"],
  },
  {
    id: 2,
    name: "微分積分学II",
    professor: "山田 浩二",
    department: "理工学部",
    credits: 2,
    difficulty: 5,
    dropout: 43,
    attendance: "毎回出席確認あり",
    homework: "毎週提出（難しめ）",
    testType: "持ち込み不可・記述式",
    pastTest: "過去問と全然違うパターンが出る。計算ミス一発アウト。",
    comments: [
      { year: "24年度", text: "マジで難しい。TA使わないと絶対落とす。週3で質問に行ってなんとか可。" },
      { year: "24年度", text: "落単率40%超え。舐めてると普通に留年する。" },
      { year: "23年度", text: "課題だけは絶対出して。課題点で6割まで稼げる。" },
    ],
    tags: ["激ムズ", "落単注意", "要TA"],
  },
  {
    id: 3,
    name: "英語コミュニケーションA",
    professor: "Smith, J.",
    department: "共通教育",
    credits: 1,
    difficulty: 2,
    dropout: 3,
    attendance: "毎回必須（3回休んだら単位消える）",
    homework: "毎週小課題あり（軽め）",
    testType: "発表・ディスカッション形式",
    pastTest: "筆記テストなし。授業参加点が全て。",
    comments: [
      { year: "24年度", text: "Smithは優しい。英語しゃべれなくてもジェスチャーで乗り切れる笑" },
      { year: "24年度", text: "出席だけはマジで守って。それだけで単位くる。" },
      { year: "23年度", text: "楽しい授業。ただ発表あるから積極的に参加する気持ちは必要。" },
    ],
    tags: ["楽単", "出席重視", "コミュ力"],
  },
  {
    id: 4,
    name: "日本近代史",
    professor: "佐藤 由美",
    department: "文学部",
    credits: 2,
    difficulty: 3,
    dropout: 12,
    attendance: "たまに確認",
    homework: "なし",
    testType: "論述式（2問）",
    pastTest: "テーマはある程度予想できる。「明治維新の影響」系が頻出。",
    comments: [
      { year: "24年度", text: "先生の話が長くて眠いけど、試験は配布レジュメ覚えれば余裕。" },
      { year: "23年度", text: "論述だけど採点ゆるい。キーワード入れれば通る感じ。" },
      { year: "23年度", text: "授業資料がそのまま試験に出る。板書は絶対撮っておいて。" },
    ],
    tags: ["普通", "論述あり", "板書重要"],
  },
  {
    id: 5,
    name: "プログラミング基礎",
    professor: "中村 健太",
    department: "情報学部",
    credits: 2,
    difficulty: 3,
    dropout: 18,
    attendance: "毎回（遅刻2回で欠席1扱い）",
    homework: "週1でコーディング課題",
    testType: "実技試験（PC使用可）",
    pastTest: "過去問あり。基本的な構文問題が中心。",
    comments: [
      { year: "24年度", text: "課題をコピペしてるのバレて単位落とした人いる。ちゃんと自分でやって。" },
      { year: "24年度", text: "PC使えるから試験自体は楽。課題が積み重なるのがキツい。" },
      { year: "23年度", text: "先生は質問しやすい。詰まったらすぐ聞いた方がいい。" },
    ],
    tags: ["実技試験", "課題多め", "コピペ厳禁"],
  },
];

const difficultyLabel = (n) => {
  if (n <= 1) return { text: "超楽単", color: "#22c55e" };
  if (n <= 2) return { text: "楽単", color: "#84cc16" };
  if (n === 3) return { text: "普通", color: "#eab308" };
  if (n === 4) return { text: "難しめ", color: "#f97316" };
  return { text: "激ムズ", color: "#ef4444" };
};

const dropoutColor = (n) => {
  if (n <= 5) return "#22c55e";
  if (n <= 15) return "#eab308";
  if (n <= 30) return "#f97316";
  return "#ef4444";
};

export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("info");

  const filtered = dummyData.filter(
    (c) =>
      c.name.includes(query) ||
      c.professor.includes(query) ||
      c.department.includes(query) ||
      c.tags.some((t) => t.includes(query))
  );

  const diff = selected ? difficultyLabel(selected.difficulty) : null;

  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif", background: "#0f0f13", minHeight: "100vh", color: "#e8e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a4a", padding: "20px 24px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
              裏シラバス
            </h1>
            <span style={{ fontSize: 11, background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>BETA</span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#8888aa" }}>先輩たちのリアルな口コミで、賢く履修選択</p>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>🔍</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              placeholder="授業名・教授名・タグで検索..."
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px",
                background: "#1e1e30", border: "1px solid #3a3a5c", borderRadius: 10,
                color: "#e8e8f0", fontSize: 14, outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px" }}>
        {!selected ? (
          <>
            <p style={{ fontSize: 12, color: "#6666aa", marginBottom: 12 }}>{filtered.length}件の授業</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((course) => {
                const d = difficultyLabel(course.difficulty);
                return (
                  <div
                    key={course.id}
                    onClick={() => { setSelected(course); setActiveTab("info"); }}
                    style={{
                      background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12,
                      padding: "14px 16px", cursor: "pointer", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2a2a4a"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{course.name}</div>
                        <div style={{ fontSize: 12, color: "#8888aa", marginTop: 2 }}>{course.professor}｜{course.department}｜{course.credits}単位</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: d.color, background: d.color + "22", padding: "2px 8px", borderRadius: 20 }}>{d.text}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: "#8888aa" }}>落単率 </span>
                        <span style={{ fontWeight: 700, color: dropoutColor(course.dropout) }}>{course.dropout}%</span>
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: "#8888aa" }}>テスト </span>
                        <span style={{ color: "#e8e8f0" }}>{course.testType}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {course.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0", fontSize: 14 }}>
                  「{query}」に一致する授業が見つかりません
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            {/* Back */}
            <button
              onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 13, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}
            >
              ← 一覧に戻る
            </button>

            {/* Course header */}
            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#fff" }}>{selected.name}</h2>
                  <div style={{ fontSize: 13, color: "#8888aa" }}>{selected.professor}｜{selected.department}｜{selected.credits}単位</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: diff.color, background: diff.color + "22", padding: "3px 10px", borderRadius: 20 }}>{diff.text}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {[
                  { label: "落単率", value: selected.dropout + "%", color: dropoutColor(selected.dropout) },
                  { label: "難易度", value: "★".repeat(selected.difficulty) + "☆".repeat(5 - selected.difficulty), color: diff.color },
                  { label: "口コミ数", value: selected.comments.length + "件", color: "#7c3aed" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#12121e", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {selected.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag}</span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[["info", "📋 授業情報"], ["test", "📝 テスト情報"], ["comments", "💬 口コミ"]].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    flex: 1, padding: "8px 4px", border: "1px solid", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                    background: activeTab === id ? "#7c3aed" : "#1a1a2e",
                    borderColor: activeTab === id ? "#7c3aed" : "#2a2a4a",
                    color: activeTab === id ? "#fff" : "#8888aa",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px" }}>
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: "🏃", label: "出席", value: selected.attendance },
                    { icon: "📚", label: "課題", value: selected.homework },
                    { icon: "✍️", label: "テスト形式", value: selected.testType },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 14, color: "#e8e8f0" }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "test" && (
                <div>
                  <div style={{ fontSize: 12, color: "#6666aa", marginBottom: 8 }}>過去問・傾向</div>
                  <div style={{ fontSize: 14, color: "#e8e8f0", lineHeight: 1.7, background: "#12121e", borderRadius: 8, padding: 12 }}>
                    {selected.pastTest}
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selected.comments.map((c, i) => (
                    <div key={i} style={{ background: "#12121e", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 6, fontWeight: 600 }}>{c.year}受講</div>
                      <div style={{ fontSize: 13, color: "#ccccdd", lineHeight: 1.6 }}>{c.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}