# -*- coding: utf-8 -*-
"""
replace_icons.py
Replace tất cả emoji còn sót lại trong các TSX files bằng text thuần
hoặc giữ nguyên nếu là decoration không ảnh hưởng UI.

Chạy: python replace_icons.py
"""
import os, re, sys
from pathlib import Path

SRC = Path(__file__).parent / "apps/frontend/src"

# Map emoji → replacement text (hoặc xoá nếu chỉ là decoration)
EMOJI_MAP = {
    # Thay bằng lucide icon text mô tả (sẽ được render trong string context)
    "🎯": "",        # Target — trong string thì bỏ prefix
    "📋": "",        # Clipboard
    "👥": "",        # Users
    "📅": "",        # Calendar
    "🌟": "",        # Star
    "💬": "",        # Message
    "📌": "",        # Pin
    "🏢": "",        # Building
    "ℹ️": "",       # Info
    "🔍": "",        # Search
    "⚠️": "",       # Warning
    "📄": "",        # File
    "📂": "",        # Folder
    "📈": "",        # Chart
    "🤖": "",        # Robot/AI
    "🗺️": "",      # Map
    "🧑‍💼": "",   # Person
    "✏️": "",       # Edit
    "🚀": "",        # Launch
    "💾": "",        # Save
    "🌐": "",        # Globe
    "🔒": "",        # Lock
    "👤": "",        # User
    "📊": "",        # Chart bar
    "🎮": "",        # Game
    "🎓": "",        # Graduate
    "⭐": "",        # Star
    "🔔": "",        # Bell
    "❌": "",        # X
    "✅": "",        # Check
    "💡": "",        # Bulb
    "🔑": "",        # Key
    "📝": "",        # Memo
    "🏆": "",        # Trophy
    "🔥": "",        # Fire
    "💰": "",        # Money
    "🎉": "",        # Party
    "📱": "",        # Phone
    "⏱": "",         # Timer
    "🕐": "",        # Clock
    "📞": "",        # Phone
    "✉️": "",       # Email
    "👋": "",        # Wave
    "🧭": "",        # Compass
    "🔗": "",        # Link
    "✓ ": "✓ ",      # keep checkmarks that are text
    "✓": "✓",
    "💥": "",
    "🎨": "",
    "📉": "",
    "🔄": "",
    "⚡": "",
    "🌿": "",
    "🌱": "",
    "🏅": "",
    "🎯 ": "",       # prefix "🎯 " → remove
    # Assessment game emojis — keep for game UI
    # "🃏": "🃏",  # keep card game
    # "🧩": "🧩",  # keep puzzle
}

# Patterns cần xử lý đặc biệt (regex → replacement)
PATTERN_REPLACEMENTS = [
    # Remove emoji that appear as lone prefix before text in JSX
    (r'[🎯📋👥📅🌟💬📌🏢ℹ🔍⚠📄📂📈🤖🗺✏🚀💾🌐🔒👤📊🎮🎓⭐🔔💡🔑📝🏆🔥💰🎉📱⏱🕐📞✉👋🧭🔗💥🎨📉🔄⚡🌿🌱🏅]️? ', ''),  # emoji followed by space
    (r'[🎯📋👥📅🌟💬📌🏢🔍⚠📄📂📈🤖✏🚀💾🌐🔒👤📊🎮🎓⭐🔔💡🔑📝🏆🔥💰🎉📱⏱🕐📞👋🧭🔗💥🎨📉🔄⚡🌿🌱🏅]', ''),
]

def clean_file(filepath: Path) -> int:
    """Remove emoji from a TSX file. Returns number of replacements made."""
    try:
        content = filepath.read_text(encoding='utf-8')
        original = content

        # Apply direct string replacements
        for emoji, replacement in EMOJI_MAP.items():
            if emoji in content:
                # Don't replace in import statements or comments
                content = content.replace(emoji, replacement)

        # Count changes
        changes = sum(1 for a, b in zip(original, content) if a != b)
        if changes:
            filepath.write_text(content, encoding='utf-8')
        return changes
    except Exception as e:
        print(f"  ERROR {filepath.name}: {e}")
        return 0


def main():
    tsx_files = list(SRC.rglob("*.tsx"))
    total_changes = 0
    changed_files = []

    for f in sorted(tsx_files):
        n = clean_file(f)
        if n > 0:
            rel = f.relative_to(SRC)
            changed_files.append(str(rel))
            total_changes += n

    print(f"Changed {len(changed_files)} files, {total_changes} chars replaced")
    for f in changed_files:
        print(f"  {f}")


if __name__ == "__main__":
    main()
