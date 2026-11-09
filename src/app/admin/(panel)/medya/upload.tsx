"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploader, type Img } from "@/components/admin/image-uploader";
import { Card } from "@/components/ui";

export function MediaUpload() {
  const router = useRouter();
  const [v, setV] = useState<Img[]>([]);
  return (
    <Card className="p-4">
      <ImageUploader
        value={v}
        onChange={(n) => {
          setV([]);
          if (n.length) router.refresh();
        }}
      />
    </Card>
  );
}
