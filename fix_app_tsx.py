import re

file_path = r'E:\2026\AI开发\食安答题助手\Kimi_Agent_食安助手文档\app\src\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start and end of the corrupted formatAnalysis function
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '// 格式化解析内容，添加换行和分段' in line and 'const formatAnalysis' in lines[i+1] if i+1 < len(lines) else False:
        start_idx = i
    if start_idx is not None and '// 处理双引号内容为红色加粗' in line:
        end_idx = i
        break

if start_idx is not None and end_idx is not None:
    new_function = '''  // 格式化解析内容，添加换行和分段
  const formatAnalysis = (text: string): React.ReactNode[] => {
    if (!text) return []
    
    const result: React.ReactNode[] = []
    
    // 方法：使用正则表达式在关键位置插入换行符
    let processed = text
      // 1. 在【标题】前加换行
      .replace(/（【/g, '\\n【')
      .replace(/([^\\n])【/g, '$1\\n【')
      // 2. 在选项字母前加换行 (A. B. C. D. E. F.)
      .replace(/([^\\n])A\\. /g, '$1\\nA. ')
      .replace(/([^\\n])B\\. /g, '$1\\nB. ')
      .replace(/([^\\n])C\\. /g, '$1\\nC. ')
      .replace(/([^\\n])D\\. /g, '$1\\nD. ')
      .replace(/([^\\n])E\\. /g, '$1\\nE. ')
      .replace(/([^\\n])F\\. /g, '$1\\nF. ')
      // 3. 在正确答案前加换行
      .replace(/([^\\n])正确答案[：:]/g, '$1\\n正确答案：')
    
    // 按换行符分割并过滤空行
    const lines = processed.split('\\n').filter(line => line.trim())
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      if (!trimmed) return
      
      // 标题行
      if (trimmed.startsWith('【') && trimmed.includes('】')) {
        result.push(
          <p key={`title-${index}`} className="font-bold text-blue-700 mt-2 mb-1">
            {trimmed}
          </p>
        )
      }
      // 正确答案行
      else if (trimmed.startsWith('正确答案')) {
        result.push(
          <p key={`answer-${index}`} className="font-bold text-green-700 mt-1 mb-1">
            {trimmed}
          </p>
        )
      }
      // 选项行 (A. B. C. D. E. F.)
      else if (/^[A-F]\\.\\s/.test(trimmed)) {
        const match = trimmed.match(/^([A-F]\\.\\s)(.*)/s)
        if (match) {
          result.push(
            <p key={`option-${index}`} className="mb-1 leading-relaxed">
              <span className="font-bold text-gray-800">{match[1]}</span>
              <span>{match[2]}</span>
            </p>
          )
        } else {
          result.push(<p key={`option-${index}`} className="mb-1 leading-relaxed">{trimmed}</p>)
        }
      }
      // 普通内容行
      else {
        result.push(<p key={`text-${index}`} className="mb-1 leading-relaxed">{trimmed}</p>)
      }
    })
    
    return result
  }

'''
    
    # Replace the corrupted function
    new_lines = lines[:start_idx] + [new_function] + lines[end_idx:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f'Fixed! Replaced lines {start_idx+1} to {end_idx}')
else:
    print(f'Could not find function boundaries. start={start_idx}, end={end_idx}')
