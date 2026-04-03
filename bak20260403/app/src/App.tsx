import { useState, useEffect } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { 
  User, Lock, Phone, Search, CreditCard, History, Settings, 
  Users, BookOpen, BarChart3, LogOut, Upload, CheckCircle, 
  AlertCircle, Eye, EyeOff, Image as ImageIcon, Edit, Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import './App.css'

// ============================================
// 类型定义
// ============================================
type UserRole = 'guest' | 'user' | 'admin'

interface RegularUser {
  id: string
  phone: string
  city: string
  district: string
  available_questions: number
  total_payment_amount: number
  valid_payment_count: number
  last_payment_date: string | null
  status: '正常' | '禁用'
  remark: string | null
  created_at: string
  updated_at: string
}

interface Question {
  id: string
  question_type: string
  business_type: string
  difficulty: string
  is_required: string
  question_content: string
  answer: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  option_e?: string
  option_f?: string
  option_g?: string
  option_h?: string
  option_i?: string
  option_j?: string
}

interface PaymentRecord {
  id: string
  user_id: string
  phone: string
  payment_image_url: string
  payment_amount: number
  upload_date: string
  audit_status: '待审核' | '已通过' | '已拒绝'
  audit_result?: string
  audit_remark?: string
  audited_amount?: number
  audit_date?: string
}

interface UsageRecord {
  id: string
  user_id: string
  phone: string
  search_content: string
  matched_count: number
  used_questions: number
  use_date: string
}

interface SystemConfig {
  id: string
  config_key: string
  config_value: string
  config_type: string
  description: string
}

// ============================================
// 福建省市县数据
// ============================================
const FUJIAN_CITIES: Record<string, string[]> = {
  '福州市': ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区', '福清市', '闽侯县', '连江县', '罗源县', '闽清县', '永泰县', '平潭试验区'],
  '厦门市': ['思明区', '湖里区', '海沧区', '集美区', '同安区', '翔安区'],
  '莆田市': ['城厢区', '涵江区', '荔城区', '秀屿区', '仙游县'],
  '三明市': ['三元区', '沙县区', '永安市', '明溪县', '清流县', '宁化县', '大田县', '尤溪县', '将乐县', '泰宁县', '建宁县'],
  '泉州市': ['鲤城区', '丰泽区', '洛江区', '泉港区', '石狮市', '晋江市', '南安市', '惠安县', '安溪县', '永春县', '德化县', '金门县'],
  '漳州市': ['芗城区', '龙文区', '龙海区', '长泰区', '云霄县', '漳浦县', '诏安县', '东山县', '南靖县', '平和县', '华安县'],
  '南平市': ['延平区', '建阳区', '邵武市', '武夷山市', '建瓯市', '顺昌县', '浦城县', '光泽县', '松溪县', '政和县'],
  '龙岩市': ['新罗区', '永定区', '漳平市', '长汀县', '上杭县', '武平县', '连城县'],
  '宁德市': ['蕉城区', '福安市', '福鼎市', '霞浦县', '古田县', '屏南县', '寿宁县', '周宁县', '柘荣县']
}

// ============================================
// Supabase 配置
// ============================================
const SUPABASE_URL = 'https://apbwolcyorxfuoadhbxv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_PPAH56VB9-Uf6RHvm5HeYA_ipR-rD9n'

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// 工具函数
// ============================================
const validatePhone = (phone: string): boolean => {
  // 手机号校验: 11位, 以1开头, 第二位3-9
  const regex = /^1[3-9]\d{9}$/
  return regex.test(phone)
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const formatDateOnly = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// ============================================
// 主应用组件
// ============================================
function App() {
  // 全局状态
  const [role, setRole] = useState<UserRole>('guest')
  const [currentUser, setCurrentUser] = useState<RegularUser | null>(null)
  const [loading, setLoading] = useState(false)
  const supabaseConnected = !!supabase
  
  // 管理员登录状态
  const [, setAdminLoggedIn] = useState(false)
  
  // 系统配置
  const [systemConfig, setSystemConfig] = useState<Record<string, string>>({
    payment_instruction: '请扫码转账缴费，必须转账留言备注注册的手机号码，每次缴费金额30-60元，1元可使用2次AI食安员考试的生成答题功能（仅限福建省范围）。',
    answer_hint: '初次注册可试用2题，请输入准确的食安考试或练习题目内容，可以仅输入题目开头部分内容，如6-8个字，AI自动匹配生成。由于技术原因，可能会有个别食安考试题目无法识别，输入非食安考题无法生成题目和答案（仅限福建省范围）',
    payment_qrcode: ''
  })

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    const savedAdmin = localStorage.getItem('adminLoggedIn')
    
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setRole('user')
      } catch (e) {
        localStorage.removeItem('currentUser')
      }
    } else if (savedAdmin === 'true') {
      setAdminLoggedIn(true)
      setRole('admin')
    }
  }, [])

  // 加载系统配置
  useEffect(() => {
    if (supabase) {
      loadSystemConfig()
    }
  }, [supabaseConnected])

  const loadSystemConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
      
      if (error) throw error
      
      if (data) {
        const config: Record<string, string> = {}
        data.forEach((item: SystemConfig) => {
          config[item.config_key] = item.config_value
        })
        setSystemConfig(prev => ({ ...prev, ...config }))
      }
    } catch (e) {
      console.error('加载系统配置失败:', e)
    }
  }

  // 处理用户登录/注册
  const handleUserLogin = async (phone: string, city: string, district: string, isRegister: boolean) => {
    if (!validatePhone(phone)) {
      toast.error('请输入有效的手机号码')
      return false
    }
    
    setLoading(true)
    
    try {
      if (isRegister) {
        // 检查手机号是否已存在
        const { data: existingUser } = await supabase
          .from('regular_users')
          .select('*')
          .eq('phone', phone)
          .single()
        
        if (existingUser) {
          toast.error('该手机号已注册，请直接登录')
          setLoading(false)
          return false
        }
        
        // 创建新用户
        const { data: newUser, error: insertError } = await supabase
          .from('regular_users')
          .insert([{
            phone,
            city,
            district,
            available_questions: 2,
            status: '正常'
          }])
          .select()
          .single()
        
        if (insertError) throw insertError
        
        setCurrentUser(newUser)
        setRole('user')
        localStorage.setItem('currentUser', JSON.stringify(newUser))
        toast.success('注册成功！赠送2题试用')
      } else {
        // 登录
        const { data: user, error } = await supabase
          .from('regular_users')
          .select('*')
          .eq('phone', phone)
          .single()
        
        if (error || !user) {
          toast.error('手机号未注册，请先注册')
          setLoading(false)
          return false
        }
        
        if (user.status === '禁用') {
          toast.error('您账号已被禁用，请联系业务人员')
          setLoading(false)
          return false
        }
        
        setCurrentUser(user)
        setRole('user')
        localStorage.setItem('currentUser', JSON.stringify(user))
        toast.success('登录成功')
      }
      
      setLoading(false)
      return true
    } catch (e) {
      console.error('登录/注册失败:', e)
      toast.error('操作失败，请稍后重试')
      setLoading(false)
      return false
    }
  }

  // 处理管理员登录
  const handleAdminLogin = (username: string, password: string) => {
    if (username === 'admin' && password === 'cx741230cx') {
      setAdminLoggedIn(true)
      setRole('admin')
      localStorage.setItem('adminLoggedIn', 'true')
      toast.success('管理员登录成功')
      return true
    } else {
      toast.error('用户名或密码错误')
      return false
    }
  }

  // 退出登录
  const handleLogout = () => {
    setCurrentUser(null)
    setAdminLoggedIn(false)
    setRole('guest')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('adminLoggedIn')
    toast.success('已退出登录')
  }

  // 刷新用户信息
  const refreshUser = async () => {
    if (!supabase || !currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('regular_users')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setCurrentUser(data)
        localStorage.setItem('currentUser', JSON.stringify(data))
      }
    } catch (e) {
      console.error('刷新用户信息失败:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">
                {systemConfig.system_name || '食安AI答题助手'}
              </h1>
              {!supabaseConnected && (
                <Badge variant="destructive" className="ml-2">未连接</Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {role === 'user' && currentUser && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-1" />
                  <span className="mr-4">{currentUser.phone}</span>
                  <Badge variant="secondary">剩余 {currentUser.available_questions} 题</Badge>
                </div>
              )}
              
              {role === 'admin' && (
                <Badge variant="default">管理员</Badge>
              )}
              
              {role !== 'guest' && (
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  退出
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {role === 'guest' && (
          <GuestView 
            onUserLogin={handleUserLogin}
            onAdminLogin={handleAdminLogin}
            loading={loading}
          />
        )}
        
        {role === 'user' && currentUser && (
          <UserView 
            user={currentUser}
            systemConfig={systemConfig}
            onRefreshUser={refreshUser}
          />
        )}
        
        {role === 'admin' && (
          <AdminView 
            systemConfig={systemConfig}
            onConfigUpdate={loadSystemConfig}
          />
        )}
      </main>
    </div>
  )
}

// ============================================
// 游客视图（登录/注册）
// ============================================
function GuestView({ 
  onUserLogin, 
  onAdminLogin, 
  loading 
}: { 
  onUserLogin: (phone: string, city: string, district: string, isRegister: boolean) => Promise<boolean>
  onAdminLogin: (username: string, password: string) => boolean
  loading: boolean
}) {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user')
  const [isRegister, setIsRegister] = useState(false)
  
  // 用户登录/注册表单
  const [phone, setPhone] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  
  // 管理员登录表单
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCity || !selectedDistrict) {
      toast.error('请选择所在市县')
      return
    }
    const success = await onUserLogin(phone, selectedCity, selectedDistrict, isRegister)
    if (success) {
      setPhone('')
      setSelectedCity('')
      setSelectedDistrict('')
    }
  }

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdminLogin(adminUsername, adminPassword)
  }

  return (
    <div className="max-w-md mx-auto">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'user' | 'admin')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="user">用户入口</TabsTrigger>
          <TabsTrigger value="admin">管理员入口</TabsTrigger>
        </TabsList>
        
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>{isRegister ? '用户注册' : '用户登录'}</CardTitle>
              <CardDescription>
                {isRegister 
                  ? '注册即送2题试用，请输入手机号和所在地区' 
                  : '请输入注册时的手机号登录'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phone">手机号码</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入11位手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      maxLength={11}
                      required
                    />
                  </div>
                </div>
                
                {isRegister && (
                  <>
                    <div>
                      <Label>所在市</Label>
                      <Select value={selectedCity} onValueChange={(v) => { setSelectedCity(v); setSelectedDistrict('') }}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="选择所在市" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(FUJIAN_CITIES).map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>所在区县</Label>
                      <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={!selectedCity}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="选择所在区县" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCity && FUJIAN_CITIES[selectedCity]?.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="link" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>管理员登录</CardTitle>
              <CardDescription>请输入管理员账号和密码</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="admin-username">用户名</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="admin-username"
                      placeholder="请输入用户名"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="admin-password">密码</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  登录
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// 用户视图
// ============================================
function UserView({ 
  user, 
  systemConfig,
  onRefreshUser 
}: { 
  user: RegularUser
  systemConfig: Record<string, string>
  onRefreshUser: () => void
}) {
  const [activeTab, setActiveTab] = useState<'answer' | 'payment' | 'history'>('answer')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 左侧导航 */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg">功能菜单</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('answer')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'answer' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Search className="h-4 w-4 mr-3" />
                AI答题
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'payment' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="h-4 w-4 mr-3" />
                缴费充值
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <History className="h-4 w-4 mr-3" />
                使用记录
              </button>
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* 右侧内容 */}
      <div className="lg:col-span-3">
        {activeTab === 'answer' && (
          <AnswerTab 
            user={user} 
            answerHint={systemConfig.answer_hint}
            onRefreshUser={onRefreshUser}
          />
        )}
        {activeTab === 'payment' && (
          <PaymentTab 
            user={user}
            paymentInstruction={systemConfig.payment_instruction}
            paymentQrcode={systemConfig.payment_qrcode}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab user={user} />
        )}
      </div>
    </div>
  )
}

// ============================================
// AI答题标签页
// ============================================
function AnswerTab({ 
  user, 
  answerHint,
  onRefreshUser 
}: { 
  user: RegularUser
  answerHint: string
  onRefreshUser: () => void
}) {
  const [searchText, setSearchText] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchText.trim()) {
      toast.error('请输入题目内容')
      return
    }
    
    if (searchText.trim().length < 6) {
      toast.error('最少需要输入6个字')
      return
    }
    
    if (user.available_questions <= 0) {
      toast.error('可用题数不足，请先缴费充值')
      return
    }
    
    setLoading(true)
    setHasSearched(true)
    
    try {
      // 调用搜索函数
      const { data, error } = await supabase
        .rpc('search_questions', { 
          search_text: searchText.trim(),
          max_results: 50
        })
      
      if (error) {
        // 如果RPC不存在，使用普通查询
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('questions')
          .select('*')
          .ilike('question_content', `%${searchText.trim()}%`)
          .limit(50)
        
        if (fallbackError) throw fallbackError
        
        if (fallbackData && fallbackData.length > 0) {
          setQuestions(fallbackData)
          
          // 扣减可用题数
          const { error: deductError } = await supabase
            .rpc('deduct_available_questions', { 
              p_user_id: user.id,
              p_deduct_count: 1
            })
          
          if (deductError) {
            // 如果RPC不存在，直接更新
            await supabase
              .from('regular_users')
              .update({ available_questions: user.available_questions - 1 })
              .eq('id', user.id)
          }
          
          // 记录使用
          await supabase.from('usage_records').insert([{
            user_id: user.id,
            phone: user.phone,
            search_content: searchText.trim(),
            matched_count: fallbackData.length,
            used_questions: 1
          }])
          
          onRefreshUser()
          toast.success(`找到 ${fallbackData.length} 道相关题目`)
        } else {
          setQuestions([])
          toast.info('未找到匹配的题目，请尝试减少字数或更换关键词')
        }
      } else if (data && data.length > 0) {
        setQuestions(data)
        
        // 扣减可用题数
        await supabase.rpc('deduct_available_questions', { 
          p_user_id: user.id,
          p_deduct_count: 1
        })
        
        // 记录使用
        await supabase.from('usage_records').insert([{
          user_id: user.id,
          phone: user.phone,
          search_content: searchText.trim(),
          matched_count: data.length,
          used_questions: 1
        }])
        
        onRefreshUser()
        toast.success(`找到 ${data.length} 道相关题目`)
      } else {
        setQuestions([])
        toast.info('未找到匹配的题目，请尝试减少字数或更换关键词')
      }
    } catch (e) {
      console.error('搜索失败:', e)
      toast.error('搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">当前用户</p>
                <p className="font-medium">{user.phone}</p>
                <p className="text-xs text-gray-400">{user.city} {user.district}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">可用题数</p>
              <p className={`text-2xl font-bold ${user.available_questions > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {user.available_questions}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提示信息 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{answerHint}</AlertDescription>
      </Alert>

      {/* 搜索区域 */}
      <Card>
        <CardHeader>
          <CardTitle>题目搜索</CardTitle>
          <CardDescription>输入题目内容（至少6个字），AI自动匹配</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="请输入题目内容..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || user.available_questions <= 0}>
              {loading ? '搜索中...' : '生成题目'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>搜索结果</CardTitle>
            <CardDescription>共找到 {questions.length} 道相关题目</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>抱歉，无法为您生成相关题目及解答</p>
                    <p className="text-sm">请准确输入题目内容或试下其它题目</p>
                  </div>
                ) : (
                  questions.map((q, index) => (
                    <div key={q.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{q.question_type}</Badge>
                        <Badge variant="secondary">{q.business_type}</Badge>
                      </div>
                      <p className="font-medium mb-3">{index + 1}. {q.question_content}</p>
                      <div className="space-y-1 text-sm">
                        {q.option_a && <p>A. {q.option_a}</p>}
                        {q.option_b && <p>B. {q.option_b}</p>}
                        {q.option_c && <p>C. {q.option_c}</p>}
                        {q.option_d && <p>D. {q.option_d}</p>}
                        {q.option_e && <p>E. {q.option_e}</p>}
                        {q.option_f && <p>F. {q.option_f}</p>}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-green-600 font-medium">答案: {q.answer}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 图片压缩函数
// ============================================
async function compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // 如果图片宽度超过最大值，等比例缩小
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 压缩为 JPEG，质量 0.7
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

// ============================================
// 缴费标签页
// ============================================
function PaymentTab({ 
  user, 
  paymentInstruction,
  paymentQrcode
}: { 
  user: RegularUser
  paymentInstruction: string
  paymentQrcode: string
}) {
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentImage, setPaymentImage] = useState<string>('')
  const [paymentImagePreview, setPaymentImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  // 加载缴费记录
  useEffect(() => {
    loadPaymentRecords()
  }, [user.id])

  const loadPaymentRecords = async () => {
    setLoadingRecords(true)
    
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false })
      
      if (error) throw error
      setRecords(data || [])
    } catch (e) {
      console.error('加载缴费记录失败:', e)
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    
    // 检查原始文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB')
      return
    }
    
    try {
      toast.info('正在压缩图片...')
      // 压缩图片，最大宽度800px，质量70%
      const compressedImage = await compressImage(file, 800, 0.7)
      
      // 计算压缩后大小（Base64字符串长度 * 0.75 约等于字节数）
      const compressedSize = Math.round(compressedImage.length * 0.75 / 1024)
      
      setPaymentImage(compressedImage)
      setPaymentImagePreview(compressedImage)
      toast.success(`图片压缩完成，约 ${compressedSize}KB`)
    } catch (e) {
      console.error('图片压缩失败:', e)
      toast.error('图片压缩失败，请重试')
    }
  }

  const handleUpload = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) < 30 || parseFloat(paymentAmount) > 60) {
      toast.error('缴费金额必须在30-60元之间')
      return
    }
    
    if (!paymentImage) {
      toast.error('请上传缴费凭证图片')
      return
    }

    setUploading(true)
    
    try {
      // 尝试上传图片到存储桶
      let imageUrl = paymentImage
      
      try {
        // 将 Base64 转换为 Blob
        const base64Data = paymentImage.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })
        
        const fileName = `${user.phone}_${Date.now()}.jpg`
        
        const { error: uploadError } = await supabase.storage
          .from('payment-images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg'
          })
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('payment-images')
            .getPublicUrl(fileName)
          imageUrl = urlData.publicUrl
        }
      } catch (storageError) {
        console.log('存储桶上传失败，使用Base64存储:', storageError)
        // 使用Base64直接存储（存储在数据库中）
      }
      
      // 创建缴费记录
      const { error: insertError } = await supabase
        .from('payment_records')
        .insert([{
          user_id: user.id,
          phone: user.phone,
          payment_image_url: imageUrl,
          payment_amount: parseFloat(paymentAmount),
          audit_status: '待审核'
        }])
      
      if (insertError) throw insertError
      
      toast.success('缴费记录上传成功，请等待审核')
      setPaymentAmount('')
      setPaymentImage('')
      setPaymentImagePreview('')
      loadPaymentRecords()
    } catch (e) {
      console.error('上传失败:', e)
      toast.error('上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 缴费说明 */}
      <Card>
        <CardHeader>
          <CardTitle>缴费说明</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="whitespace-pre-line">
              {paymentInstruction}
            </AlertDescription>
          </Alert>
          
          {paymentQrcode && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">收款码</p>
              <img 
                src={paymentQrcode} 
                alt="收款码" 
                className="max-w-xs mx-auto border rounded-lg"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上传缴费记录 */}
      <Card>
        <CardHeader>
          <CardTitle>上传缴费记录</CardTitle>
          <CardDescription>请上传缴费凭证图片</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>缴费金额（元）</Label>
            <Input
              type="number"
              placeholder="30-60元"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min={30}
              max={60}
            />
          </div>
          
          <div>
            <Label>缴费凭证</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="payment-image"
              />
              <label htmlFor="payment-image">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  {paymentImagePreview ? (
                    <img 
                      src={paymentImagePreview} 
                      alt="预览" 
                      className="max-h-48 mx-auto"
                    />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">点击上传缴费凭证</p>
                      <p className="text-xs text-gray-400">支持 JPG/PNG 格式，最大5MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={uploading}
            className="w-full"
          >
            {uploading ? '上传中...' : '提交缴费记录'}
          </Button>
        </CardContent>
      </Card>

      {/* 历史缴费记录 */}
      <Card>
        <CardHeader>
          <CardTitle>历史缴费记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <p className="text-center py-4">加载中...</p>
          ) : records.length === 0 ? (
            <p className="text-center py-4 text-gray-500">暂无缴费记录</p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{record.payment_amount}元</p>
                      <p className="text-sm text-gray-500">{formatDate(record.upload_date)}</p>
                    </div>
                    <Badge 
                      variant={
                        record.audit_status === '已通过' ? 'default' :
                        record.audit_status === '已拒绝' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {record.audit_status}
                    </Badge>
                  </div>
                  {record.audit_status !== '待审核' && (
                    <div className="mt-2 text-sm">
                      <p>审核金额: {record.audited_amount}元</p>
                      {record.audit_remark && (
                        <p className="text-gray-500">备注: {record.audit_remark}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// 使用记录标签页
// ============================================
function HistoryTab({ user }: { user: RegularUser }) {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsageRecords()
  }, [user.id])

  const loadUsageRecords = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', user.id)
        .order('use_date', { ascending: false })
      
      if (error) throw error
      setRecords(data || [])
    } catch (e) {
      console.error('加载使用记录失败:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>使用记录</CardTitle>
        <CardDescription>您的历史使用记录</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : records.length === 0 ? (
          <p className="text-center py-4 text-gray-500">暂无使用记录</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      搜索: {record.search_content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(record.use_date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm">匹配 {record.matched_count} 题</p>
                    <p className="text-xs text-gray-500">使用 {record.used_questions} 题</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 管理员视图
// ============================================
function AdminView({ 
  systemConfig,
  onConfigUpdate 
}: { 
  systemConfig: Record<string, string>
  onConfigUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState<'questions' | 'users' | 'payments' | 'stats' | 'settings'>('questions')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 左侧导航 */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg">管理菜单</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('questions')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'questions' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BookOpen className="h-4 w-4 mr-3" />
                题库管理
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'users' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="h-4 w-4 mr-3" />
                用户管理
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'payments' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="h-4 w-4 mr-3" />
                缴费管理
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'stats' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                数据统计
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'settings' 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-4 w-4 mr-3" />
                系统设置
              </button>
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* 右侧内容 */}
      <div className="lg:col-span-3">
        {activeTab === 'questions' && <AdminQuestionsTab />}
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'payments' && <AdminPaymentsTab />}
        {activeTab === 'stats' && <AdminStatsTab />}
        {activeTab === 'settings' && (
          <AdminSettingsTab 
            systemConfig={systemConfig}
            onConfigUpdate={onConfigUpdate}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// 管理员-题库管理
// ============================================
function AdminQuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    business_type: '',
    question_type: '',
    content: ''
  })

  const loadQuestions = async () => {
    setLoading(true)
    
    try {
      let query = supabase.from('questions').select('*')
      
      if (searchParams.business_type) {
        query = query.eq('business_type', searchParams.business_type)
      }
      if (searchParams.question_type) {
        query = query.eq('question_type', searchParams.question_type)
      }
      if (searchParams.content) {
        query = query.ilike('question_content', `%${searchParams.content}%`)
      }
      
      const { data, error } = await query.limit(100)
      
      if (error) throw error
      setQuestions(data || [])
    } catch (e) {
      console.error('加载题库失败:', e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>题库管理</CardTitle>
        <CardDescription>查询和管理题库内容</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 查询条件 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select 
            value={searchParams.business_type} 
            onValueChange={(v) => setSearchParams(p => ({ ...p, business_type: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择业态类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="食品生产">食品生产</SelectItem>
              <SelectItem value="食品流通">食品流通</SelectItem>
              <SelectItem value="餐饮">餐饮</SelectItem>
              <SelectItem value="特殊食品生产">特殊食品生产</SelectItem>
              <SelectItem value="特殊食品流通">特殊食品流通</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={searchParams.question_type} 
            onValueChange={(v) => setSearchParams(p => ({ ...p, question_type: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择题型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="单选题">单选题</SelectItem>
              <SelectItem value="多选题">多选题</SelectItem>
              <SelectItem value="判断题">判断题</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Input
              placeholder="题目内容模糊查找"
              value={searchParams.content}
              onChange={(e) => setSearchParams(p => ({ ...p, content: e.target.value }))}
            />
            <Button onClick={loadQuestions}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 题目列表 */}
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : (
          <div className="text-sm text-gray-500 mb-2">
            共 {questions.length} 条记录
          </div>
        )}
        
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <Badge variant="outline">{q.question_type}</Badge>
                      <Badge variant="secondary">{q.business_type}</Badge>
                    </div>
                    <p className="text-sm">{q.question_content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================
// 管理员-用户管理
// ============================================
function AdminUsersTab() {
  const [users, setUsers] = useState<RegularUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    phone: '',
    city: '',
    status: ''
  })
  const [editingUser, setEditingUser] = useState<RegularUser | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    
    try {
      let query = supabase.from('regular_users').select('*')
      
      if (searchParams.phone) {
        query = query.ilike('phone', `%${searchParams.phone}%`)
      }
      if (searchParams.city) {
        query = query.eq('city', searchParams.city)
      }
      if (searchParams.status) {
        query = query.eq('status', searchParams.status)
      }
      
      const { data, error } = await query.order('last_payment_date', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (e) {
      console.error('加载用户失败:', e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSaveUser = async () => {
    if (!supabase || !editingUser) return
    
    try {
      const { error } = await supabase
        .from('regular_users')
        .update({
          status: editingUser.status,
          available_questions: editingUser.available_questions,
          remark: editingUser.remark
        })
        .eq('id', editingUser.id)
      
      if (error) throw error
      
      toast.success('保存成功')
      setEditDialogOpen(false)
      loadUsers()
    } catch (e) {
      console.error('保存失败:', e)
      toast.error('保存失败')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>用户管理</CardTitle>
        <CardDescription>管理注册用户</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 查询条件 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="手机号"
            value={searchParams.phone}
            onChange={(e) => setSearchParams(p => ({ ...p, phone: e.target.value }))}
          />
          <Select 
            value={searchParams.city} 
            onValueChange={(v) => setSearchParams(p => ({ ...p, city: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择市" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {Object.keys(FUJIAN_CITIES).map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={searchParams.status} 
            onValueChange={(v) => setSearchParams(p => ({ ...p, status: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="用户状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="正常">正常</SelectItem>
              <SelectItem value="禁用">禁用</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadUsers}>
            <Search className="h-4 w-4 mr-1" />
            查询
          </Button>
        </div>

        {/* 用户列表 */}
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : (
          <div className="text-sm text-gray-500 mb-2">
            共 {users.length} 位用户
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>手机号</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>可用题数</TableHead>
                <TableHead>总缴费</TableHead>
                <TableHead>缴费次数</TableHead>
                <TableHead>最后缴费</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>{u.city} {u.district}</TableCell>
                  <TableCell>{u.available_questions}</TableCell>
                  <TableCell>¥{u.total_payment_amount}</TableCell>
                  <TableCell>{u.valid_payment_count}</TableCell>
                  <TableCell>{formatDateOnly(u.last_payment_date || '')}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === '正常' ? 'default' : 'destructive'}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingUser(u)
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>手机号</Label>
                <Input value={editingUser.phone} disabled />
              </div>
              <div>
                <Label>可用题数</Label>
                <Input 
                  type="number"
                  value={editingUser.available_questions}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    available_questions: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>状态</Label>
                <Select 
                  value={editingUser.status}
                  onValueChange={(v: '正常' | '禁用') => setEditingUser({
                    ...editingUser,
                    status: v
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="正常">正常</SelectItem>
                    <SelectItem value="禁用">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>备注</Label>
                <Textarea
                  value={editingUser.remark || ''}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    remark: e.target.value
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUser}>
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================
// 管理员-缴费管理
// ============================================
function AdminPaymentsTab() {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [auditForm, setAuditForm] = useState({
    result: '已通过' as '已通过' | '已拒绝',
    amount: '',
    remark: ''
  })

  const loadPayments = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .order('audit_status', { ascending: false })
        .order('upload_date', { ascending: false })
      
      if (error) throw error
      setPayments(data || [])
    } catch (e) {
      console.error('加载缴费记录失败:', e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const handleAudit = async () => {
    if (!supabase || !selectedPayment) return
    
    try {
      const { error } = await supabase
        .rpc('audit_payment', {
          p_payment_id: selectedPayment.id,
          p_audit_result: auditForm.result,
          p_audit_remark: auditForm.remark,
          p_audited_amount: parseFloat(auditForm.amount) || selectedPayment.payment_amount,
          p_auditor_id: 'admin'
        })
      
      if (error) {
        // 如果RPC不存在，手动更新
        await supabase
          .from('payment_records')
          .update({
            audit_status: auditForm.result,
            audit_result: auditForm.result,
            audit_remark: auditForm.remark,
            audited_amount: parseFloat(auditForm.amount) || selectedPayment.payment_amount,
            audit_date: new Date().toISOString()
          })
          .eq('id', selectedPayment.id)
        
        if (auditForm.result === '已通过') {
          const auditedAmount = parseFloat(auditForm.amount) || selectedPayment.payment_amount
          await supabase
            .from('regular_users')
            .update({
              available_questions: supabase.rpc('increment', { x: Math.floor(auditedAmount * 2) }),
              total_payment_amount: supabase.rpc('increment', { x: auditedAmount }),
              valid_payment_count: supabase.rpc('increment', { x: 1 }),
              last_payment_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', selectedPayment.user_id)
        }
      }
      
      toast.success('审核完成')
      setAuditDialogOpen(false)
      loadPayments()
    } catch (e) {
      console.error('审核失败:', e)
      toast.error('审核失败')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>缴费管理</CardTitle>
        <CardDescription>审核用户缴费记录</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : (
          <div className="text-sm text-gray-500 mb-2">
            共 {payments.length} 条记录
            {payments.filter(p => p.audit_status === '待审核').length > 0 && (
              <span className="text-red-500 ml-2">
                (待审核: {payments.filter(p => p.audit_status === '待审核').length})
              </span>
            )}
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>手机号</TableHead>
                <TableHead>缴费金额</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow 
                  key={p.id}
                  className={p.audit_status === '待审核' ? 'bg-red-50' : ''}
                >
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>¥{p.payment_amount}</TableCell>
                  <TableCell>{formatDate(p.upload_date)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        p.audit_status === '已通过' ? 'default' :
                        p.audit_status === '已拒绝' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {p.audit_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.audit_status === '待审核' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(p)
                          setAuditForm({
                            result: '已通过',
                            amount: p.payment_amount.toString(),
                            remark: ''
                          })
                          setAuditDialogOpen(true)
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* 审核对话框 */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>审核缴费记录</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <Label>缴费凭证</Label>
                <img 
                  src={selectedPayment.payment_image_url} 
                  alt="缴费凭证" 
                  className="max-h-48 mt-2 border rounded"
                />
              </div>
              <div>
                <Label>用户申报金额</Label>
                <Input value={`¥${selectedPayment.payment_amount}`} disabled />
              </div>
              <div>
                <Label>审核金额</Label>
                <Input 
                  type="number"
                  value={auditForm.amount}
                  onChange={(e) => setAuditForm({ ...auditForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>审核结果</Label>
                <Select 
                  value={auditForm.result}
                  onValueChange={(v: '已通过' | '已拒绝') => setAuditForm({ ...auditForm, result: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="已通过">审核通过</SelectItem>
                    <SelectItem value="已拒绝">审核拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>审核说明</Label>
                <Textarea
                  value={auditForm.remark}
                  onChange={(e) => setAuditForm({ ...auditForm, remark: e.target.value })}
                  placeholder="请输入审核说明（可选）"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAudit}>
              <Save className="h-4 w-4 mr-1" />
              确认审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================
// 管理员-数据统计
// ============================================
function AdminStatsTab() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    totalAmount: 0,
    todayUsage: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // 用户总数
      const { count: userCount } = await supabase
        .from('regular_users')
        .select('*', { count: 'exact', head: true })
      
      // 缴费统计
      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('audited_amount')
        .eq('audit_status', '已通过')
      
      const totalAmount = paymentData?.reduce((sum, p) => sum + (p.audited_amount || 0), 0) || 0
      
      // 今日使用次数
      const today = new Date().toISOString().split('T')[0]
      const { count: usageCount } = await supabase
        .from('usage_records')
        .select('*', { count: 'exact', head: true })
        .gte('use_date', today)
      
      setStats({
        totalUsers: userCount || 0,
        totalPayments: paymentData?.length || 0,
        totalAmount,
        todayUsage: usageCount || 0
      })
    } catch (e) {
      console.error('加载统计失败:', e)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">用户总数</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">有效缴费次数</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalPayments}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">累计缴费金额</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">¥{stats.totalAmount.toFixed(2)}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">今日使用次数</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.todayUsage}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// 管理员-系统设置
// ============================================
function AdminSettingsTab({ 
  systemConfig,
  onConfigUpdate 
}: { 
  systemConfig: Record<string, string>
  onConfigUpdate: () => void
}) {
  const [paymentInstruction, setPaymentInstruction] = useState(systemConfig.payment_instruction)
  const [answerHint, setAnswerHint] = useState(systemConfig.answer_hint)
  const [qrcodeImage, setQrcodeImage] = useState<string>('')
  const [qrcodePreview, setQrcodePreview] = useState(systemConfig.payment_qrcode)
  const [saving, setSaving] = useState(false)

  const handleQrcodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    
    try {
      toast.info('正在压缩图片...')
      // 压缩收款码图片，最大宽度600px，质量80%
      const compressedImage = await compressImage(file, 600, 0.8)
      const compressedSize = Math.round(compressedImage.length * 0.75 / 1024)
      
      setQrcodeImage(compressedImage)
      setQrcodePreview(compressedImage)
      toast.success(`图片压缩完成，约 ${compressedSize}KB`)
    } catch (e) {
      console.error('图片压缩失败:', e)
      toast.error('图片压缩失败')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // 上传收款码
      let qrcodeUrl = qrcodePreview
      if (qrcodeImage) {
        try {
          // 将 Base64 转换为 Blob
          const base64Data = qrcodeImage.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'image/jpeg' })
          
          const fileName = `qrcode_${Date.now()}.jpg`
          
          const { error: uploadError } = await supabase.storage
            .from('system-images')
            .upload(fileName, blob, {
              contentType: 'image/jpeg'
            })
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('system-images')
              .getPublicUrl(fileName)
            qrcodeUrl = urlData.publicUrl
          }
        } catch (storageError) {
          console.log('存储桶上传失败，使用Base64存储:', storageError)
        }
      }
      
      // 更新配置
      const configs = [
        { key: 'payment_instruction', value: paymentInstruction },
        { key: 'answer_hint', value: answerHint },
        { key: 'payment_qrcode', value: qrcodeUrl }
      ]
      
      for (const config of configs) {
        const { error } = await supabase
          .from('system_config')
          .upsert({
            config_key: config.key,
            config_value: config.value,
            config_type: config.key === 'payment_qrcode' ? 'image' : 'text'
          }, { onConflict: 'config_key' })
        
        if (error) throw error
      }
      
      toast.success('保存成功')
      onConfigUpdate()
    } catch (e) {
      console.error('保存失败:', e)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>系统设置</CardTitle>
        <CardDescription>配置系统参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>缴费说明</Label>
          <Textarea
            value={paymentInstruction}
            onChange={(e) => setPaymentInstruction(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label>答题提示信息</Label>
          <Textarea
            value={answerHint}
            onChange={(e) => setAnswerHint(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label>收款码</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleQrcodeChange}
              className="hidden"
              id="qrcode-image"
            />
            <label htmlFor="qrcode-image">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors max-w-xs">
                {qrcodePreview ? (
                  <img 
                    src={qrcodePreview} 
                    alt="收款码" 
                    className="max-h-48 mx-auto"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">点击上传收款码</p>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default App
