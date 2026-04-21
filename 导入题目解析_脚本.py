"""
题目解析数据导入脚本
功能：从CSV文件读取解析数据，生成SQL UPDATE语句
使用方法：
  1. 确保CSV文件路径正确
  2. 运行脚本：python 导入题目解析_脚本.py
  3. 将生成的SQL文件在Supabase SQL Editor中执行
"""

import csv
import os

# 配置
CSV_FILE = os.path.join(os.path.dirname(__file__), 'questions_rows_with_analysis.csv')
OUTPUT_SQL_FILE = os.path.join(os.path.dirname(__file__), 'Kimi_Agent_食安助手文档', '05_导入题目解析_完整数据.sql')
BATCH_SIZE = 100  # 每100条生成一个文件

def escape_sql_string(s):
    """转义SQL字符串中的特殊字符"""
    if not s:
        return ''
    # 替换单引号为两个单引号（SQL转义）
    return s.replace("'", "''")

def generate_sql_from_csv():
    """从CSV生成SQL UPDATE语句"""
    
    if not os.path.exists(CSV_FILE):
        print(f"错误：找不到CSV文件 {CSV_FILE}")
        print("请确保CSV文件在项目根目录")
        return False
    
    updates = []
    count = 0
    skipped = 0
    
    print(f"开始读取CSV文件：{CSV_FILE}")
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            question_id = row.get('id', '').strip()
            analysis = row.get('analysis', '').strip()
            
            if not question_id:
                skipped += 1
                continue
            
            if analysis:
                # 生成UPDATE语句
                escaped_analysis = escape_sql_string(analysis)
                update_sql = f"UPDATE public.questions SET analysis = '{escaped_analysis}' WHERE id = '{question_id}';"
                updates.append(update_sql)
                count += 1
                
                if count % 500 == 0:
                    print(f"已处理 {count} 条记录...")
            else:
                skipped += 1
    
    print(f"\n处理完成！")
    print(f"成功解析：{count} 条")
    print(f"跳过（无解析）：{skipped} 条")
    
    # 生成SQL文件
    if updates:
        sql_content = f"""-- ============================================
-- 题目解析数据导入脚本
-- 自动生成时间：通过Python脚本生成
-- 总记录数：{count} 条
-- ============================================

-- 开始事务
BEGIN;

"""
        sql_content += '\n'.join(updates)
        sql_content += f"""

-- 提交事务
COMMIT;

-- ============================================
-- 完成
-- ============================================
SELECT '题目解析数据导入完成！共更新 {count} 条记录。' AS message;
"""
        
        # 写入SQL文件
        sql_file_path = os.path.join(os.path.dirname(__file__), OUTPUT_SQL_FILE)
        with open(sql_file_path, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"\nSQL文件已生成：{sql_file_path}")
        print(f"文件大小：{os.path.getsize(sql_file_path) / 1024:.2f} KB")
        print("\n下一步操作：")
        print("1. 打开Supabase Dashboard")
        print("2. 进入SQL Editor")
        print("3. 复制并执行生成的SQL文件内容")
        
        return True
    else:
        print("没有生成任何UPDATE语句，请检查CSV文件")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("题目解析数据导入脚本")
    print("=" * 60)
    print()
    
    success = generate_sql_from_csv()
    
    print()
    if success:
        print("✓ 脚本执行成功！")
    else:
        print("✗ 脚本执行失败！")
    
    print("\n按Enter键退出...")
    input()
