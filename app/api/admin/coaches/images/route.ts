import { NextRequest, NextResponse } from "next/server";
import { getCoachesAdminContext } from "@/lib/coachesAdminApi";

const COACH_PROFILE_IMAGES_BUCKET = "coach-profile-images";
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  const context = await getCoachesAdminContext(request);
  if (context instanceof NextResponse) return context;

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "JPEG image file is required." }, { status: 400 });
  }

  if (image.type !== "image/jpeg") {
    return NextResponse.json({ error: "Only JPEG images are supported." }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be 2MB or smaller." }, { status: 400 });
  }

  const { data: bucket } = await context.adminClient.storage.getBucket(COACH_PROFILE_IMAGES_BUCKET);
  if (!bucket) {
    const { error: createBucketError } = await context.adminClient.storage.createBucket(
      COACH_PROFILE_IMAGES_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
        allowedMimeTypes: ["image/jpeg"],
      }
    );

    if (createBucketError) {
      return NextResponse.json({ error: createBucketError.message }, { status: 500 });
    }
  }

  const extension = image.name.toLowerCase().endsWith(".jpeg") ? "jpeg" : "jpg";
  const safeFileName = sanitizeFileName(image.name) || `coach-profile.${extension}`;
  const filePath = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
  const imageBuffer = Buffer.from(await image.arrayBuffer());

  const { error: uploadError } = await context.adminClient.storage
    .from(COACH_PROFILE_IMAGES_BUCKET)
    .upload(filePath, imageBuffer, {
      cacheControl: "31536000",
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = context.adminClient.storage
    .from(COACH_PROFILE_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return NextResponse.json({ url: data.publicUrl });
}
