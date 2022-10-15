import puppeteer from "puppeteer";
import fs from "fs";
import https from "https";
import TelegramBot from "node-telegram-bot-api";
import { start } from "repl";

const URLregex =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;
const WBimages = ".j-wba-card-item img";
const link =
  "https://www.wildberries.ru/catalog/13413797/detail.aspx?targetUrl=XS";
const downloadPath = "./downloads/";
const config = JSON.parse(
  await fs.promises.readFile(new URL("./config/config.json", import.meta.url))
);
const { token, replyTimeout, adminId } = config;
const bot = new TelegramBot(token, { polling: true });
const removeReplyListener = (id) => {
  bot.removeReplyListener(id);
};

const downloadImages = async (link, filename) => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(link);
  await page.screenshot({ path: "./screen.png" });
  await page.waitForSelector(WBimages);
  const images = await page.evaluate((WBimages) => {
    return [...document.querySelectorAll(WBimages)].map((anchor) => {
      return `${anchor.src}`;
    });
  }, WBimages);

  //   images.forEach(async (image, index) => {
  //     await downloadFile(image, downloadPath + `${filename + index}.png`);
  //   });

  await browser.close();
  return images;
};

async function downloadFile(url, path) {
  https.get(url, (res) => {
    res.pipe(fs.createWriteStream(path));
  });
}

try {
  (async function start() {
    console.log("Bot started.");
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const fromWho = msg.from.id;
      const text = msg.text;
      if (fromWho === adminId && text.match(URLregex)) {
        try {
          var links = text.match(URLregex);
          var first_link = links[0];
          const IMGlinks = await downloadImages(first_link);
          const images = [];
          for (let i = 0; i < 10; i++) {
            images.push({ type: "photo", media: IMGlinks[i] });
          }
          await bot.sendMediaGroup(chatId, images);
          return;
        } catch (e) {
          await bot.sendMessage(chatId, "Error! " + e);
          return;
        }
      }
    });
  })();
} catch (e) {
  console.log(e);
  start();
}
