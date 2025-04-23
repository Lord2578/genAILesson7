// import { readFile } from "node:fs/promises"; 
import readline from "node:readline";
import { config } from "dotenv";
// import { OpenAIEmbeddings } from "@langchain/openai"; 
// import { Document } from "@langchain/core/documents"; 
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// const news = JSON.parse(await readFile("news.json", "utf-8"));

// async function createStore() {
//   const { data, error } = await supabase
//     .from('news')
//     .upsert(
//       news.map(
//         (item) => ({
//           news_id: item.newsId,
//           headline: item.headline,
//           content: item.content,
//           category: item.category,
//           source: item.source,
//           date: item.date,
//         })
//       )
//     );

//   if (error) {
//     console.error("Insert error:", error);
//   }

//   return data;
// }

// const store = await createStore(); 

async function searchNews(query, count = 1) {
  const { data, error } = await supabase
    .from('news')
    .select()
    .ilike('headline', `%${query}%`)
    .limit(count);

  if (error) {
    console.error("Search error:", error);
  }

  return data;
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
