"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Post = { angle: string; hook: string; body: string; hashtags: string[] };

const TONES = [
  { id: "Professional", emoji: "💼" },
  { id: "Inspirational", emoji: "✨" },
  { id: "Witty", emoji: "😏" },
  { id: "Storytelling", emoji: "📖" },
  { id: "Bold", emoji: "🔥" },
  { id: "Educational", emoji: "🎓" },
];

const LENGTHS = [
  { id: "short", label: "Short", hint: "~70 words" },
  { id: "medium", label: "Medium", hint: "~160 words" },
  { id: "long", label: "Long", hint: "~300 words" },
];

const MODELS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
];

const PROFESSIONS = ["Software Engineer", "Founder", "Product Manager", "Designer", "Marketer", "Recruiter"];

const SURPRISE_TOPICS = [
  "What I learned from my biggest career mistake",
  "Why I stopped saying yes to every meeting",
  "The one tool that 10x'd my team's productivity",
  "How AI changed the way I work this year",
  "Hiring for attitude vs. hiring for skill",
  "Lessons from shipping a product nobody wanted",
  "The underrated power of writing things down",
  "What burnout taught me about boundaries",
];

const ROTATING = ["get read.", "spark debate.", "build your brand.", "open doors."];

const LOADING_STEPS = ["Brainstorming angles…", "Sharpening the hooks…", "Polishing every line…", "Picking hashtags…"];

const KEY_STORAGE = "postcraft.gemini-key";

function storageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function initials(text: string) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "Y").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function fullText(p: Post) {
  const tags = p.hashtags.length ? "\n\n" + p.hashtags.map((h) => `#${h}`).join(" ") : "";
  return `${p.hook}\n\n${p.body.trim()}${tags}`;
}

function burstConfetti(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const colors = ["#7c5cff", "#22d3ee", "#f472b6", "#facc15", "#34d399"];
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 70;
    piece.style.left = `${rect.left + rect.width / 2}px`;
    piece.style.top = `${rect.top + rect.height / 2}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * dist - 30}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 900);
  }
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(false);
  const [topic, setTopic] = useState("");
  const [profession, setProfession] = useState("");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("medium");
  const [model, setModel] = useState(MODELS[0].id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = storageGet(KEY_STORAGE);
    if (saved) {
      setApiKey(saved);
      setRememberKey(true);
    }
  }, []);

  useEffect(() => {
    storageSet(KEY_STORAGE, rememberKey && apiKey ? apiKey : null);
  }, [rememberKey, apiKey]);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING.length), 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length), 1800);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const generate = useCallback(async () => {
    if (loading) return;
    if (!apiKey.trim()) return setError("Paste your Gemini API key first. It's free from Google AI Studio.");
    if (!topic.trim()) return setError("Tell me what the post is about.");
    setError(null);
    setLoading(true);
    setPosts([]);
    if (window.innerWidth < 1000) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-key": apiKey.trim() },
        body: JSON.stringify({ topic, tone, length, profession, model }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [apiKey, topic, tone, length, profession, model, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generate]);

  const lengthIndex = LENGTHS.findIndex((l) => l.id === length);

  return (
    <>
      <div className="bg" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="grid" />
        <div className="spotlight" />
        <div className="noise" />
      </div>

      <main className="shell">
        <header className="hero">
          <div className="badge">
            <span className="pulse" /> Powered by Gemini 3.5
          </div>
          <h1>
            LinkedIn posts that{" "}
            <span className="rotator">
              {ROTATING.map((w, i) => (
                <span key={w} className={i === wordIndex ? "word on" : "word"}>
                  {w}
                </span>
              ))}
            </span>
          </h1>
          <p className="sub">
            Drop in a topic. Pick a vibe. Get <strong>three</strong> scroll-stopping drafts in seconds.
          </p>
        </header>

        <div className="layout">
          <section className="panel glass">
            <div className="field">
              <label htmlFor="key">
                <span className="step">1</span> Your Gemini API key
              </label>
              <div className="key-wrap">
                <span className="key-icon">🔑</span>
                <input
                  id="key"
                  type={showKey ? "text" : "password"}
                  placeholder="AIza…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="button" className="ghost-btn" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <div className="key-meta">
                <label className="toggle">
                  <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
                  <span className="track">
                    <span className="thumb" />
                  </span>
                  Remember on this device
                </label>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  Get a free key ↗
                </a>
              </div>
              <p className="fine">Your key is sent only to Google with each request. It is never stored on our server.</p>
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor="topic">
                  <span className="step">2</span> What&apos;s it about?
                </label>
                <button
                  type="button"
                  className="ghost-btn dice"
                  onClick={() => setTopic(SURPRISE_TOPICS[Math.floor(Math.random() * SURPRISE_TOPICS.length)])}
                >
                  🎲 Surprise me
                </button>
              </div>
              <textarea
                id="topic"
                rows={3}
                maxLength={1000}
                placeholder="e.g. What I learned leading a team through a product launch"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <span className="counter">{topic.length}/1000</span>
            </div>

            <div className="field">
              <label htmlFor="profession">
                <span className="step">3</span> Your profession
              </label>
              <input
                id="profession"
                type="text"
                placeholder="e.g. Data Scientist"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
              <div className="chips small">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={profession === p ? "chip on" : "chip"}
                    onClick={() => setProfession(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                <span className="step">4</span> Tone
              </label>
              <div className="tones">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={tone === t.id ? "tone on" : "tone"}
                    onClick={() => setTone(t.id)}
                  >
                    <span className="emoji">{t.emoji}</span>
                    {t.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                <span className="step">5</span> Length
              </label>
              <div className="segment" style={{ "--i": lengthIndex } as React.CSSProperties}>
                <span className="segment-pill" />
                {LENGTHS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={length === l.id ? "on" : ""}
                    onClick={() => setLength(l.id)}
                  >
                    {l.label}
                    <small>{l.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="model">Model</label>
              <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" className="cta" onClick={generate} disabled={loading}>
              <span className="cta-glow" />
              <span className="cta-label">
                {loading ? (
                  <>
                    <span className="spinner" /> Crafting…
                  </>
                ) : (
                  <>✦ Generate 3 posts</>
                )}
              </span>
            </button>
            <p className="shortcut">
              or press <kbd>⌘</kbd> + <kbd>Enter</kbd>
            </p>

            {error && (
              <div className="error" role="alert">
                <span>⚠️</span> {error}
              </div>
            )}
          </section>

          <section className="results" ref={resultsRef}>
            {loading && (
              <>
                <div className="status">
                  <span className="dot" />
                  {LOADING_STEPS[loadingStep]}
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="post glass skeleton" style={{ animationDelay: `${i * 120}ms` }}>
                    <div className="sk-head">
                      <div className="sk-avatar" />
                      <div className="sk-lines">
                        <div className="sk-line w40" />
                        <div className="sk-line w25" />
                      </div>
                    </div>
                    <div className="sk-line w90" />
                    <div className="sk-line w80" />
                    <div className="sk-line w95" />
                    <div className="sk-line w60" />
                  </div>
                ))}
              </>
            )}

            {!loading && posts.length === 0 && <EmptyState />}

            {!loading &&
              posts.map((p, i) => (
                <PostCard key={`${i}-${p.hook}`} post={p} index={i} profession={profession || "Professional"} />
              ))}

            {!loading && posts.length > 0 && (
              <button type="button" className="regen" onClick={generate}>
                ↻ Not quite right? Regenerate
              </button>
            )}
          </section>
        </div>

        <footer className="foot">
          Built with Next.js &amp; the Gemini API · Deploy on Vercel
        </footer>
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <div className="float-stack">
        <div className="ghost-card g1">
          <span>💡</span> &ldquo;I almost didn&apos;t ship it. Here&apos;s why I&apos;m glad I did.&rdquo;
        </div>
        <div className="ghost-card g2">
          <span>🔥</span> &ldquo;Unpopular opinion: your resume doesn&apos;t matter.&rdquo;
        </div>
        <div className="ghost-card g3">
          <span>📈</span> &ldquo;5 habits that doubled my output this year.&rdquo;
        </div>
      </div>
      <h3>Your drafts will appear here</h3>
      <p>Fill in the details on the left and hit generate. Each draft takes a different angle.</p>
    </div>
  );
}

function PostCard({ post, index, profession }: { post: Post; index: number; profession: string }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => fullText(post));
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const readSecs = Math.max(5, Math.round((words / 230) * 60));
  const [firstLine, ...rest] = text.split("\n");
  const restText = rest.join("\n").replace(/^\n+/, "");
  const long = restText.length > 220;

  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    burstConfetti(btn);
    setTimeout(() => setCopied(false), 1800);
  };

  const onMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el || editing || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${-y * 3}deg`);
    el.style.setProperty("--ry", `${x * 4}deg`);
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const onLeave = () => {
    cardRef.current?.style.setProperty("--rx", "0deg");
    cardRef.current?.style.setProperty("--ry", "0deg");
  };

  const renderLine = (line: string, key: number) => (
    <span key={key}>
      {line.split(/(#[\p{L}\p{N}_]+)/u).map((part, j) =>
        part.startsWith("#") ? (
          <span key={j} className="tag">
            {part}
          </span>
        ) : (
          part
        )
      )}
      {"\n"}
    </span>
  );

  const shownRest = !long || expanded ? restText : restText.slice(0, 220).replace(/\s+\S*$/, "");

  return (
    <article
      ref={cardRef}
      className="post glass reveal"
      style={{ animationDelay: `${index * 140}ms` }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="post-top">
        <span className="option">
          Option {index + 1} <span className="sep">·</span> {post.angle}
        </span>
        <span className="meter" title="LinkedIn allows 3,000 characters">
          <span className="meter-fill" style={{ width: `${Math.min(100, (chars / 3000) * 100)}%` }} />
        </span>
      </div>

      <div className="li-head">
        <div className="avatar">{initials(profession)}</div>
        <div>
          <div className="li-name">
            You <span className="li-degree">· 1st</span>
          </div>
          <div className="li-title">{profession}</div>
          <div className="li-time">Just now · 🌐</div>
        </div>
      </div>

      {editing ? (
        <textarea className="edit" value={text} onChange={(e) => setText(e.target.value)} rows={12} autoFocus />
      ) : (
        <div className="li-body">
          <strong className="hook">{firstLine}</strong>
          {shownRest.split("\n").map(renderLine)}
          {long && (
            <button type="button" className="more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "…show less" : "…see more"}
            </button>
          )}
        </div>
      )}

      <div className="li-reactions">
        <span className="react-icons">
          <i>👍</i>
          <i>❤️</i>
          <i>💡</i>
        </span>
        <span className="react-count">Ready to post</span>
      </div>

      <div className="post-foot">
        <div className="stats">
          <span>{words} words</span>
          <span>{chars.toLocaleString()} chars</span>
          <span>{readSecs}s read</span>
        </div>
        <div className="actions">
          <button type="button" className="ghost-btn" onClick={() => setEditing((v) => !v)}>
            {editing ? "✓ Done" : "✎ Edit"}
          </button>
          <button type="button" className={copied ? "copy done" : "copy"} onClick={copy}>
            {copied ? "✓ Copied!" : "Copy post"}
          </button>
        </div>
      </div>
    </article>
  );
}
