const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = {};
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const idx = line.indexOf("=");
  if (idx === -1) continue;
  env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
);

async function main() {
  const checks = [
    {
      name: "tables",
      promise: supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .in("table_name", [
          "camera",
          "orders",
          "order_detail",
          "payment",
          "customer",
          "admin_user",
        ]),
    },
    {
      name: "orders_columns",
      promise: supabase
        .from("information_schema.columns")
        .select("column_name,data_type,is_nullable")
        .eq("table_schema", "public")
        .eq("table_name", "orders"),
    },
    {
      name: "payment_columns",
      promise: supabase
        .from("information_schema.columns")
        .select("column_name,data_type,is_nullable")
        .eq("table_schema", "public")
        .eq("table_name", "payment"),
    },
    {
      name: "orders_sample",
      promise: supabase
        .from("orders")
        .select("id,status,payment_expires_at,expired_at")
        .limit(10),
    },
    {
      name: "payment_sample",
      promise: supabase
        .from("payment")
        .select("id,order_id,status,expires_at")
        .limit(10),
    },
    {
      name: "camera_sample",
      promise: supabase.from("camera").select("id,stok,aktif").limit(10),
    },
  ];

  for (const item of checks) {
    const { data, error } = await item.promise;
    console.log(`\n=== ${item.name} ===`);
    console.log(
      JSON.stringify(
        {
          data,
          error: error
            ? {
                message: error.message,
                details: error.details,
                code: error.code,
              }
            : null,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
