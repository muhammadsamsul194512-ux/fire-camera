import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Kamu harus login sebagai admin." },
        { status: 401 },
      ),
    };
  }

  const accessToken = authorization.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "Session login tidak valid." },
        { status: 401 },
      ),
    };
  }

  const admin = await cekAdmin(user.id);

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "Kamu tidak memiliki akses admin." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function GET(request: Request) {
  try {
    const adminResult = await requireAdmin(request);
    if ("error" in adminResult) return adminResult.error;

    const { searchParams } = new URL(request.url);
    const cameraId = Number(searchParams.get("cameraId"));

    if (!cameraId || Number.isNaN(cameraId)) {
      return NextResponse.json(
        { error: "ID kamera tidak valid." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("camera_photo")
      .select("id, camera_id, image_url, storage_path, sort_order, created_at")
      .eq("camera_id", cameraId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Gagal mengambil foto kamera:", error);
      return NextResponse.json(
        { error: "Gagal mengambil foto kamera." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Error API ambil foto kamera:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil foto kamera." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminResult = await requireAdmin(request);
    if ("error" in adminResult) return adminResult.error;

    const formData = await request.formData();
    const file = formData.get("file");
    const cameraId = Number(formData.get("cameraId"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File foto belum dipilih." },
        { status: 400 },
      );
    }

    if (!cameraId || Number.isNaN(cameraId)) {
      return NextResponse.json(
        { error: "ID kamera tidak valid." },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format foto harus JPG, PNG, atau WebP." },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran foto maksimal 5 MB." },
        { status: 400 },
      );
    }

    const { data: camera, error: cameraError } = await supabaseAdmin
      .from("camera")
      .select("id")
      .eq("id", cameraId)
      .maybeSingle();

    if (cameraError || !camera) {
      return NextResponse.json(
        { error: "Kamera tidak ditemukan." },
        { status: 404 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `camera-results/${cameraId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("kamera")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Gagal upload foto sample:", uploadError);
      return NextResponse.json(
        { error: "Gagal mengupload foto hasil kamera: " + uploadError.message },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("kamera")
      .getPublicUrl(storagePath);

    const { data: existingPhotos } = await supabaseAdmin
      .from("camera_photo")
      .select("sort_order")
      .eq("camera_id", cameraId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existingPhotos?.[0]?.sort_order
      ? Number(existingPhotos[0].sort_order) + 1
      : 0;

    const { data, error: insertError } = await supabaseAdmin
      .from("camera_photo")
      .insert({
        camera_id: cameraId,
        image_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        sort_order: nextSortOrder,
      })
      .select("id, camera_id, image_url, storage_path, sort_order, created_at")
      .single();

    if (insertError || !data) {
      console.error("Gagal menyimpan metadata foto kamera:", insertError);
      await supabaseAdmin.storage.from("kamera").remove([storagePath]);
      return NextResponse.json(
        { error: "Foto berhasil diupload, tetapi metadata gagal disimpan." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error API upload foto kamera:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengupload foto kamera." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const adminResult = await requireAdmin(request);
    if ("error" in adminResult) return adminResult.error;

    const body = await request.json();
    const photoId = Number(body.photoId);
    const cameraId = Number(body.cameraId);
    const direction = body.direction;

    if (
      !photoId ||
      Number.isNaN(photoId) ||
      !cameraId ||
      Number.isNaN(cameraId)
    ) {
      return NextResponse.json(
        { error: "ID foto atau kamera tidak valid." },
        { status: 400 },
      );
    }

    if (!["up", "down"].includes(direction)) {
      return NextResponse.json(
        { error: "Arah urutan tidak valid." },
        { status: 400 },
      );
    }

    const { data: photos, error: photosError } = await supabaseAdmin
      .from("camera_photo")
      .select("id, sort_order")
      .eq("camera_id", cameraId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (photosError) {
      console.error("Gagal mengambil urutan foto:", photosError);
      return NextResponse.json(
        { error: "Gagal mengatur urutan foto." },
        { status: 500 },
      );
    }

    const currentIndex = photos.findIndex(
      (photo) => Number(photo.id) === photoId,
    );

    if (currentIndex < 0) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan untuk kamera ini." },
        { status: 404 },
      );
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= photos.length) {
      return NextResponse.json({ success: true, data: photos });
    }

    const currentPhoto = photos[currentIndex];
    const targetPhoto = photos[targetIndex];

    const currentOrder = Number(currentPhoto.sort_order ?? currentIndex);
    const targetOrder = Number(targetPhoto.sort_order ?? targetIndex);

    const { error: updateCurrentError } = await supabaseAdmin
      .from("camera_photo")
      .update({ sort_order: targetOrder })
      .eq("id", currentPhoto.id);

    const { error: updateTargetError } = await supabaseAdmin
      .from("camera_photo")
      .update({ sort_order: currentOrder })
      .eq("id", targetPhoto.id);

    if (updateCurrentError || updateTargetError) {
      console.error("Gagal memperbarui urutan foto:", {
        updateCurrentError,
        updateTargetError,
      });
      return NextResponse.json(
        { error: "Gagal memperbarui urutan foto." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: photos });
  } catch (error) {
    console.error("Error API reorder foto kamera:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengatur urutan foto kamera." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminResult = await requireAdmin(request);
    if ("error" in adminResult) return adminResult.error;

    const body = await request.json();
    const photoId = Number(body.photoId);
    const cameraId = Number(body.cameraId);

    if (
      !photoId ||
      Number.isNaN(photoId) ||
      !cameraId ||
      Number.isNaN(cameraId)
    ) {
      return NextResponse.json(
        { error: "ID foto atau kamera tidak valid." },
        { status: 400 },
      );
    }

    const { data: photo, error: photoError } = await supabaseAdmin
      .from("camera_photo")
      .select("id, storage_path, camera_id")
      .eq("id", photoId)
      .eq("camera_id", cameraId)
      .maybeSingle();

    if (photoError || !photo) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan untuk kamera ini." },
        { status: 404 },
      );
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from("kamera")
      .remove([photo.storage_path]);

    if (storageError) {
      console.error("Gagal menghapus file gambar dari storage:", storageError);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("camera_photo")
      .delete()
      .eq("id", photoId)
      .eq("camera_id", cameraId);

    if (deleteError) {
      console.error("Gagal menghapus metadata foto kamera:", deleteError);
      return NextResponse.json(
        { error: "Gagal menghapus foto kamera." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error API delete foto kamera:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus foto kamera." },
      { status: 500 },
    );
  }
}
