import 'dotenv/config'

import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDb, db } from '@/lib/db/client'

async function main() {
  console.log('Running database migrations…')

  await migrate(db, {
    migrationsFolder: 'lib/db/migrations',
  })

  console.log('Migrations completed ✅')

  await closeDb()
}

main().catch((err) => {
  console.error('Migration failed ❌')
  console.error(err)
  process.exit(1)
})
