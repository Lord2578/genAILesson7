import { readFile } from "node:fs/promises";
import readline from "node:readline";
import { config } from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

config();

const products = JSON.parse(await readFile("products.json", "utf-8"));

function createStore(products) {
  const embeddings = new OpenAIEmbeddings();
  return MemoryVectorStore.fromDocuments(
    products.map(
      (product) =>
        new Document({
          pageContent: `Title: ${product.title}
                Description: ${product.description}
                Price: ${product.price}
                `,
          metadata: {
            sourceId: product.id,
          },
        })
    ),
    embeddings
  );
}

const store = await createStore(products);

async function searchProducts(query, count = 1) {
  const results = await store.similaritySearch(query, count);
  return results.map((result) =>
    products.find((p) => p.id === result.metadata.sourceId)
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

    const results = await searchProducts(query, 3);
    if (results.length === 0) {
      console.log("No results found.");
    } else {
      console.log("Results:");
      results.forEach((result) => {
        console.log(`- ${result.name} (${result.price})`);
      });
    }
  }
  rl.close();
}

await searchLoop();