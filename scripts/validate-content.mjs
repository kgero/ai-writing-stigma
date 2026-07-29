import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesPath = path.join(__dirname, "../content/articles.json");
const data = JSON.parse(fs.readFileSync(articlesPath, "utf-8"));
const active = data.articles.filter((a) => a.active);
const human = active.filter((a) => a.authorship_type === "human");
const ai = active.filter((a) => a.authorship_type === "ai_assisted");

if (active.length !== 6) {
  console.error(`Expected 6 active articles, found ${active.length}`);
  process.exit(1);
}
if (human.length !== 3 || ai.length !== 3) {
  console.error(`Expected 3 human and 3 ai_assisted, found ${human.length} human and ${ai.length} ai_assisted`);
  process.exit(1);
}

console.log("Content validation passed: 6 active articles (3 human, 3 ai_assisted).");
