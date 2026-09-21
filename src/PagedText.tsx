import { splitUnderline } from "./grammar";
import { useLayoutEffect, useRef, useState } from "react";

// Long text is paginated to the actual available space, without shrinking the
// font or requiring scrolling. ResizeObserver also handles rotation/browser bars.
export default function PagedText({
  text,
  underline,
}: {
  text: string;
  underline?: { start: number; end: number };
}) {
  const host = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState([text]);
  const [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const element = host.current;
    const measure = probe.current;
    if (!element || !measure) return;
    function paginate() {
      if (!element || !measure || !element.clientWidth || !element.clientHeight)
        return;
      const available = Math.max(24, element.clientHeight - 40);
      const chars = Array.from(text);
      const chunks: string[] = [];
      let start = 0;
      while (start < chars.length) {
        let low = 1,
          high = chars.length - start,
          fit = 1;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          measure.textContent = chars.slice(start, start + middle).join("");
          if (measure.getBoundingClientRect().height <= available) {
            fit = middle;
            low = middle + 1;
          } else high = middle - 1;
        }
        // Prefer a word boundary, while still allowing very long single words.
        if (start + fit < chars.length) {
          const boundary = chars
            .slice(start, start + fit)
            .join("")
            .search(/\s+\S*$/u);
          if (boundary > fit / 2) fit = boundary + 1;
        }
        chunks.push(chars.slice(start, start + fit).join(""));
        start += fit;
      }
      measure.textContent = "";
      setPages(chunks.length ? chunks : [""]);
      setPage(0);
    }
    paginate();
    const observer = new ResizeObserver(paginate);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);
  const currentPage = Math.min(page, pages.length - 1);
  const offset = pages.slice(0, currentPage).join("").length;
  const parts = underline
    ? splitUnderline(
        pages[currentPage],
        underline.start - offset,
        underline.end - offset,
      )
    : null;
  return (
    <div ref={host} className="paged-text">
      <div className="page-copy" aria-live="polite">
        {parts ? (
          <>
            {parts[0]}
            {parts[1] && <u className="grammar-underline">{parts[1]}</u>}
            {parts[2]}
          </>
        ) : (
          pages[currentPage]
        )}
      </div>
      <div ref={probe} className="page-probe" aria-hidden="true" />
      {pages.length > 1 && (
        <div
          className="text-pages"
          aria-label="긴 내용 넘기기"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="이전 내용"
          >
            ←
          </button>
          <span>
            {page + 1} / {pages.length}
          </span>
          <button
            disabled={page === pages.length - 1}
            onClick={() => setPage(page + 1)}
            aria-label="다음 내용"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
