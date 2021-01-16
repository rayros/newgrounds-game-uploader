const { chromium } = require("playwright");
const argv = require("minimist")(process.argv.slice(2));

const gameId = argv.gameId;
const headless = Boolean(process.env.HEADLESS !== 'false');
const login = process.env.NEWGROUNDS_LOGIN;
const password = process.env.NEWGROUNDS_PASSWORD;
const gameZipPath = argv.gameZipPath;

if (!gameId) {
  throw new Error('Missing --gameId');
}

if (!gameZipPath) {
  throw new Error('Missing --gameZipPath');
}


(async () => {
  const browser = await chromium.launch({
    headless,
  });
  const context = await browser.newContext();

  // Open new page
  const page = await context.newPage();

  await page.goto(`https://www.newgrounds.com/projects/games/${gameId}`);

  // Click text="Login / Sign Up"
  const [passportFrame] = await Promise.all([
    page.waitForEvent("frameattached"),
    page.click('text="Login / Sign Up"'),
  ]);

  await passportFrame.waitForTimeout(1000);
  // Fill input[name="username"]
  await passportFrame.waitForSelector('input[name="username"]');
  await passportFrame.type('input[name="username"]', login, { delay: 100 });

  // Fill input[name="password"]
  await passportFrame.waitForSelector('input[name="password"]');
  await passportFrame.type('input[name="password"]', password, { delay: 100 });

  // Click text=/.*Sign in with.*/
  await Promise.all([
    page.waitForNavigation(),
    passportFrame.click("text=/.*Sign in with.*/"),
  ]);

  const chooseFile = () =>
    new Promise((resolve) => {
      page.on("filechooser", async (fileChooser) => {
        await fileChooser
          .element()
          .evaluate((node) => document.body.appendChild(node));
        await fileChooser.setFiles(gameZipPath);
        await fileChooser
          .element()
          .evaluate((node) => document.body.removeChild(node));
        resolve();
      });
    });

  await Promise.all([chooseFile(), page.click('text="Upload File"')]);

  // Wait for the upload to finish
  await page.waitForSelector('span:visible:text("Ready to be Published")');

  // Click text="Publish Changes"
  await page.click('text="Publish Changes"');

  // Click text="Publish Game?"
  await Promise.all([
    page.waitForNavigation(),
    page.click('text="Publish Game?"'),
  ]);

  // // Close page
  await page.close();

  // // ---------------------
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
