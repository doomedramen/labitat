import fs from "fs";
import path from "path";

const TEST_DB_PATH = path.join(process.cwd(), "data", "labitat.test.db");

export function cleanTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log(`Deleted ${TEST_DB_PATH}`);
  } else {
    console.log(`${TEST_DB_PATH} does not exist, skipping.`);
  }

  for (const suffix of ["-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`Deleted ${p}`);
    }
  }
}

// Run when executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  cleanTestDb();
}
