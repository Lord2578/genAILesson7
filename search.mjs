import { readFile } from "node:fs/promises";
import readline from "node:readline";
import { config } from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

config();

const news = JSON.parse(await readFile("news.json", "utf-8"));

function createStore(news) {
  const embeddings = new OpenAIEmbeddings();
  return MemoryVectorStore.fromDocuments(
    news.map(
      (article) =>
        new Document({
          pageContent: `Headline: ${article.headline}
                Content: ${article.content}
                Category: ${article.category}
                Source: ${article.source}
                Date: ${article.date}
                `,
          metadata: {
            sourceId: article.newsId,
          },
        })
    ),
    embeddings
  );
}

const store = await createStore(news);

async function searchNews(query, count = 1) {
  const results = await store.similaritySearch(query, count);
  return results.map((result) =>
    news.find((n) => n.newsId === result.metadata.sourceId)
  );
}

async function searchLoop() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query) =>
    new Promise((resolve) => {
      rl.question(query, resolve);
    });

  while (true) {
    const query = await askQuestion("Enter your search (or 'exit' to quit): ");
    if (query.toLowerCase() === "exit") {
      break;
    }

    const results = await searchNews(query, 3);
    if (results.length === 0) {
      console.log("No results found.");
    } else {
      console.log("Results:");
      results.forEach((result) => {
        console.log(`- ${result.headline} [${result.category}] – Source: ${result.source}`);
      });
    }
  }
  rl.close();
}

await searchLoop();
