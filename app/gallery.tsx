"use client";
import { useEffect, useRef, useState } from "react";
import { categories, Component, previewDocument } from "@/lib/components";
import type { User } from "@/lib/auth";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" />
      </>
    ),
    github: (
      <path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.4-2-1-2 4-.5 6-2 6-6 0-2-.5-3-1.5-4 .3-1 .3-2-.2-3-2 0-3 1-4 1a15 15 0 0 0-5 0C8 3 7 3 5 3c-.5 1-.5 2-.2 3C4 7 4 8 4 10c0 4 2 5.5 6 6-.6.5-1 1-1 2v4" />
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    heart: (
      <path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 8 8 14 8-6 12-10 8-14Z" />
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20" />,
    trash: (
      <>
        <path d="M4 7h16m-10 4v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.code}
    </svg>
  );
}
function Preview({
  item,
}: {
  item: Pick<Component, "html" | "css" | "title">;
}) {
  return (
    <iframe
      title={item.title + " 미리보기"}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={previewDocument(item)}
    />
  );
}
function Modal({
  children,
  onClose,
  title,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="close" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function download(item: Component, kind: "html" | "css") {
  const content =
    kind === "css"
      ? item.css
      : '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="stylesheet" href="' +
        item.id +
        '.css">\n<title>' +
        item.title.replace(/[<>&"]/g, "") +
        "</title>\n</head>\n<body>\n" +
        item.html +
        "\n</body>\n</html>";
  const url = URL.createObjectURL(
    new Blob([content], {
      type:
        kind === "css" ? "text/css;charset=utf-8" : "text/html;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = item.id + "." + kind;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Gallery({
  initialItems,
  user,
  authReady,
  purchasedIds,
}: {
  initialItems: Component[];
  user: User | null;
  authReady: boolean;
  purchasedIds: string[];
}) {
  const [items, setItems] = useState(initialItems),
    [category, setCategory] = useState("전체"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured"),
    [saved, setSaved] = useState<string[]>([]),
    [view, setView] = useState("explore"),
    [selected, setSelected] = useState<Component | null>(null),
    [tab, setTab] = useState("preview"),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [purchased, setPurchased] = useState(purchasedIds);
  const [title, setTitle] = useState(""),
    [uploadCategory, setUploadCategory] = useState("버튼"),
    [price, setPrice] = useState("0"),
    [html, setHtml] = useState(
      '<button class="my-button">Hello, world ↗</button>',
    ),
    [css, setCss] = useState(
      ".my-button {\n  background: #8061d9;\n  color: white;\n  border: 0;\n  border-radius: 12px;\n  padding: 16px 28px;\n  cursor: pointer;\n}",
    ),
    [formError, setFormError] = useState("");
  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("annoyingcss-saved") || "[]",
      );
      if (Array.isArray(data))
        setSaved(data.filter((x) => typeof x === "string"));
    } catch {}
    const auth = new URLSearchParams(location.search).get("auth");
    if (auth) setModal(auth === "error" ? "auth-error" : "login");
    const purchase = new URLSearchParams(location.search).get("purchase");
    if (purchase === "success") {
      setToast("결제가 접수되었습니다. 잠시 후 다운로드 권한이 열립니다.");
      window.history.replaceState({}, "", "/");
      window.setTimeout(() => window.location.reload(), 2500);
    }
    if (purchase === "cancelled") {
      setToast("결제를 취소했습니다.");
      window.history.replaceState({}, "", "/");
    }
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const toggleSave = (id: string) => {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem("annoyingcss-saved", JSON.stringify(next));
    } catch {
      setToast("이 브라우저에서는 저장한 목록을 유지할 수 없어요.");
    }
  };
  const openUpload = () => {
    setFormError("");
    setModal(user ? "upload" : "login");
  };
  const visible = items
    .filter(
      (i) =>
        (category === "전체" || i.category === category) &&
        (view !== "saved" || saved.includes(i.id)) &&
        (view !== "mine" || i.author === user?.login) &&
        [i.title, i.category, i.author, ...i.tags]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : sort === "name"
          ? a.title.localeCompare(b.title)
          : 0,
    );
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const response = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: uploadCategory,
          html,
          css,
          priceCents: Math.round(Number(price || 0) * 100),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems([data, ...items]);
      setCategory("전체");
      setQuery("");
      setView("explore");
      setSort("newest");
      setModal("");
      setTitle("");
      setPrice("0");
      setToast("새로운 컴포넌트가 공유되었어요!");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function readFile(file: File | undefined, kind: "html" | "css") {
    if (!file) return;
    if (file.size > 50000) {
      setFormError("파일은 각각 50KB 이하로 올려 주세요.");
      return;
    }
    if (!file.name.toLowerCase().endsWith("." + kind)) {
      setFormError("." + kind + " 파일을 선택해 주세요.");
      return;
    }
    try {
      const text = await file.text();
      (kind === "html" ? setHtml : setCss)(text);
      setFormError("");
    } catch {
      setFormError("파일을 읽지 못했습니다.");
    }
  }
  async function remove(item: Component) {
    if (
      !user ||
      item.author !== user.login ||
      !window.confirm(
        `“${item.title}” 컴포넌트를 삭제할까요? 삭제한 작품은 복구할 수 없습니다.`,
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/components/${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "삭제하지 못했습니다.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSaved((current) => {
        const next = current.filter((id) => id !== item.id);
        try {
          localStorage.setItem("annoyingcss-saved", JSON.stringify(next));
        } catch {}
        return next;
      });
      if (selected?.id === item.id) setSelected(null);
      setToast("컴포넌트를 삭제했습니다.");
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "컴포넌트를 삭제하지 못했습니다.",
      );
    }
  }
  async function buy(item: Component) {
    if (!user) {
      setModal("login");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentId: item.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "결제를 시작하지 못했습니다.");
      window.location.href = data.url;
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "결제를 시작하지 못했습니다.",
      );
      setBusy(false);
    }
  }
  async function connectSeller() {
    setBusy(true);
    try {
      const response = await fetch("/api/sellers/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "판매자 계정을 연결하지 못했습니다.",
      );
      setBusy(false);
    }
  }
  function changeView(next: string) {
    setView(next);
    setCategory("전체");
    setQuery("");
  }
  return (
    <>
      <header className="header">
        <a className="brand" href="/" aria-label="annoyingcss 홈">
          <span className="brand-icon">
            a<span>✳</span>
          </span>
          annoying<span className="brand-css">css</span>
          <span className="beta-label">BETA</span>
        </a>
        <nav aria-label="주요 메뉴">
          <button
            className={view === "explore" ? "nav-active" : ""}
            onClick={() => changeView("explore")}
          >
            둘러보기
          </button>
          <button
            className={view === "saved" ? "nav-active" : ""}
            onClick={() => changeView("saved")}
          >
            저장한 컴포넌트
          </button>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-name">@{user.login}</span>
              <button
                className="login-button"
                onClick={async () => {
                  const r = await fetch("/api/auth/logout", { method: "POST" });
                  if (r.ok) location.reload();
                  else setToast("로그아웃을 다시 시도해 주세요.");
                }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <button className="login-button" onClick={() => setModal("login")}>
              <Icon name="github" />
              GitHub 로그인
            </button>
          )}
          <button className="primary upload-top" onClick={openUpload}>
            <Icon name="plus" size={16} />
            컴포넌트 올리기
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> SMALL DETAILS. BIG DIFFERENCE.
            </div>
            <h1>
              작지만 근사한 UI,
              <br />
              함께 만드는 <span>즐거움.</span>
              <svg className="scribble" viewBox="0 0 190 12" aria-hidden="true">
                <path d="M3 8 Q80 0 183 5 M20 11 Q90 5 172 9" />
              </svg>
            </h1>
            <p>
              반복되는 CSS는 이제 그만. 개발자들이 만든 작은 디테일을
              만나보세요.
              <br />
              마음에 드는 컴포넌트를 발견하고, 내 프로젝트에 바로 더해보세요.
            </p>
            <a className="hero-link" href="#components">
              내 다음 프로젝트의 한 조각 찾기 <Icon name="arrow" size={16} />
            </a>
            <div className="hero-pills">
              <span>
                <i>✓</i> 순수 HTML & CSS
              </span>
              <span>
                <i>✓</i> 자유로운 다운로드
              </span>
              <span>
                <i>✓</i> 커뮤니티가 만든 UI
              </span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-grid" />
            <span className="art-star">✳</span>
            <span className="art-code">&lt;/&gt;</span>
            <div className="art-card art-back">
              <div className="art-dots">
                <i />
                <i />
                <i />
              </div>
              <div className="art-code-lines">
                <span>.a-little-magic {"{"}</span>
                <span>　creativity: unlimited;</span>
                <span>　made-with: love;</span>
                <span>{"}"}</span>
              </div>
            </div>
            <div className="art-card art-front">
              <div className="art-card-top">
                <span>your next favorite button</span>
                <span>↗</span>
              </div>
              <button tabIndex={-1}>
                Make it yours <span>✦</span>
              </button>
              <div className="art-card-bottom">
                <span>HTML + CSS</span>
                <span>100% little details</span>
              </div>
            </div>
            <div className="art-label">a little code, a lot of character.</div>
            <svg className="art-loop" viewBox="0 0 80 70">
              <path d="M5 10C70 0 70 70 30 50S80 15 70 60m-8-8 8 8 5-11" />
            </svg>
          </div>
        </section>
        <section className="library" id="components">
          <aside className="sidebar">
            <div className="side-title">THE COLLECTION</div>
            <h2>어떤 UI를 찾으세요?</h2>
            <div className="category-list">
              {categories.map((c, i) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  <span className="category-icon">
                    {["▦", "▣", "◇", "▤", "▧", "⌨", "☑", "◐", "◌"][i]}
                  </span>
                  {c}
                  <span className="category-count">
                    {i === 0
                      ? items.length
                      : items.filter((item) => item.category === c).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="side-divider" />
            <button
              className={"my-components " + (view === "mine" ? "chosen" : "")}
              onClick={() => (user ? changeView("mine") : setModal("login"))}
            >
              <Icon name="code" />내 컴포넌트 <span>↗</span>
            </button>
            <div className="contribute">
              <span className="contribute-star">✳</span>
              <h3>
                당신의 작은 디테일도
                <br />
                누군가에겐 영감이 돼요.
              </h3>
              <p>
                혼자 보기 아까운 UI가 있나요?
                <br />
                커뮤니티와 함께 나눠보세요.
              </p>
              <button onClick={openUpload}>
                첫 컴포넌트 공유하기 <Icon name="arrow" size={15} />
              </button>
            </div>
          </aside>
          <div className="collection">
            <div className="collection-heading">
              <div>
                <div className="section-eyebrow">
                  MADE BY DEVELOPERS, FOR DEVELOPERS
                </div>
                <h2>
                  {view === "saved"
                    ? "저장한 컴포넌트"
                    : view === "mine"
                      ? "내가 만든 컴포넌트"
                      : category === "전체"
                        ? "마음에 드는 디테일을 발견하세요."
                        : category + " 컴포넌트"}{" "}
                  <span>{visible.length}</span>
                </h2>
              </div>
              <span className="live-label">
                <i /> A little inspiration, every day
              </span>
            </div>
            <div className="toolbar">
              <label className="search">
                <Icon name="search" />
                <input
                  aria-label="컴포넌트 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="어떤 컴포넌트를 찾고 있나요?"
                />
                {query ? (
                  <button aria-label="검색 지우기" onClick={() => setQuery("")}>
                    ×
                  </button>
                ) : (
                  <span className="search-shortcut">⌕</span>
                )}
              </label>
              <select
                aria-label="정렬"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">추천순</option>
                <option value="newest">최신순</option>
                <option value="name">이름순</option>
              </select>
              <div className="grid-indicator">
                <Icon name="grid" size={17} />
              </div>
            </div>
            <div className="collection-note">
              <span>
                {view === "saved"
                  ? "브라우저에 저장한 나만의 컬렉션"
                  : view === "mine"
                    ? "내가 공유한 작은 아이디어들"
                    : category === "전체"
                      ? "모든 컴포넌트"
                      : category}{" "}
                <b>{visible.length}</b>
              </span>
              <span>
                작은 코드로 만드는 큰 차이 <span className="tiny-spark">✧</span>
              </span>
            </div>
            {visible.length ? (
              <div className="component-grid">
                {visible.map((item) => (
                  <article className="component-card" key={item.id}>
                    <div
                      className="card-preview"
                      style={{ background: item.color }}
                    >
                      <span className="preview-category">{item.category}</span>
                      <button
                        className={
                          "save-button " +
                          (saved.includes(item.id) ? "saved" : "")
                        }
                        aria-label={
                          item.title +
                          (saved.includes(item.id) ? " 저장 취소" : " 저장")
                        }
                        aria-pressed={saved.includes(item.id)}
                        onClick={() => toggleSave(item.id)}
                      >
                        <Icon name="heart" size={15} />
                      </button>
                      <Preview item={item} />
                      <button
                        className="preview-open"
                        onClick={() => {
                          setSelected(item);
                          setTab("preview");
                        }}
                      >
                        코드 살펴보기 <Icon name="code" size={14} />
                      </button>
                    </div>
                    <div className="card-info">
                      <button
                        className="card-title"
                        onClick={() => {
                          setSelected(item);
                          setTab("preview");
                        }}
                      >
                        {item.title}
                      </button>
                      <div className="price-line">
                        {item.priceCents && item.priceCents > 0
                          ? `$${(item.priceCents / 100).toFixed(2)} · 구매 후 다운로드`
                          : "무료 다운로드"}
                      </div>
                      <div className="card-meta">
                        <span className="author">
                          <span
                            className="avatar"
                            style={{ background: item.color }}
                          >
                            {item.author.slice(0, 1)}
                          </span>
                          {item.author}
                          <small>
                            {item.id.startsWith("starter-") ? "샘플" : ""}
                          </small>
                        </span>
                        {!item.id.startsWith("starter-") &&
                          user?.login === item.author && (
                            <button
                              className="card-delete"
                              aria-label={item.title + " 삭제"}
                              onClick={() => remove(item)}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        <button
                          className="card-download"
                          aria-label={item.title + " 다운로드"}
                          onClick={() => {
                            setSelected(item);
                            setTab("html");
                          }}
                        >
                          <Icon name="download" size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Icon name="search" size={32} />
                <h3>
                  {view === "saved"
                    ? "마음에 드는 컴포넌트를 저장해 보세요."
                    : "아직 컴포넌트가 없어요."}
                </h3>
                <p>다른 검색어를 사용하거나 새로운 컴포넌트를 공유해 주세요.</p>
                <button
                  className="secondary"
                  onClick={() => {
                    changeView("explore");
                  }}
                >
                  전체 둘러보기
                </button>
              </div>
            )}
            <div className="collection-end">
              <span>✳</span> 작은 디테일 하나가, 멋진 시작이 될 거예요.
            </div>
          </div>
        </section>
        <section className="bottom-banner">
          <div>
            <span>FROM YOUR EDITOR, TO EVERYONE.</span>
            <h2>좋은 코드는, 나눌수록 더 좋아지니까.</h2>
            <p>당신만의 HTML과 CSS를 공유하고 다음 개발자에게 영감을 주세요.</p>
          </div>
          <button className="primary" onClick={openUpload}>
            나의 컴포넌트 공유하기 <Icon name="arrow" />
          </button>
        </section>
      </main>
      <footer>
        <a className="brand footer-brand" href="/">
          annoying<span className="brand-css">css</span>
          <span>✳</span>
        </a>
        <span>A little annoying. A lot of possibilities.</span>
        <span>Made for the love of the web. © {new Date().getFullYear()}</span>
      </footer>
      {selected && (
        <Modal title={selected.title} wide onClose={() => setSelected(null)}>
          <div className="detail-meta">
            by @{selected.author} · {selected.category} · annoyingcss 라이선스
          </div>
          <div className="detail-tabs">
            {[
              ["preview", "미리보기"],
              ["html", "HTML"],
              ["css", "CSS"],
            ].map(([key, label]) => (
              <button
                className={tab === key ? "active" : ""}
                key={key}
                disabled={
                  key !== "preview" &&
                  !!selected.priceCents &&
                  selected.priceCents > 0 &&
                  !purchased.includes(selected.id) &&
                  selected.ownerId !== user?.id
                }
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
            {tab !== "preview" && (
              <button
                className="copy-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      tab === "html" ? selected.html : selected.css,
                    );
                    setToast("클립보드에 복사했어요.");
                  } catch {
                    setToast("복사할 수 없습니다. 코드를 직접 선택해 주세요.");
                  }
                }}
              >
                코드 복사
              </button>
            )}
          </div>
          {tab === "preview" ? (
            <div
              className="detail-preview"
              style={{ background: selected.color }}
            >
              <Preview item={selected} />
            </div>
          ) : selected.priceCents &&
            selected.priceCents > 0 &&
            !purchased.includes(selected.id) &&
            selected.ownerId !== user?.id ? (
            <div className="purchase-lock">
              <Icon name="download" size={30} />
              <h3>구매 후 코드를 다운로드할 수 있어요.</h3>
              <p>
                판매자가 설정한 가격에는 HTML과 CSS 사용 라이선스가 포함됩니다.
              </p>
              <p className="fee-note">
                결제 금액의 5%는 annoyingcss 수수료이며 판매자는 95%를
                정산받습니다.
              </p>
              <button
                className="primary"
                onClick={() => buy(selected)}
                disabled={busy}
              >
                ${(selected.priceCents / 100).toFixed(2)} 결제하고 다운로드
              </button>
            </div>
          ) : (
            <pre className="code-block">
              <code>{tab === "html" ? selected.html : selected.css}</code>
            </pre>
          )}
          <div className="download-actions">
            <p>두 파일을 같은 폴더에 저장하면 바로 사용할 수 있어요.</p>
            {!selected.id.startsWith("starter-") &&
              user?.login === selected.author && (
                <button
                  className="delete-button"
                  onClick={() => remove(selected)}
                >
                  <Icon name="trash" size={15} />내 컴포넌트 삭제
                </button>
              )}
            {selected.priceCents &&
            selected.priceCents > 0 &&
            !purchased.includes(selected.id) &&
            selected.ownerId !== user?.id ? (
              <button
                className="primary"
                onClick={() => buy(selected)}
                disabled={busy}
              >
                ${(selected.priceCents / 100).toFixed(2)}에 구매하기
              </button>
            ) : (
              <>
                <button
                  className="secondary"
                  onClick={() => download(selected, "html")}
                >
                  <Icon name="download" size={16} /> HTML
                </button>
              </>
            )}
            <button
              className="primary"
              onClick={() => download(selected, "css")}
            >
              <Icon name="download" size={16} /> CSS
            </button>
          </div>
          <p className="license-note">
            구매 라이선스: 구매자는 자신의 프로젝트에서 코드를 사용·수정할 수
            있습니다. 원본 파일을 재판매하거나 컴포넌트 저장소로 재배포할 수
            없습니다. 판매자는 업로드 코드에 필요한 권리를 보유해야 합니다.
          </p>
        </Modal>
      )}
      {(modal === "login" || modal === "auth-error") && (
        <Modal
          title={
            modal === "auth-error"
              ? "로그인을 완료하지 못했어요"
              : "작은 아이디어를 함께 나눠요."
          }
          onClose={() => setModal("")}
        >
          <div className="login-content">
            <div className="login-mark">
              <Icon name="github" size={36} />
            </div>
            <p>
              GitHub로 로그인하고
              <br />
              직접 만든 HTML과 CSS를 공유하세요.
            </p>
            {authReady ? (
              <a className="primary" href="/api/auth/github">
                <Icon name="github" />
                GitHub로 계속하기 <Icon name="arrow" />
              </a>
            ) : (
              <div className="setup-notice">
                GitHub 로그인 연결을 준비 중이에요.
                <br />
                연결 전에도 모든 컴포넌트를 둘러보고 다운로드할 수 있어요.
              </div>
            )}
            <small>불필요한 저장소 접근 권한은 요청하지 않아요.</small>
          </div>
        </Modal>
      )}
      {modal === "upload" && (
        <Modal
          title="나만의 작은 디테일 공유하기"
          wide
          onClose={() => {
            if (!busy) setModal("");
          }}
        >
          <form className="upload-form" onSubmit={upload}>
            <p>HTML과 CSS만으로 만든 컴포넌트를 공유해 주세요.</p>
            <div className="form-row">
              <label>
                컴포넌트 이름
                <input
                  required
                  maxLength={80}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 부드럽게 눌리는 버튼"
                />
              </label>
              <label>
                카테고리
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  {categories.slice(1).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                판매 가격 (USD)
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>
            {Number(price) > 0 && (
              <div className="seller-box">
                <strong>판매자 정산 계정</strong>
                <p>
                  판매를 시작하려면 Stripe에서 본인 인증과 정산 계정을 연결해야
                  합니다. annoyingcss는 결제 금액의 5%를 수수료로 가져가고,
                  판매자에게 95%를 정산합니다.
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={connectSeller}
                  disabled={busy}
                >
                  Stripe 판매자 계정 연결
                </button>
              </div>
            )}
            <div className="editors">
              {(["html", "css"] as const).map((kind) => (
                <label key={kind}>
                  <span>
                    {kind.toUpperCase()}
                    <input
                      type="file"
                      accept={"." + kind}
                      aria-label={kind.toUpperCase() + " 파일 업로드"}
                      onChange={(e) => readFile(e.target.files?.[0], kind)}
                    />
                  </span>
                  <textarea
                    required
                    spellCheck={false}
                    maxLength={50000}
                    value={kind === "html" ? html : css}
                    onChange={(e) =>
                      (kind === "html" ? setHtml : setCss)(e.target.value)
                    }
                  />
                </label>
              ))}
            </div>
            <span className="preview-label">LIVE PREVIEW</span>
            <div className="upload-preview">
              <Preview item={{ title: "업로드", html, css }} />
            </div>
            <label className="license-check">
              <input type="checkbox" required /> 코드의 권리를 보유하고 있으며,
              구매자에게 위 사용 라이선스를 부여하는 데 동의합니다.
            </label>
            <p className="license-note">
              구매자는 구매한 컴포넌트를 프로젝트에서 사용·수정할 수 있습니다.
              판매자는 업로드한 코드의 권리를 보유하거나 배포 권한이 있음을
              확인해야 합니다. 결제 금액의 5%는 사이트 수수료이며, 판매자는
              95%를 받습니다.
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="primary submit-upload" disabled={busy}>
              {busy ? "공유하는 중…" : "컴포넌트 공유하기"}
              <Icon name="arrow" />
            </button>
          </form>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
