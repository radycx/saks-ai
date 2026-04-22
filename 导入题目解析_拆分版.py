"""
题目解析数据批量导入脚本（拆分版）
功能：从CSV文件读取解析数据，拆分成多个SQL文件
使用方法：
  1. 运行脚本：python 导入题目解析_拆分版.py
  2. 在 Supabase SQL Editor 中依次执行生成的 SQL 文件
"""

import csv
import os

# 配置
CSV_FILE = os.path.join(os.path.dirname(__file__), 'questions_rows_with_analysis.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'Kimi_Agent_食安助手文档')
BATCH_SIZE = 500  # 每个文件500条UPDATE语句

def escape_sql_string(s):
    """转义SQL字符串中的特殊字符"""
    if not s:
        return ''
    # 替换单引号为两个单引号（SQL转义）
    return s.replace("'", "''")

def generate_batched_sql():
    """从CSV生成批量SQL UPDATE语句"""
    
    if not os.path.exists(CSV_FILE):
        print(f"错误：找不到CSV文件 {CSV_FILE}")
        return False
    
    updates = []
    count = 0
    skipped = 0
    file_count = 0
    
    print(f"开始读取CSV文件：{CSV_FILE}")
    print(f"每 {BATCH_SIZE} 条记录生成一个SQL文件")
    print()
    
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
                
                # 达到批量大小，生成文件
                if len(updates) >= BATCH_SIZE:
                    file_count += 1
                    save_batch_file(updates, file_count, count)
                    updates = []  # 清空缓存
                    print(f"✓ 已生成第 {file_count} 批文件")
            else:
                skipped += 1
    
    # 处理剩余数据
    if updates:
        file_count += 1
        save_batch_file(updates, file_count, count)
        print(f"✓ 已生成第 {file_count} 批文件（最后一批）")
    
    print(f"\n{'='*60}")
    print(f"处理完成！")
    print(f"{'='*60}")
    print(f"成功解析：{count} 条")
    print(f"跳过（无解析）：{skipped} 条")
    print(f"生成文件数：{file_count} 个")
    print(f"{'='*60}")
    print(f"\n文件位置：{OUTPUT_DIR}")
    print(f"文件名格式：07_导入解析_批次X.sql")
    print(f"\n执行顺序：")
    for i in range(1, file_count + 1):
        print(f"  {i}. 07_导入解析_批次{i}.sql")
    print(f"\n下一步操作：")
    print("1. 打开 Supabase Dashboard")
    print("2. 进入 SQL Editor")
    print("3. 按顺序依次执行每个SQL文件")
    print("4. 每个文件执行成功后再执行下一个")
    
    return True

def save_batch_file(updates, file_num, total_count):
    """保存批次SQL文件"""
    
    start_num = (file_num - 1) * BATCH_SIZE + 1
    end_num = start_num + len(updates) - 1
    
    sql_content = f"""-- ============================================
-- 题目解析数据导入 - 第 {file_num} 批次
-- 记录范围：第 {start_num} - {end_num} 条
-- 本批数量：{len(updates)} 条
-- ============================================
-- 执行时间：约 1-2 分钟
-- ============================================

BEGIN;

"""
    sql_content += '\n'.join(updates)
    sql_content += f"""

COMMIT;

-- ============================================
SELECT '✅ 第 {file_num} 批次导入完成！共更新 {len(updates)} 条记录。' AS message;
"""
    
    # 写入SQL文件
    sql_file_path = os.path.join(OUTPUT_DIR, f'07_导入解析_批次{file_num}.sql')
    with open(sql_file_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    
    file_size = os.path.getsize(sql_file_path) / 1024
    print(f"  → 生成文件：07_导入解析_批次{file_num}.sql ({file_size:.2f} KB)")

if __name__ == '__main__':
    print("="*60)
    print("题目解析数据批量导入脚本（拆分版）")
    print("="*60)
    print()
    
    success = generate_batched_sql()
    
    print()
    if success:
        print("✓ 脚本执行成功！")
    else:
        print("✗ 脚本执行失败！")
    
    print("\n按Enter键退出...")
    input()
