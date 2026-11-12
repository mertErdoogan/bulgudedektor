"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/** Site içi arama olayı (GA4 "search", Meta "Search") — sonuç sayısıyla birlikte */
export function TrackSearch({ q, results }: { q: string; results: number }) {
  useEffect(() => {
    if (q) track("search", { search_term: q.slice(0, 100), results });
  }, [q, results]);
  return null;
}
