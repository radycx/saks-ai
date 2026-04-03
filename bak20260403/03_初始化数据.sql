-- ============================================
-- 食安AI答题助手 - 初始化数据脚本
-- ============================================

BEGIN;

-- ============================================
-- 一、初始化管理员账号
-- ============================================
-- 注意: 实际密码需要通过应用层处理，这里仅创建记录
-- 初始密码: cx741230cx (需要在应用层进行MD5或bcrypt加密)

INSERT INTO public.admins (username, password_hash)
VALUES ('admin', '$2a$10$YourHashedPasswordHere');

-- ============================================
-- 二、初始化系统配置
-- ============================================

-- 2.1 缴费说明配置
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES (
    'payment_instruction',
    '请扫码转账缴费，必须转账留言备注注册的手机号码，每次缴费金额30-60元，1元可使用2次AI食安员考试的生成答题功能（仅限福建省范围）。',
    'text',
    '缴费说明文字'
);

-- 2.2 答题提示信息配置
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES (
    'answer_hint',
    '初次注册可试用2题，请输入准确的食安考试或练习题目内容，可以仅输入题目开头部分内容，如6-8个字，AI自动匹配生成。由于技术原因，可能会有个别食安考试题目无法识别，输入非食安考题无法生成题目和答案（仅限福建省范围）',
    'text',
    '答题页面提示信息'
);

-- 2.3 收款码图片配置（初始为空，需要管理员上传）
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES (
    'payment_qrcode',
    '',
    'image',
    '收款码图片URL'
);

-- 2.4 系统名称配置
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES (
    'system_name',
    '食安AI答题助手',
    'text',
    '系统名称'
);

-- 2.5 客服联系方式
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES (
    'contact_info',
    '如有问题请联系客服',
    'text',
    '客服联系方式'
);

-- ============================================
-- 三、福建省市县数据（用于前端选择）
-- ============================================
INSERT INTO public.system_config (config_key, config_value, config_type, description)
VALUES (
    'fujian_cities',
    '{
        "福州市": ["鼓楼区", "台江区", "仓山区", "马尾区", "晋安区", "长乐区", "福清市", "闽侯县", "连江县", "罗源县", "闽清县", "永泰县", "平潭试验区"],
        "厦门市": ["思明区", "湖里区", "海沧区", "集美区", "同安区", "翔安区"],
        "莆田市": ["城厢区", "涵江区", "荔城区", "秀屿区", "仙游县"],
        "三明市": ["三元区", "沙县区", "永安市", "明溪县", "清流县", "宁化县", "大田县", "尤溪县", "将乐县", "泰宁县", "建宁县"],
        "泉州市": ["鲤城区", "丰泽区", "洛江区", "泉港区", "石狮市", "晋江市", "南安市", "惠安县", "安溪县", "永春县", "德化县", "金门县"],
        "漳州市": ["芗城区", "龙文区", "龙海区", "长泰区", "云霄县", "漳浦县", "诏安县", "东山县", "南靖县", "平和县", "华安县"],
        "南平市": ["延平区", "建阳区", "邵武市", "武夷山市", "建瓯市", "顺昌县", "浦城县", "光泽县", "松溪县", "政和县"],
        "龙岩市": ["新罗区", "永定区", "漳平市", "长汀县", "上杭县", "武平县", "连城县"],
        "宁德市": ["蕉城区", "福安市", "福鼎市", "霞浦县", "古田县", "屏南县", "寿宁县", "周宁县", "柘荣县"]
    }',
    'text',
    '福建省市县数据JSON'
);

-- ============================================
-- 四、创建测试用户（可选）
-- ============================================
-- 注意: 以下测试用户仅用于开发测试，生产环境请删除

-- 测试用户1: 正常状态，有可用题数
-- INSERT INTO public.regular_users (phone, city, district, available_questions, status)
-- VALUES ('13800138000', '福州市', '鼓楼区', 10, '正常');

-- 测试用户2: 禁用状态
-- INSERT INTO public.regular_users (phone, city, district, available_questions, status)
-- VALUES ('13800138001', '厦门市', '思明区', 0, '禁用');

COMMIT;

-- ============================================
-- 初始化完成
-- ============================================
SELECT '系统初始化数据已导入!' AS message;
