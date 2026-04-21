-- ============================================
-- 为questions表添加analysis字段
-- ============================================

-- 添加analysis字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'questions' 
        AND column_name = 'analysis'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN analysis TEXT;
        COMMENT ON COLUMN public.questions.analysis IS '题目解析';
        RAISE NOTICE '成功添加analysis字段';
    ELSE
        RAISE NOTICE 'analysis字段已存在，跳过添加';
    END IF;
END $$;

-- ============================================
-- 完成
-- ============================================
SELECT '题库表analysis字段添加完成！' AS message;
