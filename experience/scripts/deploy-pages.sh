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
# Cached HTML and already-open sessions may still refer to older fingerprinted
# assets. Keep those immutable filenames available; new builds only add hashes.
find "$publish_dir" -mindepth 1 -maxdepth 1 ! -name .git ! -name assets -exec rm -rf -- {} +
cp -R "$app_dir/dist/." "$publish_dir/"
# During the static recovery, cached HTML must not revive a retained motion
# entry. Keep old URLs usable, but route only those motion bundles to static UI.
python3 - "$publish_dir" "$app_dir/dist" <<'PY'
from pathlib import Path
import re,sys
published,build=map(Path,sys.argv[1:])
entry=re.search(r'src="\./assets/([^"/]+\.js)"',(build/'index.html').read_text()).group(1)
current=(build/'assets'/entry).read_text()
if 'page02-environment' not in current:
    font_import=re.compile(r'@import\s*(?:url\(\s*)?([\'"])https://fonts\.googleapis\.com/[^\'"]+\1\s*\)?\s*;')
    for asset in (published/'assets').glob('index-*.css'):
        source=asset.read_text()
        clean=font_import.sub('',source)
        if clean!=source:
            asset.write_text(clean)
    for asset in (published/'assets').glob('index-*.js'):
        if asset.name==entry:
            continue
        source=asset.read_text()
        if 'page02-environment' in source or 'static-recovery-entry' in source:
            asset.write_text('// static-recovery-entry\nimport "./'+entry+'";\n')
    for asset in (published/'assets').glob('page02-material-*.js'):
        # An already-open old page may still request this optional module.
        asset.write_text('export function createPage02Material(){return null}\n')
PY
touch "$publish_dir/.nojekyll"
printf '%s\n' "$source_sha" > "$publish_dir/source-commit.txt"
git -C "$publish_dir" add .
if git -C "$publish_dir" diff --cached --quiet; then
  echo 'Build output unchanged.'
else
  git -C "$publish_dir" -c user.name='Codex' -c user.email='codex@openai.com' commit -m "Deploy Other Side of Self from $source_sha"
  git -C "$publish_dir" -c credential.helper='!gh auth git-credential' push origin gh-pages
fi
