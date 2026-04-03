# 食安AI答题助手软件系统设计文档

## 一、项目概述

### 1.1 项目背景
食安AI答题助手是一款面向福建省食安人员的在线答题辅助工具，通过AI技术帮助用户快速匹配食安考试题目并提供答案解析。

### 1.2 技术架构
- **前端**: H5网页（React + TypeScript + Tailwind CSS）
- **后端**: Supabase（PostgreSQL + Auth + Storage）
- **部署**: 静态网站托管

### 1.3 用户角色
1. **普通用户**: 福建省各企业食安人员
2. **系统管理员**: admin账号管理后台

---

## 二、数据库表设计

### 2.1 核心数据表

#### 2.1.1 题库表 (questions)
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | uuid | 主键 | 自动生成 |
| question_type | varchar(20) | 题目类型 | 单选题/多选题/判断题 |
| business_type | varchar(50) | 业态类型 | 食品生产/食品流通/餐饮/特殊食品生产/特殊食品流通 |
| difficulty | varchar(10) | 题目等级 | 易/中/难 |
| is_required | boolean | 是否必考 | 默认false |
| remark | text | 备注 | 可空 |
| question_content | text | 题目内容 | 非空 |
| answer | varchar(50) | 答案 | 非空 |
| option_a | text | 选项A | 可空 |
| option_b | text | 选项B | 可空 |
| option_c | text | 选项C | 可空 |
| option_d | text | 选项D | 可空 |
| option_e | text | 选项E | 可空 |
| option_f | text | 选项F | 可空 |
| option_g | text | 选项G | 可空 |
| option_h | text | 选项H | 可空 |
| option_i | text | 选项I | 可空 |
| option_j | text | 选项J | 可空 |
| created_at | timestamp | 创建时间 | 自动 |

#### 2.1.2 普通用户表 (regular_users)
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | uuid | 主键 | 自动生成 |
| phone | varchar(11) | 手机号 | 唯一，非空 |
| city | varchar(50) | 所在市 | 非空 |
| district | varchar(50) | 所在区县 | 非空 |
| available_questions | integer | 可用题数 | 默认2 |
| total_payment_amount | decimal(10,2) | 总缴费金额 | 默认0 |
| valid_payment_count | integer | 有效缴费次数 | 默认0 |
| last_payment_date | date | 最后缴费日期 | 可空 |
| status | varchar(10) | 用户状态 | 正常/禁用，默认正常 |
| remark | text | 备注 | 可空 |
| created_at | timestamp | 创建时间 | 自动 |
| updated_at | timestamp | 更新时间 | 自动 |

#### 2.1.3 缴费记录表 (payment_records)
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | uuid | 主键 | 自动生成 |
| user_id | uuid | 用户ID | 外键关联regular_users |
| phone | varchar(11) | 用户手机号 | 非空 |
| payment_image_url | text | 缴费图片URL | 非空 |
| payment_amount | decimal(10,2) | 缴费金额 | 非空 |
| upload_date | timestamp | 上传日期时间 | 自动 |
| audit_status | varchar(10) | 审核状态 | 待审核/已通过/已拒绝 |
| audit_result | varchar(10) | 审核结果 | 可空 |
| audit_remark | text | 审核说明 | 可空 |
| audited_amount | decimal(10,2) | 已审核缴费金额 | 可空 |
| auditor_id | uuid | 审核人ID | 可空 |
| audit_date | timestamp | 审核日期时间 | 可空 |
| created_at | timestamp | 创建时间 | 自动 |

#### 2.1.4 使用记录表 (usage_records)
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | uuid | 主键 | 自动生成 |
| user_id | uuid | 用户ID | 外键关联regular_users |
| phone | varchar(11) | 用户手机号 | 非空 |
| search_content | text | 搜索内容 | 非空 |
| matched_count | integer | 匹配题数 | 非空 |
| used_questions | integer | 使用题数 | 非空 |
| use_date | timestamp | 使用日期时间 | 自动 |
| created_at | timestamp | 创建时间 | 自动 |

#### 2.1.5 系统配置表 (system_config)
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | uuid | 主键 | 自动生成 |
| config_key | varchar(50) | 配置键 | 唯一，非空 |
| config_value | text | 配置值 | 可空 |
| config_type | varchar(20) | 配置类型 | text/image |
| description | text | 描述 | 可空 |
| created_at | timestamp | 创建时间 | 自动 |
| updated_at | timestamp | 更新时间 | 自动 |

---

## 三、视图设计

### 3.1 用户完整信息视图 (v_user_full_info)
```sql
-- 包含用户信息及统计信息
```

### 3.2 缴费记录详情视图 (v_payment_detail)
```sql
-- 包含缴费记录及用户信息
```

### 3.3 使用记录统计视图 (v_usage_statistics)
```sql
-- 按日期统计使用记录
```

---

## 四、Row Level Security (RLS) 策略

### 4.1 普通用户表 RLS
- 用户只能查看和修改自己的记录
- 管理员可查看和修改所有记录

### 4.2 缴费记录表 RLS
- 用户只能查看自己的缴费记录
- 管理员可查看和审核所有记录

### 4.3 使用记录表 RLS
- 用户只能查看自己的使用记录
- 管理员可查看所有记录

### 4.4 题库表 RLS
- 所有用户可查看
- 仅管理员可修改

---

## 五、函数和存储过程

### 5.1 搜索题目函数 (search_questions)
- 输入: 搜索关键词
- 输出: 匹配的题目列表
- 逻辑: 模糊匹配题目内容

### 5.2 扣减可用题数函数 (deduct_available_questions)
- 输入: 用户ID, 扣减数量
- 输出: 是否成功
- 逻辑: 检查可用题数并扣减

### 5.3 审核缴费函数 (audit_payment)
- 输入: 缴费记录ID, 审核结果, 审核金额
- 输出: 是否成功
- 逻辑: 更新缴费记录和用户可用题数

---

## 六、前端页面设计

### 6.1 页面结构
单文件双视图设计，通过角色动态切换：

#### 普通用户视图
1. **登录/注册页**
   - 手机号输入
   - 市县选择（福建省）
   - 注册/登录按钮

2. **AI答题页**
   - 用户信息及可用题数显示
   - 重要提示信息
   - 题目输入框
   - 生成按钮
   - 结果展示区域

3. **缴费页**
   - 收款码显示
   - 缴费说明
   - 缴费记录上传
   - 历史缴费记录

4. **使用记录页**
   - 历史使用记录列表

#### 管理员视图
1. **登录页**
   - 用户名/密码登录

2. **题库管理**
   - 题目查询（业态/题型/内容）
   - 题目列表展示

3. **用户管理**
   - 用户列表（支持条件查询）
   - 用户编辑
   - 用户详情

4. **缴费管理**
   - 缴费记录列表
   - 缴费审核

5. **数据统计**
   - 用户统计
   - 缴费统计
   - 使用统计

6. **系统设置**
   - 收款码上传
   - 缴费说明配置
   - 答题提示配置

### 6.2 响应式设计
- PC端: 居中布局，最大宽度1200px
- 手机端: 全屏布局，底部导航
- 微信网页适配

---

## 七、接口设计

### 7.1 认证接口
- POST /auth/register - 注册
- POST /auth/login - 登录
- POST /auth/logout - 登出

### 7.2 用户接口
- GET /user/profile - 获取用户信息
- PUT /user/profile - 更新用户信息

### 7.3 题目接口
- GET /questions/search - 搜索题目
- GET /questions/:id - 获取题目详情

### 7.4 缴费接口
- POST /payments - 上传缴费记录
- GET /payments - 获取缴费记录
- PUT /payments/:id/audit - 审核缴费

### 7.5 使用记录接口
- POST /usage-records - 创建使用记录
- GET /usage-records - 获取使用记录

### 7.6 统计接口
- GET /statistics/users - 用户统计
- GET /statistics/payments - 缴费统计
- GET /statistics/usage - 使用统计

---

## 八、安全设计

### 8.1 认证安全
- 使用Supabase Auth
- JWT Token认证
- Token过期处理

### 8.2 数据安全
- RLS策略控制数据访问
- 敏感字段加密存储
- 手机号格式校验

### 8.3 传输安全
- HTTPS传输
- API请求限流

---

## 九、部署方案

### 9.1 数据库部署
- Supabase云端数据库
- 启用RLS
- 配置连接池

### 9.2 前端部署
- 静态网站托管
- CDN加速
- 域名配置

---

## 十、附录

### 10.1 福建省市县数据
```json
{
  "福州市": ["鼓楼区", "台江区", "仓山区", "马尾区", "晋安区", "长乐区", "福清市", "闽侯县", "连江县", "罗源县", "闽清县", "永泰县"],
  "厦门市": ["思明区", "湖里区", "海沧区", "集美区", "同安区", "翔安区"],
  "莆田市": ["城厢区", "涵江区", "荔城区", "秀屿区", "仙游县"],
  "三明市": ["三元区", "沙县区", "永安市", "明溪县", "清流县", "宁化县", "大田县", "尤溪县", "将乐县", "泰宁县", "建宁县"],
  "泉州市": ["鲤城区", "丰泽区", "洛江区", "泉港区", "石狮市", "晋江市", "南安市", "惠安县", "安溪县", "永春县", "德化县", "金门县"],
  "漳州市": ["芗城区", "龙文区", "龙海区", "长泰区", "云霄县", "漳浦县", "诏安县", "东山县", "南靖县", "平和县", "华安县"],
  "南平市": ["延平区", "建阳区", "邵武市", "武夷山市", "建瓯市", "顺昌县", "浦城县", "光泽县", "松溪县", "政和县"],
  "龙岩市": ["新罗区", "永定区", "漳平市", "长汀县", "上杭县", "武平县", "连城县"],
  "宁德市": ["蕉城区", "福安市", "福鼎市", "霞浦县", "古田县", "屏南县", "寿宁县", "周宁县", "柘荣县"]
}
```

### 10.2 手机号校验规则
- 长度: 11位
- 号段: 13x, 14x, 15x, 16x, 17x, 18x, 19x
- 排除: 物联网卡号段(1400-1449, 146等)
