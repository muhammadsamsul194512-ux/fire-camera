import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

// ======================================================
// GET
// Mengambil daftar pembayaran untuk admin
// ======================================================
export async function GET(request: Request) {
  try {
    // 1. Ambil access token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Kamu harus login sebagai admin.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    // 2. Verifikasi token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Session login tidak valid.",
        },
        {
          status: 401,
        },
      );
    }

    // 3. Cek admin
    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Akses ditolak. Kamu bukan admin.",
        },
        {
          status: 403,
        },
      );
    }

    // 4. Ambil data pembayaran
    const { data, error } = await supabaseAdmin
      .from("payment")
      .select(
        `
        id,
        order_id,
        metode,
        bank,
        nomor_rekening,
        nama_pemilik_rekening,
        bukti_pembayaran_url,
        status,
        catatan_admin,
        uploaded_at,
        verified_at,
        created_at,
        order:order_id (
          id,
          nomor_pesanan,
          tanggal_ambil,
          jam_ambil,
          tanggal_kembali,
          jam_kembali,
          jumlah_hari,
          total_harga,
          status,
          payment_expires_at,
          expired_at,
          created_at,
          customer:customer_id (
            nama_lengkap,
            whatsapp,
            email
          ),
          detail:order_detail (
            jumlah,
            harga_per_hari,
            subtotal,
            camera:camera_id (
              nama,
              brand
            )
          )
        )
      `,
      )
      .neq("status", "kedaluwarsa")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Gagal mengambil data pembayaran:", error);

      return NextResponse.json(
        {
          error: "Gagal mengambil data pembayaran.",
        },
        {
          status: 500,
        },
      );
    }

    const dataDenganUrl = await Promise.all(
      (data || []).map(async (payment) => {
        let buktiPembayaranUrl = payment.bukti_pembayaran_url;

        if (payment.bukti_pembayaran_url) {
          const { data: signedUrlData, error: signedUrlError } =
            await supabaseAdmin.storage
              .from("bukti-pembayaran")
              .createSignedUrl(payment.bukti_pembayaran_url, 60 * 10);

          if (signedUrlError) {
            console.error(
              "Gagal membuat signed URL bukti pembayaran:",
              signedUrlError,
            );

            buktiPembayaranUrl = null;
          } else {
            buktiPembayaranUrl = signedUrlData.signedUrl;
          }
        }

        return {
          ...payment,
          bukti_pembayaran_url: buktiPembayaranUrl,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: dataDenganUrl,
    });
  } catch (error) {
    console.error("Error API mengambil pembayaran:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      },
    );
  }
}

// ======================================================
// PATCH
// Mengubah status pembayaran
//
// action:
// - konfirmasi
// - upload_ulang
// - tolak
// ======================================================
export async function PATCH(request: Request) {
  try {
    // 1. Ambil access token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Kamu harus login sebagai admin.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    // 2. Verifikasi token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Session login tidak valid.",
        },
        {
          status: 401,
        },
      );
    }

    // 3. Cek admin
    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Akses ditolak. Kamu bukan admin.",
        },
        {
          status: 403,
        },
      );
    }

    // 4. Ambil data dari request
    const body = await request.json();

    const paymentId = Number(body.paymentId);
    const action = body.action;
    const catatanAdmin =
      typeof body.catatanAdmin === "string" ? body.catatanAdmin.trim() : "";

    if (!paymentId) {
      return NextResponse.json(
        {
          error: "ID pembayaran tidak ditemukan.",
        },
        {
          status: 400,
        },
      );
    }

    // 5. Validasi action
    const actionDiizinkan = ["konfirmasi", "upload_ulang", "tolak"];

    if (!actionDiizinkan.includes(action)) {
      return NextResponse.json(
        {
          error: "Tindakan pembayaran tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    // 6. Cari pembayaran
    const { data: payment, error: paymentFindError } = await supabaseAdmin
      .from("payment")
      .select("id, order_id, status, expires_at")
      .eq("id", paymentId)
      .single();

    if (paymentFindError || !payment) {
      return NextResponse.json(
        {
          error: "Data pembayaran tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_expires_at")
      .eq("id", payment.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        {
          error: "Pesanan tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    if (order.status === "kedaluwarsa") {
      return NextResponse.json(
        {
          error:
            "Reservasi sudah kedaluwarsa dan tidak dapat dikonfirmasi lagi.",
        },
        { status: 400 },
      );
    }

    // ==================================================
    // AKSI 1: KONFIRMASI
    // ==================================================
    if (action === "konfirmasi") {
      if (payment.status === "dikonfirmasi") {
        return NextResponse.json(
          {
            error: "Pembayaran ini sudah dikonfirmasi.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        order.payment_expires_at &&
        new Date(order.payment_expires_at).getTime() <= Date.now()
      ) {
        return NextResponse.json(
          {
            error:
              "Batas waktu pembayaran sudah habis. Pesanan ini tidak dapat dikonfirmasi lagi.",
          },
          { status: 400 },
        );
      }

      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payment")
        .update({
          status: "dikonfirmasi",
          verified_at: new Date().toISOString(),
          catatan_admin: null,
        })
        .eq("id", paymentId)
        .eq("status", "menunggu_verifikasi");

      if (paymentUpdateError) {
        console.error("Gagal mengubah status pembayaran:", paymentUpdateError);

        return NextResponse.json(
          {
            error: "Gagal mengonfirmasi pembayaran.",
          },
          {
            status: 500,
          },
        );
      }

      const { error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "dikonfirmasi",
        })
        .eq("id", payment.order_id);

      if (orderUpdateError) {
        console.error("Gagal mengubah status pesanan:", orderUpdateError);

        return NextResponse.json(
          {
            error:
              "Pembayaran berhasil dikonfirmasi, tetapi status pesanan gagal diperbarui.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Pembayaran berhasil dikonfirmasi.",
      });
    }

    // ==================================================
    // AKSI 2: PERLU UPLOAD ULANG
    // ==================================================
    if (action === "upload_ulang") {
      if (!catatanAdmin) {
        return NextResponse.json(
          {
            error: "Catatan admin wajib diisi untuk meminta upload ulang.",
          },
          {
            status: 400,
          },
        );
      }

      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payment")
        .update({
          status: "perlu_upload_ulang",
          catatan_admin: catatanAdmin,
          verified_at: null,
        })
        .eq("id", paymentId);

      if (paymentUpdateError) {
        console.error("Gagal meminta upload ulang:", paymentUpdateError);

        return NextResponse.json(
          {
            error: "Gagal meminta pelanggan upload ulang.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Pelanggan diminta mengupload ulang bukti pembayaran.",
      });
    }

    // ==================================================
    // AKSI 3: TOLAK
    // ==================================================
    if (action === "tolak") {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payment")
        .update({
          status: "ditolak",
          catatan_admin: catatanAdmin || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (paymentUpdateError) {
        console.error("Gagal menolak pembayaran:", paymentUpdateError);

        return NextResponse.json(
          {
            error: "Gagal menolak pembayaran.",
          },
          {
            status: 500,
          },
        );
      }

      const { error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "ditolak",
        })
        .eq("id", payment.order_id);

      if (orderUpdateError) {
        console.error("Gagal mengubah status pesanan:", orderUpdateError);

        return NextResponse.json(
          {
            error:
              "Pembayaran ditolak, tetapi status pesanan gagal diperbarui.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Pembayaran berhasil ditolak.",
      });
    }

    return NextResponse.json(
      {
        error: "Tindakan tidak dapat diproses.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("Error API verifikasi pembayaran:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      },
    );
  }
}
