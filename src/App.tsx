import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Comment {
  id: number;
  course_id: number;
  year: string;
  gpa: string;
  ease_rating: number;
  workload_rating: number;
  exam_type: string;
  material_allowed: string;
  attendance_type: string;
  passed: boolean;
  text: string;
}

interface Course {
  id: number;
  name: string;
  professor: string;
  department: string;
  credits: number;
  tags: string;
}

const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} onClick={() => onChange && onChange(i + 1)}
        style={{ fontSize: 28, cursor: onChange ? "pointer" : "default", color: i < value ? "#f59e0b" : "#3a3a5c" }}>★</span>
    ))}
  </div>
);

const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

const mostCommon = (arr: string[]) => {
  if (!arr.length) return null;
  const counts: Record<string, number> = {};
  arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const total = arr.length;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([val, count]) => ({ val, pct: Math.round(count / total * 100) }));
};

export default function App() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState("data");
  const [comments, setComments] = useState<Comment[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    year: "", gpa: "", ease_rating: 0, workload_rating: 0,
    exam_type: "", material_allowed: "", attendance_type: "", passed: "", text: "",
  });

  useEffect(() => { fetchCourses(); fetchAllComments(); }, []);
  useEffect(() => {
    if (selected) { fetchComments(selected.id); setAiSummary(""); }
  }, [selected]);

  const fetchCourses = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*");
    setCourses(data || []);
    setLoading(false);
  };

  const fetchAllComments = async () => {
    const { data } = await supabase.from("comments").select("*");
    setAllComments(data || []);
  };

  const fetchComments = async (courseId: number) => {
    const { data } = await supabase.from("comments").select("*").eq("course_id", courseId).order("id", { ascending: false });
    setComments(data || []);
  };

  const submitComment = async () => {
    if (!selected || !form.year || !form.gpa || !form.ease_rating || !form.workload_rating || !form.exam_type || !form.material_allowed || !form.attendance_type || !form.passed) return;
    setSubmitting(true);
    await supabase.from("comments").insert({
      course_id: selected.id,
      year: form.year, gpa: form.gpa,
      ease_rating: form.ease_rating, workload_rating: form.workload_rating,
      exam_type: form.exam_type, material_allowed: form.material_allowed,
      attendance_type: form.attendance_type,
      passed: form.passed === "true",
      text: form.text || null,
    });
    setForm({ year: "", gpa: "", ease_rating: 0, workload_rating: 0, exam_type: "", material_allowed: "", attendance_type: "", passed: "", text: "" });
    await fetchComments(selected.id);
    await fetchAllComments();
    setSubmitting(false);
  };

  const generateAiSummary = async () => {
    if (!comments.length) return;
    setAiLoading(true);
    const commentTexts = comments.filter(c => c.text).map(c => `・${c.year} GPA${c.gpa} ${c.passed ? "取得" : "落単"}: ${c.text}`).join("\n");
    if (!commentTexts) { setAiSummary("テキストコメントがまだありません。"); setAiLoading(false); return; }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `以下は大学の授業「${selected?.name}」に関する先輩の口コミです。これらを日本語で3〜5文にまとめてください。楽単かどうか、テストの特徴、注意点などを中心にまとめてください。\n\n${commentTexts}`
        }]
      })
    });
    const data = await response.json();
    setAiSummary(data.content[0].text);
    setAiLoading(false);
  };

  const getCourseStats = (courseId: number) => {
    const c = allComments.filter(c => c.course_id === courseId);
    if (!c.length) return null;
    return {
      easeAvg: avg(c.map(x => x.ease_rating).filter(Boolean)),
      workloadAvg: avg(c.map(x => x.workload_rating).filter(Boolean)),
      passRate: Math.round(c.filter(x => x.passed).length / c.length * 100),
      count: c.length,
      examTypes: mostCommon(c.map(x => x.exam_type).filter(Boolean)),
      materials: mostCommon(c.map(x => x.material_allowed).filter(Boolean)),
      attendance: mostCommon(c.map(x => x.attendance_type).filter(Boolean)),
    };
  };

  const filtered = courses.filter(c =>
    c.name.includes(query) || c.professor.includes(query) || c.department.includes(query) || c.tags.includes(query)
  );

  const stats = selected ? getCourseStats(selected.id) : null;
  const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "8px 10px", background: "#1a1a2e", border: "1px solid #3a3a5c", borderRadius: 6, color: "#e8e8f0", fontSize: 13, outline: "none", marginBottom: 8 };
  const labelStyle = { fontSize: 11, color: "#8888aa", marginBottom: 4, display: "block" as const };

  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif", background: "#0f0f13", minHeight: "100vh", color: "#e8e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a4a", padding: "20px 24px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>裏シラバス</h1>
            <span style={{ fontSize: 11, background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>BETA</span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#8888aa" }}>先輩たちのリアルな口コミで、賢く履修選択</p>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>🔍</span>
            <input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder="授業名・教授名・タグで検索..."
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", background: "#1e1e30", border: "1px solid #3a3a5c", borderRadius: 10, color: "#e8e8f0", fontSize: 14, outline: "none" }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px" }}>
        {!selected ? (
          <>
            <p style={{ fontSize: 12, color: "#6666aa", marginBottom: 12 }}>{loading ? "読み込み中..." : `${filtered.length}件の授業`}</p>
            {loading ? <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0" }}>データを取得中...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((course) => {
                  const s = getCourseStats(course.id);
                  return (
                    <div key={course.id} onClick={() => { setSelected(course); setActiveTab("data"); }}
                      style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a4a")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{course.name}</div>
                          <div style={{ fontSize: 12, color: "#8888aa", marginTop: 2 }}>{course.professor}｜{course.department}｜{course.credits}単位</div>
                        </div>
                        {s ? (
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>楽単 ★{s.easeAvg}</div>
                            <div style={{ fontSize: 12, color: s.passRate >= 80 ? "#22c55e" : s.passRate >= 60 ? "#eab308" : "#ef4444", fontWeight: 700 }}>取得率 {s.passRate}%</div>
                            <div style={{ fontSize: 11, color: "#6666aa" }}>{s.count}件の口コミ</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#6666aa", flexShrink: 0, marginLeft: 12 }}>口コミなし</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {course.tags.split(",").map((tag) => (
                          <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0" }}>「{query}」に一致する授業が見つかりません</div>}
              </div>
            )}
          </>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 13, padding: "0 0 16px" }}>← 一覧に戻る</button>

            {/* Header */}
            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#fff" }}>{selected.name}</h2>
              <div style={{ fontSize: 13, color: "#8888aa", marginBottom: 12 }}>{selected.professor}｜{selected.department}｜{selected.credits}単位</div>
              {stats ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "楽単レベル", value: `★${stats.easeAvg}`, color: "#f59e0b" },
                    { label: "課題&テスト", value: `★${stats.workloadAvg}`, color: "#a78bfa" },
                    { label: "単位取得率", value: `${stats.passRate}%`, color: stats.passRate >= 80 ? "#22c55e" : stats.passRate >= 60 ? "#eab308" : "#ef4444" },
                    { label: "口コミ数", value: `${stats.count}件`, color: "#7c3aed" },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "#12121e", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#6666aa" }}>まだ口コミがありません。最初の投稿者になりましょう！</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {selected.tags.split(",").map((tag) => (
                  <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[["data", "📊 授業データ"], ["comments", `💬 口コミ(${comments.length})`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ flex: 1, padding: "10px 4px", border: "1px solid", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === id ? "#7c3aed" : "#1a1a2e", borderColor: activeTab === id ? "#7c3aed" : "#2a2a4a", color: activeTab === id ? "#fff" : "#8888aa" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px" }}>
              {/* 授業データタブ */}
              {activeTab === "data" && (
                <div>
                  {!stats ? (
                    <div style={{ textAlign: "center", color: "#6666aa", padding: "30px 0" }}>口コミが集まると自動でデータが表示されます</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                      {/* テスト形式 */}
                      <div>
                        <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8 }}>✍️ テスト形式</div>
                        {stats.examTypes?.map(({ val, pct }) => (
                          <div key={val} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: "#e8e8f0" }}>{val}</span>
                              <span style={{ color: "#7c3aed", fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div style={{ background: "#12121e", borderRadius: 4, height: 6 }}>
                              <div style={{ background: "#7c3aed", borderRadius: 4, height: 6, width: `${pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 持ち込み */}
                      <div>
                        <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8 }}>📦 持ち込み可否</div>
                        {stats.materials?.map(({ val, pct }) => (
                          <div key={val} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: "#e8e8f0" }}>{val}</span>
                              <span style={{ color: "#a78bfa", fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div style={{ background: "#12121e", borderRadius: 4, height: 6 }}>
                              <div style={{ background: "#a78bfa", borderRadius: 4, height: 6, width: `${pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 出席 */}
                      <div>
                        <div style={{ fontSize: 12, color: "#8888aa", marginBottom: 8 }}>🏃 出席確認</div>
                        {stats.attendance?.map(({ val, pct }) => (
                          <div key={val} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: "#e8e8f0" }}>{val}</span>
                              <span style={{ color: "#22c55e", fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div style={{ background: "#12121e", borderRadius: 4, height: 6 }}>
                              <div style={{ background: "#22c55e", borderRadius: 4, height: 6, width: `${pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      
              )}

              {/* 口コミタブ */}
              {activeTab === "comments" && (
                <div>
                  {/* 投稿フォーム */}
                  <div style={{ background: "#12121e", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 700, marginBottom: 12 }}>口コミを投稿する</div>

                    <label style={labelStyle}>受講年度 *</label>
                    <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
                      <option value="">選択してください</option>
                      {["25年度", "24年度", "23年度", "22年度", "21年度以前"].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <label style={labelStyle}>あなたのGPA *</label>
                    <input value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} placeholder="例：3.2" style={inputStyle} />

                    <label style={labelStyle}>楽単レベル * （★5が一番楽単）</label>
                    <div style={{ marginBottom: 12 }}>
                      <StarRating value={form.ease_rating} onChange={(v) => setForm({ ...form, ease_rating: v })} />
                    </div>

                    <label style={labelStyle}>課題の少なさ＆テストの易しさ * （★5が一番楽）</label>
                    <div style={{ marginBottom: 12 }}>
                      <StarRating value={form.workload_rating} onChange={(v) => setForm({ ...form, workload_rating: v })} />
                    </div>

                    <label style={labelStyle}>テスト形式 *</label>
                    <select value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
                      <option value="">選択してください</option>
                      {["記述式", "選択式（マークシート等）", "レポート提出", "実技・発表", "テストなし"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <label style={labelStyle}>持ち込み可否 *</label>
                    <select value={form.material_allowed} onChange={(e) => setForm({ ...form, material_allowed: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
                      <option value="">選択してください</option>
                      {["持ち込み可", "持ち込み不可", "一部可（教科書のみ等）", "該当なし（テストなしの場合）"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <label style={labelStyle}>出席確認 *</label>
                    <select value={form.attendance_type} onChange={(e) => setForm({ ...form, attendance_type: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
                      <option value="">選択してください</option>
                      {["教員口頭", "学生証タッチのみ", "たまに確認", "自由", "オンデマンド"].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <label style={labelStyle}>単位取得 *</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      {[["true", "✅ 取得"], ["false", "❌ 落単"]].map(([val, label]) => (
                        <button key={val} onClick={() => setForm({ ...form, passed: val })}
                          style={{ flex: 1, padding: "8px", border: "1px solid", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, background: form.passed === val ? "#7c3aed" : "#1a1a2e", borderColor: form.passed === val ? "#7c3aed" : "#3a3a5c", color: form.passed === val ? "#fff" : "#8888aa" }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <label style={labelStyle}>コメント（任意）</label>
                    <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="授業の感想・アドバイスなど自由に" rows={3}
                      style={{ ...inputStyle, resize: "vertical" as const }} />

                    <button onClick={submitComment}
                      disabled={submitting || !form.year || !form.gpa || !form.ease_rating || !form.workload_rating || !form.exam_type || !form.material_allowed || !form.attendance_type || !form.passed}
                      style={{ width: "100%", padding: "10px", background: "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}>
                      {submitting ? "投稿中..." : "投稿する"}
                    </button>
                  </div>

                  {/* 口コミ一覧 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#6666aa", padding: "20px 0", fontSize: 13 }}>まだ口コミがありません</div>
                    ) : comments.map((c) => (
                      <div key={c.id} style={{ background: "#12121e", borderRadius: 8, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>{c.year}</span>
                            <span style={{ fontSize: 11, color: "#8888aa" }}>GPA {c.gpa}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.passed ? "#22c55e" : "#ef4444" }}>{c.passed ? "✅ 取得" : "❌ 落単"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "#8888aa" }}>楽単 </span>
                            <span style={{ color: "#f59e0b" }}>{"★".repeat(c.ease_rating)}{"☆".repeat(5 - c.ease_rating)}</span>
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "#8888aa" }}>課題&テスト </span>
                            <span style={{ color: "#a78bfa" }}>{"★".repeat(c.workload_rating)}{"☆".repeat(5 - c.workload_rating)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: c.text ? 8 : 0 }}>
                          {[c.exam_type, c.material_allowed, c.attendance_type].filter(Boolean).map(tag => (
                            <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>{tag}</span>
                          ))}
                        </div>
                        {c.text && <div style={{ fontSize: 13, color: "#ccccdd", lineHeight: 1.6 }}>{c.text}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
