const BUCKET = "business-assets";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function getBucketUrl(): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
}

export function publicUrl(path: string): string {
  return `${getBucketUrl()}/${path}`;
}
