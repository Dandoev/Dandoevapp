const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Connecting to Supabase PostgreSQL database...');

  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow all uploads to dandoev-docs'
      ) THEN
        CREATE POLICY "Allow all uploads to dandoev-docs"
        ON storage.objects FOR INSERT
        TO public, anon, authenticated
        WITH CHECK (bucket_id = 'dandoev-docs');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow all reads from dandoev-docs'
      ) THEN
        CREATE POLICY "Allow all reads from dandoev-docs"
        ON storage.objects FOR SELECT
        TO public, anon, authenticated
        USING (bucket_id = 'dandoev-docs');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow all updates on dandoev-docs'
      ) THEN
        CREATE POLICY "Allow all updates on dandoev-docs"
        ON storage.objects FOR UPDATE
        TO public, anon, authenticated
        USING (bucket_id = 'dandoev-docs')
        WITH CHECK (bucket_id = 'dandoev-docs');
      END IF;
    END
    $$;
  `;

  await pool.query(sql);
  console.log('Storage policies created successfully!');

  const check = await pool.query(
    "SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'"
  );
  console.log('Active storage policies on storage.objects:', check.rows);

  await pool.end();
}

main().catch((err) => {
  console.error('Error applying storage policies:', err);
  process.exit(1);
});
