import sys
import re
from pathlib import Path

def parse_po_file(path):
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    normal_entries = {}
    obsolete_entries = {}

    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('msgid'):
            # normal msgid
            msgid = re.match(r'msgid\s+"(.*)"', line).group(1)
            msgstr = ""
            j = i + 1
            while j < len(lines) and not lines[j].startswith('msgid'):
                if lines[j].startswith('msgstr'):
                    msgstr = re.match(r'msgstr\s+"(.*)"', lines[j]).group(1)
                    break
                j += 1
            normal_entries[msgid] = msgstr
            i = j
        elif line.startswith('#~ msgid'):
            # obsolete msgid
            msgid = re.match(r'#~ msgid\s+"(.*)"', line).group(1)
            msgstr = ""
            j = i + 1
            while j < len(lines) and not lines[j].startswith('#~ msgid'):
                if lines[j].startswith('#~ msgstr'):
                    msgstr = re.match(r'#~ msgstr\s+"(.*)"', lines[j]).group(1)
                    break
                j += 1
            obsolete_entries[msgid] = msgstr
            i = j
        else:
            i += 1

    return normal_entries, obsolete_entries


def find_duplicates(normal, obsolete):
    for msgid, old_translation in obsolete.items():
        if msgid in normal:
            new_translation = normal[msgid]
            print(f"[DUPLICATE] msgid: {msgid}")
            print(f"  🟡 Old (obsolete): {old_translation}")
            print(f"  🟢 New (active):   {new_translation}")
            print("")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 detect-lingui-duplicates.py <path-to-po-file>")
        sys.exit(1)

    print(f"Detecting Lingui duplicates in PO file {sys.argv[1]}...")

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    normal, obsolete = parse_po_file(path)
    find_duplicates(normal, obsolete)
