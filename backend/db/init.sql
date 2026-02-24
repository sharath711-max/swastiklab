PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- 👤 USERS (Single login)
-- 👤 USERS (Single login)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME
);

-- 🌐 GLOBALS (Auto-number, sequences, config)
CREATE TABLE IF NOT EXISTS globals (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL
);

-- 🔢 SEQUENCES (For simple sequential IDs)
CREATE TABLE IF NOT EXISTS sequences (
  name TEXT PRIMARY KEY,
  value INTEGER DEFAULT 0
);

-- 👥 CUSTOMER
CREATE TABLE IF NOT EXISTS customer (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  balance REAL DEFAULT 0,
  notes TEXT,
  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME
);

CREATE INDEX IF NOT EXISTS idx_customer_phone ON customer(phone);

-- 🧪 TESTS (PARENT)
CREATE TABLE IF NOT EXISTS gold_test (
  id TEXT PRIMARY KEY,
  auto_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('TODO','IN_PROGRESS','DONE')) NOT NULL,
  mode_of_payment TEXT,
  total REAL DEFAULT 0,
  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TABLE IF NOT EXISTS silver_test (
  id TEXT PRIMARY KEY,
  auto_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('TODO','IN_PROGRESS','DONE')) NOT NULL,
  mode_of_payment TEXT,
  total REAL DEFAULT 0,
  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- 🧪 TEST ITEMS (CHILD)
CREATE TABLE IF NOT EXISTS gold_test_item (
  id TEXT PRIMARY KEY,
  item_number TEXT NOT NULL UNIQUE,
  gold_test_id TEXT NOT NULL,
  name TEXT,
  item_type TEXT NOT NULL,
  gross_weight REAL NOT NULL,
  sample_weight REAL DEFAULT 0,
  test_weight REAL NOT NULL,
  purity REAL,
  returned INTEGER DEFAULT 0,
  created DATETIME NOT NULL,
  deletedon DATETIME,
  FOREIGN KEY (gold_test_id) REFERENCES gold_test(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS silver_test_item (
  id TEXT PRIMARY KEY,
  item_number TEXT NOT NULL UNIQUE,
  silver_test_id TEXT NOT NULL,
  name TEXT,
  item_type TEXT NOT NULL,
  gross_weight REAL NOT NULL,
  sample_weight REAL DEFAULT 0,
  test_weight REAL NOT NULL,
  purity REAL,
  returned INTEGER DEFAULT 0,
  created DATETIME NOT NULL,
  deletedon DATETIME,
  FOREIGN KEY (silver_test_id) REFERENCES silver_test(id) ON DELETE CASCADE
);

-- 📜 CERTIFICATES (PARENT — FINANCIAL OWNER)
CREATE TABLE IF NOT EXISTS gold_certificate (
  id TEXT PRIMARY KEY,
  auto_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,

  status TEXT CHECK (status IN ('TODO','IN_PROGRESS','DONE')) NOT NULL,

  total REAL DEFAULT 0,
  gst INTEGER DEFAULT 0,              -- 0 / 1
  total_tax REAL DEFAULT 0,
  gst_bill_number TEXT,
  mode_of_payment TEXT,

  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME,

  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TABLE IF NOT EXISTS silver_certificate (
  id TEXT PRIMARY KEY,
  auto_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,

  status TEXT CHECK (status IN ('TODO','IN_PROGRESS','DONE')) NOT NULL,

  total REAL DEFAULT 0,
  gst INTEGER DEFAULT 0,
  total_tax REAL DEFAULT 0,
  gst_bill_number TEXT,
  mode_of_payment TEXT,

  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME,

  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TABLE IF NOT EXISTS photo_certificate (
  id TEXT PRIMARY KEY,
  auto_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,

  status TEXT CHECK (status IN ('TODO','IN_PROGRESS','DONE')) NOT NULL,

  total REAL DEFAULT 0,
  gst INTEGER DEFAULT 0,
  total_tax REAL DEFAULT 0,
  gst_bill_number TEXT,
  mode_of_payment TEXT,

  created DATETIME NOT NULL,
  lastmodified DATETIME NOT NULL,
  deletedon DATETIME,

  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- 📄 CERTIFICATE ITEMS (CHILD)
CREATE TABLE IF NOT EXISTS gold_certificate_item (
  id TEXT PRIMARY KEY,
  item_number TEXT NOT NULL UNIQUE,
  gold_certificate_id TEXT NOT NULL,

  certificate_number TEXT NOT NULL,   -- A01, A02 (PRINT ONLY)

  name TEXT,
  item_type TEXT NOT NULL,
  gross_weight REAL NOT NULL,
  test_weight REAL NOT NULL,
  net_weight REAL NOT NULL,
  purity REAL,
  returned INTEGER DEFAULT 0,

  created DATETIME NOT NULL,
  deletedon DATETIME,

  FOREIGN KEY (gold_certificate_id)
    REFERENCES gold_certificate(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS silver_certificate_item (
  id TEXT PRIMARY KEY,
  item_number TEXT NOT NULL UNIQUE,
  silver_certificate_id TEXT NOT NULL,
  certificate_number TEXT NOT NULL,
  name TEXT,
  item_type TEXT NOT NULL,
  gross_weight REAL NOT NULL,
  test_weight REAL NOT NULL,
  net_weight REAL NOT NULL,
  purity REAL,
  returned INTEGER DEFAULT 0,
  created DATETIME NOT NULL,
  deletedon DATETIME,
  FOREIGN KEY (silver_certificate_id)
    REFERENCES silver_certificate(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photo_certificate_item (
  id TEXT PRIMARY KEY,
  item_number TEXT NOT NULL UNIQUE,
  photo_certificate_id TEXT NOT NULL,
  certificate_number TEXT NOT NULL,
  name TEXT,
  item_type TEXT NOT NULL,
  gross_weight REAL,
  purity REAL,
  media_path TEXT,
  created DATETIME NOT NULL,
  deletedon DATETIME,
  FOREIGN KEY (photo_certificate_id)
    REFERENCES photo_certificate(id) ON DELETE CASCADE
);

-- 💰 CREDIT HISTORY (APPEND ONLY)
CREATE TABLE IF NOT EXISTS credit_history (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT CHECK (type IN ('CREDIT','DEBIT')) NOT NULL,
  mode_of_payment TEXT,
  description TEXT NOT NULL,
  created DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- ⚖️ WEIGHT LOSS HISTORY (APPEND ONLY)
CREATE TABLE IF NOT EXISTS weight_loss_history (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT,
  created DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- 📊 INDEXES
CREATE INDEX IF NOT EXISTS idx_gt_status ON gold_test(status, deletedon);
CREATE INDEX IF NOT EXISTS idx_st_status ON silver_test(status, deletedon);

CREATE INDEX IF NOT EXISTS idx_gc_status ON gold_certificate(status, deletedon);
CREATE INDEX IF NOT EXISTS idx_sc_status ON silver_certificate(status, deletedon);
CREATE INDEX IF NOT EXISTS idx_pc_status ON photo_certificate(status, deletedon);

CREATE INDEX IF NOT EXISTS idx_ch_customer ON credit_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_wlh_customer ON weight_loss_history(customer_id);
