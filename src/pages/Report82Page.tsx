import { Sheet, SheetToolbar, SheetEmptyState } from '../components/Sheet';

function Report82Page() {
  return (
    <Sheet>
      <SheetToolbar viewName="All Reports" count={0}>
        <button className="sheet-toolbar__btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
        </button>
        <button className="sheet-toolbar__btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="14" y2="15" />
            <line x1="4" y1="3" x2="10" y2="3" />
          </svg>
          Sort
        </button>
      </SheetToolbar>

      <SheetEmptyState
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        }
        title="No reports yet"
        description="82 report data will appear here once configured."
      />
    </Sheet>
  );
}

export default Report82Page;
