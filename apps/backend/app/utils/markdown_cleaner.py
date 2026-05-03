"""
Markdown syntax cleaner utility
Removes markdown formatting while preserving content
"""
import re


def strip_markdown(text: str) -> str:
    """
    Remove markdown syntax from text, keeping only plain content.
    
    Args:
        text: Markdown formatted text
        
    Returns:
        Plain text without markdown syntax
    """
    if not text:
        return ""
    
    # Remove bold/italic
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*(.+?)\*', r'\1', text)      # *italic*
    text = re.sub(r'__(.+?)__', r'\1', text)      # __bold__
    text = re.sub(r'_(.+?)_', r'\1', text)        # _italic_
    
    # Remove headers (keep text, remove # symbols)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # Remove bullet points (keep text, remove - * + symbols)
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    
    # Remove numbered lists (keep text, remove numbers)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    
    # Remove links [text](url) - keep text only
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # Remove inline code `code` - keep code only
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # Remove code blocks ```code``` - remove entirely
    text = re.sub(r'```[\s\S]*?```', '', text)
    
    # Remove blockquotes > - keep text
    text = re.sub(r'^\s*>\s+', '', text, flags=re.MULTILINE)
    
    # Remove horizontal rules --- or ***
    text = re.sub(r'^[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    
    # Remove strikethrough ~~text~~
    text = re.sub(r'~~(.+?)~~', r'\1', text)
    
    # Clean up multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def markdown_to_html(text: str) -> str:
    """
    Convert basic markdown to HTML.
    
    Args:
        text: Markdown formatted text
        
    Returns:
        HTML formatted text
    """
    if not text:
        return ""
    
    # Convert headers
    text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', text, flags=re.MULTILINE)
    text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', text, flags=re.MULTILINE)
    
    # Convert bold and italic
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
    text = re.sub(r'_(.+?)_', r'<em>\1</em>', text)
    
    # Convert links
    text = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2">\1</a>', text)
    
    # Convert bullet lists
    lines = text.split('\n')
    in_list = False
    result = []
    
    for line in lines:
        if re.match(r'^\s*[-*+]\s+', line):
            if not in_list:
                result.append('<ul>')
                in_list = True
            item = re.sub(r'^\s*[-*+]\s+', '', line)
            result.append(f'<li>{item}</li>')
        else:
            if in_list:
                result.append('</ul>')
                in_list = False
            result.append(line)
    
    if in_list:
        result.append('</ul>')
    
    text = '\n'.join(result)
    
    # Convert paragraphs (lines not in tags)
    lines = text.split('\n')
    result = []
    for line in lines:
        if line.strip() and not line.strip().startswith('<'):
            result.append(f'<p>{line}</p>')
        else:
            result.append(line)
    
    return '\n'.join(result)
