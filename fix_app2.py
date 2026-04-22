file_path = r'E:\2026\AI开发\食安答题助手\Kimi_Agent_食安助手文档\app\src\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the corrupted section and remove it
# The corrupted section starts with "?（【/g" and ends before "// 处理双引号"
start_marker = '}\n?（【/g'
end_marker = '}\n\n  // 处理双引号内容为红色加粗'

start_idx = content.find(start_marker)
if start_idx != -1:
    end_idx = content.find(end_marker, start_idx)
    if end_idx != -1:
        # Remove everything from start_idx to end_idx + len('}\n')
        content = content[:start_idx+1] + '\n\n' + content[end_idx+2:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('Fixed! Removed corrupted code.')
    else:
        print('Could not find end marker')
else:
    print('Could not find start marker')
