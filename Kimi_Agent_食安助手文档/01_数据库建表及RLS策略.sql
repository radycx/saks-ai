-- ============================================
-- 食安AI答题助手 - 数据库初始化脚本
-- ============================================
-- 执行顺序: 1. 建表 -> 2. 视图 -> 3. 索引 -> 4. RLS策略 -> 5. 函数
-- ============================================

-- ============================================
-- 一、创建数据表
-- ============================================

-- 1.1 题库表
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('单选题', '多选题', '判断题')),
    business_type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(10) DEFAULT '易' CHECK (difficulty IN ('易', '中', '难')),
    is_required VARCHAR(10) DEFAULT '否' CHECK (is_required IN ('是', '否')),
    remark TEXT,
    question_content TEXT NOT NULL,
    answer VARCHAR(50) NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.questions IS '题库表';
COMMENT ON COLUMN public.questions.question_type IS '题目类型: 单选题/多选题/判断题';
COMMENT ON COLUMN public.questions.business_type IS '业态类型: 食品生产/食品流通/餐饮/特殊食品生产/特殊食品流通';
COMMENT ON COLUMN public.questions.is_required IS '是否必考题: 是/否';
COMMENT ON COLUMN public.questions.analysis IS '题目解析';

-- 1.2 普通用户表
CREATE TABLE IF NOT EXISTS public.regular_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(11) NOT NULL UNIQUE,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    available_questions INTEGER DEFAULT 2 CHECK (available_questions >= 0),
    total_payment_amount DECIMAL(10,2) DEFAULT 0 CHECK (total_payment_amount >= 0),
    valid_payment_count INTEGER DEFAULT 0 CHECK (valid_payment_count >= 0),
    last_payment_date DATE,
    status VARCHAR(10) DEFAULT '正常' CHECK (status IN ('正常', '禁用')),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.regular_users IS '普通用户表';
COMMENT ON COLUMN public.regular_users.phone IS '用户手机号';
COMMENT ON COLUMN public.regular_users.available_questions IS '可用题数';
COMMENT ON COLUMN public.regular_users.status IS '用户状态: 正常/禁用';

-- 1.3 缴费记录表
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.regular_users(id) ON DELETE CASCADE,
    phone VARCHAR(11) NOT NULL,
    payment_image_url TEXT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audit_status VARCHAR(10) DEFAULT '待审核' CHECK (audit_status IN ('待审核', '已通过', '已拒绝')),
    audit_result VARCHAR(10),
    audit_remark TEXT,
    audited_amount DECIMAL(10,2),
    auditor_id UUID,
    audit_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.payment_records IS '缴费记录表';
COMMENT ON COLUMN public.payment_records.audit_status IS '审核状态: 待审核/已通过/已拒绝';

-- 1.4 使用记录表
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.regular_users(id) ON DELETE CASCADE,
    phone VARCHAR(11) NOT NULL,
    search_content TEXT NOT NULL,
    matched_count INTEGER DEFAULT 0,
    used_questions INTEGER DEFAULT 0,
    use_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.usage_records IS '使用记录表';

-- 1.5 系统配置表
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(50) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'text' CHECK (config_type IN ('text', 'image')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.system_config IS '系统配置表';

-- 1.6 管理员表（用于扩展，当前使用固定admin账号）
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.admins IS '管理员表';

-- ============================================
-- 二、创建视图
-- ============================================

-- 2.1 用户完整信息视图
CREATE OR REPLACE VIEW public.v_user_full_info AS
SELECT 
    ru.*,
    COUNT(DISTINCT pr.id) AS payment_count,
    COUNT(DISTINCT ur.id) AS usage_count,
    COALESCE(SUM(pr.audited_amount), 0) AS audited_total_amount
FROM public.regular_users ru
LEFT JOIN public.payment_records pr ON ru.id = pr.user_id
LEFT JOIN public.usage_records ur ON ru.id = ur.user_id
GROUP BY ru.id;

COMMENT ON VIEW public.v_user_full_info IS '用户完整信息视图';

-- 2.2 缴费记录详情视图
CREATE OR REPLACE VIEW public.v_payment_detail AS
SELECT 
    pr.*,
    ru.city,
    ru.district,
    ru.status AS user_status
FROM public.payment_records pr
LEFT JOIN public.regular_users ru ON pr.user_id = ru.id;

COMMENT ON VIEW public.v_payment_detail IS '缴费记录详情视图';

-- 2.3 使用记录统计视图（按日期）
CREATE OR REPLACE VIEW public.v_usage_daily_stats AS
SELECT 
    DATE(use_date) AS stat_date,
    COUNT(*) AS usage_count,
    COUNT(DISTINCT user_id) AS user_count,
    SUM(used_questions) AS total_questions_used
FROM public.usage_records
GROUP BY DATE(use_date)
ORDER BY stat_date DESC;

COMMENT ON VIEW public.v_usage_daily_stats IS '使用记录日统计视图';

-- 2.4 用户缴费统计视图
CREATE OR REPLACE VIEW public.v_user_payment_stats AS
SELECT 
    ru.id AS user_id,
    ru.phone,
    ru.city,
    ru.district,
    ru.available_questions,
    ru.total_payment_amount,
    ru.valid_payment_count,
    ru.last_payment_date,
    COUNT(pr.id) AS total_payments,
    COUNT(CASE WHEN pr.audit_status = '待审核' THEN 1 END) AS pending_payments,
    COUNT(CASE WHEN pr.audit_status = '已通过' THEN 1 END) AS approved_payments,
    COUNT(CASE WHEN pr.audit_status = '已拒绝' THEN 1 END) AS rejected_payments
FROM public.regular_users ru
LEFT JOIN public.payment_records pr ON ru.id = pr.user_id
GROUP BY ru.id, ru.phone, ru.city, ru.district, ru.available_questions, 
         ru.total_payment_amount, ru.valid_payment_count, ru.last_payment_date;

COMMENT ON VIEW public.v_user_payment_stats IS '用户缴费统计视图';

-- ============================================
-- 三、创建索引
-- ============================================

-- 3.1 题库表索引
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_business ON public.questions(business_type);
CREATE INDEX IF NOT EXISTS idx_questions_content ON public.questions USING gin(to_tsvector('simple', question_content));

-- 3.2 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.regular_users(phone);
CREATE INDEX IF NOT EXISTS idx_users_city ON public.regular_users(city);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.regular_users(status);
CREATE INDEX IF NOT EXISTS idx_users_created ON public.regular_users(created_at);

-- ============================================
-- 安装 pg_trgm 扩展（用于模糊搜索）
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3.3 缴费记录表索引
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON public.payment_records(phone);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_records(audit_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payment_records(upload_date);
CREATE INDEX IF NOT EXISTS idx_payments_audit_date ON public.payment_records(audit_date);

-- 3.4 使用记录表索引
CREATE INDEX IF NOT EXISTS idx_usage_user ON public.usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_phone ON public.usage_records(phone);
CREATE INDEX IF NOT EXISTS idx_usage_date ON public.usage_records(use_date);

-- ============================================
-- 四、启用RLS并创建策略
-- ============================================

-- 4.1 题库表 RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允许所有人查看题库" ON public.questions;
CREATE POLICY "允许所有人查看题库"
    ON public.questions
    FOR SELECT
    TO PUBLIC
    USING (true);

DROP POLICY IF EXISTS "仅管理员可修改题库" ON public.questions;
CREATE POLICY "仅管理员可修改题库"
    ON public.questions
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 4.2 普通用户表 RLS
ALTER TABLE public.regular_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户查看自己的信息" ON public.regular_users;
CREATE POLICY "用户查看自己的信息"
    ON public.regular_users
    FOR SELECT
    TO authenticated
    USING (
        phone = auth.jwt() ->> 'phone' 
        OR auth.jwt() ->> 'role' = 'admin'
    );

DROP POLICY IF EXISTS "用户更新自己的信息" ON public.regular_users;
CREATE POLICY "用户更新自己的信息"
    ON public.regular_users
    FOR UPDATE
    TO authenticated
    USING (
        phone = auth.jwt() ->> 'phone' 
        OR auth.jwt() ->> 'role' = 'admin'
    )
    WITH CHECK (
        phone = auth.jwt() ->> 'phone' 
        OR auth.jwt() ->> 'role' = 'admin'
    );

DROP POLICY IF EXISTS "允许注册新用户" ON public.regular_users;
CREATE POLICY "允许注册新用户"
    ON public.regular_users
    FOR INSERT
    TO PUBLIC
    WITH CHECK (true);

-- 4.3 缴费记录表 RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户查看自己的缴费记录" ON public.payment_records;
CREATE POLICY "用户查看自己的缴费记录"
    ON public.payment_records
    FOR SELECT
    TO authenticated
    USING (
        phone = auth.jwt() ->> 'phone' 
        OR auth.jwt() ->> 'role' = 'admin'
    );

DROP POLICY IF EXISTS "用户创建缴费记录" ON public.payment_records;
CREATE POLICY "用户创建缴费记录"
    ON public.payment_records
    FOR INSERT
    TO authenticated
    WITH CHECK (phone = auth.jwt() ->> 'phone');

DROP POLICY IF EXISTS "仅管理员可审核缴费" ON public.payment_records;
CREATE POLICY "仅管理员可审核缴费"
    ON public.payment_records
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 4.4 使用记录表 RLS
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户查看自己的使用记录" ON public.usage_records;
CREATE POLICY "用户查看自己的使用记录"
    ON public.usage_records
    FOR SELECT
    TO authenticated
    USING (
        phone = auth.jwt() ->> 'phone' 
        OR auth.jwt() ->> 'role' = 'admin'
    );

DROP POLICY IF EXISTS "用户创建使用记录" ON public.usage_records;
CREATE POLICY "用户创建使用记录"
    ON public.usage_records
    FOR INSERT
    TO authenticated
    WITH CHECK (phone = auth.jwt() ->> 'phone');

-- 4.5 系统配置表 RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允许所有人查看配置" ON public.system_config;
CREATE POLICY "允许所有人查看配置"
    ON public.system_config
    FOR SELECT
    TO PUBLIC
    USING (true);

DROP POLICY IF EXISTS "仅管理员可修改配置" ON public.system_config;
CREATE POLICY "仅管理员可修改配置"
    ON public.system_config
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 五、创建函数
-- ============================================

-- 5.1 搜索题目函数（支持模糊匹配）
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
        similarity(q.question_content, search_text) AS match_score
    FROM public.questions q
    WHERE q.question_content ILIKE '%' || search_text || '%'
    ORDER BY match_score DESC, q.id
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.search_questions IS '模糊搜索题目函数';

-- 5.2 扣减可用题数函数
CREATE OR REPLACE FUNCTION public.deduct_available_questions(
    p_user_id UUID,
    p_deduct_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_available INTEGER;
BEGIN
    -- 获取当前可用题数
    SELECT available_questions INTO v_available
    FROM public.regular_users
    WHERE id = p_user_id;
    
    -- 检查可用题数
    IF v_available IS NULL OR v_available < p_deduct_count THEN
        RETURN false;
    END IF;
    
    -- 扣减题数
    UPDATE public.regular_users
    SET 
        available_questions = available_questions - p_deduct_count,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.deduct_available_questions IS '扣减用户可用题数函数';

-- 5.3 审核缴费函数
CREATE OR REPLACE FUNCTION public.audit_payment(
    p_payment_id UUID,
    p_audit_result VARCHAR,
    p_audit_remark TEXT,
    p_audited_amount DECIMAL,
    p_auditor_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_phone VARCHAR;
    v_old_status VARCHAR;
BEGIN
    -- 获取缴费记录信息
    SELECT user_id, phone, audit_status INTO v_user_id, v_phone, v_old_status
    FROM public.payment_records
    WHERE id = p_payment_id;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- 已审核的记录不能再次审核
    IF v_old_status != '待审核' THEN
        RETURN false;
    END IF;
    
    -- 更新缴费记录
    UPDATE public.payment_records
    SET 
        audit_status = p_audit_result,
        audit_result = p_audit_result,
        audit_remark = p_audit_remark,
        audited_amount = p_audited_amount,
        auditor_id = p_auditor_id,
        audit_date = NOW()
    WHERE id = p_payment_id;
    
    -- 如果审核通过，更新用户可用题数
    IF p_audit_result = '已通过' THEN
        UPDATE public.regular_users
        SET 
            available_questions = available_questions + (FLOOR(p_audited_amount * 2)::INTEGER),
            total_payment_amount = total_payment_amount + p_audited_amount,
            valid_payment_count = valid_payment_count + 1,
            last_payment_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.audit_payment IS '审核缴费记录函数';

-- 5.4 获取用户统计信息函数
CREATE OR REPLACE FUNCTION public.get_user_statistics(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    stat_date DATE,
    new_users BIGINT,
    active_users BIGINT,
    payment_users BIGINT,
    payment_amount DECIMAL,
    usage_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date AS stat_date,
        COALESCE(n.new_count, 0) AS new_users,
        COALESCE(u.active_count, 0) AS active_users,
        COALESCE(p.pay_count, 0) AS payment_users,
        COALESCE(p.pay_amount, 0) AS payment_amount,
        COALESCE(us.use_count, 0) AS usage_count
    FROM generate_series(p_start_date, p_end_date, INTERVAL '1 day') AS d(date)
    LEFT JOIN (
        SELECT DATE(created_at) AS dt, COUNT(*) AS new_count
        FROM public.regular_users
        WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(created_at)
    ) n ON d.date = n.dt
    LEFT JOIN (
        SELECT DATE(use_date) AS dt, COUNT(DISTINCT user_id) AS active_count
        FROM public.usage_records
        WHERE DATE(use_date) BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(use_date)
    ) u ON d.date = u.dt
    LEFT JOIN (
        SELECT DATE(upload_date) AS dt, 
               COUNT(DISTINCT user_id) AS pay_count,
               SUM(audited_amount) AS pay_amount
        FROM public.payment_records
        WHERE DATE(upload_date) BETWEEN p_start_date AND p_end_date
          AND audit_status = '已通过'
        GROUP BY DATE(upload_date)
    ) p ON d.date = p.dt
    LEFT JOIN (
        SELECT DATE(use_date) AS dt, COUNT(*) AS use_count
        FROM public.usage_records
        WHERE DATE(use_date) BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(use_date)
    ) us ON d.date = us.dt
    ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_statistics IS '获取用户统计信息函数';

-- 5.5 自动更新更新时间触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_regular_users_updated_at ON public.regular_users;
CREATE TRIGGER update_regular_users_updated_at
    BEFORE UPDATE ON public.regular_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON public.system_config;
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 六、创建存储桶（用于图片存储）
-- ============================================

-- 注意: 存储桶需要通过Supabase Dashboard或API创建
-- 以下是推荐的存储桶配置:

-- 存储桶: payment-images (缴费凭证图片)
-- 公开访问: false
-- 文件大小限制: 5MB
-- 允许的文件类型: image/*

-- 存储桶: system-images (系统图片如收款码)
-- 公开访问: true
-- 文件大小限制: 2MB
-- 允许的文件类型: image/*

-- ============================================
-- 完成
-- ============================================
SELECT '数据库初始化完成!' AS message;
