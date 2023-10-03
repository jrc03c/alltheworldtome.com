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

  console.log(
    "NOTE: Remember that you can specify a base path with -b or --base-path!",
  )

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

    const basePath = (() => {
      const arg = process.argv.find(a => a.includes("--base-path"))
      const index = process.argv.indexOf("-b")

      if (arg) {
        return arg.split("=").at(-1)
      } else if (index > -1) {
        return process.argv[index + 1]
      } else {
        return "."
      }
    })()

    const data = { poems, base_path: basePath }
    const liquid = new Liquid()
    const rendered = await liquid.parseAndRender(template, data)
    const outfile = path.join(__dirname, "index.html")
    fs.writeFileSync(outfile, rendered, "utf8")
    execSync(`npx prettier -w "${outfile}"`, { encoding: "utf8" })

    console.log("Done! 🎉")
  } catch (e) {
    console.error(e)
  }
}

if (process.argv.indexOf("--watch") > -1) {
  watch({
    target: path.resolve(__dirname),
    exclude: ["build.js", "index.html", "node_modules"],
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
