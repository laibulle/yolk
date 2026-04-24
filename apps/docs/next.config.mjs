import createMDX from "@next/mdx"

const withMDX = createMDX({})

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ["ts", "tsx", "mdx"],
}

export default withMDX(config)
