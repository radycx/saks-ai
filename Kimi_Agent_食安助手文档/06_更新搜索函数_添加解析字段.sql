-- ============================================
-- 更新search_questions函数，添加analysis字段
-- ============================================

-- 更新搜索题目函数，在返回值中增加analysis字段
CREATE OR REPLACE FUNCTION public.search_questions(
    search_text TEXT,
    max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    question_type VARCHAR,
    business_type VARCHAR,
    question_content TEXT,
    answer VARCHAR,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    option_f TEXT,
    option_g TEXT,
    option_h TEXT,
    option_i TEXT,
    option_j TEXT,
    analysis TEXT,
    match_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.question_type,
        q.business_type,
        q.question_content,
        q.answer,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.option_e,
        q.option_f,
        q.option_g,
        q.option_h,
        q.option_i,
        q.option_j,
        q.analysis,
        similarity(q.question_content, search_text) AS match_score
    FROM public.questions q
    WHERE q.question_content ILIKE '%' || search_text || '%'
    ORDER BY match_score DESC, q.id
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.search_questions IS '模糊搜索题目函数（包含解析）';

-- ============================================
-- 完成
-- ============================================
SELECT 'search_questions函数更新完成，已添加analysis字段！' AS message;
