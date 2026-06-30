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

const difficultyLabel = (n: number) => {
  if (n <= 1) return { text: "超楽単", color: "#22c55e" };
  if (n <= 2) return { text: "楽単", color: "#84cc16" };
  if (n === 3) return { text: "普通", color: "#eab308" };
  if (n === 4) return { text: "難しめ", color: "#f97316" };
  return { text: "激ムズ", color: "#ef4444" };
};

const dropoutColor = (n: number) => {
  if (n <= 5) return "#22c55e";
  if (n <= 15) return "#eab308";
  if (n <= 30) return "#f97316";
  return "#ef4444";
};

export default function App() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState({ year: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selected) fetchComments(selected.id);
  }, [selected]);

  const fetchCourses = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*");
    setCourses(data || []);
    setLoading(false);
  };

  const fetchComments = async (courseId: number) => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("course_id", courseId)
      .order("id", { ascending: false });
    setComments(data || []);
  };

  const submitComment = async () => {
    if (!selected || !newComment.year || !newComment.text) return;
    setSubmitting(true);
    await supabase.from("comments").insert({
      course_id: selected.id,
      year: newComment.year,
      text: newComment.text,
    });
    setNewComment({ year: "", text: "" });
    await fetchComments(selected.id);
    setSubmitting(false);
  };

  const filtered = courses.filter(
    (c) =>
      c.name.includes(query) ||
      c.professor.includes(query) ||
      c.department.includes(query) ||
      c.tags.includes(query)
  );

  const diff = selected ? difficultyLabel(selected.difficulty) : null;

  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif", background: "#0f0f13", minHeight: "100vh", color: "#e8e8f0" }}>
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
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              placeholder="授業名・教授名・タグで検索..."
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", background: "#1e1e30", border: "1px solid #3a3a5c", borderRadius: 10, color: "#e8e8f0", fontSize: 14, outline: "none" }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px" }}>
        {!selected ? (
          <>
            <p style={{ fontSize: 12, color: "#6666aa", marginBottom: 12 }}>
              {loading ? "読み込み中..." : `${filtered.length}件の授業`}
            </p>
            {loading ? (
              <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0" }}>データを取得中...</div>
            ) : filtered.length === 0 && query === "" ? (
              <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0", fontSize: 14 }}>
                まだ授業データがありません。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((course) => {
                  const d = difficultyLabel(course.difficulty);
                  return (
                    <div
                      key={course.id}
                      onClick={() => { setSelected(course); setActiveTab("info"); }}
                      style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a4a")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{course.name}</div>
                          <div style={{ fontSize: 12, color: "#8888aa", marginTop: 2 }}>{course.professor}｜{course.department}｜{course.credits}単位</div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: d.color, background: d.color + "22", padding: "2px 8px", borderRadius: 20, flexShrink: 0, marginLeft: 12 }}>{d.text}</div>
                      </div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: "#8888aa" }}>落単率 </span>
                          <span style={{ fontWeight: 700, color: dropoutColor(course.dropout) }}>{course.dropout}%</span>
                        </div>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: "#8888aa" }}>テスト </span>
                          <span style={{ color: "#e8e8f0" }}>{course.test_type}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {course.tags.split(",").map((tag) => (
                          <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", color: "#6666aa", padding: "40px 0", fontSize: 14 }}>「{query}」に一致する授業が見つかりません</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 13, padding: "0 0 16px" }}>
              ← 一覧に戻る
            </button>

            <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#fff" }}>{selected.name}</h2>
                  <div style={{ fontSize: 13, color: "#8888aa" }}>{selected.professor}｜{selected.department}｜{selected.credits}単位</div>
                </div>
                {diff && <div style={{ fontSize: 12, fontWeight: 700, color: diff.color, background: diff.color + "22", padding: "3px 10px", borderRadius: 20 }}>{diff.text}</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {[
                  { label: "落単率", value: selected.dropout + "%", color: dropoutColor(selected.dropout) },
                  { label: "難易度", value: "★".repeat(selected.difficulty) + "☆".repeat(5 - selected.difficulty), color: diff?.color ?? "#fff" },
                  { label: "口コミ数", value: comments.length + "件", color: "#7c3aed" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#12121e", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {selected.tags.split(",").map((tag) => (
                  <span key={tag} style={{ fontSize: 11, background: "#2a2a4a", color: "#aaaacc", padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>
                ))}
              </div>
            </div>

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
                  <div style={{ background: "#12121e", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginBottom: 8 }}>口コミを投稿する</div>
                    <input
                      value={newComment.year}
                      onChange={(e) => setNewComment({ ...newComment, year: e.target.value })}
                      placeholder="受講年度（例：24年度）"
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: "#1a1a2e", border: "1px solid #3a3a5c", borderRadius: 6, color: "#e8e8f0", fontSize: 13, outline: "none", marginBottom: 8 }}
                    />
                    <textarea
                      value={newComment.text}
                      onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                      placeholder="授業の感想・アドバイスを書いてください"
                      rows={3}
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: "#1a1a2e", border: "1px solid #3a3a5c", borderRadius: 6, color: "#e8e8f0", fontSize: 13, outline: "none", resize: "vertical", marginBottom: 8 }}
                    />
                    <button
                      onClick={submitComment}
                      disabled={submitting || !newComment.year || !newComment.text}
                      style={{ padding: "8px 16px", background: "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: submitting || !newComment.year || !newComment.text ? 0.5 : 1 }}
                    >
                      {submitting ? "投稿中..." : "投稿する"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#6666aa", padding: "20px 0", fontSize: 13 }}>まだ口コミがありません。最初の投稿者になりましょう！</div>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} style={{ background: "#12121e", borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 6, fontWeight: 600 }}>{c.year}受講</div>
                          <div style={{ fontSize: 13, color: "#ccccdd", lineHeight: 1.6 }}>{c.text}</div>
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
