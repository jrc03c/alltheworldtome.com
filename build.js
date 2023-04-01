const { Liquid } = require("liquidjs")
const express = require("express")
const fs = require("fs")
const fsx = require("@jrc03c/fs-extras")
const MarkdownIt = require("markdown-it")
const path = require("path")
const process = require("process")
const watch = require("@jrc03c/watch")

function copySync(a, b) {
  if (fs.statSync(a).isDirectory()) {
    const aFiles = fsx.getFilesDeepSync(a)

    aFiles.forEach(aFile => {
      const aFileRelativePath = aFile.replace(a, "")
      const bFile = path.join(b, aFileRelativePath)
      copySync(aFile, bFile)
    })
  } else {
    const bDir = b.split("/").slice(0, -1).join("/")

    if (!fs.existsSync(bDir)) {
      fs.mkdirSync(bDir, { recursive: true })
    }

    fs.copyFileSync(a, b)
  }
}

async function rebuild() {
  console.log("-----")
  console.log(`Rebuilding... (${new Date().toLocaleString()})`)

  try {
    const srcDir = path.join(__dirname, "src")
    const distDir = path.join(__dirname, "dist")

    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir)
    }

    copySync(path.join(srcDir, "res"), path.join(distDir, "res"))

    const indexRaw = fs.readFileSync(path.join(srcDir, "index.html"), "utf8")
    const md = new MarkdownIt()

    const poems = JSON.parse(
      fs.readFileSync(path.join(srcDir, "poems.json"), "utf8")
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
    const indexRendered = await liquid.parseAndRender(indexRaw, data)
    fs.writeFileSync(path.join(distDir, "index.html"), indexRendered, "utf8")

    console.log("Done! 🎉")
  } catch (e) {
    console.error(e)
  }
}

if (process.argv.indexOf("--watch") > -1) {
  watch({
    target: path.join(__dirname, "src"),
    exclude: ["node_modules"],
    created: rebuild,
    modified: rebuild,
    deleted: rebuild,
  })

  const server = express()

  server.use(
    "/",
    express.static(path.join(__dirname, "dist"), { extensions: ["html"] })
  )

  server.listen(8000, () => {
    console.log("Listening at http://localhost:8000...")
  })
}

rebuild()
