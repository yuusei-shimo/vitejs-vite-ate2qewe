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
  passed: boolean;
  text: string;
}

interface Course {
  id: number;
  name: string;
  professor: string;
  department: string;
  credits: number;
  difficulty: number;
  dropout: number;
  attendance: string;
  homework: string;
  test_type: string;
  past_test: string;
  tags: string;
}

const StarRating = ({ value, onChange, max = 5 }: { value: number; onChange?: (v: number) => void; max?: number }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: max }).map((_, i) => (
      <span
        key={i}
        onClick={() => onChange && onChange(i + 1)}
        style={{ fontSize: 24, cursor: onChange ? "pointer" : "default", color: i < value ? "#f59e0b" : "#3a3a5c" }}
      >
        ★
      </span>
    ))}
  </div>
);

const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

export default function App() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [comments, setComments] = useState<Comment[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    year: "",
    gpa: "",
    ease_rating: 0,
    workload_rating: 0,
    exam_type: "",
    material_allowed: "",
    passed: "",
    text: "",
  });

  useEffect(() => { fetchCourses(); fetchAllComments(); }, []);
  useEffect(() => { if (selected) fetchComments(selected.id); }, [selected]);

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
    if (!selected || !form.year || !form.gpa || !form.ease_rating || !form.workload_rating || !form.exam_type || !form.material_allowed || !form.passed) return;
    setSubmitting(true);
    await supabase.from("comments").insert({
      course_id: selected.id,
      year: form.year,
      gpa: form.gpa,
      ease_rating: form.ease_rating,
      workload_rating: form.workload_rating,
      exam_type: form.exam_type,
      material_allowed: form.material_allowed,
      passed: form.passed === "true",
      text: form.text || null,
    });
    setForm({ year: "", gpa: "", ease_rating: 0, workload_rating: 0, exam_type: "", material_allowed: "", passed: "", text: "" });
    await fetchComments(selected.id);
    await fetchAllComments();
    setSubmitting(false);
  };

  const getCourseStats = (courseId: number) => {
    const c = allComments.filter(c => c.course_id === courseId);
    if (!c.length) return null;
    const easeAvg = avg(c.map(x => x.ease_rating).filter(Boolean));
    const workloadAvg = avg(c.map(x => x.workload_rating).filter(Boolean));
    const passRate = Math.round(c.filter(x => x.passed).length / c.length * 100);
    return { easeAvg, workloadAvg, passRate, count: c.length };
  };

  const filtered = courses.filter(c =>
    c.name.includes(query) || c.professor.includes(query) || c.department.includes(query) || c.tags.includes(query)
  );

  const stats = selected ? getCourseStats(selected.id) : null;

  const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "8px 10px", background: "#1a1a2e", border: "1px solid #3a3a5c", borderRadius: 6, color: "#e8e8f0", fontSize: 13, outline: "none", marginBottom: 8 };
  const labelStyle = { fontSize: 11, color: "#8888aa", marginBottom: 4, display: "block" };

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
            <input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder="授業名・教授名・タグで検索..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", background: "#1e1e30", border: "1px solid #3a3a5c", borderRadius: 10, color: "#e8e8f0", fontSize: 14, outline: "none" }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px" }}>
        {!selected ? (
          <>
            <p style={{ fontSize: 12, color: "#6666aa", marginBottom: 12 }}>{loading ? "読み込み中..." : `${filtered.length}件の授業`}</p>
            {loading ? (
              <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0" }}>データを取得中...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((course) => {
                  const s = getCourseStats(course.id);
                  return (
                    <div key={course.id} onClick={() => { setSelected(course); setActiveTab("info"); }}
                      style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a4a")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{course.name}</div>
                          <div style={{ fontSize: 12, color: "#8888aa", marginTop: 2 }}>{course.professor}｜{course.department}｜{course.credits}単位</div>
                        </div>
                        {s && (
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                            <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>★{s.easeAvg} 楽単</div>
                            <div style={{ fontSize: 11, color: s.passRate >= 80 ? "#22c55e" : s.passRate >= 60 ? "#eab308" : "#ef4444", fontWeight: 700 }}>取得率 {s.passRate}%</div>
                          </div>
                        )}
                      </div>
                      {s && (
                        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "#8888aa" }}>楽単レベル </span>
                            <span style={{ color: "#f59e0b" }}>{"★".repeat(Math.round(Number(s.easeAvg)))}</span>
                            <span style={{ color: "#3a3a5c" }}>{"★".repeat(5 - Math.round(Number(s.easeAvg)))}</span>
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "#8888aa" }}>口コミ </span>
                            <span style={{ color: "#e8e8f0" }}>{s.count}件</span>
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {course.tags.split(",").map((tag) => (
                          <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0", fontSize: 14 }}>「{query}」に一致する授業が見つかりません</div>}
              </div>
            )}
          </>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 13, padding: "0 0 16px" }}>← 一覧に戻る</button>

            {/* Course header */}
            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#fff" }}>{selected.name}</h2>
                  <div style={{ fontSize: 13, color: "#8888aa" }}>{selected.professor}｜{selected.department}｜{selected.credits}単位</div>
                </div>
              </div>
              {stats ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
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
                <div style={{ marginTop: 12, fontSize: 13, color: "#6666aa" }}>まだ口コミがありません。最初の投稿者になりましょう！</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {selected.tags.split(",").map((tag) => (
                  <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[["info", "📋 授業情報"], ["test", "📝 テスト情報"], ["comments", `💬 口コミ(${comments.length})`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "8px 4px", border: "1px solid", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, background: activeTab === id ? "#7c3aed" : "#1a1a2e", borderColor: activeTab === id ? "#7c3aed" : "#2a2a4a", color: activeTab === id ? "#fff" : "#8888aa" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px" }}>
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: "🏃", label: "出席", value: selected.attendance },
                    { icon: "📚", label: "課題", value: selected.homework },
                    { icon: "✍️", label: "テスト形式", value: selected.test_type },
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
                  <div style={{ fontSize: 14, color: "#e8e8f0", lineHeight: 1.7, background: "#12121e", borderRadius: 8, padding: 12 }}>{selected.past_test}</div>
                </div>
              )}

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
                    <div style={{ marginBottom: 8 }}>
                      <StarRating value={form.ease_rating} onChange={(v) => setForm({ ...form, ease_rating: v })} />
                    </div>

                    <label style={labelStyle}>課題の少なさ＆テストの易しさ * （★5が一番楽）</label>
                    <div style={{ marginBottom: 8 }}>
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

                    <button onClick={submitComment} disabled={submitting || !form.year || !form.gpa || !form.ease_rating || !form.workload_rating || !form.exam_type || !form.material_allowed || !form.passed}
                      style={{ width: "100%", padding: "10px", background: "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}>
                      {submitting ? "投稿中..." : "投稿する"}
                    </button>
                  </div>

                  {/* 口コミ一覧 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#6666aa", padding: "20px 0", fontSize: 13 }}>まだ口コミがありません</div>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} style={{ background: "#12121e", borderRadius: 8, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>{c.year}</span>
                              <span style={{ fontSize: 11, color: "#8888aa" }}>GPA {c.gpa}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: c.passed ? "#22c55e" : "#ef4444" }}>{c.passed ? "✅ 取得" : "❌ 落単"}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: "#8888aa" }}>楽単 </span>
                              <span style={{ color: "#f59e0b" }}>{"★".repeat(c.ease_rating)}{"☆".repeat(5 - c.ease_rating)}</span>
                            </div>
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: "#8888aa" }}>課題&テスト </span>
                              <span style={{ color: "#a78bfa" }}>{"★".repeat(c.workload_rating)}{"☆".repeat(5 - c.workload_rating)}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginBottom: c.text ? 8 : 0 }}>
                            <span style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>{c.exam_type}</span>
                            <span style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>{c.material_allowed}</span>
                          </div>
                          {c.text && <div style={{ fontSize: 13, color: "#ccccdd", lineHeight: 1.6, marginTop: 8 }}>{c.text}</div>}
                        </div>
                      ))
                    )}
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
