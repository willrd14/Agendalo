-- Public bucket for business logos, covers and service images.
-- Uploads are performed server-side via the /api/upload route using the
-- service role, so no public/anonymous write policies are granted here.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
