#!/usr/bin/env bash
set -euo pipefail
app_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(git -C "$app_dir" rev-parse --show-toplevel)"
remote_url="$(git -C "$repo_root" remote get-url origin)"
source_sha="$(git -C "$repo_root" rev-parse HEAD)"
cd "$app_dir"
npm test
npm run build
publish_dir="$(mktemp -d /tmp/other-self-pages.XXXXXX)"
trap 'rm -rf "$publish_dir"' EXIT
# Keep publication history; never force push a deployment branch.
git -c credential.helper='!gh auth git-credential' clone --single-branch --branch gh-pages "$remote_url" "$publish_dir" >/dev/null
find "$publish_dir" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf -- {} +
cp -R "$app_dir/dist/." "$publish_dir/"
touch "$publish_dir/.nojekyll"
printf '%s\n' "$source_sha" > "$publish_dir/source-commit.txt"
git -C "$publish_dir" add .
if git -C "$publish_dir" diff --cached --quiet; then
  echo 'Build output unchanged.'
else
  git -C "$publish_dir" -c user.name='Codex' -c user.email='codex@openai.com' commit -m "Deploy Other Side of Self from $source_sha"
  git -C "$publish_dir" -c credential.helper='!gh auth git-credential' push origin gh-pages
fi
