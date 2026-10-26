"""One-off: extract inline script from index.html (run before modular refactor)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "index.html").read_text(encoding="utf-8")
m = re.search(r"three\.min\.js\"></script>\s*<script>(.*?)</script>", text, re.S)
if not m:
    raise SystemExit("inline script not found")
js = m.group(1)
js = re.sub(r"const EMBEDDED_TRACK = `.*?`;\s*\n", "", js, count=1, flags=re.S)
js = re.sub(
    r"// ====================== CONFIG ======================.*?const G = 9\.8;\s*\n",
    "",
    js,
    count=1,
    flags=re.S,
)
(ROOT / "js").mkdir(exist_ok=True)
(ROOT / "js" / "_legacy.js").write_text(js, encoding="utf-8")
print("wrote js/_legacy.js", len(js), "chars")
