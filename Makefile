# Vercel Deployment Makefile
# This Makefile uses local build to avoid leaking credentials.
# Prerequisites: Vercel CLI installed (`npm i -g vercel`)

.PHONY: build-docs deploy-docs

# Pulls the latest environment variables and project settings from Vercel.
# Requires VERCE_TOKEN and PROJECT_ID to be set in your local environment or .env.local
pull:
	npx vercel pull --yes --environment=production

# Builds the docs locally using Vercel's build command.
# This creates a .vercel/output directory.
build-docs:
	npx vercel build --prod

# Deploys the prebuilt artifacts to Vercel.
# Uses the --prebuilt flag to ensure only the local build is used.
deploy-docs: build-docs
	npx vercel deploy --prebuilt --prod

generate-playground-macos:
	node packages/codegen/dist/cli.js examples/playground/logic/playground.spec.ts examples/playground/macos/Generated examples/playground/logic/src/generated
	node packages/codegen/dist/cli.js examples/playground/logic/src/http.spec.ts examples/playground/macos/Generated examples/playground/logic/src/generated
	cd examples/playground/macos && xcodegen generate

# Clean up build artifacts
clean:
	rm -rf .vercel/output
	rm -rf apps/docs/.next
