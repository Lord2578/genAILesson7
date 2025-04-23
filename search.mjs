import { readFile } from "node:fs/promises"; 
import readline from "node:readline";
import { config } from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai"; 
import { Document } from "@langchain/core/documents"; 
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchNewsFromDB() {
  const { data, error } = await supabase
    .from('news')
    .select('*');

  if (error) {
    console.error("Error fetching news:", error);
    return [];
  }

  return data;
}
// const news = JSON.parse(await readFile("news.json", "utf-8"));

async function createStore(newsData) {
  const embeddings = new OpenAIEmbeddings();
  return MemoryVectorStore.fromDocuments(
    newsData.map(
      (article) =>
        new Document({
          pageContent: `Headline: ${article.headline}
                Content: ${article.content}
                Category: ${article.category}
                Source: ${article.source}
                Date: ${article.date}
                `,
          metadata: {
            sourceId: article.news_id,
          },
        })
    ),
    embeddings
  );
}

// const store = await createStore(); 

async function searchNews(store, newsData, query, count = 1) {
  const results = await store.similaritySearch(query, count);
  return results.map((result) =>
    newsData.find((n) => n.news_id === result.metadata.sourceId)
  );
}

async function searchLoop() {
  const newsData = await fetchNewsFromDB();
  
  if (!newsData.length) {
    console.log("No news data available in the database.");
    return;
  }
  
  console.log(`Loaded ${newsData.length} news articles from database.`);
  
  const store = await createStore(newsData);

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

    const results = await searchNews(store, newsData, query, 3);
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
