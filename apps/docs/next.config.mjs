import createMDX from "@next/mdx"
import rehypePrettyCode from "rehype-pretty-code"

/** @type {import('rehype-pretty-code').Options} */
const options = {
  theme: "github-dark",
}

const withMDX = createMDX({
  options: {
    rehypePlugins: [[rehypePrettyCode, options]],
  },
})

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ["ts", "tsx", "mdx"],
}

export default withMDX(config)
