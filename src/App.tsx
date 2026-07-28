import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  bg: "#fffdf0",
  card: "#ffffff",
  border: "#FFE566",
  borderStrong: "#FFD700",
  accent: "#FFD700",
  accentDark: "#b8960a",
  text: "#1a1a1a",
  textMuted: "#777777",
  textLight: "#aaaaaa",
  green: "#16a34a",
  greenBg: "#f0fff4",
  red: "#dc2626",
  redBg: "#fff5f5",
  orange: "#ea580c",
};

interface User { id: string; email: string; user_metadata: { full_name?: string; avatar_url?: string }; }
interface Comment { id: number; course_id: number; year: string; gpa: string; ease_rating: number; workload_rating: number; exam_type: string; material_allowed: string; attendance_type: string; passed: boolean; text: string; user_id?: string; }
interface Course { id: number; name: string; professor: string; department: string; credits: number; tags: string; university: string; }
type Screen = "top" | "courses" | "detail" | "add_course" | "terms";

const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} onClick={() => onChange && onChange(i + 1)}
        style={{ fontSize: 28, cursor: onChange ? "pointer" : "default", color: i < value ? "#FFD700" : "#e0e0e0" }}>★</span>
    ))}
  </div>
);

const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
const mostCommon = (arr: string[]) => {
  if (!arr.length) return [];
  const counts: Record<string, number> = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const total = arr.length;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([val, count]) => ({ val, pct: Math.round(count / total * 100) }));
};
const BarChart = ({ items, color }: { items: { val: string; pct: number }[]; color: string }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {items.map(({ val, pct }) => (
      <div key={val}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: C.text }}>{val}</span>
          <span style={{ color, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ background: "#f0f0f0", borderRadius: 4, height: 8 }}>
          <div style={{ background: color, borderRadius: 4, height: 8, width: `${pct}%`, transition: "width 0.5s" }} />
        </div>
      </div>
    ))}
  </div>
);
const similarity = (a: string, b: string) => {
  const s1 = a.toLowerCase().replace(/\s/g, "");
  const s2 = b.toLowerCase().replace(/\s/g, "");
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  let matches = 0;
  for (const c of s1) { if (s2.includes(c)) matches++; }
  return matches / Math.max(s1.length, s2.length);
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ points: number; is_og: boolean; og_number: number | null; ad_free: boolean } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [screen, setScreen] = useState<Screen>("top");
  const [uniQuery, setUniQuery] = useState("");
  const [selectedUni, setSelectedUni] = useState("");
  const [query, setQuery] = useState("");
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState("data");
  const [comments, setComments] = useState<Comment[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [courseAdded, setCourseAdded] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [similarCourses, setSimilarCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ year: "", gpa: "", ease_rating: 0, workload_rating: 0, exam_type: "", material_allowed: "", attendance_type: "", passed: "", text: "" });
  const [courseForm, setCourseForm] = useState({ name: "", professor: "", department: "", credits: "", university: "" });

  useEffect(() => {
    fetchAllCourses(); fetchAllComments();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user as User ?? null);
      if (session) fetchOrCreateProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user as User ?? null);
      if (session) {
        setShowLoginModal(false);
        fetchOrCreateProfile(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (selected) fetchComments(selected.id); }, [selected]);

  useEffect(() => {
    if (!courseForm.name || courseForm.name.length < 2 || !courseForm.university) { setSimilarCourses([]); setDuplicateError(""); return; }
    const uniCourses = allCourses.filter(c => c.university === courseForm.university);
    const exact = uniCourses.find(c => c.name === courseForm.name && c.professor === courseForm.professor);
    if (exact) { setDuplicateError("この授業名と教員名の組み合わせはすでに登録されています。"); setSimilarCourses([]); return; }
    setDuplicateError("");
    setSimilarCourses(uniCourses.filter(c => c.name !== courseForm.name && similarity(c.name, courseForm.name) > 0.5).slice(0, 3));
  }, [courseForm.name, courseForm.professor, courseForm.university, allCourses]);

  const fetchAllCourses = async () => { const { data } = await supabase.from("courses").select("*"); setAllCourses(data || []); };
  const fetchAllComments = async () => { const { data } = await supabase.from("comments").select("*"); setAllComments(data || []); };
  const fetchComments = async (courseId: number) => {
    const { data } = await supabase.from("comments").select("*").eq("course_id", courseId).order("id", { ascending: false });
    setComments(data || []);
  };
  const loginWithGoogle = async () => { await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } }); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); };

  const fetchOrCreateProfile = async (userId: string) => {
    const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (existing) { setProfile(existing); return; }
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const ogCount = count ?? 0;
    const isOg = ogCount < 1000;
    const ogNumber = isOg ? ogCount + 1 : null;
    const { data: created } = await supabase.from("profiles").insert({ id: userId, points: 0, is_og: isOg, og_number: ogNumber, ad_free: isOg }).select().single();
    setProfile(created);
  };
  const hasContribution = profile?.ad_free || (user && allComments.some(c => c.user_id === user.id));
  const requireLogin = (action: () => void) => { if (!user) { setShowLoginModal(true); return; } action(); };

  const submitReport = async () => {
    if (!reportReason || showReportModal === null) return;
    await supabase.from("reports").insert({ comment_id: showReportModal, reason: reportReason, reported_by: user?.id || null });
    setReportSent(true);
    setTimeout(() => { setShowReportModal(null); setReportReason(""); setReportSent(false); }, 2000);
  };

  const submitCourse = async () => {
    if (!courseForm.name || !courseForm.professor || !courseForm.university || !courseForm.credits || duplicateError) return;
    setAddingCourse(true);
    await supabase.from("courses").insert({ name: courseForm.name, professor: courseForm.professor, department: courseForm.department || null, credits: parseInt(courseForm.credits), university: courseForm.university, tags: "" });
    const uni = courseForm.university;
    setCourseForm({ name: "", professor: "", department: "", credits: "", university: "" });
    setSimilarCourses([]);
    await fetchAllCourses();
    setAddingCourse(false); setCourseAdded(true); setSelectedUni(uni); setScreen("courses");
    setTimeout(() => setCourseAdded(false), 3000);
  };

  const submitComment = async () => {
    if (!selected || !form.year || !form.gpa || !form.ease_rating || !form.workload_rating || !form.exam_type || !form.material_allowed || !form.attendance_type || !form.passed) return;
    setSubmitting(true);
    await supabase.from("comments").insert({ course_id: selected.id, year: form.year, gpa: form.gpa, ease_rating: form.ease_rating, workload_rating: form.workload_rating, exam_type: form.exam_type, material_allowed: form.material_allowed, attendance_type: form.attendance_type, passed: form.passed === "true", text: form.text || null, user_id: user?.id || null });
    setForm({ year: "", gpa: "", ease_rating: 0, workload_rating: 0, exam_type: "", material_allowed: "", attendance_type: "", passed: "", text: "" });
    await fetchComments(selected.id); await fetchAllComments();
    setSubmitting(false);
  };

  const getCourseStats = (courseId: number) => {
    const c = allComments.filter(c => c.course_id === courseId);
    if (!c.length) return null;
    return { easeAvg: avg(c.map(x => x.ease_rating).filter(Boolean)), workloadAvg: avg(c.map(x => x.workload_rating).filter(Boolean)), passRate: Math.round(c.filter(x => x.passed).length / c.length * 100), count: c.length, examTypes: mostCommon(c.map(x => x.exam_type).filter(Boolean)), materials: mostCommon(c.map(x => x.material_allowed).filter(Boolean)), attendance: mostCommon(c.map(x => x.attendance_type).filter(Boolean)) };
  };

  const universities = Array.from(new Set(allCourses.map(c => c.university).filter(Boolean)));
  const filteredUnis = universities.filter(u => u.includes(uniQuery));
  const filteredCourses = allCourses.filter(c => c.university === selectedUni && (c.name.includes(query) || c.professor.includes(query) || (c.department || "").includes(query) || (c.tags || "").includes(query)));
  const stats = selected ? getCourseStats(selected.id) : null;

  const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "8px 10px", background: "#fffdf0", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14, outline: "none", marginBottom: 8 };
  const labelStyle = { fontSize: 11, color: C.textMuted, marginBottom: 4, display: "block" as const };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", marginBottom: 12 };

  return (
    <div style={{ fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>

      {/* 通報モーダル */}
      {showReportModal !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, maxWidth: 360, width: "90%" }}>
            {reportSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: C.green }}>通報を受け付けました</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>ご協力ありがとうございます</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🚨 この口コミを通報する</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>通報理由を選択してください</div>
                {["教員への誹謗中傷", "事実と異なる情報", "スパム・宣伝", "その他"].map(r => (
                  <div key={r} onClick={() => setReportReason(r)}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${reportReason === r ? C.accentDark : C.border}`, background: reportReason === r ? "#fffacc" : "#fff", marginBottom: 6, cursor: "pointer", fontSize: 13, fontWeight: reportReason === r ? 700 : 400 }}>
                    {r}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => { setShowReportModal(null); setReportReason(""); }} style={{ flex: 1, padding: "10px", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 13, cursor: "pointer" }}>キャンセル</button>
                  <button onClick={submitReport} disabled={!reportReason} style={{ flex: 2, padding: "10px", background: C.accent, border: "none", borderRadius: 6, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !reportReason ? 0.5 : 1 }}>通報する</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ログインモーダル */}
      {showLoginModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
            <h3 style={{ margin: "0 0 8px", color: C.text, fontSize: 18 }}>ログインが必要です</h3>
            <p style={{ margin: "0 0 8px", color: C.textMuted, fontSize: 13 }}>口コミの投稿・授業の追加にはGoogleアカウントでのログインが必要です</p>
            <div style={{ background: "#fffacc", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: C.accentDark, fontWeight: 600 }}>
              👑 先着1000名限定：永久無料＆広告なし特典！
            </div>
            <button onClick={loginWithGoogle} style={{ width: "100%", padding: "12px", background: C.accent, border: "none", borderRadius: 8, color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
              G　Googleでログイン
            </button>
            <button onClick={() => setShowLoginModal(false)} style={{ width: "100%", padding: "10px", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontSize: 13, cursor: "pointer" }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: `2px solid ${C.accent}`, padding: "14px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setScreen("top"); setSelectedUni(""); setSelected(null); setQuery(""); }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>楽単.jp</span>
          </div>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {profile?.is_og && (
                <span style={{ fontSize: 10, background: C.accent, color: C.accentDark, padding: "2px 8px", borderRadius: 20, fontWeight: 700, border: `1px solid ${C.accentDark}` }}>
                  👑 OG#{String(profile.og_number).padStart(3, "0")}
                </span>
              )}
              {hasContribution && !profile?.is_og && <span style={{ fontSize: 10, background: C.greenBg, color: C.green, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>広告なし</span>}
              <img src={user.user_metadata.avatar_url} style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${profile?.is_og ? C.accentDark : C.accent}` }} />
              <button onClick={logout} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>ログアウト</button>
            </div>
          ) : (
            <button onClick={loginWithGoogle} style={{ padding: "6px 14px", background: C.accent, border: "none", borderRadius: 8, color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>ログイン</button>
          )}
        </div>
        <div style={{ maxWidth: 720, margin: "6px auto 0" }}>
          {screen === "courses" && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={() => { setScreen("top"); setSelectedUni(""); setQuery(""); }} style={{ background: "none", border: "none", color: C.accentDark, cursor: "pointer", fontSize: 12, padding: 0 }}>← トップ</button><span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{selectedUni}</span></div>}
          {screen === "add_course" && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={() => { setScreen(selectedUni ? "courses" : "top"); setSimilarCourses([]); setDuplicateError(""); }} style={{ background: "none", border: "none", color: C.accentDark, cursor: "pointer", fontSize: 12, padding: 0 }}>← 戻る</button><span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>口コミ・授業を追加</span></div>}
          {screen === "detail" && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={() => { setScreen("courses"); setSelected(null); }} style={{ background: "none", border: "none", color: C.accentDark, cursor: "pointer", fontSize: 12, padding: 0 }}>← {selectedUni}</button><span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{selected?.name}</span></div>}
          {screen === "terms" && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={() => setScreen("top")} style={{ background: "none", border: "none", color: C.accentDark, cursor: "pointer", fontSize: 12, padding: 0 }}>← トップ</button><span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>利用規約</span></div>}
        </div>
      </div>

      {/* 広告バナー */}
      {!hasContribution && (
        <div style={{ background: "#fffacc", borderBottom: `1px solid ${C.border}`, padding: "6px 16px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: C.textMuted }}>先着1000名限定</span>
            <span style={{ color: C.accentDark, cursor: "pointer" }} onClick={() => user ? null : setShowLoginModal(true)}>
              {user ? "口コミを1件投稿すると広告が消えます！" : "先着1000名は永久無料＆広告なし！今すぐログイン →"}
            </span>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px" }}>

        {/* トップ */}
        {screen === "top" && (
          <div>
            <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎓</div>
              <h2 style={{ margin: "0 0 6px", fontSize: 22, color: C.text }}>楽単特化！学生の味方サイト</h2>
            </div>

            <div style={{ marginBottom: 20 }}>
              <button onClick={() => requireLogin(() => { setScreen("add_course"); setCourseForm({ name: "", professor: "", department: "", credits: "", university: "" }); })}
                style={{ width: "100%", padding: "16px 12px", background: C.accent, border: `1px solid ${C.borderStrong}`, borderRadius: 12, color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>📚</span>
                <span>口コミ・授業を追加する</span>
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</span>
              <input value={uniQuery} onChange={(e) => setUniQuery(e.target.value)} placeholder="大学名を検索..."
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 12px 12px 38px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: "none" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredUnis.map((uni) => {
                const uniCourses = allCourses.filter(c => c.university === uni);
                const uniComments = allComments.filter(c => uniCourses.some(course => course.id === c.course_id));
                return (
                  <div key={uni} onClick={() => { setSelectedUni(uni); setScreen("courses"); setQuery(""); setCourseAdded(false); }}
                    style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accentDark)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 2 }}>{uni}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{uniCourses.length}授業 · {uniComments.length}件の口コミ</div>
                    </div>
                    <span style={{ color: C.accentDark, fontSize: 18 }}>→</span>
                  </div>
                );
              })}
              {filteredUnis.length === 0 && <div style={{ textAlign: "center", color: C.textMuted, padding: "30px 0", fontSize: 14 }}>{uniQuery ? `「${uniQuery}」に一致する大学が見つかりません` : "大学データがありません"}</div>}
            </div>

            {/* フッター */}
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
              <button onClick={() => setScreen("terms")} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>利用規約</button>
              <span style={{ color: C.textLight, margin: "0 8px", fontSize: 12 }}>|</span>
              <span style={{ color: C.textLight, fontSize: 12 }}>© 2025 楽単.jp</span>
            </div>
          </div>
        )}

        {/* 利用規約 */}
        {screen === "terms" && (
          <div style={cardStyle}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, color: C.text }}>利用規約</h2>
            {[
              { title: "第1条（目的）", body: "本サービス「楽単.jp」（以下「本サービス」）は、大学生が授業に関する口コミ情報を共有するためのプラットフォームです。" },
              { title: "第2条（禁止事項）", body: "ユーザーは以下の行為を行ってはなりません。\n・教員・学生個人への誹謗中傷や名誉毀損\n・事実と異なる虚偽情報の投稿\n・スパムや宣伝目的の投稿\n・他者のプライバシーを侵害する投稿\n・その他、公序良俗に反する行為" },
              { title: "第3条（投稿内容の責任）", body: "投稿内容の責任はユーザー本人に帰属します。本サービスは投稿内容の正確性を保証しません。" },
              { title: "第4条（コンテンツの削除）", body: "運営者は、禁止事項に該当すると判断した投稿を予告なく削除できるものとします。通報機能を通じてご連絡いただいた場合、内容を確認のうえ対応します。" },
              { title: "第5条（免責事項）", body: "本サービスに掲載された情報の利用により生じた損害について、運営者は一切の責任を負いません。" },
              { title: "第6条（規約の変更）", body: "運営者は必要に応じて本規約を変更できるものとします。変更後の規約はサービス上に掲示した時点で効力を生じます。" },
            ].map(({ title, body }) => (
              <div key={title} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8, whiteSpace: "pre-line" }}>{body}</div>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: 12, background: "#fffacc", borderRadius: 8, fontSize: 12, color: C.accentDark }}>
              制定日：2025年1月1日　運営：楽単.jp
            </div>
          </div>
        )}

        {/* 授業一覧 */}
        {screen === "courses" && (
          <div>
            {courseAdded && <div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: C.green }}>✅ 授業を追加しました！</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="授業名・教授名で検索..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: "none" }} />
              </div>
              <button onClick={() => requireLogin(() => { setScreen("add_course"); setCourseForm({ name: "", professor: "", department: "", credits: "", university: selectedUni }); setSimilarCourses([]); setDuplicateError(""); })}
                style={{ padding: "10px 14px", background: C.accent, border: "none", borderRadius: 10, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                ＋ 授業追加
              </button>
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{filteredCourses.length}件の授業</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredCourses.map((course) => {
                const s = getCourseStats(course.id);
                return (
                  <div key={course.id} onClick={() => { setSelected(course); setScreen("detail"); setActiveTab("data"); }}
                    style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accentDark)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{course.name}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{course.professor}{course.department ? `｜${course.department}` : ""}｜{course.credits}単位</div>
                      </div>
                      {s ? (
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 12, color: C.accentDark, fontWeight: 700 }}>楽単 ★{s.easeAvg}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: s.passRate >= 80 ? C.green : s.passRate >= 60 ? C.orange : C.red }}>取得率 {s.passRate}%</div>
                          <div style={{ fontSize: 11, color: C.textLight }}>{s.count}件の口コミ</div>
                        </div>
                      ) : <div style={{ fontSize: 11, color: C.textLight, flexShrink: 0, marginLeft: 12 }}>口コミなし</div>}
                    </div>
                    {course.tags && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{course.tags.split(",").filter(Boolean).map((tag) => <span key={tag} style={{ fontSize: 11, background: "#fffacc", color: C.accentDark, padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>)}</div>}
                  </div>
                );
              })}
              {filteredCourses.length === 0 && <div style={{ textAlign: "center", color: C.textMuted, padding: "40px 0" }}>授業がまだありません。「＋ 授業追加」から追加しましょう！</div>}
            </div>
          </div>
        )}

        {/* 授業追加フォーム */}
        {screen === "add_course" && (
          <div style={cardStyle}>
            <div style={{ fontSize: 15, color: C.text, fontWeight: 700, marginBottom: 16 }}>📚 授業を追加する</div>
            <label style={labelStyle}>大学名 *</label>
            <select value={courseForm.university} onChange={(e) => setCourseForm({ ...courseForm, university: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
              <option value="">大学を選択してください</option>
              {universities.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <label style={labelStyle}>授業名 *</label>
            <input value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="例：経営学概論" style={{ ...inputStyle, borderColor: duplicateError ? C.red : C.border }} />
            {duplicateError && <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 12, color: C.red }}>⚠️ {duplicateError}</div>}
            {similarCourses.length > 0 && (
              <div style={{ background: "#fffacc", border: `1px solid ${C.borderStrong}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: C.accentDark, fontWeight: 700, marginBottom: 6 }}>⚠️ 似た授業がすでに登録されています。これじゃないですか？</div>
                {similarCourses.map(c => (
                  <div key={c.id} onClick={() => { setSelected(c); setSelectedUni(c.university); setScreen("detail"); }} style={{ fontSize: 12, color: C.text, padding: "6px 8px", background: "#fff", borderRadius: 6, cursor: "pointer", marginBottom: 4, border: `1px solid ${C.border}` }}>
                    <span style={{ fontWeight: 700 }}>{c.name}</span><span style={{ color: C.textMuted }}> / {c.professor}</span>
                    <span style={{ color: C.accentDark, marginLeft: 8, fontSize: 11 }}>→ この授業を見る</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>違う場合はそのまま追加できます</div>
              </div>
            )}
            <label style={labelStyle}>教員名 *</label>
            <input value={courseForm.professor} onChange={(e) => setCourseForm({ ...courseForm, professor: e.target.value })} placeholder="例：田中 誠一" style={inputStyle} />
            <label style={labelStyle}>学部・学科（任意）</label>
            <input value={courseForm.department} onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })} placeholder="例：商学部" style={inputStyle} />
            <label style={labelStyle}>単位数 *</label>
            <select value={courseForm.credits} onChange={(e) => setCourseForm({ ...courseForm, credits: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
              <option value="">選択してください</option>
              {["1", "2", "3", "4"].map(c => <option key={c} value={c}>{c}単位</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => { setScreen(selectedUni ? "courses" : "top"); setSimilarCourses([]); setDuplicateError(""); }} style={{ flex: 1, padding: "10px", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>キャンセル</button>
              <button onClick={submitCourse} disabled={addingCourse || !courseForm.name || !courseForm.professor || !courseForm.university || !courseForm.credits || !!duplicateError}
                style={{ flex: 2, padding: "10px", background: C.accent, border: "none", borderRadius: 6, color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (addingCourse || !!duplicateError) ? 0.5 : 1 }}>
                {addingCourse ? "追加中..." : "授業を追加する"}
              </button>
            </div>
          </div>
        )}

        {/* 授業詳細 */}
        {screen === "detail" && selected && (
          <div>
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, color: C.text }}>{selected.name}</h2>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{selected.professor}{selected.department ? `｜${selected.department}` : ""}｜{selected.credits}単位</div>
              {stats ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {[
                    { label: "楽単レベル", value: `★${stats.easeAvg}`, color: C.accentDark },
                    { label: "課題&テスト", value: `★${stats.workloadAvg}`, color: C.orange },
                    { label: "単位取得率", value: `${stats.passRate}%`, color: stats.passRate >= 80 ? C.green : stats.passRate >= 60 ? C.orange : C.red },
                    { label: "口コミ数", value: `${stats.count}件`, color: C.text },
                  ].map((s) => (
                    <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: "10px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontSize: 13, color: C.textMuted }}>まだ口コミがありません。最初の投稿者になりましょう！</div>}
              {selected.tags && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>{selected.tags.split(",").filter(Boolean).map((tag) => <span key={tag} style={{ fontSize: 11, background: "#fffacc", color: C.accentDark, padding: "2px 8px", borderRadius: 20 }}>#{tag.trim()}</span>)}</div>}
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[["data", "📊 授業データ"], ["comments", `💬 口コミ(${comments.length})`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ flex: 1, padding: "10px 4px", border: `1px solid ${activeTab === id ? C.accentDark : C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === id ? C.accent : "#fff", color: C.text }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={cardStyle}>
              {activeTab === "data" && (
                !stats ? <div style={{ textAlign: "center", color: C.textMuted, padding: "30px 0" }}>口コミが集まると自動でデータが表示されます</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>✍️ テスト形式</div><BarChart items={stats.examTypes} color={C.accentDark} /></div>
                    <div><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>📦 持ち込み可否</div><BarChart items={stats.materials} color={C.orange} /></div>
                    <div><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>🏃 出席確認</div><BarChart items={stats.attendance} color={C.green} /></div>
                  </div>
                )
              )}

              {activeTab === "comments" && (
                <div>
                  {!user ? (
                    <div style={{ background: "#fffacc", borderRadius: 8, padding: 20, marginBottom: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>🔐</div>
                      <div style={{ fontSize: 14, color: C.text, marginBottom: 4, fontWeight: 700 }}>口コミを投稿するにはログインが必要です</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>投稿すると広告も非表示になります！</div>
                      <button onClick={loginWithGoogle} style={{ padding: "10px 24px", background: C.accent, border: "none", borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Googleでログインして投稿する</button>
                    </div>
                  ) : (
                    <div style={{ background: C.bg, borderRadius: 8, padding: 12, marginBottom: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 13, color: C.accentDark, fontWeight: 700, marginBottom: 12 }}>口コミを投稿する</div>
                      <label style={labelStyle}>受講年度 *</label>
                      <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={{ ...inputStyle, appearance: "none" as const }}>
                        <option value="">選択してください</option>
                        {["25年度", "24年度", "23年度", "22年度", "21年度以前"].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <label style={labelStyle}>あなたのGPA *</label>
                      <input value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} placeholder="例：3.2" style={inputStyle} />
                      <label style={labelStyle}>楽単レベル * （★5が一番楽単）</label>
                      <div style={{ marginBottom: 12 }}><StarRating value={form.ease_rating} onChange={(v) => setForm({ ...form, ease_rating: v })} /></div>
                      <label style={labelStyle}>課題の少なさ＆テストの易しさ * （★5が一番楽）</label>
                      <div style={{ marginBottom: 12 }}><StarRating value={form.workload_rating} onChange={(v) => setForm({ ...form, workload_rating: v })} /></div>
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
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        {[["true", "✅ 取得"], ["false", "❌ 落単"]].map(([val, label]) => (
                          <button key={val} onClick={() => setForm({ ...form, passed: val })}
                            style={{ flex: 1, padding: "8px", border: `1px solid ${form.passed === val ? C.accentDark : C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, background: form.passed === val ? C.accent : "#fff", color: C.text }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <label style={labelStyle}>コメント（任意）</label>
                      <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="授業の感想・アドバイスなど自由に" rows={3} style={{ ...inputStyle, resize: "vertical" as const }} />
                      <button onClick={submitComment}
                        disabled={submitting || !form.year || !form.gpa || !form.ease_rating || !form.workload_rating || !form.exam_type || !form.material_allowed || !form.attendance_type || !form.passed}
                        style={{ width: "100%", padding: "10px", background: C.accent, border: "none", borderRadius: 6, color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.5 : 1 }}>
                        {submitting ? "投稿中..." : "投稿する"}
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: "center", color: C.textMuted, padding: "20px 0", fontSize: 13 }}>まだ口コミがありません</div>
                    ) : comments.map((c) => (
                      <div key={c.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: C.accentDark, fontWeight: 700 }}>{c.year}</span>
                            <span style={{ fontSize: 11, color: C.textMuted }}>GPA {c.gpa}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.passed ? C.green : C.red }}>{c.passed ? "✅ 取得" : "❌ 落単"}</span>
                          </div>
                          {/* 通報ボタン */}
                          <button onClick={() => setShowReportModal(c.id)}
                            style={{ background: "none", border: "none", color: C.textLight, fontSize: 11, cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
                            title="この口コミを通報する">
                            🚨 通報
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 12 }}><span style={{ color: C.textMuted }}>楽単 </span><span style={{ color: C.accentDark }}>{"★".repeat(c.ease_rating)}{"☆".repeat(5 - c.ease_rating)}</span></div>
                          <div style={{ fontSize: 12 }}><span style={{ color: C.textMuted }}>課題&テスト </span><span style={{ color: C.orange }}>{"★".repeat(c.workload_rating)}{"☆".repeat(5 - c.workload_rating)}</span></div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: c.text ? 8 : 0 }}>
                          {[c.exam_type, c.material_allowed, c.attendance_type].filter(Boolean).map(tag => <span key={tag} style={{ fontSize: 11, background: "#fffacc", color: C.accentDark, padding: "2px 8px", borderRadius: 20 }}>{tag}</span>)}
                        </div>
                        {c.text && <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{c.text}</div>}
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
