const config = {
  testDir: './tests',
  timeout: 30 * 1000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000
  }
};
module.exports = config;
