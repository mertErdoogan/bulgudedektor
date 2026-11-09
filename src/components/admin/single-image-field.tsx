"use client";

import { useState } from "react";
import { ImageUploader } from "./image-uploader";

export function SingleImageField({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [v, setV] = useState(defaultValue ? [{ url: defaultValue }] : []);
  return (
    <>
      <input type="hidden" name={name} value={v[0]?.url ?? ""} />
      <ImageUploader single value={v} onChange={setV} />
    </>
  );
}
