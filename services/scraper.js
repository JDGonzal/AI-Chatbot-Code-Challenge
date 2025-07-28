import axios from "axios";
import * as cheerio from 'cheerio';

// Extract the main text from the body of a webpage
export async function fetchAndExtractText(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  // You can adjust the selector based on the structure of each page
  return $("body").text().replace(/\s+/g, " ").trim();
}
