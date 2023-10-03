const { execSync } = require("child_process")
const { Liquid } = require("liquidjs")
const express = require("express")
const fs = require("fs")
const MarkdownIt = require("markdown-it")
const path = require("path")
const process = require("process")
const watch = require("@jrc03c/watch")

async function rebuild() {
  console.log("-----")
  console.log(`Rebuilding... (${new Date().toLocaleString()})`)

  try {
    const template = fs.readFileSync(
      path.join(__dirname, "template.html"),
      "utf8",
    )

    const md = new MarkdownIt()

    const poems = JSON.parse(
      fs.readFileSync(path.join(__dirname, "poems.json"), "utf8"),
    ).map(poem => {
      poem.content = poem.content
        .split(" || ")
        .map(line => {
          const rendered = md.renderInline(line)
          return `<div class="line">${rendered}</div>`
        })
        .join("\n")

      return poem
    })

    const data = { poems }
    const liquid = new Liquid()
    const rendered = await liquid.parseAndRender(template, data)
    fs.writeFileSync(path.join(__dirname, "index.html"), rendered, "utf8")

    execSync(`npx prettier -w "${path.join(__dirname, "index.html")}"`, {
      encoding: "utf8",
    })

    console.log("Done! 🎉")
  } catch (e) {
    console.error(e)
  }
}

if (process.argv.indexOf("--watch") > -1) {
  watch({
    target: path.resolve(__dirname),
    exclude: ["index.html", "node_modules"],
    created: rebuild,
    modified: rebuild,
    deleted: rebuild,
  })

  const server = express()

  server.use(
    "/",
    express.static(path.join(__dirname), { extensions: ["html"] }),
  )

  server.listen(8000, () => {
    console.log("Listening at http://localhost:8000...")
  })
}

rebuild()
