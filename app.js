import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";

const PORT = 3001;
const DATA_FILE = path.join("data", "links.json");

const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      const data = await readFile(path.join("public", "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    } else if (req.method === "GET" && req.url === "/style.css") {
      const data = await readFile(path.join("public", "style.css"));
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(data);
    } else if (req.method === "POST" && req.url == "/shorten") {
      const links = await loadLinks();

      let body = "";
      req.on("data", (chunk) => {
        body = body + chunk;
      });
      req.on("end", async () => {
        console.log(body);
        const { url, shortCode } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          return res.end("URL is required");
        }

        const finalShortCode =
          shortCode || crypto.randomBytes(4).toString("hex");

        if (links[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          return res.end("Short code already exists");
        }
        links[finalShortCode] = url;

        await saveLinks(links);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
      });
    } 
    
    else if (req.method === "GET" && req.url === "/links") {
      const links = await loadLinks();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(links));
    }
    
    else if (req.method === "GET") {
      const links = await loadLinks();
      const shortCode = req.url.slice(1);

      const originalURL = links[shortCode];
      if (originalURL) {
        res.writeHead(302, { Location: originalURL });
        return res.end();
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Short URL not found");
      }
    }
     else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Page Not Found!!");
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
